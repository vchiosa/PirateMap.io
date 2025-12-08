import { describe, it, expect } from "vitest";
import { clampToDailyCap, computeGrantBounds, withinCooldown, isValidKind } from "@/lib/reward-policy";

describe("reward-policy", () => {
  it("clamps grant to remaining cap", () => {
    expect(clampToDailyCap(100, 0, 100)).toBe(100);
    expect(clampToDailyCap(150, 0, 100)).toBe(100);
    expect(clampToDailyCap(50, 90, 100)).toBe(10);
    expect(clampToDailyCap(50, 100, 100)).toBe(0);
  });

  it("returns correct bounds per kind", () => {
    expect(computeGrantBounds("sail")).toEqual([10, 100]);
    expect(computeGrantBounds("treasure")).toEqual([1000, 10000]);
    expect(computeGrantBounds("sail", { sailMin: 5, sailMax: 6 })).toEqual([5, 6]);
  });

  it("detects cooldown", () => {
    const now = 10_000;
    expect(withinCooldown(now, null, 800)).toBe(false);
    expect(withinCooldown(now, 9_300, 800)).toBe(true);
    expect(withinCooldown(now, 9_100, 800)).toBe(false);
  });

  it("validates kind", () => {
    expect(isValidKind("sail")).toBe(true);
    expect(isValidKind("treasure")).toBe(true);
    expect(isValidKind("x")).toBe(false);
  });
});
