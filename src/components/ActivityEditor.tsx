import { useLiveActivities, usePlanner } from '../store/plannerStore';

type Props = { onClose: () => void };

/** CRUD das atividades (D14). Edições gravam direto na store, então o undo cobre tudo. */
export function ActivityEditor({ onClose }: Props) {
  const activities = useLiveActivities();
  const upsert = usePlanner((s) => s.upsertActivity);
  const remove = usePlanner((s) => s.removeActivity);

  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Atividades">
        <h2>Atividades</h2>

        {activities.map((activity) => (
          <div className="modal__row" key={activity.id}>
            <input
              type="text"
              value={activity.emoji}
              aria-label={`Emoji de ${activity.name}`}
              onChange={(e) => upsert({ id: activity.id, emoji: e.target.value })}
            />
            <input
              type="text"
              value={activity.name}
              aria-label="Nome"
              onChange={(e) => upsert({ id: activity.id, name: e.target.value })}
            />
            <input
              type="number"
              min={0}
              placeholder="meta"
              value={activity.goal ?? ''}
              aria-label={`Meta anual de ${activity.name}`}
              onChange={(e) =>
                upsert({ id: activity.id, goal: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
            <input
              type="color"
              value={activity.color}
              aria-label={`Cor de ${activity.name}`}
              onChange={(e) => upsert({ id: activity.id, color: e.target.value })}
            />
            <button
              type="button"
              title="Remover"
              onClick={() => remove(activity.id)}
            >
              ×
            </button>
          </div>
        ))}

        <div className="modal__actions">
          <button type="button" onClick={() => upsert({})}>+ Nova atividade</button>
          <button type="button" onClick={onClose}>Fechar</button>
        </div>

        <p className="modal__hint">
          Remover uma atividade também esconde as marcações dela — <kbd>Cmd/Ctrl+Z</kbd> desfaz.
        </p>
      </div>
    </div>
  );
}
