import { addDays, compareISO, daysBetween, type ISODate } from './dates';
import { newId, type Mark } from './types';

export const isLive = <T extends { deletedAt: number | null }>(record: T): boolean =>
  record.deletedAt === null;

export function covers(mark: Mark, date: ISODate): boolean {
  return compareISO(mark.start, date) <= 0 && compareISO(date, mark.end) <= 0;
}

export function markAt(marks: Mark[], date: ISODate): Mark | undefined {
  return marks.find((m) => isLive(m) && covers(m, date));
}

function intersects(mark: Mark, start: ISODate, end: ISODate): boolean {
  return compareISO(mark.start, end) <= 0 && compareISO(start, mark.end) <= 0;
}

/**
 * Libera o intervalo [start, end], preservando o invariante "um dia = no máximo
 * uma Mark" (DESIGN.md §5.1). Marcações existentes são apagadas, truncadas ou
 * divididas conforme se sobrepõem ao intervalo.
 */
export function clearRange(marks: Mark[], start: ISODate, end: ISODate, now = Date.now()): Mark[] {
  const out: Mark[] = [];

  for (const mark of marks) {
    if (!isLive(mark) || !intersects(mark, start, end)) {
      out.push(mark);
      continue;
    }

    const startsInside = compareISO(start, mark.start) <= 0;
    const endsInside = compareISO(mark.end, end) <= 0;

    if (startsInside && endsInside) {
      // Contida: some por inteiro.
      out.push({ ...mark, deletedAt: now, updatedAt: now });
    } else if (!startsInside && !endsInside) {
      // Miolo: vira duas, herdando atividade e nota.
      out.push({ ...mark, end: addDays(start, -1), updatedAt: now });
      out.push({ ...mark, id: newId(), start: addDays(end, 1), updatedAt: now });
    } else if (startsInside) {
      // Cobre o começo: empurra o início para depois do intervalo.
      out.push({ ...mark, start: addDays(end, 1), updatedAt: now });
    } else {
      // Cobre o fim: puxa o fim para antes do intervalo.
      out.push({ ...mark, end: addDays(start, -1), updatedAt: now });
    }
  }

  return out;
}

/** Grava uma marcação, recortando o que estiver no caminho. */
export function applyMark(
  marks: Mark[],
  input: { activityId: string; start: ISODate; end: ISODate; note?: string | null },
  now = Date.now(),
): Mark[] {
  const [start, end] =
    compareISO(input.start, input.end) <= 0 ? [input.start, input.end] : [input.end, input.start];

  const mark: Mark = {
    id: newId(),
    activityId: input.activityId,
    start,
    end,
    note: input.note ?? null,
    updatedAt: now,
    deletedAt: null,
  };

  return [...clearRange(marks, start, end, now), mark];
}

/** Fatia uma marcação nos segmentos que cabem dentro de um mês. */
export function segmentFor(
  mark: Mark,
  monthStart: ISODate,
  monthEnd: ISODate,
): { start: ISODate; end: ISODate; openStart: boolean; openEnd: boolean } | null {
  if (!intersects(mark, monthStart, monthEnd)) return null;
  const start = compareISO(mark.start, monthStart) < 0 ? monthStart : mark.start;
  const end = compareISO(mark.end, monthEnd) > 0 ? monthEnd : mark.end;
  return {
    start,
    end,
    openStart: compareISO(mark.start, monthStart) < 0,
    openEnd: compareISO(mark.end, monthEnd) > 0,
  };
}

export const lengthInDays = (mark: Mark): number => daysBetween(mark.start, mark.end) + 1;
