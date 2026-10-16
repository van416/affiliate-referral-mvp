export const MAX_RATE_BPS = 10_000;
export const DEFAULT_RATE_BPS = 1_000;

export function calculateCommissionCents(amountCents: number, rateBps: number): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error("amountCents must be a non-negative integer");
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > MAX_RATE_BPS) {
    throw new Error("rateBps must be an integer from 0 to 10000");
  }
  return Math.floor((amountCents * rateBps) / MAX_RATE_BPS);
}

export function percentToRateBps(percent: number): number {
  if (typeof percent !== "number" || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("Commission rate must be between 0 and 100 percent");
  }
  const scaled = percent * 100;
  const rateBps = Math.round(scaled);
  if (Math.abs(scaled - rateBps) > 1e-6) {
    throw new Error("Commission rate supports at most 2 decimal places");
  }
  return rateBps;
}

export function rateBpsToPercent(rateBps: number): number {
  return rateBps / 100;
}
