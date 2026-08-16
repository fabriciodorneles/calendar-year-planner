import type { Activity, Mark } from './types';

export type Backup = {
  schemaVersion: number;
  exportedAt: string;
  activities: Activity[];
  marks: Mark[];
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

/** Import defensivo: o arquivo pode ter sido editado à mão. */
export function parseBackup(raw: string): { activities: Activity[]; marks: Mark[] } {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== 'object' || data === null) throw new Error('Arquivo inválido.');

  const { activities, marks } = data as Partial<Backup>;
  if (!Array.isArray(activities) || !Array.isArray(marks)) {
    throw new Error('Arquivo não tem "activities" e "marks".');
  }

  const validActivity = (a: Activity) =>
    typeof a?.id === 'string' && typeof a?.name === 'string' && typeof a?.color === 'string';
  const validMark = (m: Mark) =>
    typeof m?.id === 'string' && typeof m?.activityId === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(m?.start) && /^\d{4}-\d{2}-\d{2}$/.test(m?.end);

  if (!activities.every(validActivity)) throw new Error('Há atividades malformadas no arquivo.');
  if (!marks.every(validMark)) throw new Error('Há marcações malformadas no arquivo.');

  return { activities, marks };
}
