import { useState } from 'react';
import { EMOJI_CHOICES } from '../store/defaults';

/** Botão que abre a grade de emojis. Digitar direto continua valendo para quem
 *  quiser um emoji fora da lista. */
export function EmojiPicker({
  value,
  onPick,
  label,
}: {
  value: string;
  onPick: (emoji: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="emoji">
      <button
        type="button"
        className="emoji__trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {value}
      </button>

      {open ? (
        <>
          <div className="emoji__scrim" onPointerDown={() => setOpen(false)} />
          <div className="emoji__menu" role="menu">
            {EMOJI_CHOICES.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                className="emoji__option"
                aria-current={emoji === value}
                onClick={() => { onPick(emoji); setOpen(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
