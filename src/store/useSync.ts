import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { mergeById, pull, push, type SyncSnapshot } from './sync';
import { usePlanner } from './plannerStore';

export type SyncStatus = 'signed-out' | 'idle' | 'syncing' | 'error';

const CURSOR_KEY = 'cyp:sync-cursor';
const PUSH_DEBOUNCE_MS = 2500;

const readCursor = (): number => Number(localStorage.getItem(CURSOR_KEY) ?? 0);
const writeCursor = (value: number) => localStorage.setItem(CURSOR_KEY, String(value));

/**
 * Sincronização em segundo plano, offline-first: o localStorage continua sendo a
 * fonte local e o app funciona sem rede. Puxa ao entrar e ao voltar o foco,
 * empurra alguns segundos depois de cada alteração.
 */
export function useSync() {
  const [session, setSession] = useState<Session | null>(null);
  // 'signed-out' é derivado da sessão, não guardado: evita um setState dentro do
  // efeito só para refletir algo que já sabemos pelo próprio session.
  const [syncState, setSyncState] = useState<Exclude<SyncStatus, 'signed-out'>>('idle');
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const userId = session.user.id;

    const sync = async () => {
      if (running.current) return;
      running.current = true;
      setSyncState('syncing');
      try {
        const cursor = readCursor();
        const remote = await pull(cursor);

        const state = usePlanner.getState();

        /**
         * Aparelho novo entrando numa conta que já tem dados: cada instalação
         * cria seu próprio conjunto de atividades iniciais, com ids distintos,
         * então mesclar produziria duas "Aventura", duas "Corrida"… Se este
         * aparelho nunca marcou nada, ele adota o que vem do servidor em vez de
         * somar as próprias atividades de fábrica.
         */
        const neverUsedHere =
          cursor === 0 && state.marks.every((m) => m.deletedAt !== null);
        const remoteHasData = remote.activities.length > 0 || remote.marks.length > 0;

        if (neverUsedHere && remoteHasData) {
          usePlanner.setState({ activities: remote.activities, marks: remote.marks });
          writeCursor(Date.now());
          setError(null);
          setSyncState('idle');
          return;
        }

        const activities = mergeById(state.activities, remote.activities);
        const marks = mergeById(state.marks, remote.marks);
        if (activities.changed || marks.changed) {
          usePlanner.setState({ activities: activities.merged, marks: marks.merged });
        }

        const snapshot: SyncSnapshot = {
          activities: activities.merged,
          marks: marks.merged,
        };
        await push(snapshot, userId, cursor);

        // O cursor só avança depois do push: se ele falhar, a próxima tentativa
        // reenvia o mesmo intervalo em vez de deixar registros para trás.
        writeCursor(Date.now());
        setError(null);
        setSyncState('idle');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setSyncState('error');
      } finally {
        running.current = false;
      }
    };

    void sync();

    const schedule = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void sync(), PUSH_DEBOUNCE_MS);
    };

    const unsubscribe = usePlanner.subscribe(schedule);
    const onFocus = () => void sync();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [session]);

  return {
    session,
    status: (session ? syncState : 'signed-out') as SyncStatus,
    error,
    signIn: (email: string) =>
      supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      }),
    signOut: async () => {
      await supabase.auth.signOut();
      localStorage.removeItem(CURSOR_KEY);
    },
  };
}
