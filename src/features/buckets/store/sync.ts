import { supabase } from '@/shared/lib/supabase';
import { pendingSince } from '@/shared/store/cursor';
import type { Bucket, Goal } from '../lib/types';

/** Linhas como o Postgres as guarda (snake_case; `order` e `text` são palavras
 *  ocupadas em SQL, daí `sort_order` e `label`). */
type BucketRow = {
  id: string; user_id: string; title: string; sort_order: number;
  updated_at: number; deleted_at: number | null;
};

type GoalRow = {
  id: string; user_id: string; bucket_id: string; label: string; done: boolean;
  sort_order: number; updated_at: number; deleted_at: number | null;
};

const toBucketRow = (b: Bucket, userId: string): BucketRow => ({
  id: b.id, user_id: userId, title: b.title, sort_order: b.order,
  updated_at: b.updatedAt, deleted_at: b.deletedAt,
});

const fromBucketRow = (r: BucketRow): Bucket => ({
  id: r.id, title: r.title, order: r.sort_order,
  updatedAt: r.updated_at, deletedAt: r.deleted_at,
});

const toGoalRow = (g: Goal, userId: string): GoalRow => ({
  id: g.id, user_id: userId, bucket_id: g.bucketId, label: g.text, done: g.done,
  sort_order: g.order, updated_at: g.updatedAt, deleted_at: g.deletedAt,
});

const fromGoalRow = (r: GoalRow): Goal => ({
  id: r.id, bucketId: r.bucket_id, text: r.label, done: r.done, order: r.sort_order,
  updatedAt: r.updated_at, deletedAt: r.deleted_at,
});

export type BucketsSnapshot = { buckets: Bucket[]; goals: Goal[] };

/** Puxa tudo, sem filtrar por cursor — mesmo motivo do calendário: o filtro
 *  comparava relógios de aparelhos diferentes e escondia linhas em silêncio. */
export async function pullBuckets(): Promise<BucketsSnapshot> {
  const [buckets, goals] = await Promise.all([
    supabase.from('buckets').select('*'),
    supabase.from('bucket_items').select('*'),
  ]);

  if (buckets.error) throw buckets.error;
  if (goals.error) throw goals.error;

  return {
    buckets: (buckets.data as BucketRow[]).map(fromBucketRow),
    goals: (goals.data as GoalRow[]).map(fromGoalRow),
  };
}

/** Sobe só os registros tocados depois do último push. */
export async function pushBuckets(
  snapshot: BucketsSnapshot,
  userId: string,
  since: number,
): Promise<number> {
  const buckets = pendingSince(snapshot.buckets, since);
  const goals = pendingSince(snapshot.goals, since);
  if (!buckets.length && !goals.length) return 0;

  // Buckets antes dos objetivos: o objetivo referencia o bucket.
  if (buckets.length) {
    const { error } = await supabase
      .from('buckets')
      .upsert(buckets.map((b) => toBucketRow(b, userId)));
    if (error) throw error;
  }

  if (goals.length) {
    const { error } = await supabase
      .from('bucket_items')
      .upsert(goals.map((g) => toGoalRow(g, userId)));
    if (error) throw error;
  }

  return buckets.length + goals.length;
}
