import { useLiveActivities, usePlanner } from '../store/plannerStore';
import { EmojiPicker } from './EmojiPicker';

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
            <EmojiPicker
              value={activity.emoji}
              label={`Emoji de ${activity.name}`}
              onPick={(emoji) => upsert({ id: activity.id, emoji })}
            />
            <input
              type="text"
              value={activity.name}
              aria-label="Nome"
              onChange={(e) => upsert({ id: activity.id, name: e.target.value })}
            />
            <select
              value={activity.kind}
              aria-label={`Categoria de ${activity.name}`}
              onChange={(e) => upsert({ id: activity.id, kind: e.target.value as 'event' | 'routine' })}
            >
              <option value="event">Evento</option>
              <option value="routine">Rotina</option>
            </select>
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
          <span>
            <button type="button" onClick={() => upsert({ kind: 'event', name: 'Novo evento' })}>
              + Evento
            </button>
            <button type="button" onClick={() => upsert({ kind: 'routine', name: 'Nova rotina' })}>
              + Rotina
            </button>
          </span>
          <button type="button" onClick={onClose}>Fechar</button>
        </div>

        <p className="modal__hint">
          <strong>Evento</strong> ocupa a célula inteira e vira barra em vários dias.
          <strong> Rotina</strong> é um iconezinho na base do dia, marcado dia a dia.
          Remover uma atividade também esconde as marcações dela — <kbd>Cmd/Ctrl+Z</kbd> desfaz.
        </p>
      </div>
    </div>
  );
}
