import { useMemo } from 'react';
import { daysPerActivity } from '../store/selectors';
import { useLiveActivities, useLiveMarks, usePlanner } from '../store/plannerStore';

type Props = { onManage: () => void };

export function ActivityDock({ onManage }: Props) {
  const activities = useLiveActivities();
  const marks = useLiveMarks();
  const year = usePlanner((s) => s.currentYear);
  const activeId = usePlanner((s) => s.activeActivityId);
  const setActive = usePlanner((s) => s.setActiveActivity);

  const totals = useMemo(() => daysPerActivity(marks, year), [marks, year]);

  return (
    <nav className="dock" aria-label="Atividades">
      {activities.map((activity, index) => {
        const done = totals.get(activity.id) ?? 0;
        const pct = activity.goal ? Math.min(100, (done / activity.goal) * 100) : 0;

        return (
          <button
            key={activity.id}
            type="button"
            className="dock__item"
            aria-pressed={activeId === activity.id}
            title={`${activity.name}${index < 9 ? ` (tecla ${index + 1})` : ''}`}
            onClick={() => setActive(activeId === activity.id ? null : activity.id)}
          >
            <span className="dock__swatch" style={{ background: activity.color }}>
              {activity.emoji}
            </span>
            <span className="dock__meta">
              <span className="dock__name">{activity.name}</span>
              <span className="dock__count">
                {activity.goal ? `${done} / ${activity.goal}` : `${done} ${done === 1 ? 'dia' : 'dias'}`}
              </span>
              {activity.goal ? (
                <span className="dock__bar">
                  <i style={{ width: `${pct}%`, background: activity.color }} />
                </span>
              ) : null}
            </span>
            {index < 9 ? <span className="dock__key">{index + 1}</span> : null}
          </button>
        );
      })}

      <span className="dock__spacer" />

      <button type="button" className="dock__item" onClick={onManage} title="Gerenciar atividades">
        <span className="dock__swatch">⚙️</span>
        <span className="dock__meta"><span className="dock__name">Atividades</span></span>
      </button>
    </nav>
  );
}
