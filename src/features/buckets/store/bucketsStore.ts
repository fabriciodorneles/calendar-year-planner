import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addGoal, defaultBuckets, goalsOf, moveGoal, patchGoal, removeGoal, renameBucket, sheetBuckets,
} from '../lib/buckets';
import type { Bucket, Goal, SheetLayout } from '../lib/types';
import { DEFAULT_FONT, type HandwritingFont } from '../lib/fonts';

export const BUCKETS_SCHEMA_VERSION = 1;
const HISTORY_LIMIT = 50;

/** O que o undo captura. Layout e fonte ficam de fora: são preferência de vista. */
type Snapshot = { buckets: Bucket[]; goals: Goal[] };

type BucketsState = Snapshot & {
  schemaVersion: number;
  layout: SheetLayout;
  font: HandwritingFont;
  past: Snapshot[];
  future: Snapshot[];

  setLayout: (layout: SheetLayout) => void;
  setFont: (font: HandwritingFont) => void;

  renameBucket: (id: string, title: string) => void;
  addGoal: (bucketId: string, text: string) => void;
  setGoalText: (id: string, text: string) => void;
  toggleGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  moveGoal: (id: string, toIndex: number) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  replaceAll: (snapshot: Snapshot) => void;
};

const snapshotOf = (s: BucketsState): Snapshot => ({ buckets: s.buckets, goals: s.goals });

export const useBuckets = create<BucketsState>()(
  persist(
    (set, get) => {
      /** Toda mutação de dados passa por aqui, para o histórico nunca desalinhar. */
      const commit = (next: Partial<Snapshot>) =>
        set((state) => ({
          ...next,
          past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
          future: [],
        }));

      return {
        schemaVersion: BUCKETS_SCHEMA_VERSION,
        buckets: defaultBuckets(),
        goals: [],
        layout: 'vertical',
        font: DEFAULT_FONT,
        past: [],
        future: [],

        setLayout: (layout) => set({ layout }),
        setFont: (font) => set({ font }),

        renameBucket: (id, title) => {
          const current = get().buckets.find((b) => b.id === id);
          if (!current || current.title === title.trim()) return;
          commit({ buckets: renameBucket(get().buckets, id, title) });
        },

        addGoal: (bucketId, text) => {
          const next = addGoal(get().goals, bucketId, text);
          if (next !== get().goals) commit({ goals: next });
        },

        /** Texto vazio remove: apagar a linha é a forma de apagar o objetivo. */
        setGoalText: (id, text) => {
          const trimmed = text.trim();
          const current = get().goals.find((g) => g.id === id);
          if (!current) return;
          if (!trimmed) {
            commit({ goals: removeGoal(get().goals, id) });
            return;
          }
          if (current.text === trimmed) return;
          commit({ goals: patchGoal(get().goals, id, { text: trimmed }) });
        },

        toggleGoal: (id) => {
          const current = get().goals.find((g) => g.id === id);
          if (!current) return;
          commit({ goals: patchGoal(get().goals, id, { done: !current.done }) });
        },

        removeGoal: (id) => commit({ goals: removeGoal(get().goals, id) }),

        moveGoal: (id, toIndex) => {
          const next = moveGoal(get().goals, id, toIndex);
          if (next !== get().goals) commit({ goals: next });
        },

        undo: () =>
          set((state) => {
            const previous = state.past.at(-1);
            if (!previous) return state;
            return {
              ...previous,
              past: state.past.slice(0, -1),
              future: [snapshotOf(state), ...state.future].slice(0, HISTORY_LIMIT),
            };
          }),

        redo: () =>
          set((state) => {
            const [next, ...rest] = state.future;
            if (!next) return state;
            return {
              ...next,
              past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
              future: rest,
            };
          }),

        canUndo: () => get().past.length > 0,

        replaceAll: (snapshot) => commit(snapshot),
      };
    },
    {
      name: 'cyp-buckets:v1',
      version: BUCKETS_SCHEMA_VERSION,
      // Layout e fonte ficam por aparelho de propósito: a folha na TV da sala
      // pode estar em paisagem sem virar a do notebook.
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        buckets: s.buckets,
        goals: s.goals,
        layout: s.layout,
        font: s.font,
      }),
    },
  ),
);

/** Derivar dentro do seletor devolveria array novo a cada render e o zustand,
 *  que compara por identidade, entraria em loop — daí o memo no componente. */
export function useSheetBuckets(): Bucket[] {
  const buckets = useBuckets((s) => s.buckets);
  return useMemo(() => sheetBuckets(buckets), [buckets]);
}

export function useGoalsOf(bucketId: string): Goal[] {
  const goals = useBuckets((s) => s.goals);
  return useMemo(() => goalsOf(goals, bucketId), [goals, bucketId]);
}
