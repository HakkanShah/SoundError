import * as vscode from "vscode";

export class Logger implements vscode.Disposable {
  private readonly channel?: vscode.OutputChannel;

  constructor(enabled = false) {
    if (enabled) {
      this.channel = vscode.window.createOutputChannel("Sound Error");
    }
  }

  debug(message: string): void {
    this.channel?.appendLine(`[debug] ${message}`);
  }

  error(message: string): void {
    this.channel?.appendLine(`[error] ${message}`);
  }

  dispose(): void {
    this.channel?.dispose();
  }
}
