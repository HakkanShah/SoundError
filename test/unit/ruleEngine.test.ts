import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config";
import { RuleEngine } from "../../src/ruleEngine";
import type { DiagnosticLike } from "../../src/types";

const engine = new RuleEngine();

describe("RuleEngine terminal classification", () => {
  it("maps npm test failure to test-fail", () => {
    const result = engine.classifyTerminal(
      {
        commandLine: "npm test",
        exitCode: 1
      },
      DEFAULT_CONFIG
    );
    expect(result.category).toBe("test-fail");
  });

  it("maps build failure to build-fail", () => {
    const result = engine.classifyTerminal(
      {
        commandLine: "npm run build",
        exitCode: 2
      },
      DEFAULT_CONFIG
    );
    expect(result.category).toBe("build-fail");
  });

  it("maps runtime failure to runtime", () => {
    const result = engine.classifyTerminal(
      {
        commandLine: "node app.js",
        exitCode: 1
      },
      DEFAULT_CONFIG
    );
    expect(result.category).toBe("runtime");
  });

  it("maps build success to success when enabled", () => {
    const result = engine.classifyTerminal(
      {
        commandLine: "npm run build",
        exitCode: 0
      },
      DEFAULT_CONFIG
    );
    expect(result.category).toBe("success");
  });
});

describe("RuleEngine diagnostics classification", () => {
  it("returns multi-error when error delta exceeds threshold", () => {
    const diagnostics: DiagnosticLike[] = [
      { severity: "error", message: "Unexpected token", source: "typescript" },
      { severity: "error", message: "Expected ;", source: "typescript" }
    ];

    const result = engine.classifyDiagnostics({
      diagnostics,
      delta: 2,
      config: DEFAULT_CONFIG
    });

    expect(result.category).toBe("multi-error");
  });

  it("returns type for type-like diagnostics", () => {
    const diagnostics: DiagnosticLike[] = [
      {
        severity: "error",
        message: "Type 'string' is not assignable to type 'number'.",
        source: "typescript"
      }
    ];

    const result = engine.classifyDiagnostics({
      diagnostics,
      delta: 1,
      config: DEFAULT_CONFIG
    });

    expect(result.category).toBe("type");
  });
});
