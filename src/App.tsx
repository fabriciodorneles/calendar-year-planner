import { useEffect, useState } from 'react';
import { ActivityDock } from './components/ActivityDock';
import { ActivityEditor } from './components/ActivityEditor';
import { CalendarGrid } from './components/CalendarGrid';
import { DayModal } from './components/DayModal';
import { Toolbar } from './components/Toolbar';
import { liveActivities, useLiveActivities, usePlanner } from './store/plannerStore';

export default function App() {
  const [editing, setEditing] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const activities = useLiveActivities();
  const activeId = usePlanner((s) => s.activeActivityId);
  const setActive = usePlanner((s) => s.setActiveActivity);

  // Sem pincel ativo o clique não faz nada; começar com um escolhido evita
  // a primeira impressão de "cliquei e não aconteceu nada".
  useEffect(() => {
    if (!activeId && activities[0]) setActive(activities[0].id);
  }, [activeId, activities, setActive]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Esc precisa funcionar mesmo com o cursor num campo do modal, então vem
      // antes do guard que protege a digitação dos atalhos de atividade.
      if (event.key === 'Escape') {
        setEditing(false);
        setOpenDay(null);
        (event.target as HTMLElement | null)?.blur?.();
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const store = usePlanner.getState();

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key >= '1' && event.key <= '9') {
        const picked = liveActivities(store.activities)[Number(event.key) - 1];
        if (picked) setActive(picked.id);
        return;
      }

      switch (event.key) {
        case 'f':
        case 'F':
          void (document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen());
          break;
        case 'ArrowLeft':
          store.setYear(store.currentYear - 1);
          break;
        case 'ArrowRight':
          store.setYear(store.currentYear + 1);
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActive]);

  return (
    <>
      <ActivityDock onManage={() => setEditing(true)} />
      <Toolbar />
      <main className="app">
        <CalendarGrid onOpenDay={setOpenDay} />
      </main>
      <p className="mobile-note">Visualização apenas — a edição funciona no desktop.</p>
      {editing ? <ActivityEditor onClose={() => setEditing(false)} /> : null}
      {openDay ? <DayModal date={openDay} onClose={() => setOpenDay(null)} /> : null}
    </>
  );
}
