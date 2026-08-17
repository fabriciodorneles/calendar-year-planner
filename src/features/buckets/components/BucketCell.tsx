import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { MAX_GOALS, type Bucket, type Goal } from '../lib/types';
import { useBuckets, useGoalsOf } from '../store/bucketsStore';
import { GoalDraft, GoalRow } from './GoalRow';

/** Índice da linha sob o ponteiro. Com pointer capture os eventos não chegam às
 *  linhas, então a posição é resolvida por hit-test — como no grid do calendário. */
function indexUnder(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y);
  const row = el?.closest<HTMLElement>('[data-goal-index]');
  return row ? Number(row.dataset.goalIndex) : null;
}

type Drag = { id: string; over: number };

export function BucketCell({ bucket }: { bucket: Bucket }) {
  const goals = useGoalsOf(bucket.id);
  const rename = useBuckets((s) => s.renameBucket);
  const addGoal = useBuckets((s) => s.addGoal);
  const setGoalText = useBuckets((s) => s.setGoalText);
  const toggleGoal = useBuckets((s) => s.toggleGoal);
  const moveGoal = useBuckets((s) => s.moveGoal);

  const [title, setTitle] = useState(bucket.title);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== titleRef.current) setTitle(bucket.title);
  }, [bucket.title]);

  /** O arrasto vive numa ref: `pointerup` chega antes do React commitar o último
   *  `pointermove`, e ler o state ali soltaria o item na posição defasada. */
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const startDrag = (event: ReactPointerEvent<HTMLElement>, goal: Goal) => {
    if (event.button !== 0 || goals.length < 2) return;
    event.preventDefault(); // sem isso o gesto vira seleção de texto
    listRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = { id: goal.id, over: goal.order };
    setDrag(dragRef.current);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLUListElement>) => {
    const current = dragRef.current;
    if (!current) return;
    const over = indexUnder(event.clientX, event.clientY);
    if (over === null || over === current.over) return;
    dragRef.current = { ...current, over };
    setDrag(dragRef.current);
  };

  const endDrag = (event: ReactPointerEvent<HTMLUListElement>) => {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current) return;
    listRef.current?.releasePointerCapture(event.pointerId);
    // Uma gravação por gesto: mover ao vivo encheria o undo de passos parciais.
    moveGoal(current.id, current.over);
  };

  return (
    <section className="bucket">
      <input
        ref={titleRef}
        className="bucket__title"
        value={title}
        aria-label={`Nome do bucket: ${bucket.title}`}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => (title.trim() ? rename(bucket.id, title) : setTitle(bucket.title))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setTitle(bucket.title);
            event.currentTarget.blur();
          }
        }}
      />

      <ul
        className="bucket__goals"
        ref={listRef}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {goals.map((goal, index) => (
          <li
            key={goal.id}
            data-goal-index={index}
            className={
              drag && drag.id !== goal.id && drag.over === index
                ? 'goal-slot goal-slot--over'
                : 'goal-slot'
            }
          >
            <GoalRow
              goal={goal}
              dragging={drag?.id === goal.id}
              onCommit={(text) => setGoalText(goal.id, text)}
              onToggle={() => toggleGoal(goal.id)}
              onDragStart={startDrag}
            />
          </li>
        ))}

        {goals.length < MAX_GOALS ? (
          <li className="goal-slot">
            <GoalDraft onCreate={(text) => addGoal(bucket.id, text)} />
          </li>
        ) : null}
      </ul>
    </section>
  );
}
