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
  /** Une as ocorrências geradas por uma repetição, para removê-las juntas. */
  seriesId: string | null;
  updatedAt: number;
  deletedAt: number | null;
};

export type Mode = 'brush' | 'inspect';

/** Precisa ser um UUID de verdade: as colunas `id` no Postgres são `uuid`, e o
 *  fallback antigo (base36 aleatório) seria rejeitado no sync. */
export const newId = (): string => {
  const source: Crypto | undefined = globalThis.crypto;
  if (source?.randomUUID) return source.randomUUID();

  const bytes = new Uint8Array(16);
  if (source?.getRandomValues) {
    source.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // versão 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variante
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
