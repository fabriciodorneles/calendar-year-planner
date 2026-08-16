import { newId, type Activity } from '../lib/types';

export const PALETTE = [
  '#C1654F', '#6B7F5C', '#4A6E7E', '#C79A45', '#7D5A6E', '#9C5B4A',
  '#5F7470', '#A8763E', '#6D6875', '#4F6D3A',
] as const;

/** Set inicial sugerido — renomeável, recolorível e deletável na UI. */
export function defaultActivities(): Activity[] {
  const seed: Array<[name: string, emoji: string, color: string, goal: number | null]> = [
    ['Aventura', '🏔️', '#C1654F', 12],
    ['Corrida', '🏃', '#6B7F5C', 100],
    ['Academia', '🏋️', '#4A6E7E', 150],
    ['Leitura', '📚', '#C79A45', null],
    ['Viagem', '✈️', '#7D5A6E', null],
  ];
  const now = Date.now();
  return seed.map(([name, emoji, color, goal], order) => ({
    id: newId(), name, emoji, color, goal, order, updatedAt: now, deletedAt: null,
  }));
}
