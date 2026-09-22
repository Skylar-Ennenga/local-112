/**
 * Whole years elapsed since a starting year.
 *
 * Used for both the local's "years strong" (from `locals.founded_year`) and a
 * member's years in the union (from `members.joined_year`). Per SPEC.md §4.1
 * and §4.2 this value is always computed and never stored — the site it
 * replaces hardcoded "118 years" and has been wrong since 2022.
 *
 * Only the year is known, not the anniversary date, so this is a year
 * subtraction rather than a true elapsed-time calculation.
 */
export function yearsSince(startYear: number, now: Date = new Date()): number {
  return Math.max(0, now.getFullYear() - startYear);
}
