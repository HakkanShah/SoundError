import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { ConfigManager, readConfigFromGetter } from "./config";
import { CooldownManager } from "./cooldownManager";
import { DiagnosticsWatcher } from "./diagnosticsWatcher";
import { Logger } from "./logger";
import { RuleEngine } from "./ruleEngine";
import { SoundEngine } from "./soundEngine";
import { StateManager } from "./stateManager";
import { TerminalWatcher } from "./terminalWatcher";
import type { CooldownPolicy, SoundCategory, SoundErrorConfig, SoundEvent } from "./types";

export function activate(context: vscode.ExtensionContext): void {
  const logger = new Logger(false);
  const configManager = new ConfigManager(readCurrentConfig());
  const stateManager = new StateManager(configManager.get().mode);
  const ruleEngine = new RuleEngine();
  const cooldownManager = new CooldownManager(buildCooldownPolicy(configManager.get()));
  const soundEngine = new SoundEngine(context.extensionPath, logger);

  const onSoundEvent = (event: SoundEvent): void => {
    const config = configManager.get();
    if (!config.enabled || config.mode === "off") {
      return;
    }

    cooldownManager.updatePolicy(buildCooldownPolicy(config));
    const cooldownResult = cooldownManager.canPlay(event);
    if (!cooldownResult.shouldPlay) {
      return;
    }

    cooldownManager.markPlayed(event);
    void soundEngine.play(event.category, config);
  };

  const diagnosticsWatcher = new DiagnosticsWatcher(
    ruleEngine,
    stateManager,
    configManager,
    onSoundEvent,
    logger
  );
  const terminalWatcher = new TerminalWatcher(ruleEngine, stateManager, configManager, onSoundEvent, logger);

  const configDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration("soundError")) {
      return;
    }

    const nextConfig = readCurrentConfig();
    configManager.update(nextConfig);
    stateManager.setMode(nextConfig.mode);
  });

  context.subscriptions.push(
    logger,
    configDisposable,
    configManager.onDidChange((nextConfig) => {
      stateManager.setMode(nextConfig.mode);
      if (nextConfig.mode === "chaos") {
        cooldownManager.reset();
      }
    }),
    diagnosticsWatcher,
    terminalWatcher,
    ...registerCommands({
      configManager,
      soundEngine,
      logger
    })
  );
}

export function deactivate(): void {
  // Lifecycle cleanup is handled through context subscriptions.
}

function readCurrentConfig(): SoundErrorConfig {
  const workspaceConfig = vscode.workspace.getConfiguration("soundError");
  return readConfigFromGetter((key) => workspaceConfig.get(key));
}

function buildCooldownPolicy(config: SoundErrorConfig): CooldownPolicy {
  const base = Math.max(0, config.cooldown);
  const successCooldown = Math.max(500, Math.floor(base / 2));
  return {
    globalMs: base,
    mode: config.mode,
    perCategoryMs: buildPerCategoryCooldown(base, successCooldown)
  };
}

function buildPerCategoryCooldown(base: number, successCooldown: number): Partial<Record<SoundCategory, number>> {
  return {
    syntax: base,
    type: base,
    "build-fail": base,
    runtime: base,
    "test-fail": base,
    success: successCooldown,
    warning: base,
    "multi-error": base
  };
}
