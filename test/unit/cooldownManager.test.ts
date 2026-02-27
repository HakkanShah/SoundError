import { describe, expect, it } from "vitest";
import { CooldownManager } from "../../src/cooldownManager";
import type { CooldownPolicy, SoundEvent } from "../../src/types";

const BASE_POLICY: CooldownPolicy = {
  globalMs: 3000,
  perCategoryMs: {},
  mode: "meme"
};

function makeEvent(category: SoundEvent["category"]): SoundEvent {
  return {
    category,
    reason: "test",
    timestamp: 0
  };
}

describe("CooldownManager", () => {
  it("blocks repeated category within cooldown and allows after expiry", () => {
    const manager = new CooldownManager(BASE_POLICY);
    const event = makeEvent("syntax");

    expect(manager.evaluateAndMark(event, 1000).shouldPlay).toBe(true);
    expect(manager.evaluateAndMark(event, 2000).shouldPlay).toBe(false);
    expect(manager.evaluateAndMark(event, 5001).shouldPlay).toBe(true);
  });

  it("allows everything in chaos mode", () => {
    const manager = new CooldownManager({ ...BASE_POLICY, mode: "chaos" });
    const event = makeEvent("type");

    expect(manager.evaluateAndMark(event, 1000).shouldPlay).toBe(true);
    expect(manager.evaluateAndMark(event, 1001).shouldPlay).toBe(true);
  });

  it("blocks everything in off mode", () => {
    const manager = new CooldownManager({ ...BASE_POLICY, mode: "off" });
    const event = makeEvent("runtime");

    expect(manager.evaluateAndMark(event, 1000).shouldPlay).toBe(false);
  });

  it("allows only success sounds in silent-success mode", () => {
    const manager = new CooldownManager({ ...BASE_POLICY, mode: "silent-success" });
    const successEvent = makeEvent("success");
    const failureEvent = makeEvent("build-fail");

    expect(manager.evaluateAndMark(successEvent, 1000).shouldPlay).toBe(true);
    expect(manager.evaluateAndMark(failureEvent, 1001).shouldPlay).toBe(false);
  });
});
