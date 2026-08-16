import type { ISODate } from './dates';

/** Todo registro carrega id/updatedAt/deletedAt para o sync da fase 3 (ver DESIGN.md §5). */
export type Activity = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  goal: number | null;
  order: number;
  updatedAt: number;
  deletedAt: number | null;
};

/** Marcação contínua: um dia (start === end) ou uma barra. `end` é inclusivo. */
export type Mark = {
  id: string;
  activityId: string;
  start: ISODate;
  end: ISODate;
  note: string | null;
  updatedAt: number;
  deletedAt: number | null;
};

export type Mode = 'brush' | 'inspect';

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
