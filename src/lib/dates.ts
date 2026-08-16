/** Datas do planner: sempre 'YYYY-MM-DD' em UTC, para não sofrer com fuso. */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** `month` é 0-indexado (0 = janeiro), como em `Date`. */
export function iso(year: number, month: number, day: number): ISODate {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function parseISO(value: ISODate): { year: number; month: number; day: number } {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return { year: y, month: m - 1, day: d };
}

function toUTC(value: ISODate): number {
  const { year, month, day } = parseISO(value);
  return Date.UTC(year, month, day);
}

function fromUTC(ms: number): ISODate {
  const d = new Date(ms);
  return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** 0 = domingo … 6 = sábado. */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const w = weekdayOf(year, month, day);
  return w === 0 || w === 6;
}

export function addDays(value: ISODate, amount: number): ISODate {
  return fromUTC(toUTC(value) + amount * 86_400_000);
}

/** <0 se a vem antes de b. Como o formato é ordenável, comparar strings basta. */
export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

/** Intervalo inclusivo nas duas pontas. */
export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let cursor = start; compareISO(cursor, end) <= 0; cursor = addDays(cursor, 1)) {
    out.push(cursor);
  }
  return out;
}

export function todayISO(): ISODate {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

export const MONTH_LABELS = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
] as const;
