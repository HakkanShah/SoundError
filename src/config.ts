import type { ExtensionMode, SoundErrorConfig } from "./types";

const VALID_MODES: ReadonlySet<ExtensionMode> = new Set([
  "meme",
  "chaos",
  "silent-success",
  "off"
]); 

export const DEFAULT_CONFIG: SoundErrorConfig = {
  enabled: true,
  volume: 0.8,
  cooldown: 3000,
  enableWarnings: false,
  customSoundPath: "",
  mode: "meme",
  enableSuccessSound: true,
  debounceMs: 250,
  multiErrorThreshold: 1
};

export function sanitizeConfig(raw: Partial<Record<keyof SoundErrorConfig, unknown>>): SoundErrorConfig {
  const mode = isMode(raw.mode) ? raw.mode : DEFAULT_CONFIG.mode;

  return {
    enabled: toBoolean(raw.enabled, DEFAULT_CONFIG.enabled),
    volume: clampNumber(raw.volume, 0, 1, DEFAULT_CONFIG.volume),
    cooldown: Math.max(0, toNumber(raw.cooldown, DEFAULT_CONFIG.cooldown)),
    enableWarnings: toBoolean(raw.enableWarnings, DEFAULT_CONFIG.enableWarnings),
    customSoundPath: typeof raw.customSoundPath === "string" ? raw.customSoundPath.trim() : "",
    mode,
    enableSuccessSound: toBoolean(raw.enableSuccessSound, DEFAULT_CONFIG.enableSuccessSound),
    debounceMs: Math.max(0, toNumber(raw.debounceMs, DEFAULT_CONFIG.debounceMs)),
    multiErrorThreshold: Math.max(
      1,
      Math.floor(toNumber(raw.multiErrorThreshold, DEFAULT_CONFIG.multiErrorThreshold))
    )
  };
}

export function readConfigFromGetter(getValue: (key: string) => unknown): SoundErrorConfig {
  return sanitizeConfig({
    enabled: getValue("enabled"),
    volume: getValue("volume"),
    cooldown: getValue("cooldown"),
    enableWarnings: getValue("enableWarnings"),
    customSoundPath: getValue("customSoundPath"),
    mode: getValue("mode"),
    enableSuccessSound: getValue("enableSuccessSound")
  });
}

export class ConfigManager {
  private currentConfig: SoundErrorConfig;
  private readonly listeners = new Set<(config: SoundErrorConfig) => void>();

  constructor(initialConfig: SoundErrorConfig) {
    this.currentConfig = initialConfig;
  }

  get(): SoundErrorConfig {
    return this.currentConfig;
  }

  update(config: SoundErrorConfig): void {
    if (isEqualConfig(this.currentConfig, config)) {
      return;
    }

    this.currentConfig = config;
    for (const listener of this.listeners) {
      listener(this.currentConfig);
    }
  }

  onDidChange(listener: (config: SoundErrorConfig) => void): { dispose: () => void } {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      }
    };
  }
}

function isMode(value: unknown): value is ExtensionMode {
  return typeof value === "string" && VALID_MODES.has(value as ExtensionMode);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = toNumber(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}

function isEqualConfig(a: SoundErrorConfig, b: SoundErrorConfig): boolean {
  return (
    a.enabled === b.enabled &&
    a.volume === b.volume &&
    a.cooldown === b.cooldown &&
    a.enableWarnings === b.enableWarnings &&
    a.customSoundPath === b.customSoundPath &&
    a.mode === b.mode &&
    a.enableSuccessSound === b.enableSuccessSound &&
    a.debounceMs === b.debounceMs &&
    a.multiErrorThreshold === b.multiErrorThreshold
  );
}
