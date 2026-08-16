import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyEvent, applyRoutine, clearRange, clearRoutine, eventAt, isLive, routinesAt,
} from '../lib/marks';
import { newId, type Activity, type Mark, type Mode } from '../lib/types';
import type { ISODate } from '../lib/dates';
import { defaultActivities } from './defaults';

export const SCHEMA_VERSION = 2;
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
  toggleDay: (date: ISODate) => void;
  setMarkText: (markId: string, patch: { title?: string | null; details?: string | null }) => void;
  removeMark: (markId: string) => void;
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
          const state = get();
          const activity = state.activities.find((a) => a.id === state.activeActivityId);
          if (!activity) return;

          commit({
            marks:
              activity.kind === 'event'
                ? applyEvent(state.marks, { activityId: activity.id, start, end }, isEventOf(state))
                : applyRoutine(state.marks, activity.id, start, end),
          });
        },

        erase: (start, end) => commit({ marks: clearRange(get().marks, start, end) }),

        /** Clique repetido com o mesmo pincel: apaga em vez de repintar. */
        toggleDay: (date) => {
          const state = get();
          const activity = state.activities.find((a) => a.id === state.activeActivityId);
          if (!activity) return;

          if (activity.kind === 'event') {
            const current = eventAt(state.marks, date, isEventOf(state));
            if (current?.activityId === activity.id) {
              commit({ marks: clearRange(state.marks, date, date, (m) => m.id === current.id) });
              return;
            }
            commit({
              marks: applyEvent(state.marks, { activityId: activity.id, start: date, end: date }, isEventOf(state)),
            });
            return;
          }

          const already = routinesAt(state.marks, date, isEventOf(state))
            .some((m) => m.activityId === activity.id);
          commit({
            marks: already
              ? clearRoutine(state.marks, activity.id, date, date)
              : applyRoutine(state.marks, activity.id, date, date),
          });
        },

        setMarkText: (markId, patch) =>
          commit({
            marks: get().marks.map((m) =>
              m.id === markId ? { ...m, ...patch, updatedAt: Date.now() } : m,
            ),
          }),

        removeMark: (markId) => {
          const now = Date.now();
          commit({
            marks: get().marks.map((m) =>
              m.id === markId ? { ...m, deletedAt: now, updatedAt: now } : m,
            ),
          });
        },

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
            kind: input.kind ?? 'routine',
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
      version: SCHEMA_VERSION,
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        activities: s.activities,
        marks: s.marks,
        currentYear: s.currentYear,
      }),
      /**
       * v1 → v2: `kind` e `title`/`details` não existiam. Toda marcação do v1
       * pintava a célula inteira, que é o comportamento de evento — então as
       * atividades antigas viram eventos, preservando a aparência que o usuário
       * já tinha. Sem isso elas caem no ramo "não é evento" e viram rotinas.
       */
      migrate: (persisted, version) => {
        type LegacyMark = Omit<Mark, 'title' | 'details'> &
          Partial<Pick<Mark, 'title' | 'details'>> & { note?: string | null };
        const state = persisted as Omit<Partial<PlannerState>, 'activities' | 'marks'> & {
          activities?: Array<Omit<Activity, 'kind'> & Partial<Pick<Activity, 'kind'>>>;
          marks?: LegacyMark[];
        };
        if (version >= SCHEMA_VERSION) return state as PlannerState;

        return {
          ...state,
          schemaVersion: SCHEMA_VERSION,
          activities: (state.activities ?? []).map((a) => ({ ...a, kind: a.kind ?? 'event' })),
          marks: (state.marks ?? []).map(({ note, ...m }) => ({
            ...m,
            title: m.title ?? null,
            details: m.details ?? note ?? null,
          })),
        } as PlannerState;
      },
    },
  ),
);

/** Escopo "isto é um evento?" derivado do cadastro das atividades. */
export function isEventOf(state: { activities: Activity[] }) {
  const events = new Set(
    state.activities.filter((a) => a.kind === 'event').map((a) => a.id),
  );
  return (mark: Mark) => events.has(mark.activityId);
}

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

