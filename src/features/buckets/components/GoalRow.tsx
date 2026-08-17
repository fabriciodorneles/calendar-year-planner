import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Goal } from '../lib/types';

type Props = {
  goal: Goal;
  onCommit: (text: string) => void;
  onToggle: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLElement>, goal: Goal) => void;
  dragging: boolean;
};

/**
 * Uma linha escrita: texto à esquerda, quadradinho à direita. O texto vive em
 * state local e só vai para a store no blur/Enter — gravar a cada tecla encheria
 * o histórico de undo com uma letra por passo e acordaria o push a cada digitada.
 */
export function GoalRow({ goal, onCommit, onToggle, onDragStart, dragging }: Props) {
  const [text, setText] = useState(goal.text);
  const area = useRef<HTMLTextAreaElement>(null);

  // O texto pode mudar por fora (sync de outro aparelho, undo). Enquanto o campo
  // está em foco a digitação manda; fora dele, o dado manda.
  useEffect(() => {
    if (document.activeElement !== area.current) setText(goal.text);
  }, [goal.text]);

  useEffect(() => autoGrow(area.current), [text]);

  return (
    <div className={`goal${goal.done ? ' goal--done' : ''}${dragging ? ' goal--dragging' : ''}`}>
      <span
        className="goal__grip"
        aria-hidden="true"
        onPointerDown={(event) => onDragStart(event, goal)}
        title="Arraste para reordenar"
      >
        ⠿
      </span>

      <textarea
        ref={area}
        className="goal__text"
        rows={1}
        value={text}
        aria-label={`Objetivo: ${goal.text}`}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => onCommit(text)}
        onKeyDown={(event) => {
          // Enter confirma em vez de quebrar linha: a quebra é decidida pela
          // largura da célula, como no papel.
          if (event.key === 'Enter') {
            event.preventDefault();
            area.current?.blur();
          }
          if (event.key === 'Escape') {
            setText(goal.text);
            area.current?.blur();
          }
        }}
      />

      <button
        type="button"
        className="goal__check"
        role="checkbox"
        aria-checked={goal.done}
        aria-label={goal.done ? 'Desmarcar' : 'Marcar como feito'}
        onClick={onToggle}
      >
        {goal.done ? <Tick /> : null}
      </button>
    </div>
  );
}

/** Linha em branco no fim da lista: escrever nela cria o objetivo. */
export function GoalDraft({ onCreate }: { onCreate: (text: string) => void }) {
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => autoGrow(area.current), [text]);

  const commit = (keepFocus: boolean) => {
    if (!text.trim()) return;
    onCreate(text);
    setText('');
    if (keepFocus) area.current?.focus();
  };

  return (
    <div className="goal goal--draft">
      <span className="goal__grip" aria-hidden="true" />
      <textarea
        ref={area}
        className="goal__text"
        rows={1}
        value={text}
        placeholder="+"
        aria-label="Novo objetivo"
        onChange={(event) => setText(event.target.value)}
        onBlur={() => commit(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(true); // já deixa a próxima linha pronta
          }
          if (event.key === 'Escape') {
            setText('');
            area.current?.blur();
          }
        }}
      />
      <span className="goal__check goal__check--ghost" aria-hidden="true" />
    </div>
  );
}

/** Traço de caneta, não o ✓ da fonte do sistema — este acompanha a manuscrita. */
function Tick() {
  return (
    <svg className="goal__tick" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 13.5 L9 20 L21 3.5" />
    </svg>
  );
}

/** Textarea que cresce com o conteúdo: um objetivo longo quebra em duas linhas
 *  em vez de rolar dentro de um campo de uma linha só. */
function autoGrow(node: HTMLTextAreaElement | null): void {
  if (!node) return;
  node.style.height = 'auto';
  node.style.height = `${node.scrollHeight}px`;
}
