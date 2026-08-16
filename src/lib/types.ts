import type { ISODate } from './dates';

/** Duas categorias com comportamentos distintos no grid (DESIGN.md §5.3):
 *  - event: ocupa a célula inteira, vira barra quando dura vários dias, um por dia
 *  - routine: iconezinho na linha de baixo, vários por dia, sempre dia a dia */
export type ActivityKind = 'event' | 'routine';

/** Todo registro carrega id/updatedAt/deletedAt para o sync da fase 3 (ver DESIGN.md §5). */
export type Activity = {
  id: string;
  kind: ActivityKind;
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
  /** Rótulo mostrado na célula. Vazio = cai no nome da atividade. */
  title: string | null;
  /** Texto longo, só no modal do dia. */
  details: string | null;
  updatedAt: number;
  deletedAt: number | null;
};

export type Mode = 'brush' | 'inspect';

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
