import { addDays, iso, type ISODate } from './dates';

/** Domingo de Páscoa (Meeus/Jones/Butcher, calendário gregoriano). */
export function easterSunday(year: number): ISODate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month - 1, day);
}

const FIXED: Array<[month: number, day: number, name: string]> = [
  [0, 1, 'Confraternização Universal'],
  [3, 21, 'Tiradentes'],
  [4, 1, 'Dia do Trabalho'],
  [8, 7, 'Independência'],
  [9, 12, 'Nossa Senhora Aparecida'],
  [10, 2, 'Finados'],
  [10, 15, 'Proclamação da República'],
  [10, 20, 'Consciência Negra'],
  [11, 25, 'Natal'],
];

/** Feriados nacionais do ano, incluindo os móveis derivados da Páscoa. */
export function holidaysFor(year: number): Map<ISODate, string> {
  const easter = easterSunday(year);
  const out = new Map<ISODate, string>();

  for (const [month, day, name] of FIXED) out.set(iso(year, month, day), name);

  out.set(addDays(easter, -47), 'Carnaval');
  out.set(addDays(easter, -2), 'Sexta-feira Santa');
  out.set(easter, 'Páscoa');
  out.set(addDays(easter, 60), 'Corpus Christi');

  return out;
}
