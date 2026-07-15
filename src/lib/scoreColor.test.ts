import { describe, expect, it } from "vitest";
import { scoreColor } from "./scoreColor";

describe("scoreColor", () => {
  it("is red at 0 and green at 100", () => {
    expect(scoreColor(0)).toBe("rgb(220, 38, 38)");
    expect(scoreColor(100)).toBe("rgb(22, 163, 74)");
  });

  it("clamps out-of-range scores", () => {
    expect(scoreColor(-20)).toBe(scoreColor(0));
    expect(scoreColor(140)).toBe(scoreColor(100));
  });

  it("keeps mid scores warmer than high scores", () => {
    // Parse green channel — mid should be less "green dominate" than a high score
    const midG = Number(scoreColor(60).match(/rgb\((\d+), (\d+), (\d+)\)/)?.[2]);
    const highG = Number(scoreColor(90).match(/rgb\((\d+), (\d+), (\d+)\)/)?.[2]);
    const midR = Number(scoreColor(60).match(/rgb\((\d+), (\d+), (\d+)\)/)?.[1]);
    const highR = Number(scoreColor(90).match(/rgb\((\d+), (\d+), (\d+)\)/)?.[1]);
    expect(midR).toBeGreaterThan(highR);
    expect(highG).toBeGreaterThan(midG);
  });
});
