import { useEffect } from 'react';
import { BucketSheet } from './components/BucketSheet';
import { useBuckets } from './store/bucketsStore';
import './styles/buckets.css';

export function BucketsScreen() {
  const undo = useBuckets((s) => s.undo);
  const redo = useBuckets((s) => s.redo);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Dentro de um campo o Cmd+Z nativo manda: desfazer a digitação letra a
      // letra é o que a pessoa espera ali. O histórico da folha é para o resto.
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;

      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <main className="buckets">
      <BucketSheet />
    </main>
  );
}
