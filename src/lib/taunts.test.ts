import { describe, expect, it } from "vitest";
import { pickTaunt, TAUNTS, type TauntStats } from "./taunts";

const zeroStats: TauntStats = {
  totalMatches: 0,
  appliedCount: 0,
  newThisWeek: 0,
};

describe("pickTaunt", () => {
  it("falls back to a generic taunt with no stats", () => {
    expect(TAUNTS).toContain(pickTaunt(null, () => 0));
  });

  it("falls back to a generic taunt when the stats have nothing to roast", () => {
    expect(TAUNTS).toContain(pickTaunt(zeroStats, () => 0));
  });

  it("roasts zero applications when there are matches", () => {
    const taunt = pickTaunt({ ...zeroStats, totalMatches: 7 }, () => 0);
    expect(taunt).toContain("7 matches");
    expect(taunt).toContain("ZERO");
  });

  it("uses singular grammar for one match", () => {
    const taunt = pickTaunt({ ...zeroStats, totalMatches: 1 }, () => 0);
    expect(taunt).toContain("1 match found");
  });

  it("acknowledges applications, then demands more", () => {
    const taunt = pickTaunt({ ...zeroStats, appliedCount: 2 }, () => 0);
    expect(taunt).toContain("2 applications in");
  });

  it("never returns an empty string, whatever the random draw", () => {
    const stats: TauntStats = { totalMatches: 5, appliedCount: 1, newThisWeek: 4 };
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickTaunt(stats, () => r).length).toBeGreaterThan(0);
      expect(pickTaunt(null, () => r).length).toBeGreaterThan(0);
    }
  });

  it("mixes one generic taunt into the personal pool", () => {
    // With random() pinned near 1, the pick lands on the last entry of the
    // source array, which is the generic taunt appended after the pool.
    const taunt = pickTaunt({ ...zeroStats, totalMatches: 3 }, () => 0.999);
    expect(TAUNTS).toContain(taunt);
  });
});
