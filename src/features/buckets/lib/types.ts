import type { Syncable } from '@/shared/lib/records';

/** Uma área da vida. São sempre 8, nem mais nem menos (DESIGN-BUCKETS.md D2). */
export type Bucket = Syncable & {
  title: string;
  /** 0..7 — posição na folha, lida em zigue-zague: 0 e 1 na primeira faixa. */
  order: number;
};

/** Um objetivo dentro de um bucket. Até 6 por bucket. */
export type Goal = Syncable & {
  bucketId: string;
  text: string;
  done: boolean;
  /** Posição dentro do bucket; sempre normalizada em 0..n-1 depois de mexer. */
  order: number;
};

/** Retrato (2×4, fiel à folha original) ou paisagem (4×2, para tela wide). */
export type SheetLayout = 'vertical' | 'horizontal';

export const MAX_GOALS = 6;
export const BUCKET_COUNT = 8;
