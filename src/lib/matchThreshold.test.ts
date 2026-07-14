import { describe, expect, it } from "vitest";
import { thresholdLabel } from "./matchThreshold";

describe("thresholdLabel", () => {
  it("labels the exact preset values", () => {
    expect(thresholdLabel(40)).toBe("Broad");
    expect(thresholdLabel(60)).toBe("Balanced");
    expect(thresholdLabel(80)).toBe("Strict");
  });

  it("snaps in-between values to the closest preset", () => {
    expect(thresholdLabel(45)).toBe("Broad");
    expect(thresholdLabel(65)).toBe("Balanced");
    expect(thresholdLabel(75)).toBe("Strict");
  });

  it("clamps extremes to the nearest preset", () => {
    expect(thresholdLabel(0)).toBe("Broad");
    expect(thresholdLabel(100)).toBe("Strict");
  });
});
