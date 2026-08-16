import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { compareISO, iso, MONTH_LABELS, todayISO, type ISODate } from '../lib/dates';
import { holidaysFor } from '../lib/holidays';
import { markAt } from '../lib/marks';
import { useLiveActivities, useLiveMarks, usePlanner } from '../store/plannerStore';
import { MonthRow } from './MonthRow';

/** Descobre o dia sob o ponteiro. Com pointer capture ativo os eventos não
 *  chegam às células, então a posição é resolvida por hit-test. */
function dateUnder(x: number, y: number): ISODate | null {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest<HTMLElement>('[data-date]');
  return cell?.dataset.date ?? null;
}

export function CalendarGrid() {
  const year = usePlanner((s) => s.currentYear);
  const marks = useLiveMarks();
  const activities = useLiveActivities();
  const activeId = usePlanner((s) => s.activeActivityId);
  const paint = usePlanner((s) => s.paint);
  const erase = usePlanner((s) => s.erase);

  type Drag = { anchor: ISODate; cursor: ISODate };
  /**
   * O arrasto vive numa ref, não no state: `pointerup` chega antes do React
   * commitar o último `pointermove`, e ler o state ali encerrava a barra num dia
   * defasado. O state existe só para desenhar o preview.
   */
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const holidays = useMemo(() => holidaysFor(year), [year]);
  const today = useMemo(() => todayISO(), []);
  const activityMap = useMemo(
    () => new Map(activities.map((a) => [a.id, a])),
    [activities],
  );
  const active = activeId ? activityMap.get(activeId) : undefined;

  const marksByMonth = useMemo(() => {
    const buckets: (typeof marks)[] = Array.from({ length: 12 }, () => []);
    for (const mark of marks) {
      const first = Math.max(0, compareISO(mark.start, iso(year, 0, 1)) < 0 ? 0 : Number(mark.start.slice(5, 7)) - 1);
      const last = compareISO(mark.end, iso(year, 11, 31)) > 0 ? 11 : Number(mark.end.slice(5, 7)) - 1;
      if (mark.end < iso(year, 0, 1) || mark.start > iso(year, 11, 31)) continue;
      for (let m = first; m <= last; m += 1) buckets[m]!.push(mark);
    }
    return buckets;
  }, [marks, year]);

  const preview = useMemo(() => {
    if (!drag || !active) return null;
    const [start, end] =
      compareISO(drag.anchor, drag.cursor) <= 0
        ? [drag.anchor, drag.cursor]
        : [drag.cursor, drag.anchor];
    return { start, end, color: active.color, emoji: active.emoji };
  }, [drag, active]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !active) return;
    const date = dateUnder(event.clientX, event.clientY);
    if (!date) return;
    gridRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = { anchor: date, cursor: date };
    setDrag(dragRef.current);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = dragRef.current;
    if (!current) return;
    const date = dateUnder(event.clientX, event.clientY);
    if (!date || date === current.cursor) return;
    dragRef.current = { ...current, cursor: date };
    setDrag(dragRef.current);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = dragRef.current;
    dragRef.current = null;
    if (!current || !active) return;
    gridRef.current?.releasePointerCapture(event.pointerId);
    const [start, end] =
      compareISO(current.anchor, current.cursor) <= 0
        ? [current.anchor, current.cursor]
        : [current.cursor, current.anchor];

    // Clique simples sobre a própria atividade ativa = apagar (toggle).
    const existing = markAt(marks, start);
    if (start === end && existing && existing.activityId === active.id) {
      erase(start, end);
    } else {
      paint(start, end);
    }
    setDrag(null);
  };

  return (
    <div
      className="grid"
      role="grid"
      aria-label={`Calendário de ${year}`}
      ref={gridRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
        setDrag(null);
      }}
      style={{ cursor: active ? 'crosshair' : 'default' }}
    >
      {MONTH_LABELS.map((label, month) => (
        <Fragmented
          key={label}
          label={label}
          year={year}
          month={month}
          marks={marksByMonth[month] ?? []}
          activities={activityMap}
          holidays={holidays}
          today={today}
          preview={preview}
        />
      ))}
    </div>
  );
}

type FragmentedProps = Parameters<typeof MonthRow>[0] & { label: string };

/** Rótulo + linha, como irmãos diretos do grid para as 12 faixas ficarem alinhadas. */
function Fragmented({ label, ...rowProps }: FragmentedProps) {
  return (
    <>
      <div className="month-label" role="rowheader">{label}</div>
      <MonthRow {...rowProps} />
    </>
  );
}
