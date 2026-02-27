import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, readConfigFromGetter, sanitizeConfig } from "../../src/config";

describe("config sanitation", () => {
  it("clamps out-of-range values and falls back to defaults", () => {
    const config = sanitizeConfig({
      volume: 3,
      cooldown: -10,
      mode: "unknown",
      enabled: "yes"
    });

    expect(config.volume).toBe(1);
    expect(config.cooldown).toBe(0);
    expect(config.mode).toBe(DEFAULT_CONFIG.mode);
    expect(config.enabled).toBe(DEFAULT_CONFIG.enabled);
  });

  it("reads values from getter and applies defaults for missing values", () => {
    const values = new Map<string, unknown>([
      ["enabled", false],
      ["volume", 0.25],
      ["cooldown", 1500],
      ["mode", "chaos"]
    ]);
    const config = readConfigFromGetter((key) => values.get(key));

    expect(config.enabled).toBe(false);
    expect(config.volume).toBe(0.25);
    expect(config.cooldown).toBe(1500);
    expect(config.mode).toBe("chaos");
    expect(config.enableSuccessSound).toBe(DEFAULT_CONFIG.enableSuccessSound);
  });
});
