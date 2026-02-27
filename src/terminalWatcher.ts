import * as vscode from "vscode";
import { ConfigManager } from "./config";
import { Logger } from "./logger";
import { RuleEngine } from "./ruleEngine";
import { StateManager } from "./stateManager";
import type { SoundEvent } from "./types";

type SoundEventHandler = (event: SoundEvent) => void;

interface TerminalWindowEvents {
  onDidStartTerminalShellExecution?: (
    listener: (event: vscode.TerminalShellExecutionStartEvent) => void
  ) => vscode.Disposable;
  onDidEndTerminalShellExecution?: (
    listener: (event: vscode.TerminalShellExecutionEndEvent) => void
  ) => vscode.Disposable;
}

export class TerminalWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly terminalKeys = new WeakMap<vscode.Terminal, string>();
  private nextTerminalId = 1;

  constructor(
    private readonly ruleEngine: RuleEngine,
    private readonly stateManager: StateManager,
    private readonly configManager: ConfigManager,
    private readonly onSoundEvent: SoundEventHandler,
    private readonly logger: Logger
  ) {
    this.registerShellExecutionWatchers();
    this.registerTaskWatcher();
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private registerShellExecutionWatchers(): void {
    const terminalEvents = vscode.window as unknown as TerminalWindowEvents;

    if (typeof terminalEvents.onDidStartTerminalShellExecution === "function") {
      this.disposables.push(
        terminalEvents.onDidStartTerminalShellExecution((event) => {
          const terminalKey = this.getTerminalKey(event.terminal);
          const commandLine = this.extractCommandLine(event.execution.commandLine);
          this.stateManager.rememberTerminalStart(terminalKey, commandLine);
        })
      );
    } else {
      this.logger.debug("onDidStartTerminalShellExecution is unavailable in this VS Code version.");
    }

    if (typeof terminalEvents.onDidEndTerminalShellExecution === "function") {
      this.disposables.push(
        terminalEvents.onDidEndTerminalShellExecution((event) => {
          this.handleShellExecutionEnd(event);
        })
      );
    } else {
      this.logger.debug("onDidEndTerminalShellExecution is unavailable in this VS Code version.");
    }
  }

  private registerTaskWatcher(): void {
    this.disposables.push(
      vscode.tasks.onDidEndTaskProcess((event) => {
        this.handleTaskEnd(event);
      })
    );
  }

  private handleShellExecutionEnd(event: vscode.TerminalShellExecutionEndEvent): void {
    const config = this.configManager.get();
    if (!config.enabled || config.mode === "off") {
      return;
    }

    const terminalKey = this.getTerminalKey(event.terminal);
    const rememberedCommand = this.stateManager.consumeTerminalCommand(terminalKey);
    const commandLine = rememberedCommand || this.extractCommandLine(event.execution.commandLine);
    const classification = this.ruleEngine.classifyTerminal(
      {
        commandLine,
        exitCode: event.exitCode
      },
      config
    );

    if (!classification.shouldPlay || !classification.category) {
      return;
    }

    const signature = `${classification.category}|${event.exitCode}|${commandLine}`;
    if (!this.stateManager.shouldEmitTerminalSignature(terminalKey, signature)) {
      this.logger.debug("Skipped duplicate terminal signature.");
      return;
    }

    this.onSoundEvent({
      category: classification.category,
      reason: classification.reason,
      timestamp: Date.now(),
      terminalName: event.terminal.name,
      commandLine,
      dedupeKey: signature
    });
  }

  private handleTaskEnd(event: vscode.TaskProcessEndEvent): void {
    const config = this.configManager.get();
    if (!config.enabled || config.mode === "off") {
      return;
    }

    const task = event.execution.task;
    const commandLine = `${task.source ?? "task"} ${task.name}`.trim();
    const classification = this.ruleEngine.classifyTerminal(
      {
        commandLine,
        exitCode: event.exitCode
      },
      config
    );

    if (!classification.shouldPlay || !classification.category) {
      return;
    }

    const terminalKey = `task:${task.name}`;
    const signature = `${classification.category}|${event.exitCode}|${commandLine}`;
    if (!this.stateManager.shouldEmitTerminalSignature(terminalKey, signature)) {
      this.logger.debug("Skipped duplicate task signature.");
      return;
    }

    this.onSoundEvent({
      category: classification.category,
      reason: classification.reason,
      timestamp: Date.now(),
      terminalName: task.name,
      commandLine,
      dedupeKey: signature
    });
  }

  private getTerminalKey(terminal: vscode.Terminal): string {
    const existing = this.terminalKeys.get(terminal);
    if (existing) {
      return existing;
    }

    const key = `terminal-${this.nextTerminalId++}:${terminal.name}`;
    this.terminalKeys.set(terminal, key);
    return key;
  }

  private extractCommandLine(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object" && value !== null) {
      const candidate = value as { value?: unknown; commandLine?: unknown };
      if (typeof candidate.value === "string") {
        return candidate.value;
      }
      if (typeof candidate.commandLine === "string") {
        return candidate.commandLine;
      }
    }

    return "";
  }
}
