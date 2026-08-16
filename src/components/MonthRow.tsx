import { memo } from 'react';
import { daysInMonth, iso, isWeekend, type ISODate } from '../lib/dates';
import { segmentFor } from '../lib/marks';
import { daysBetween } from '../lib/dates';
import type { Activity, Mark } from '../lib/types';

type Props = {
  year: number;
  month: number;
  marks: Mark[];
  activities: Map<string, Activity>;
  holidays: Map<ISODate, string>;
  today: ISODate;
  preview: { start: ISODate; end: ISODate; color: string; emoji: string } | null;
};

/** Uma linha de mês. Memoizada: durante um arrasto só a linha tocada re-renderiza. */
export const MonthRow = memo(function MonthRow({
  year, month, marks, activities, holidays, today, preview,
}: Props) {
  const total = daysInMonth(year, month);
  const monthStart = iso(year, month, 1);
  const monthEnd = iso(year, month, total);

  const bars = marks.flatMap((mark) => {
    const segment = segmentFor(mark, monthStart, monthEnd);
    if (!segment) return [];
    const activity = activities.get(mark.activityId);
    if (!activity) return [];
    const startDay = daysBetween(monthStart, segment.start) + 1;
    const span = daysBetween(segment.start, segment.end) + 1;
    return [{ mark, segment, activity, startDay, span }];
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
        const classes = [
          'day',
          isWeekend(year, month, day) ? 'day--weekend' : '',
          date === today ? 'day--today' : '',
          holiday ? 'day--holiday' : '',
        ].filter(Boolean).join(' ');

        return (
          <div
            key={day}
            className={classes}
            style={{ gridColumn: day }}
            data-date={date}
            role="gridcell"
            title={holiday ?? undefined}
          >
            {day}
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
          style={{
            gridColumn: `${startDay} / span ${span}`,
            background: activity.color,
          }}
          title={`${activity.name}${mark.note ? ` — ${mark.note}` : ''}`}
        >
          <span aria-label={activity.name}>{activity.emoji}</span>
          {mark.note ? <span className="mark__note" /> : null}
        </div>
      ))}

      {previewSegment ? (
        <div
          className="mark mark--preview"
          style={{
            gridColumn: `${daysBetween(monthStart, previewSegment.start) + 1} / span ${
              daysBetween(previewSegment.start, previewSegment.end) + 1
            }`,
            background: preview!.color,
          }}
        >
          <span>{preview!.emoji}</span>
        </div>
      ) : null}
    </div>
  );
});
