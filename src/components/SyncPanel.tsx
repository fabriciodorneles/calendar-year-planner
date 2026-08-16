import { useState } from 'react';
import { useSync, type SyncStatus } from '../store/useSync';

const LABEL: Record<SyncStatus, string> = {
  'signed-out': 'Sincronizar',
  idle: 'Sincronizado',
  syncing: 'Sincronizando…',
  error: 'Erro no sync',
};

const DOT: Record<SyncStatus, string> = {
  'signed-out': '○', idle: '●', syncing: '◐', error: '▲',
};

export function SyncPanel() {
  const { session, status, error, signIn, signOut } = useSync();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error: failure } = await signIn(email.trim());
    setBusy(false);
    if (!failure) setSent(true);
    else alert(`Não deu para enviar: ${failure.message}`);
  };

  return (
    <>
      <button
        type="button"
        className={`sync sync--${status}`}
        title={error ?? LABEL[status]}
        onClick={() => setOpen(true)}
      >
        {DOT[status]}
      </button>

      {open ? (
        <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Sincronização">
            <h2>Sincronização</h2>

            {session ? (
              <>
                <p className="modal__hint">
                  Conectado como <strong>{session.user.email}</strong>.<br />
                  Estado: {LABEL[status]}{error ? ` — ${error}` : ''}
                </p>
                <div className="modal__actions">
                  <button type="button" onClick={() => void signOut()}>Sair</button>
                  <button type="button" onClick={() => setOpen(false)}>Fechar</button>
                </div>
              </>
            ) : sent ? (
              <>
                <p className="modal__hint">
                  Enviei um link para <strong>{email}</strong>. Abra o e-mail <em>neste mesmo
                  aparelho</em> — o link já entra e começa a sincronizar.
                </p>
                <div className="modal__actions">
                  <span />
                  <button type="button" onClick={() => setOpen(false)}>Fechar</button>
                </div>
              </>
            ) : (
              <>
                <p className="modal__hint">
                  Entre com seu e-mail para usar o mesmo calendário em outros aparelhos.
                  Sem senha: chega um link de acesso.
                </p>
                <div className="modal__block">
                  <input
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && void submit()}
                  />
                </div>
                <div className="modal__actions">
                  <button type="button" disabled={busy || !email.includes('@')} onClick={() => void submit()}>
                    {busy ? 'Enviando…' : 'Enviar link'}
                  </button>
                  <button type="button" onClick={() => setOpen(false)}>Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
