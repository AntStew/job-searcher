import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "./anthropicPricing";

describe("estimateCostUsd", () => {
  it("is zero with no usage", () => {
    expect(estimateCostUsd(0, 0, 0)).toBe(0);
  });

  it("prices input tokens at $3 per million", () => {
    expect(estimateCostUsd(1_000_000, 0, 0)).toBeCloseTo(3);
  });

  it("prices output tokens at $15 per million", () => {
    expect(estimateCostUsd(0, 1_000_000, 0)).toBeCloseTo(15);
  });

  it("prices web searches at $10 per thousand", () => {
    expect(estimateCostUsd(0, 0, 1_000)).toBeCloseTo(10);
  });

  it("sums all three components", () => {
    expect(estimateCostUsd(1_000_000, 1_000_000, 1_000)).toBeCloseTo(28);
  });
});
