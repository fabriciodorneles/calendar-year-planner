import { useRef } from 'react';
import { downloadBackup, parseBackup } from '../lib/io';
import { navigate, type Route } from '../lib/router';
import { SCHEMA_VERSION, usePlanner } from '@/features/calendar/store/plannerStore';
import { BUCKETS_SCHEMA_VERSION, useBuckets } from '@/features/buckets/store/bucketsStore';
import { FONTS, type HandwritingFont } from '@/features/buckets/lib/fonts';
import type { SheetLayout } from '@/features/buckets/lib/types';
import { SyncPanel } from './SyncPanel';

/**
 * Uma barra só para as duas telas. O que é de uma aparece só nela: seletor de
 * ano no calendário, layout e fonte na folha. Undo/redo agem na tela atual,
 * porque cada uma tem seu próprio histórico.
 */
export function Toolbar({ route }: { route: Route }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const onCalendar = route === 'calendar';

  const year = usePlanner((s) => s.currentYear);
  const setYear = usePlanner((s) => s.setYear);

  const layout = useBuckets((s) => s.layout);
  const setLayout = useBuckets((s) => s.setLayout);
  const font = useBuckets((s) => s.font);
  const setFont = useBuckets((s) => s.setFont);

  // Os quatro seletores são sempre lidos (hook não pode ficar atrás de `if`);
  // a tela atual só escolhe qual par vale.
  const plannerUndo = usePlanner((s) => s.past.length > 0);
  const plannerRedo = usePlanner((s) => s.future.length > 0);
  const sheetUndo = useBuckets((s) => s.past.length > 0);
  const sheetRedo = useBuckets((s) => s.future.length > 0);
  const canUndo = onCalendar ? plannerUndo : sheetUndo;
  const canRedo = onCalendar ? plannerRedo : sheetRedo;

  const undo = () => (onCalendar ? usePlanner.getState().undo() : useBuckets.getState().undo());
  const redo = () => (onCalendar ? usePlanner.getState().redo() : useBuckets.getState().redo());

  const exportNow = () => {
    const { activities, marks } = usePlanner.getState();
    const { buckets, goals } = useBuckets.getState();
    downloadBackup({
      schemaVersion: SCHEMA_VERSION,
      bucketsSchemaVersion: BUCKETS_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      activities,
      marks,
      buckets,
      goals,
    });
  };

  const importFile = async (file: File) => {
    try {
      const snapshot = parseBackup(await file.text());
      const days = snapshot.marks.filter((m) => m.deletedAt === null).length;
      // Arquivo antigo não tem buckets — nesse caso a folha atual fica de pé.
      const sheet = snapshot.buckets && snapshot.goals
        ? ` e ${snapshot.buckets.length} buckets`
        : '';
      if (!confirm(`Substituir os dados atuais por ${days} marcações${sheet} do arquivo?`)) return;

      usePlanner.getState().replaceAll({ activities: snapshot.activities, marks: snapshot.marks });
      if (snapshot.buckets && snapshot.goals) {
        useBuckets.getState().replaceAll({ buckets: snapshot.buckets, goals: snapshot.goals });
      }
    } catch (error) {
      alert(`Não deu para importar: ${(error as Error).message}`);
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar__nav" role="group" aria-label="Telas">
        <button type="button" aria-pressed={onCalendar} onClick={() => navigate('calendar')}>
          Calendário
        </button>
        <button type="button" aria-pressed={!onCalendar} onClick={() => navigate('buckets')}>
          Buckets
        </button>
      </div>

      {onCalendar ? (
        <>
          <button type="button" onClick={() => setYear(year - 1)} title="Ano anterior (←)">‹</button>
          <span className="toolbar__year">{year}</span>
          <button type="button" onClick={() => setYear(year + 1)} title="Próximo ano (→)">›</button>
        </>
      ) : (
        <>
          <button
            type="button"
            title={layout === 'vertical' ? 'Virar para paisagem (4×2)' : 'Virar para retrato (2×4)'}
            onClick={() => setLayout((layout === 'vertical' ? 'horizontal' : 'vertical') as SheetLayout)}
          >
            {layout === 'vertical' ? '2×4' : '4×2'}
          </button>
          <select
            className="toolbar__font"
            value={font}
            aria-label="Fonte manuscrita"
            title="Fonte manuscrita"
            onChange={(event) => setFont(event.target.value as HandwritingFont)}
          >
            {FONTS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </>
      )}

      <button type="button" onClick={undo} disabled={!canUndo} title="Desfazer (Cmd/Ctrl+Z)">↶</button>
      <button type="button" onClick={redo} disabled={!canRedo} title="Refazer (Cmd/Ctrl+Shift+Z)">↷</button>

      <button
        type="button"
        title="Tela cheia (F)"
        onClick={() =>
          document.fullscreenElement
            ? void document.exitFullscreen()
            : void document.documentElement.requestFullscreen()
        }
      >
        ⛶
      </button>

      <SyncPanel />

      <button type="button" onClick={exportNow} title="Exportar JSON">↓</button>
      <button type="button" onClick={() => fileRef.current?.click()} title="Importar JSON">↑</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
