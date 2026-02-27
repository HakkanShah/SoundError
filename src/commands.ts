import * as vscode from "vscode";
import { ConfigManager, readConfigFromGetter } from "./config";
import { Logger } from "./logger";
import { SoundEngine } from "./soundEngine";
import type { ExtensionMode } from "./types";

export interface CommandDependencies {
  configManager: ConfigManager;
  soundEngine: SoundEngine;
  logger: Logger;
}

const MODE_ORDER: ExtensionMode[] = ["meme", "chaos", "silent-success", "off"];

export function registerCommands(deps: CommandDependencies): vscode.Disposable[] {
  const testSound = vscode.commands.registerCommand("soundError.testSound", async () => {
    const config = deps.configManager.get();
    const category = config.enableSuccessSound ? "success" : "syntax";
    await deps.soundEngine.play(category, config);
  });

  const reloadSoundPack = vscode.commands.registerCommand("soundError.reloadSoundPack", () => {
    deps.soundEngine.clearCache();
    vscode.window.showInformationMessage("Sound Error sound pack reloaded.");
  });

  const toggleMode = vscode.commands.registerCommand("soundError.toggleMode", async () => {
    const current = deps.configManager.get().mode;
    const nextMode = getNextMode(current);
    await vscode.workspace.getConfiguration("soundError").update("mode", nextMode, vscode.ConfigurationTarget.Global);

    const refreshed = readConfigFromGetter((key) => vscode.workspace.getConfiguration("soundError").get(key));
    deps.configManager.update(refreshed);

    vscode.window.showInformationMessage(`Sound Error mode: ${nextMode}`);
    deps.logger.debug(`Mode changed from ${current} to ${nextMode}`);
  });

  return [testSound, reloadSoundPack, toggleMode];
}

function getNextMode(current: ExtensionMode): ExtensionMode {
  const currentIndex = MODE_ORDER.indexOf(current);
  if (currentIndex < 0) {
    return MODE_ORDER[0];
  }
  return MODE_ORDER[(currentIndex + 1) % MODE_ORDER.length];
}
