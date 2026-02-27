import type { ClassificationResult, CooldownPolicy, SoundCategory, SoundEvent } from "./types";

export class CooldownManager {
  private policy: CooldownPolicy;
  private lastGlobalPlayAt = Number.NEGATIVE_INFINITY;
  private readonly lastCategoryPlayAt = new Map<SoundCategory, number>();

  constructor(policy: CooldownPolicy) {
    this.policy = clonePolicy(policy);
  }

  updatePolicy(policy: CooldownPolicy): void {
    this.policy = clonePolicy(policy);
  }

  reset(): void {
    this.lastGlobalPlayAt = Number.NEGATIVE_INFINITY;
    this.lastCategoryPlayAt.clear();
  }

  canPlay(event: SoundEvent, now = Date.now()): ClassificationResult {
    if (this.policy.mode === "off") {
      return { shouldPlay: false, reason: "mode:off" };
    }

    if (this.policy.mode === "silent-success" && event.category !== "success") {
      return { shouldPlay: false, reason: "mode:silent-success-filter" };
    }

    if (this.policy.mode === "chaos") {
      return { shouldPlay: true, category: event.category, reason: "mode:chaos" };
    }

    const globalElapsed = now - this.lastGlobalPlayAt;
    if (globalElapsed < this.policy.globalMs) {
      return { shouldPlay: false, reason: "global-cooldown" };
    }

    const categoryCooldown = this.policy.perCategoryMs[event.category] ?? this.policy.globalMs;
    const lastCategoryPlay = this.lastCategoryPlayAt.get(event.category) ?? Number.NEGATIVE_INFINITY;
    const categoryElapsed = now - lastCategoryPlay;

    if (categoryElapsed < categoryCooldown) {
      return { shouldPlay: false, reason: "category-cooldown" };
    }

    return { shouldPlay: true, category: event.category, reason: "cooldown-pass" };
  }

  markPlayed(event: SoundEvent, now = Date.now()): void {
    this.lastGlobalPlayAt = now;
    this.lastCategoryPlayAt.set(event.category, now);
  }

  evaluateAndMark(event: SoundEvent, now = Date.now()): ClassificationResult {
    const result = this.canPlay(event, now);
    if (result.shouldPlay) {
      this.markPlayed(event, now);
    }
    return result;
  }
}

function clonePolicy(policy: CooldownPolicy): CooldownPolicy {
  return {
    globalMs: Math.max(0, policy.globalMs),
    perCategoryMs: { ...policy.perCategoryMs },
    mode: policy.mode
  };
}
