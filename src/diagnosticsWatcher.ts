import * as vscode from "vscode";
import { ConfigManager } from "./config";
import { Logger } from "./logger";
import { RuleEngine } from "./ruleEngine";
import { StateManager } from "./stateManager";
import type { DiagnosticLike, SoundEvent } from "./types";

type SoundEventHandler = (event: SoundEvent) => void;

export class DiagnosticsWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly ruleEngine: RuleEngine,
    private readonly stateManager: StateManager,
    private readonly configManager: ConfigManager,
    private readonly onSoundEvent: SoundEventHandler,
    private readonly logger: Logger
  ) {
    this.seedBaseline();
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(() => {
        this.scheduleProcess();
      })
    );
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    vscode.Disposable.from(...this.disposables).dispose();
  }

  private seedBaseline(): void {
    const diagnostics = vscode.languages.getDiagnostics();
    const totalErrorCount = diagnostics.reduce((count, [, list]) => {
      return count + list.filter((diag) => diag.severity === vscode.DiagnosticSeverity.Error).length;
    }, 0);
    this.stateManager.seedDiagnosticCount(totalErrorCount);
  }

  private scheduleProcess(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const { debounceMs } = this.configManager.get();
    this.timer = setTimeout(() => {
      this.processDiagnostics();
    }, debounceMs);
  }

  private processDiagnostics(): void {
    const config = this.configManager.get();
    if (!config.enabled || config.mode === "off") {
      this.seedBaseline();
      return;
    }

    const diagnosticsByFile = vscode.languages.getDiagnostics();
    const flattened: DiagnosticLike[] = [];
    let totalErrorCount = 0;

    for (const [uri, diagnostics] of diagnosticsByFile) {
      let fileErrorCount = 0;
      for (const diagnostic of diagnostics) {
        if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
          fileErrorCount += 1;
          totalErrorCount += 1;
          flattened.push(toDiagnosticLike(diagnostic, uri));
        } else if (config.enableWarnings && diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
          flattened.push(toDiagnosticLike(diagnostic, uri));
        }
      }
      this.stateManager.setFileErrorCount(uri.toString(), fileErrorCount);
    }

    const countChange = this.stateManager.updateDiagnosticCount(totalErrorCount);
    if (!countChange.increased) {
      return;
    }

    const classification = this.ruleEngine.classifyDiagnostics({
      diagnostics: flattened,
      delta: countChange.delta,
      config
    });

    if (!classification.shouldPlay || !classification.category) {
      return;
    }

    const signature = this.buildSignature(classification.category, flattened, totalErrorCount);
    if (!this.stateManager.shouldEmitDiagnosticSignature(signature)) {
      this.logger.debug("Skipped duplicate diagnostic signature.");
      return;
    }

    this.onSoundEvent({
      category: classification.category,
      reason: classification.reason,
      timestamp: Date.now(),
      dedupeKey: signature
    });
  }

  private buildSignature(category: string, diagnostics: DiagnosticLike[], totalErrorCount: number): string {
    const sample = diagnostics.slice(0, 3).map((diag) => `${diag.file}:${diag.message}`).join("|");
    return `${category}::${totalErrorCount}::${sample}`;
  }
}

function toDiagnosticLike(diagnostic: vscode.Diagnostic, uri: vscode.Uri): DiagnosticLike {
  return {
    severity: diagnostic.severity === vscode.DiagnosticSeverity.Error ? "error" : "warning",
    message: diagnostic.message,
    source: diagnostic.source,
    code:
      typeof diagnostic.code === "string" || typeof diagnostic.code === "number"
        ? diagnostic.code
        : diagnostic.code?.value,
    file: uri.fsPath
  };
}
