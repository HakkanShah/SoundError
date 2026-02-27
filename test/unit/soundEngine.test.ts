import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPlaybackCommand } from "../../src/soundEngine";

describe("buildPlaybackCommand", () => {
  it("uses event-driven windows playback without fixed sleep", () => {
    const result = buildPlaybackCommand("C:\\tmp\\my'sound.wav", 0.8, "win32");
    const script = result.args[3] ?? "";

    expect(result.command).toBe("powershell");
    expect(script).toContain("MediaEnded");
    expect(script).toContain("MediaFailed");
    expect(script).toContain("$sync.WaitOne()");
    expect(script).not.toContain("Start-Sleep");
  });

  it("uses afplay on macOS", () => {
    const result = buildPlaybackCommand("/tmp/sound.wav", 0.4, "darwin");

    expect(result.command).toBe("afplay");
    expect(result.args).toEqual(["-v", "0.40", "/tmp/sound.wav"]);
  });

  it("uses paplay/aplay fallback on linux", () => {
    const result = buildPlaybackCommand("/tmp/sound.wav", 0.4, "linux");

    expect(result.command).toBe("sh");
    expect(result.args[0]).toBe("-c");
    expect(result.args[1]).toContain("paplay");
    expect(result.args[1]).toContain("aplay");
  });
});

describe("soundEngine timeout removal", () => {
  it("does not include fixed playback timeout or forced kill logic", () => {
    const source = readFileSync("src/soundEngine.ts", "utf8");

    expect(source).not.toContain("PLAYBACK_TIMEOUT_MS");
    expect(source).not.toContain("Start-Sleep -Milliseconds 1200");
    expect(source).not.toContain("child.kill()");
  });
});
