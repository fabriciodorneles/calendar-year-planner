import { addDays, compareISO, daysBetween, eachDay, type ISODate } from './dates';
import { newId, type Mark } from './types';

export const isLive = <T extends { deletedAt: number | null }>(record: T): boolean =>
  record.deletedAt === null;

export function covers(mark: Mark, date: ISODate): boolean {
  return compareISO(mark.start, date) <= 0 && compareISO(date, mark.end) <= 0;
}

function intersects(mark: Mark, start: ISODate, end: ISODate): boolean {
  return compareISO(mark.start, end) <= 0 && compareISO(start, mark.end) <= 0;
}

export const sortRange = (a: ISODate, b: ISODate): [ISODate, ISODate] =>
  compareISO(a, b) <= 0 ? [a, b] : [b, a];

/** Predicado que restringe quais marcações uma operação enxerga. */
export type Scope = (mark: Mark) => boolean;

/**
 * Libera o intervalo [start, end] entre as marcações dentro do `scope`,
 * preservando "um evento por dia" (DESIGN.md §5.1). As de fora do escopo — as
 * rotinas, quando o escopo são eventos — não são tocadas.
 */
export function clearRange(
  marks: Mark[],
  start: ISODate,
  end: ISODate,
  scope: Scope = () => true,
  now = Date.now(),
): Mark[] {
  const out: Mark[] = [];

  for (const mark of marks) {
    if (!isLive(mark) || !scope(mark) || !intersects(mark, start, end)) {
      out.push(mark);
      continue;
    }

    const startsInside = compareISO(start, mark.start) <= 0;
    const endsInside = compareISO(mark.end, end) <= 0;

    if (startsInside && endsInside) {
      out.push({ ...mark, deletedAt: now, updatedAt: now });
    } else if (!startsInside && !endsInside) {
      out.push({ ...mark, end: addDays(start, -1), updatedAt: now });
      out.push({ ...mark, id: newId(), start: addDays(end, 1), updatedAt: now });
    } else if (startsInside) {
      out.push({ ...mark, start: addDays(end, 1), updatedAt: now });
    } else {
      out.push({ ...mark, end: addDays(start, -1), updatedAt: now });
    }
  }

  return out;
}

/** Grava um evento, recortando os eventos que estiverem no caminho. */
export function applyEvent(
  marks: Mark[],
  input: { activityId: string; start: ISODate; end: ISODate; title?: string | null },
  isEvent: Scope,
  now = Date.now(),
): Mark[] {
  const [start, end] = sortRange(input.start, input.end);

  const mark: Mark = {
    id: newId(),
    activityId: input.activityId,
    start,
    end,
    title: input.title ?? null,
    details: null,
    updatedAt: now,
    deletedAt: null,
  };

  return [...clearRange(marks, start, end, isEvent, now), mark];
}

/**
 * Rotinas são registradas dia a dia (decisão do usuário): cinco dias de academia
 * são cinco ocorrências, não um bloco contínuo. Dias que já têm a rotina ficam
 * como estão, então repintar por cima não duplica.
 */
export function applyRoutine(
  marks: Mark[],
  activityId: string,
  start: ISODate,
  end: ISODate,
  now = Date.now(),
): Mark[] {
  const [from, to] = sortRange(start, end);
  const existing = new Set(
    marks.filter((m) => isLive(m) && m.activityId === activityId).map((m) => m.start),
  );

  const added = eachDay(from, to)
    .filter((date) => !existing.has(date))
    .map<Mark>((date) => ({
      id: newId(),
      activityId,
      start: date,
      end: date,
      title: null,
      details: null,
      updatedAt: now,
      deletedAt: null,
    }));

  return [...marks, ...added];
}

/** Remove uma rotina específica do intervalo, sem tocar em nada mais. */
export function clearRoutine(
  marks: Mark[],
  activityId: string,
  start: ISODate,
  end: ISODate,
  now = Date.now(),
): Mark[] {
  const [from, to] = sortRange(start, end);
  return clearRange(marks, from, to, (m) => m.activityId === activityId, now);
}

export function eventAt(marks: Mark[], date: ISODate, isEvent: Scope): Mark | undefined {
  return marks.find((m) => isLive(m) && isEvent(m) && covers(m, date));
}

export function routinesAt(marks: Mark[], date: ISODate, isEvent: Scope): Mark[] {
  return marks.filter((m) => isLive(m) && !isEvent(m) && covers(m, date));
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
