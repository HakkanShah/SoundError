export type SoundCategory =
  | "syntax"
  | "type"
  | "build-fail"
  | "runtime"
  | "test-fail"
  | "success"
  | "warning"
  | "multi-error";

export type ExtensionMode = "meme" | "chaos" | "silent-success" | "off";

export interface SoundEvent {
  category: SoundCategory;
  reason: string;
  terminalName?: string;
  commandLine?: string;
  timestamp: number;
  dedupeKey?: string;
}

export interface CooldownPolicy {
  globalMs: number;
  perCategoryMs: Partial<Record<SoundCategory, number>>;
  mode: ExtensionMode;
}

export interface ClassificationResult {
  shouldPlay: boolean;
  category?: SoundCategory;
  reason: string;
}

export interface SoundErrorConfig {
  enabled: boolean;
  volume: number;
  cooldown: number;
  enableWarnings: boolean;
  customSoundPath: string;
  mode: ExtensionMode;
  enableSuccessSound: boolean;
  debounceMs: number;
  multiErrorThreshold: number;
}

export type DiagnosticSeverityLike = "error" | "warning";

export interface DiagnosticLike {
  severity: DiagnosticSeverityLike;
  message: string;
  source?: string;
  code?: string | number;
  file?: string;
}

export interface DiagnosticClassificationInput {
  diagnostics: DiagnosticLike[];
  delta: number;
  config: SoundErrorConfig;
}

export interface TerminalClassificationInput {
  commandLine: string;
  exitCode: number | undefined;
}
