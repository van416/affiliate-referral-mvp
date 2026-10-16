import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateCommissionCents, percentToRateBps } from "./commission";

describe("calculateCommissionCents", () => {
  it("applies basis points and floors fractional cents", () => {
    assert.equal(calculateCommissionCents(10_000, 1_000), 1_000);
    assert.equal(calculateCommissionCents(199, 1_000), 19);
    assert.equal(calculateCommissionCents(10_000, 10_000), 10_000);
    assert.equal(calculateCommissionCents(10_000, 0), 0);
  });

  it("rejects amounts and rates outside the integer range", () => {
    assert.throws(() => calculateCommissionCents(10.5, 1_000));
    assert.throws(() => calculateCommissionCents(-1, 1_000));
    assert.throws(() => calculateCommissionCents(100, 10_001));
    assert.throws(() => calculateCommissionCents(100, -1));
  });
});

describe("percentToRateBps", () => {
  it("converts a percent to basis points", () => {
    assert.equal(percentToRateBps(10), 1_000);
    assert.equal(percentToRateBps(12.5), 1_250);
    assert.equal(percentToRateBps(0), 0);
    assert.equal(percentToRateBps(100), 10_000);
  });

  it("rejects more than two decimal places and out-of-range percents", () => {
    assert.throws(() => percentToRateBps(10.555));
    assert.throws(() => percentToRateBps(-0.01));
    assert.throws(() => percentToRateBps(100.01));
    assert.throws(() => percentToRateBps(Number.NaN));
  });
});
