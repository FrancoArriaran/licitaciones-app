import { limaCalendar } from "../../shared";

export interface Period {
  year: number;
  month: number;
}

/**
 * Months re-read every day. A month's file keeps growing after the month ends: the
 * awards and contracts of a process arrive in the file of the month it was published,
 * often weeks later.
 */
export const RECENT_MONTHS = 3;

function previousMonth({ year, month }: Period): Period {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

const key = ({ year, month }: Period) => year * 12 + month;

/** The current month in Lima and the ones before it, oldest first. */
export function periodsToSync(now: Date, months = RECENT_MONTHS): Period[] {
  const { year, month } = limaCalendar(now);
  const periods: Period[] = [{ year, month }];
  while (periods.length < months) periods.unshift(previousMonth(periods[0] ?? { year, month }));
  return periods;
}

/** Every month from `from` to `to`, both included. */
export function monthRange(from: Period, to: Period): Period[] {
  const periods: Period[] = [];
  for (let current = to; key(current) >= key(from); current = previousMonth(current)) {
    periods.unshift(current);
  }
  return periods;
}

export function isSamePeriod(a: Period, b: Period): boolean {
  return key(a) === key(b);
}

/** "2026-03" → { year: 2026, month: 3 }; null if it isn't a valid month. */
export function parsePeriod(value: string): Period | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const period = { year: Number(match[1]), month: Number(match[2]) };
  return period.month >= 1 && period.month <= 12 ? period : null;
}
