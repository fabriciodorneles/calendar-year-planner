import { daysBetween, iso, type ISODate } from '../lib/dates';
import { compareISO } from '../lib/dates';
import type { Mark } from '../lib/types';

/** Dias marcados por atividade dentro do ano (barras são recortadas ao ano). */
export function daysPerActivity(marks: Mark[], year: number): Map<string, number> {
  const yearStart: ISODate = iso(year, 0, 1);
  const yearEnd: ISODate = iso(year, 11, 31);
  const totals = new Map<string, number>();

  for (const mark of marks) {
    if (compareISO(mark.end, yearStart) < 0 || compareISO(mark.start, yearEnd) > 0) continue;
    const start = compareISO(mark.start, yearStart) < 0 ? yearStart : mark.start;
    const end = compareISO(mark.end, yearEnd) > 0 ? yearEnd : mark.end;
    totals.set(mark.activityId, (totals.get(mark.activityId) ?? 0) + daysBetween(start, end) + 1);
  }

  return totals;
}
