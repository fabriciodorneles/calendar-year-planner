import type { Activity, Mark } from '@/features/calendar/lib/types';
import type { Bucket, Goal } from '@/features/buckets/lib/types';

/** Um arquivo só para as duas telas. `buckets`/`goals` são opcionais porque
 *  arquivos exportados antes da folha existir continuam válidos. */
export type Backup = {
  schemaVersion: number;
  bucketsSchemaVersion?: number;
  exportedAt: string;
  activities: Activity[];
  marks: Mark[];
  buckets?: Bucket[];
  goals?: Goal[];
};

export function downloadBackup(backup: Backup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `year-planner-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

type Parsed = {
  activities: Activity[];
  marks: Mark[];
  /** Ausentes num arquivo antigo: nesse caso a folha atual não é tocada. */
  buckets: Bucket[] | null;
  goals: Goal[] | null;
};

/** Import defensivo: o arquivo pode ter sido editado à mão. */
export function parseBackup(raw: string): Parsed {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== 'object' || data === null) throw new Error('Arquivo inválido.');

  const { activities, marks, buckets, goals } = data as Partial<Backup>;
  if (!Array.isArray(activities) || !Array.isArray(marks)) {
    throw new Error('Arquivo não tem "activities" e "marks".');
  }

  const validActivity = (a: Activity) =>
    typeof a?.id === 'string' && typeof a?.name === 'string' && typeof a?.color === 'string';
  const validMark = (m: Mark) =>
    typeof m?.id === 'string' && typeof m?.activityId === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(m?.start) && /^\d{4}-\d{2}-\d{2}$/.test(m?.end);
  const validBucket = (b: Bucket) =>
    typeof b?.id === 'string' && typeof b?.title === 'string' && typeof b?.order === 'number';
  const validGoal = (g: Goal) =>
    typeof g?.id === 'string' && typeof g?.bucketId === 'string' && typeof g?.text === 'string';

  if (!activities.every(validActivity)) throw new Error('Há atividades malformadas no arquivo.');
  if (!marks.every(validMark)) throw new Error('Há marcações malformadas no arquivo.');

  // Buckets e objetivos andam juntos: meia folha importada deixaria objetivos
  // órfãos, apontando para buckets que não vieram.
  const hasSheet = Array.isArray(buckets) && Array.isArray(goals);
  if (hasSheet) {
    if (!buckets.every(validBucket)) throw new Error('Há buckets malformados no arquivo.');
    if (!goals.every(validGoal)) throw new Error('Há objetivos malformados no arquivo.');
  }

  return {
    activities,
    marks,
    buckets: hasSheet ? buckets : null,
    goals: hasSheet ? goals : null,
  };
}
