import { useEffect } from 'react';
import { BucketsScreen } from './features/buckets/BucketsScreen';
import { CalendarScreen } from './features/calendar/CalendarScreen';
import { Toolbar } from './shared/components/Toolbar';
import { supabase } from './shared/lib/supabase';
import { navigate, takeReturnScreen, useRoute } from './shared/lib/router';

export default function App() {
  const route = useRoute();

  useEffect(() => {
    const wanted = takeReturnScreen();
    if (!wanted) return;
    // `getSession()` só resolve depois de o Supabase ter lido (e limpado) o
    // `#access_token=…` da URL. Escrever a rota no hash antes disso apagaria o
    // token e a sessão nunca seria criada.
    void supabase.auth.getSession().then(() => navigate(wanted));
  }, []);

  return (
    <>
      <Toolbar route={route} />
      {route === 'buckets' ? <BucketsScreen /> : <CalendarScreen />}
    </>
  );
}
