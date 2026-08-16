import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyMark, clearRange, isLive, markAt } from '../lib/marks';
import { newId, type Activity, type Mark, type Mode } from '../lib/types';
import type { ISODate } from '../lib/dates';
import { defaultActivities } from './defaults';

export const SCHEMA_VERSION = 1;
const HISTORY_LIMIT = 50;

/** O que o undo/redo captura. A UI (ano, modo, pincel) fica de fora de propósito. */
type Snapshot = { activities: Activity[]; marks: Mark[] };

type PlannerState = {
  schemaVersion: number;
  activities: Activity[];
  marks: Mark[];
  currentYear: number;
  mode: Mode;
  activeActivityId: string | null;
  past: Snapshot[];
  future: Snapshot[];

  setYear: (year: number) => void;
  setMode: (mode: Mode) => void;
  setActiveActivity: (id: string | null) => void;

  paint: (start: ISODate, end: ISODate) => void;
  erase: (start: ISODate, end: ISODate) => void;
  setNote: (markId: string, note: string | null) => void;
  setMarkActivity: (markId: string, activityId: string) => void;

  upsertActivity: (input: Partial<Activity> & { id?: string }) => void;
  removeActivity: (id: string) => void;

  undo: () => void;
  redo: () => void;
  replaceAll: (snapshot: Snapshot) => void;
};

const snapshotOf = (s: PlannerState): Snapshot => ({ activities: s.activities, marks: s.marks });

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => {
      /** Toda mutação de dados passa por aqui, para o histórico nunca ficar desalinhado. */
      const commit = (next: Partial<Snapshot>) =>
        set((state) => ({
          ...next,
          past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
          future: [],
        }));

      return {
        schemaVersion: SCHEMA_VERSION,
        activities: defaultActivities(),
        marks: [],
        currentYear: new Date().getFullYear(),
        mode: 'brush',
        activeActivityId: null,
        past: [],
        future: [],

        setYear: (currentYear) => set({ currentYear }),
        setMode: (mode) => set({ mode }),
        setActiveActivity: (activeActivityId) => set({ activeActivityId }),

        paint: (start, end) => {
          const activityId = get().activeActivityId;
          if (!activityId) return;
          commit({ marks: applyMark(get().marks, { activityId, start, end }) });
        },

        erase: (start, end) => commit({ marks: clearRange(get().marks, start, end) }),

        setNote: (markId, note) =>
          commit({
            marks: get().marks.map((m) =>
              m.id === markId ? { ...m, note, updatedAt: Date.now() } : m,
            ),
          }),

        setMarkActivity: (markId, activityId) =>
          commit({
            marks: get().marks.map((m) =>
              m.id === markId ? { ...m, activityId, updatedAt: Date.now() } : m,
            ),
          }),

        upsertActivity: (input) => {
          const now = Date.now();
          const existing = input.id ? get().activities.find((a) => a.id === input.id) : undefined;

          if (existing) {
            commit({
              activities: get().activities.map((a) =>
                a.id === existing.id ? { ...a, ...input, updatedAt: now } : a,
              ),
            });
            return;
          }

          const live = get().activities.filter(isLive);
          const activity: Activity = {
            id: newId(),
            name: input.name ?? 'Nova atividade',
            emoji: input.emoji ?? '⭐',
            color: input.color ?? '#C1654F',
            goal: input.goal ?? null,
            order: live.length,
            updatedAt: now,
            deletedAt: null,
          };
          commit({ activities: [...get().activities, activity] });
        },

        /**
         * Soft delete da atividade e das marcações dela: some da tela, mas o undo
         * restaura e o sync futuro consegue propagar a remoção.
         */
        removeActivity: (id) => {
          const now = Date.now();
          commit({
            activities: get().activities.map((a) =>
              a.id === id ? { ...a, deletedAt: now, updatedAt: now } : a,
            ),
            marks: get().marks.map((m) =>
              m.activityId === id ? { ...m, deletedAt: now, updatedAt: now } : m,
            ),
          });
          if (get().activeActivityId === id) set({ activeActivityId: null });
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

        replaceAll: (snapshot) => commit(snapshot),
      };
    },
    {
      name: 'cyp:v1',
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        activities: s.activities,
        marks: s.marks,
        currentYear: s.currentYear,
      }),
    },
  ),
);

export const liveActivities = (activities: Activity[]): Activity[] =>
  activities.filter(isLive).sort((a, b) => a.order - b.order);

export const liveMarks = (marks: Mark[]): Mark[] => marks.filter(isLive);

/**
 * Derivar dentro do seletor devolveria um array novo a cada render e o zustand,
 * que compara por identidade, entraria em loop. Por isso a fatia crua (estável)
 * é que vem da store, e o filtro acontece memoizado no componente.
 */
export function useLiveActivities(): Activity[] {
  const activities = usePlanner((s) => s.activities);
  return useMemo(() => liveActivities(activities), [activities]);
}

export function useLiveMarks(): Mark[] {
  const marks = usePlanner((s) => s.marks);
  return useMemo(() => liveMarks(marks), [marks]);
}

export { markAt };
