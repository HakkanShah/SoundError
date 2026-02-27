import type { ExtensionMode } from "./types";

interface TerminalState {
  lastSignature?: string;
  lastAt?: number;
  activeCommandLine?: string;
}

export class StateManager {
  private totalErrorCount = 0;
  private readonly perFileErrorCounts = new Map<string, number>();
  private readonly terminalStates = new Map<string, TerminalState>();
  private lastDiagnosticSignature?: string;
  private lastDiagnosticSignatureAt = 0;
  private mode: ExtensionMode;

  constructor(initialMode: ExtensionMode) {
    this.mode = initialMode;
  }

  setMode(mode: ExtensionMode): void {
    this.mode = mode;
  }

  getMode(): ExtensionMode {
    return this.mode;
  }

  seedDiagnosticCount(value: number): void {
    this.totalErrorCount = Math.max(0, value);
  }

  updateDiagnosticCount(nextTotal: number): {
    previous: number;
    current: number;
    delta: number;
    increased: boolean;
  } {
    const previous = this.totalErrorCount;
    const current = Math.max(0, nextTotal);
    this.totalErrorCount = current;
    const delta = current - previous;

    return {
      previous,
      current,
      delta,
      increased: delta > 0
    };
  }

  setFileErrorCount(fileKey: string, count: number): void {
    this.perFileErrorCounts.set(fileKey, Math.max(0, count));
  }

  getFileErrorCount(fileKey: string): number {
    return this.perFileErrorCounts.get(fileKey) ?? 0;
  }

  rememberTerminalStart(terminalKey: string, commandLine: string): void {
    const existing = this.terminalStates.get(terminalKey) ?? {};
    this.terminalStates.set(terminalKey, {
      ...existing,
      activeCommandLine: commandLine.trim()
    });
  }

  consumeTerminalCommand(terminalKey: string): string {
    const existing = this.terminalStates.get(terminalKey);
    if (!existing?.activeCommandLine) {
      return "";
    }

    const command = existing.activeCommandLine;
    this.terminalStates.set(terminalKey, {
      ...existing,
      activeCommandLine: undefined
    });
    return command;
  }

  shouldEmitTerminalSignature(terminalKey: string, signature: string, dedupeWindowMs = 1000): boolean {
    const now = Date.now();
    const existing = this.terminalStates.get(terminalKey);

    if (
      existing?.lastSignature === signature &&
      typeof existing.lastAt === "number" &&
      now - existing.lastAt < dedupeWindowMs
    ) {
      return false;
    }

    this.terminalStates.set(terminalKey, {
      ...existing,
      lastSignature: signature,
      lastAt: now
    });

    return true;
  }

  shouldEmitDiagnosticSignature(signature: string, dedupeWindowMs = 1000): boolean {
    const now = Date.now();
    if (this.lastDiagnosticSignature === signature && now - this.lastDiagnosticSignatureAt < dedupeWindowMs) {
      return false;
    }

    this.lastDiagnosticSignature = signature;
    this.lastDiagnosticSignatureAt = now;
    return true;
  }
}
