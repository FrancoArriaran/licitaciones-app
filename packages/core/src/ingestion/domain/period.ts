import { limaCalendar } from "../../shared";

export interface Period {
  year: number;
  month: number;
}

/** Days into a month during which the previous month's file is still re-read. */
export const PREVIOUS_MONTH_GRACE_DAYS = 5;

/**
 * Months to download in a sync: the current one in Lima and, during the first
 * days of a month, also the previous one. SEACE keeps updating a month's file
 * after it ends, and on the 1st the new file may not exist yet.
 */
export function periodsToSync(now: Date): Period[] {
  const { year, month, day } = limaCalendar(now);
  const current = { year, month };
  if (day > PREVIOUS_MONTH_GRACE_DAYS) return [current];
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return [previous, current];
}
