import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { rememberReturnScreen, readRoute } from '../lib/router';
import { mergeById } from './merge';
import { usePlanner } from '@/features/calendar/store/plannerStore';
import { pullCalendar, pushCalendar } from '@/features/calendar/store/sync';
import { useBuckets } from '@/features/buckets/store/bucketsStore';
import { pullBuckets, pushBuckets } from '@/features/buckets/store/sync';
import { isPristine } from '@/features/buckets/lib/buckets';

export type SyncStatus = 'signed-out' | 'idle' | 'syncing' | 'error';

const CURSOR_KEY = 'cyp:sync-cursor';
const PUSH_DEBOUNCE_MS = 2500;

const readCursor = (): number => Number(localStorage.getItem(CURSOR_KEY) ?? 0);
const writeCursor = (value: number) => localStorage.setItem(CURSOR_KEY, String(value));

/**
 * Sincronização em segundo plano, offline-first: o localStorage continua sendo a
 * fonte local e o app funciona sem rede. Puxa ao entrar e ao voltar o foco,
 * empurra alguns segundos depois de cada alteração.
 *
 * As duas telas compartilham um cursor só e a mesma passada: elas nascem do
 * mesmo login e, se cada uma tivesse o seu, uma falha de rede deixaria metade
 * dos dados para trás sem sinal na UI.
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
        const [remoteCalendar, remoteBuckets] = await Promise.all([
          pullCalendar(cursor),
          pullBuckets(cursor),
        ]);

        const planner = usePlanner.getState();
        const buckets = useBuckets.getState();

        /**
         * Aparelho novo entrando numa conta que já tem dados: cada instalação
         * cria seu próprio conjunto inicial (atividades, e os 8 buckets) com ids
         * distintos, então mesclar produziria duas "Aventura" e dezesseis
         * buckets. Se este aparelho nunca escreveu nada, ele adota o servidor.
         */
        const firstVisit = cursor === 0;
        const calendarAdopted =
          firstVisit
          && planner.marks.every((m) => m.deletedAt !== null)
          && remoteCalendar.activities.length > 0;
        const bucketsAdopted =
          firstVisit
          && isPristine(buckets.buckets, buckets.goals)
          && remoteBuckets.buckets.length > 0;

        if (calendarAdopted) {
          usePlanner.setState({
            activities: remoteCalendar.activities,
            marks: remoteCalendar.marks,
          });
        }
        if (bucketsAdopted) {
          useBuckets.setState({ buckets: remoteBuckets.buckets, goals: remoteBuckets.goals });
        }

        const fresh = usePlanner.getState();
        const freshBuckets = useBuckets.getState();

        const activities = mergeById(fresh.activities, remoteCalendar.activities);
        const marks = mergeById(fresh.marks, remoteCalendar.marks);
        if (activities.changed || marks.changed) {
          usePlanner.setState({ activities: activities.merged, marks: marks.merged });
        }

        const bucketRows = mergeById(freshBuckets.buckets, remoteBuckets.buckets);
        const goalRows = mergeById(freshBuckets.goals, remoteBuckets.goals);
        if (bucketRows.changed || goalRows.changed) {
          useBuckets.setState({ buckets: bucketRows.merged, goals: goalRows.merged });
        }

        // Quem adotou o remoto não devolve nada: seria reenviar linha por linha
        // exatamente o que acabou de chegar.
        if (!calendarAdopted) {
          await pushCalendar({ activities: activities.merged, marks: marks.merged }, userId, cursor);
        }
        if (!bucketsAdopted) {
          await pushBuckets({ buckets: bucketRows.merged, goals: goalRows.merged }, userId, cursor);
        }

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

    const unsubscribePlanner = usePlanner.subscribe(schedule);
    const unsubscribeBuckets = useBuckets.subscribe(schedule);
    const onFocus = () => void sync();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubscribePlanner();
      unsubscribeBuckets();
      window.removeEventListener('focus', onFocus);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [session]);

  /** Sem hash nem query: `location.href` carregaria o `#` de um login anterior
   *  e o retorno viria com `##access_token=...`. A tela de volta vai na aba. */
  const redirect = () => {
    rememberReturnScreen(readRoute());
    return `${window.location.origin}${window.location.pathname}`;
  };

  return {
    session,
    status: (session ? syncState : 'signed-out') as SyncStatus,
    error,
    signIn: (email: string) =>
      supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } }),
    /** OAuth: um clique, sem e-mail. Mesmo destino de retorno do magic link. */
    signInWith: (provider: 'google' | 'github') =>
      supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirect() } }),
    signOut: async () => {
      await supabase.auth.signOut();
      localStorage.removeItem(CURSOR_KEY);
    },
  };
}
