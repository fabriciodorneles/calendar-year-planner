import { useRef } from 'react';
import { downloadBackup, parseBackup } from '../lib/io';
import { SCHEMA_VERSION, usePlanner } from '../store/plannerStore';

export function Toolbar() {
  const year = usePlanner((s) => s.currentYear);
  const setYear = usePlanner((s) => s.setYear);
  const undo = usePlanner((s) => s.undo);
  const redo = usePlanner((s) => s.redo);
  const canUndo = usePlanner((s) => s.past.length > 0);
  const canRedo = usePlanner((s) => s.future.length > 0);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportNow = () => {
    const { activities, marks } = usePlanner.getState();
    downloadBackup({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      activities,
      marks,
    });
  };

  const importFile = async (file: File) => {
    try {
      const snapshot = parseBackup(await file.text());
      const count = snapshot.marks.filter((m) => m.deletedAt === null).length;
      if (confirm(`Substituir os dados atuais por ${count} marcações do arquivo?`)) {
        usePlanner.getState().replaceAll(snapshot);
      }
    } catch (error) {
      alert(`Não deu para importar: ${(error as Error).message}`);
    }
  };

  return (
    <div className="toolbar">
      <button type="button" onClick={() => setYear(year - 1)} title="Ano anterior (←)">‹</button>
      <span className="toolbar__year">{year}</span>
      <button type="button" onClick={() => setYear(year + 1)} title="Próximo ano (→)">›</button>

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
