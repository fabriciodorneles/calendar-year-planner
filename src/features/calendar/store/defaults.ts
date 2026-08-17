import { newId, type Activity, type ActivityKind } from '../lib/types';

export const PALETTE = [
  '#C1654F', '#6B7F5C', '#4A6E7E', '#C79A45', '#7D5A6E', '#9C5B4A',
  '#5F7470', '#A8763E', '#6D6875', '#4F6D3A',
] as const;

/** Set inicial sugerido — renomeável, recolorível e deletável na UI. */
export function defaultActivities(): Activity[] {
  const seed: Array<[ActivityKind, string, string, string, number | null]> = [
    ['event', 'Aventura', '🏔️', '#C1654F', 12],
    ['event', 'Viagem', '✈️', '#7D5A6E', null],
    ['event', 'Aniversário', '🎂', '#9C5B4A', null],
    ['routine', 'Corrida', '🏃', '#6B7F5C', 100],
    ['routine', 'Academia', '🏋️', '#4A6E7E', 150],
    ['routine', 'Leitura', '📚', '#C79A45', null],
    ['routine', 'Estudos', '📝', '#5F7470', null],
  ];
  const now = Date.now();
  return seed.map(([kind, name, emoji, color, goal], order) => ({
    id: newId(), kind, name, emoji, color, goal, order, updatedAt: now, deletedAt: null,
  }));
}

/** Biblioteca do seletor de emoji, agrupada por afinidade — o menu rola. */
export const EMOJI_CHOICES = [
  // pessoas e família
  '👧', '🧒', '👶', '👦', '👨‍👧', '👩‍👧', '👨‍👧‍👦', '👪', '🧑‍🤝‍🧑', '❤️', '🥰', '🏠',
  '🐶', '🐱', '🎈', '🧸', '🎠', '🍼', '🎓', '🎒', '🤱', '👵', '👴', '🫂',
  // viagem e aventura
  '🏔️', '⛰️', '🌋', '🏕️', '⛺', '🥾', '🧗', '🗺️', '✈️', '🚗', '🚐', '🚲',
  '🏖️', '🏝️', '🌊', '⛵', '🎣', '🚤', '🏂', '⛷️', '🧭', '🎿', '🛶', '🏍️',
  // esporte e saúde
  '🏃', '🏋️', '🚴', '🏊', '🧘', '🤸', '⚽', '🏀', '🎾', '🏐', '🥊', '🤾',
  '💧', '💊', '🥗', '🍎', '😴', '💤', '🧠', '🦷', '🩺', '🌡️', '🫀', '🧴',
  // trabalho e estudo
  '📚', '📝', '✏️', '💻', '💼', '📊', '📈', '🗓️', '🔬', '🧪', '🎯', '⏱️',
  // lazer e cultura
  '🎉', '🎂', '🎁', '🎸', '🎹', '🎧', '🎬', '🎭', '🎨', '📷', '🍽️', '☕',
  '🍺', '🍷', '🎮', '♟️', '🎲', '🧩', '📺', '🎤', '🕺', '💃', '🎪', '🃏',
  // natureza e datas
  '🌱', '🌳', '🌻', '🐕', '🐈', '🌙', '☀️', '⭐', '🔥', '❄️', '🎄', '🇧🇷',
] as const;
