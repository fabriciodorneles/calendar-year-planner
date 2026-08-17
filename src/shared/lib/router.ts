import { useEffect, useState } from 'react';

export type Route = 'calendar' | 'buckets';

const RETURN_KEY = 'cyp:return-screen';

/**
 * Rota no hash porque o GitHub Pages serve arquivo estático: `/buckets` daria
 * 404 no servidor, `#/buckets` não. Qualquer hash desconhecido — inclusive o
 * `#access_token=…` que o Supabase devolve no login — cai no calendário.
 */
export function readRoute(hash: string = window.location.hash): Route {
  return hash.replace(/^#\/?/, '').split(/[?&]/)[0] === 'buckets' ? 'buckets' : 'calendar';
}

export function navigate(route: Route): void {
  const next = route === 'buckets' ? '#/buckets' : '#/';
  if (window.location.hash !== next) window.location.hash = next;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => readRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}

/**
 * Para onde voltar depois do login. Não dá para mandar a rota no `redirectTo`:
 * um hash ali faz o retorno virar `##access_token=…`, que o parser do Supabase
 * ignora (DESIGN.md §9.4). Então a tela fica guardada na aba e é lida na volta.
 */
export const rememberReturnScreen = (route: Route): void =>
  sessionStorage.setItem(RETURN_KEY, route);

export function takeReturnScreen(): Route | null {
  const stored = sessionStorage.getItem(RETURN_KEY);
  if (!stored) return null;
  sessionStorage.removeItem(RETURN_KEY);
  return stored === 'buckets' ? 'buckets' : 'calendar';
}
