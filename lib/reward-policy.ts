export type RewardKind = "sail" | "treasure";

export function clampToDailyCap(grant: number, todaySoFar: number, cap: number): number {
  const remaining = Math.max(0, cap - todaySoFar);
  return Math.max(0, Math.min(grant, remaining));
}

export function computeGrantBounds(kind: RewardKind, cfg?: {
  sailMin?: number; sailMax?: number; treasureMin?: number; treasureMax?: number;
}) {
  const sailMin = cfg?.sailMin ?? 10;
  const sailMax = cfg?.sailMax ?? 100;
  const treasureMin = cfg?.treasureMin ?? 1000;
  const treasureMax = cfg?.treasureMax ?? 10000;
  return kind === "sail" ? [sailMin, sailMax] as const : [treasureMin, treasureMax] as const;
}

export function withinCooldown(nowMs: number, lastEventMs: number | null, cooldownMs: number): boolean {
  if (!lastEventMs) return false;
  return (nowMs - lastEventMs) < cooldownMs;
}

export function isValidKind(kind: any): kind is RewardKind {
  return kind === "sail" || kind === "treasure";
}
