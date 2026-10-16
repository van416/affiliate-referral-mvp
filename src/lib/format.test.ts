import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dollarsToCents } from "./format";

describe("dollarsToCents", () => {
  it("converts dollar strings to integer cents", () => {
    assert.equal(dollarsToCents("100"), 10_000);
    assert.equal(dollarsToCents("19.99"), 1_999);
    assert.equal(dollarsToCents("0.01"), 1);
    assert.equal(dollarsToCents(" 100.1 "), 10_010);
  });

  it("rejects empty, zero, and overly precise amounts", () => {
    assert.equal(dollarsToCents(""), null);
    assert.equal(dollarsToCents("0"), null);
    assert.equal(dollarsToCents("10.999"), null);
    assert.equal(dollarsToCents("100000.01"), null);
    assert.equal(dollarsToCents("abc"), null);
  });
});
