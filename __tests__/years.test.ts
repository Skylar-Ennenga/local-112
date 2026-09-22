import { describe, expect, it } from "vitest";
import { yearsSince } from "@/lib/years";

describe("yearsSince", () => {
  const at = (year: number) => new Date(`${year}-06-15T12:00:00Z`);

  it("computes the local's age from its founding year", () => {
    // SPEC.md §4.1: Local 112 was founded in 1904.
    expect(yearsSince(1904, at(2026))).toBe(122);
  });

  it("stays correct as the year rolls over", () => {
    expect(yearsSince(1904, at(2027))).toBe(123);
  });

  it("returns 0 for the founding year itself", () => {
    expect(yearsSince(1904, at(1904))).toBe(0);
  });

  it("never returns a negative count for a future year", () => {
    expect(yearsSince(2030, at(2026))).toBe(0);
  });
});
