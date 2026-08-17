import { createClient } from '@supabase/supabase-js';

/**
 * A publishable key é pública por design: ela identifica o projeto, e quem
 * protege os dados são as policies de RLS ("cada um só enxerga as próprias
 * linhas"). Por isso pode viver no repositório. A secret key, jamais.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://pyntrbyjpxxezupqdaev.supabase.co';

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_LBuvOeBdb1785NwAkR4kpA_i-xtT0fo';

/**
 * O magic link volta com `#access_token=...`. Se a URL de retorno já terminava
 * em `#` — sobra de um login anterior —, o Supabase anexa o dele e o endereço
 * fica `##access_token=...`, que o parser não reconhece: o token chega mas a
 * sessão nunca é criada. Normaliza antes de instanciar o cliente, para consertar
 * inclusive os links já enviados.
 */
if (typeof window !== 'undefined' && window.location.hash.startsWith('##')) {
  const { pathname, search, hash } = window.location;
  window.history.replaceState(null, '', `${pathname}${search}${hash.slice(1)}`);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
