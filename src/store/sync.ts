import { supabase } from '../lib/supabase';
import type { Activity, Mark } from '../lib/types';

/** Linhas como o Postgres as guarda (snake_case, datas em colunas próprias). */
type ActivityRow = {
  id: string; user_id: string; kind: string; name: string; emoji: string; color: string;
  goal: number | null; order: number; updated_at: number; deleted_at: number | null;
};

type MarkRow = {
  id: string; user_id: string; activity_id: string; start_date: string; end_date: string;
  title: string | null; details: string | null; series_id: string | null;
  updated_at: number; deleted_at: number | null;
};

const toActivityRow = (a: Activity, userId: string): ActivityRow => ({
  id: a.id, user_id: userId, kind: a.kind, name: a.name, emoji: a.emoji, color: a.color,
  goal: a.goal, order: a.order, updated_at: a.updatedAt, deleted_at: a.deletedAt,
});

const fromActivityRow = (r: ActivityRow): Activity => ({
  id: r.id, kind: r.kind === 'event' ? 'event' : 'routine', name: r.name, emoji: r.emoji,
  color: r.color, goal: r.goal, order: r.order, updatedAt: r.updated_at, deletedAt: r.deleted_at,
});

const toMarkRow = (m: Mark, userId: string): MarkRow => ({
  id: m.id, user_id: userId, activity_id: m.activityId, start_date: m.start, end_date: m.end,
  title: m.title, details: m.details, series_id: m.seriesId,
  updated_at: m.updatedAt, deleted_at: m.deletedAt,
});

const fromMarkRow = (r: MarkRow): Mark => ({
  id: r.id, activityId: r.activity_id, start: r.start_date, end: r.end_date,
  title: r.title, details: r.details, seriesId: r.series_id,
  updatedAt: r.updated_at, deletedAt: r.deleted_at,
});

/**
 * Last-write-wins por registro: o lado com `updatedAt` maior vence, e cada dia
 * é um registro separado, então edições em dias diferentes se somam em vez de
 * competir. Depende dos relógios dos dispositivos estarem razoavelmente certos.
 */
export function mergeById<T extends { id: string; updatedAt: number }>(
  local: T[],
  remote: T[],
): { merged: T[]; changed: boolean } {
  const byId = new Map(local.map((item) => [item.id, item]));
  let changed = false;

  for (const item of remote) {
    const mine = byId.get(item.id);
    if (!mine || item.updatedAt > mine.updatedAt) {
      byId.set(item.id, item);
      changed = true;
    }
  }

  return { merged: [...byId.values()], changed };
}

export type SyncSnapshot = { activities: Activity[]; marks: Mark[] };

/** Puxa só o que mudou desde a última visita — o cursor é o `updated_at`. */
export async function pull(since: number): Promise<SyncSnapshot> {
  const [activities, marks] = await Promise.all([
    supabase.from('activities').select('*').gt('updated_at', since),
    supabase.from('marks').select('*').gt('updated_at', since),
  ]);

  if (activities.error) throw activities.error;
  if (marks.error) throw marks.error;

  return {
    activities: (activities.data as ActivityRow[]).map(fromActivityRow),
    marks: (marks.data as MarkRow[]).map(fromMarkRow),
  };
}

/** Sobe só os registros tocados depois do último push. */
export async function push(snapshot: SyncSnapshot, userId: string, since: number): Promise<number> {
  const activities = snapshot.activities.filter((a) => a.updatedAt > since);
  const marks = snapshot.marks.filter((m) => m.updatedAt > since);
  if (!activities.length && !marks.length) return 0;

  if (activities.length) {
    const { error } = await supabase
      .from('activities')
      .upsert(activities.map((a) => toActivityRow(a, userId)));
    if (error) throw error;
  }

  // Atividades antes das marcações: a marcação referencia a atividade.
  if (marks.length) {
    const { error } = await supabase
      .from('marks')
      .upsert(marks.map((m) => toMarkRow(m, userId)));
    if (error) throw error;
  }

  return activities.length + marks.length;
}
