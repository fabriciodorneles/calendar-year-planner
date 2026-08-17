import { isLive, newId } from '@/shared/lib/records';
import { BUCKET_COUNT, MAX_GOALS, type Bucket, type Goal } from './types';

/** Ordem da folha de referência, traduzida. Todos editáveis. */
export const DEFAULT_TITLES = [
  'Aventura', 'Negócios',
  'Casamento', 'Financeiro',
  'Saúde', 'Filhos',
  'Pessoal', 'Caridade',
] as const;

export function defaultBuckets(now = Date.now()): Bucket[] {
  return DEFAULT_TITLES.map((title, order) => ({
    id: newId(), title, order, updatedAt: now, deletedAt: null,
  }));
}

/** Os 8 da folha, na ordem, mesmo que o dado venha bagunçado do sync. */
export function sheetBuckets(buckets: Bucket[]): Bucket[] {
  return buckets.filter(isLive).sort((a, b) => a.order - b.order).slice(0, BUCKET_COUNT);
}

export function goalsOf(goals: Goal[], bucketId: string): Goal[] {
  return goals
    .filter((g) => isLive(g) && g.bucketId === bucketId)
    .sort((a, b) => a.order - b.order);
}

/**
 * Acrescenta no fim da lista. Devolve o array intacto quando o bucket já tem 6
 * ou o texto é só espaço — a UI não precisa checar antes de chamar.
 */
export function addGoal(goals: Goal[], bucketId: string, text: string, now = Date.now()): Goal[] {
  const trimmed = text.trim();
  const current = goalsOf(goals, bucketId);
  if (!trimmed || current.length >= MAX_GOALS) return goals;

  return [...goals, {
    id: newId(),
    bucketId,
    text: trimmed,
    done: false,
    order: current.length,
    updatedAt: now,
    deletedAt: null,
  }];
}

export function patchGoal(
  goals: Goal[],
  id: string,
  patch: Partial<Pick<Goal, 'text' | 'done'>>,
  now = Date.now(),
): Goal[] {
  return goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: now } : g));
}

export function removeGoal(goals: Goal[], id: string, now = Date.now()): Goal[] {
  const target = goals.find((g) => g.id === id);
  if (!target || !isLive(target)) return goals;

  // Renumera os que ficaram: sem isso o próximo item entraria com um `order`
  // repetido e a lista passaria a depender da ordem de chegada do sync.
  const remaining = goalsOf(goals, target.bucketId).filter((g) => g.id !== id);
  const orderById = new Map(remaining.map((g, index) => [g.id, index]));

  return goals.map((g) => {
    if (g.id === id) return { ...g, deletedAt: now, updatedAt: now };
    const order = orderById.get(g.id);
    return order === undefined || order === g.order ? g : { ...g, order, updatedAt: now };
  });
}

/**
 * Move um objetivo para outra posição dentro do mesmo bucket. Só carimba
 * `updatedAt` em quem realmente mudou de posição, para o push não reenviar a
 * lista inteira a cada arrasto.
 */
export function moveGoal(goals: Goal[], id: string, toIndex: number, now = Date.now()): Goal[] {
  const target = goals.find((g) => g.id === id);
  if (!target || !isLive(target)) return goals;

  const ordered = goalsOf(goals, target.bucketId);
  const from = ordered.findIndex((g) => g.id === id);
  const to = Math.max(0, Math.min(ordered.length - 1, toIndex));
  if (from === -1 || from === to) return goals;

  const reordered = [...ordered];
  reordered.splice(to, 0, ...reordered.splice(from, 1));
  const orderById = new Map(reordered.map((g, index) => [g.id, index]));

  return goals.map((g) => {
    const order = orderById.get(g.id);
    return order === undefined || order === g.order ? g : { ...g, order, updatedAt: now };
  });
}

export function renameBucket(buckets: Bucket[], id: string, title: string, now = Date.now()): Bucket[] {
  return buckets.map((b) => (b.id === id ? { ...b, title: title.trim(), updatedAt: now } : b));
}

/**
 * Este aparelho nunca escreveu nada aqui? Cada instalação cria seus próprios 8
 * buckets, com ids distintos — mesclar com os de outro aparelho produziria 16.
 * Quando a folha ainda está de fábrica, adotamos a do servidor (mesma regra que
 * o calendário já usava para as atividades iniciais).
 */
export function isPristine(buckets: Bucket[], goals: Goal[]): boolean {
  if (goals.some(isLive)) return false;
  const live = sheetBuckets(buckets);
  return live.every((b, index) => b.title === DEFAULT_TITLES[index]);
}
