import { fontStack, titleWeight } from '../lib/fonts';
import { useBuckets, useSheetBuckets } from '../store/bucketsStore';
import { BucketCell } from './BucketCell';

/**
 * A folha: 8 células separadas por réguas de tinta, proporção de papel,
 * centralizada e sem scroll. Em retrato são 2 colunas × 4 linhas (a folha
 * original); em paisagem, 4 × 2. Abaixo de 700px vira uma coluna e rola.
 */
export function BucketSheet() {
  const buckets = useSheetBuckets();
  const layout = useBuckets((s) => s.layout);
  const font = useBuckets((s) => s.font);

  return (
    <div className="sheet-stage">
      <div
        className={`sheet sheet--${layout}`}
        style={{
          '--hand': fontStack(font),
          '--title-weight': titleWeight(font),
        } as React.CSSProperties}
      >
        {buckets.map((bucket) => (
          <BucketCell key={bucket.id} bucket={bucket} />
        ))}
      </div>
    </div>
  );
}
