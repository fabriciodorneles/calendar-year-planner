import { MONTH_LABELS, parseISO, weekdayOf, WEEKDAY_NAMES, type ISODate } from '../lib/dates';
import { holidaysFor } from '../lib/holidays';
import { eventAt, routinesAt, type RepeatKind } from '../lib/marks';
import { isEventOf, useLiveActivities, useLiveMarks, usePlanner } from '../store/plannerStore';
import type { Mark } from '../lib/types';

/** Detalhes do dia: título e texto do evento, rotinas marcadas e o feriado. */
export function DayModal({ date, onClose }: { date: ISODate; onClose: () => void }) {
  const marks = useLiveMarks();
  const activities = useLiveActivities();
  const setMarkText = usePlanner((s) => s.setMarkText);
  const removeMark = usePlanner((s) => s.removeMark);
  const repeatSeries = usePlanner((s) => s.repeatSeries);
  const dropSeries = usePlanner((s) => s.dropSeries);

  const isEvent = isEventOf({ activities });
  const event = eventAt(marks, date, isEvent);
  const routines = routinesAt(marks, date, isEvent);
  const byId = new Map(activities.map((a) => [a.id, a]));

  const { year, month, day } = parseISO(date);
  const holiday = holidaysFor(year).get(date);
  const eventActivity = event ? byId.get(event.activityId) : undefined;

  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Dia ${date}`}>
        <h2>
          {day} {MONTH_LABELS[month]} {year}
          <span className="modal__sub">{WEEKDAY_NAMES[weekdayOf(year, month, day)]}</span>
        </h2>

        {holiday ? <p className="modal__holiday">🇧🇷 {holiday}</p> : null}

        {event && eventActivity ? (
          <div className="modal__block">
            <span className="modal__label">
              <span className="dock__swatch" style={{ background: eventActivity.color }}>
                {eventActivity.emoji}
              </span>
              {eventActivity.name}
              {event.start !== event.end ? (
                <em className="modal__range">{event.start} → {event.end}</em>
              ) : null}
            </span>
            <input
              type="text"
              placeholder="Título (aparece na célula)"
              value={event.title ?? ''}
              onChange={(e) => setMarkText(event.id, { title: e.target.value || null })}
            />
            <textarea
              rows={4}
              placeholder="Detalhes"
              value={event.details ?? ''}
              onChange={(e) => setMarkText(event.id, { details: e.target.value || null })}
            />
            <Repeat mark={event} onRepeat={repeatSeries} onDrop={dropSeries} />
            <button type="button" onClick={() => removeMark(event.id)}>Remover evento</button>
          </div>
        ) : (
          <p className="modal__hint">Nenhum evento neste dia.</p>
        )}

        <div className="modal__block">
          <span className="modal__label">Rotinas</span>
          {routines.length ? (
            <ul className="modal__routines">
              {routines.map((routine) => {
                const activity = byId.get(routine.activityId);
                if (!activity) return null;
                return (
                  <li key={routine.id}>
                    <span className="routine" style={{ background: activity.color }}>
                      {activity.emoji}
                    </span>
                    {activity.name}
                    <Repeat mark={routine} onRepeat={repeatSeries} onDrop={dropSeries} />
                    <button type="button" onClick={() => removeMark(routine.id)} title="Remover">×</button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="modal__hint">Nenhuma rotina marcada.</p>
          )}
        </div>

        <div className="modal__actions">
          <span />
          <button type="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Repetição materializada: escolher a cadência já gera as ocorrências até o fim
 * do ano (DESIGN.md §5.4). Depois de gerada, cada dia é editável sozinho e o
 * botão de série apaga todas de uma vez.
 */
function Repeat({
  mark,
  onRepeat,
  onDrop,
}: {
  mark: Mark;
  onRepeat: (id: string, kind: RepeatKind) => void;
  onDrop: (seriesId: string) => void;
}) {
  return (
    <span className="repeat">
      <select
        value=""
        aria-label="Repetir"
        onChange={(e) => e.target.value && onRepeat(mark.id, e.target.value as RepeatKind)}
      >
        <option value="">Repetir…</option>
        <option value="weekly">Toda semana</option>
        <option value="biweekly">Semana sim, semana não</option>
      </select>
      {mark.seriesId ? (
        <button type="button" title="Remover a série inteira" onClick={() => onDrop(mark.seriesId!)}>
          ↻ apagar série
        </button>
      ) : null}
    </span>
  );
}
