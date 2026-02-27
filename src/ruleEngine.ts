import type {
  ClassificationResult,
  DiagnosticClassificationInput,
  DiagnosticLike,
  SoundErrorConfig,
  TerminalClassificationInput
} from "./types";

const TYPE_PATTERNS: RegExp[] = [
  /not assignable/i,
  /argument of type/i,
  /property .+ does not exist/i,
  /type .+ is not assignable/i,
  /cannot find name/i,
  /ts\d{3,5}/i
];

const SYNTAX_PATTERNS: RegExp[] = [
  /unexpected token/i,
  /expected/i,
  /unterminated/i,
  /declaration or statement expected/i,
  /missing/i,
  /';' expected/i
];

const TYPE_SOURCES = new Set(["typescript", "typescriptreact", "ts", "javascript", "javascriptreact", "tsserver"]);

const TEST_COMMAND_PATTERNS: RegExp[] = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b/i,
  /\bjest\b/i,
  /\bvitest\b/i,
  /\bpytest\b/i,
  /\bgo\s+test\b/i,
  /\bcargo\s+test\b/i
];

const BUILD_COMMAND_PATTERNS: RegExp[] = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?build\b/i,
  /\bwebpack\b/i,
  /\brollup\b/i,
  /\bvite\s+build\b/i,
  /\btsc\b/i,
  /\bgradle\b/i,
  /\bmvn\b/i
];

const RUNTIME_COMMAND_PATTERNS: RegExp[] = [
  /\bnode(?:\.exe)?\b/i,
  /\bdeno\b/i,
  /\bpython(?:3)?\b/i,
  /\bdotnet\s+run\b/i,
  /\bjava\b/i,
  /\bcargo\s+run\b/i,
  /\bphp\b/i
];

export class RuleEngine {
  classifyDiagnostics(input: DiagnosticClassificationInput): ClassificationResult {
    const errors = input.diagnostics.filter((diag) => diag.severity === "error");
    const warnings = input.diagnostics.filter((diag) => diag.severity === "warning");

    if (errors.length === 0) {
      if (input.config.enableWarnings && warnings.length > 0) {
        return {
          shouldPlay: true,
          category: "warning",
          reason: "warning-diagnostic"
        };
      }

      return {
        shouldPlay: false,
        reason: "no-error-diagnostics"
      };
    }

    if (input.delta > input.config.multiErrorThreshold) {
      return {
        shouldPlay: true,
        category: "multi-error",
        reason: "error-escalation"
      };
    }

    if (errors.some((diag) => isTypeDiagnostic(diag))) {
      return {
        shouldPlay: true,
        category: "type",
        reason: "type-diagnostic"
      };
    }

    if (errors.some((diag) => isSyntaxDiagnostic(diag))) {
      return {
        shouldPlay: true,
        category: "syntax",
        reason: "syntax-diagnostic"
      };
    }

    return {
      shouldPlay: true,
      category: "syntax",
      reason: "generic-error-fallback"
    };
  }

  classifyTerminal(input: TerminalClassificationInput, config: SoundErrorConfig): ClassificationResult {
    const normalizedCommand = input.commandLine.trim();
    const exitCode = input.exitCode;

    if (typeof exitCode !== "number") {
      return {
        shouldPlay: false,
        reason: "terminal-exit-unknown"
      };
    }

    if (exitCode === 0) {
      if (!config.enableSuccessSound) {
        return {
          shouldPlay: false,
          reason: "success-sound-disabled"
        };
      }

      return {
        shouldPlay: true,
        category: "success",
        reason: "terminal-success"
      };
    }

    if (matchesAny(TEST_COMMAND_PATTERNS, normalizedCommand)) {
      return {
        shouldPlay: true,
        category: "test-fail",
        reason: "terminal-test-failure"
      };
    }

    if (matchesAny(BUILD_COMMAND_PATTERNS, normalizedCommand)) {
      return {
        shouldPlay: true,
        category: "build-fail",
        reason: "terminal-build-failure"
      };
    }

    if (matchesAny(RUNTIME_COMMAND_PATTERNS, normalizedCommand)) {
      return {
        shouldPlay: true,
        category: "runtime",
        reason: "terminal-runtime-failure"
      };
    }

    return {
      shouldPlay: true,
      category: "runtime",
      reason: "terminal-failure-fallback"
    };
  }
}

function isTypeDiagnostic(diagnostic: DiagnosticLike): boolean {
  const source = (diagnostic.source ?? "").toLowerCase();
  const message = diagnostic.message.toLowerCase();
  const code = typeof diagnostic.code === "string" ? diagnostic.code.toLowerCase() : String(diagnostic.code ?? "");

  if (TYPE_SOURCES.has(source)) {
    return true;
  }

  if (TYPE_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }

  return /^ts\d{3,5}$/.test(code);
}

function isSyntaxDiagnostic(diagnostic: DiagnosticLike): boolean {
  const message = diagnostic.message.toLowerCase();
  return SYNTAX_PATTERNS.some((pattern) => pattern.test(message));
}

function matchesAny(patterns: RegExp[], commandLine: string): boolean {
  return patterns.some((pattern) => pattern.test(commandLine));
}
