import { memo } from 'react';
import {
  daysBetween, daysInMonth, iso, isWeekend, weekdayOf, WEEKDAY_INITIALS, type ISODate,
} from '../lib/dates';
import { segmentFor } from '../lib/marks';
import type { Activity, Mark } from '../lib/types';

/** Acima disso a fila vira "+N": quatro quadradinhos é o que ainda se distingue
 *  numa célula de ~50px (DESIGN.md §6.4). */
const MAX_ROUTINE_ICONS = 4;

type Props = {
  year: number;
  month: number;
  events: Mark[];
  routinesByDay: Map<ISODate, Mark[]>;
  activities: Map<string, Activity>;
  holidays: Map<ISODate, string>;
  today: ISODate;
  preview: { start: ISODate; end: ISODate; color: string; emoji: string; isEvent: boolean } | null;
};

export const MonthRow = memo(function MonthRow({
  year, month, events, routinesByDay, activities, holidays, today, preview,
}: Props) {
  const total = daysInMonth(year, month);
  const monthStart = iso(year, month, 1);
  const monthEnd = iso(year, month, total);

  const bars = events.flatMap((mark) => {
    const segment = segmentFor(mark, monthStart, monthEnd);
    const activity = activities.get(mark.activityId);
    if (!segment || !activity) return [];
    return [{
      mark,
      segment,
      activity,
      startDay: daysBetween(monthStart, segment.start) + 1,
      span: daysBetween(segment.start, segment.end) + 1,
    }];
  });

  const previewSegment = preview && segmentFor(
    { start: preview.start, end: preview.end } as Mark, monthStart, monthEnd,
  );

  return (
    <div className="month-row" role="row">
      {Array.from({ length: 31 }, (_, index) => {
        const day = index + 1;
        if (day > total) {
          return (
            <div key={day} className="day day--empty" style={{ gridColumn: day }} aria-hidden="true" />
          );
        }

        const date = iso(year, month, day);
        const holiday = holidays.get(date);
        const routines = routinesByDay.get(date) ?? [];
        const shown = routines.slice(0, MAX_ROUTINE_ICONS);
        const overflow = routines.length - shown.length;

        return (
          <div
            key={day}
            className={[
              'day',
              isWeekend(year, month, day) ? 'day--weekend' : '',
              date === today ? 'day--today' : '',
              preview && !preview.isEvent && preview.start <= date && date <= preview.end
                ? 'day--brushing'
                : '',
            ].filter(Boolean).join(' ')}
            style={{ gridColumn: day }}
            data-date={date}
            role="gridcell"
            title={holiday ?? undefined}
          >
            <span className="day__head">
              <span className="day__num">{day}</span>
              <span className="day__dow">{WEEKDAY_INITIALS[weekdayOf(year, month, day)]}</span>
            </span>

            {holiday ? <span className="day__holiday">{holiday}</span> : null}

            {shown.length ? (
              <span className="day__routines">
                {shown.map((routine) => {
                  const activity = activities.get(routine.activityId);
                  if (!activity) return null;
                  return (
                    <span
                      key={routine.id}
                      className="routine"
                      style={{ background: activity.color }}
                      title={activity.name}
                    >
                      {activity.emoji}
                    </span>
                  );
                })}
                {overflow > 0 ? <span className="routine routine--more">+{overflow}</span> : null}
              </span>
            ) : null}
          </div>
        );
      })}

      {bars.map(({ mark, segment, activity, startDay, span }) => (
        <div
          key={mark.id}
          className={[
            'mark',
            segment.openStart ? 'mark--open-start' : '',
            segment.openEnd ? 'mark--open-end' : '',
          ].filter(Boolean).join(' ')}
          style={{ gridColumn: `${startDay} / span ${span}`, background: activity.color }}
          title={`${mark.title || activity.name}${mark.details ? ` — ${mark.details}` : ''}`}
        >
          <span className="mark__emoji" aria-label={activity.name}>{activity.emoji}</span>
          <span className="mark__title">{mark.title || activity.name}</span>
        </div>
      ))}

      {previewSegment && preview!.isEvent ? (
        <div
          className="mark mark--preview"
          style={{
            gridColumn: `${daysBetween(monthStart, previewSegment.start) + 1} / span ${
              daysBetween(previewSegment.start, previewSegment.end) + 1
            }`,
            background: preview!.color,
          }}
        >
          <span className="mark__emoji">{preview!.emoji}</span>
        </div>
      ) : null}
    </div>
  );
});
