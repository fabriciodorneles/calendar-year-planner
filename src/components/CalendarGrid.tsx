import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { compareISO, iso, MONTH_LABELS, todayISO, type ISODate } from '../lib/dates';
import { holidaysFor } from '../lib/holidays';
import { sortRange } from '../lib/marks';
import { isEventOf, useLiveActivities, useLiveMarks, usePlanner } from '../store/plannerStore';
import type { Mark } from '../lib/types';
import { MonthRow } from './MonthRow';

/** Descobre o dia sob o ponteiro. Com pointer capture ativo os eventos não
 *  chegam às células, então a posição é resolvida por hit-test. */
function dateUnder(x: number, y: number): ISODate | null {
  const el = document.elementFromPoint(x, y);
  return el?.closest<HTMLElement>('[data-date]')?.dataset.date ?? null;
}

type Drag = { anchor: ISODate; cursor: ISODate; moved: boolean };

export function CalendarGrid({ onOpenDay }: { onOpenDay: (date: ISODate) => void }) {
  const year = usePlanner((s) => s.currentYear);
  const marks = useLiveMarks();
  const activities = useLiveActivities();
  const activeId = usePlanner((s) => s.activeActivityId);
  const paint = usePlanner((s) => s.paint);
  const toggleDay = usePlanner((s) => s.toggleDay);

  /** O arrasto vive numa ref: `pointerup` chega antes do React commitar o último
   *  `pointermove`, e ler o state ali encerrava a barra num dia defasado. */
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const holidays = useMemo(() => holidaysFor(year), [year]);
  const today = useMemo(() => todayISO(), []);
  const activityMap = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);
  const active = activeId ? activityMap.get(activeId) : undefined;
  const isEvent = useMemo(() => isEventOf({ activities }), [activities]);

  /** Um balde por mês, já separado por categoria — a linha não deve refazer isso. */
  const byMonth = useMemo(() => {
    const yearStart = iso(year, 0, 1);
    const yearEnd = iso(year, 11, 31);
    const events: Mark[][] = Array.from({ length: 12 }, () => []);
    const routines: Map<ISODate, Mark[]>[] = Array.from({ length: 12 }, () => new Map());

    for (const mark of marks) {
      if (compareISO(mark.end, yearStart) < 0 || compareISO(mark.start, yearEnd) > 0) continue;

      if (isEvent(mark)) {
        const first = compareISO(mark.start, yearStart) < 0 ? 0 : Number(mark.start.slice(5, 7)) - 1;
        const last = compareISO(mark.end, yearEnd) > 0 ? 11 : Number(mark.end.slice(5, 7)) - 1;
        for (let m = first; m <= last; m += 1) events[m]!.push(mark);
      } else {
        const month = Number(mark.start.slice(5, 7)) - 1;
        const bucket = routines[month]!;
        bucket.set(mark.start, [...(bucket.get(mark.start) ?? []), mark]);
      }
    }
    return { events, routines };
  }, [marks, year, isEvent]);

  const preview = useMemo(() => {
    if (!drag || !active || !drag.moved) return null;
    const [start, end] = sortRange(drag.anchor, drag.cursor);
    return { start, end, color: active.color, emoji: active.emoji, isEvent: active.kind === 'event' };
  }, [drag, active]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !active) return;
    const date = dateUnder(event.clientX, event.clientY);
    if (!date) return;
    gridRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = { anchor: date, cursor: date, moved: false };
    setDrag(dragRef.current);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = dragRef.current;
    if (!current) return;
    const date = dateUnder(event.clientX, event.clientY);
    if (!date || date === current.cursor) return;
    dragRef.current = { ...current, cursor: date, moved: true };
    setDrag(dragRef.current);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current || !active) return;
    gridRef.current?.releasePointerCapture(event.pointerId);

    if (!current.moved) {
      toggleDay(current.anchor);
      return;
    }
    const [start, end] = sortRange(current.anchor, current.cursor);
    paint(start, end);
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
      onPointerCancel={() => { dragRef.current = null; setDrag(null); }}
      onDoubleClick={(e) => {
        const date = dateUnder(e.clientX, e.clientY);
        if (date) onOpenDay(date);
      }}
      style={{ cursor: active ? 'crosshair' : 'default' }}
    >
      {MONTH_LABELS.map((label, month) => (
        <MonthBand
          key={label}
          label={label}
          year={year}
          month={month}
          events={byMonth.events[month] ?? []}
          routinesByDay={byMonth.routines[month] ?? new Map()}
          activities={activityMap}
          holidays={holidays}
          today={today}
          preview={preview}
        />
      ))}
    </div>
  );
}

type BandProps = Parameters<typeof MonthRow>[0] & { label: string };

/** Rótulo + linha, irmãos diretos do grid para as 12 faixas ficarem alinhadas. */
function MonthBand({ label, ...rowProps }: BandProps) {
  return (
    <>
      <div className="month-label" role="rowheader">{label}</div>
      <MonthRow {...rowProps} />
    </>
  );
}
