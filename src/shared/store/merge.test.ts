import { describe, expect, it } from 'vitest';
import { mergeById } from './merge';

const rec = (id: string, updatedAt: number, tag = '') => ({ id, updatedAt, tag });

describe('mergeById', () => {
  it('o lado mais recente vence', () => {
    const { merged } = mergeById([rec('a', 10, 'local')], [rec('a', 20, 'remoto')]);
    expect(merged).toEqual([rec('a', 20, 'remoto')]);
  });

  it('o local mais novo não é sobrescrito pelo remoto antigo', () => {
    const { merged, changed } = mergeById([rec('a', 30, 'local')], [rec('a', 20, 'remoto')]);
    expect(merged).toEqual([rec('a', 30, 'local')]);
    expect(changed).toBe(false);
  });

  it('empate mantém o local, evitando escrita desnecessária', () => {
    const { changed } = mergeById([rec('a', 20, 'local')], [rec('a', 20, 'remoto')]);
    expect(changed).toBe(false);
  });

  it('registros de dispositivos diferentes se somam', () => {
    const { merged } = mergeById([rec('a', 10)], [rec('b', 10)]);
    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('remoção remota (soft delete mais novo) vence sobre o local vivo', () => {
    const local: Array<{ id: string; updatedAt: number; deletedAt: number | null }> =
      [{ id: 'a', updatedAt: 10, deletedAt: null }];
    const remote = [{ id: 'a', updatedAt: 20, deletedAt: 20 }];
    expect(mergeById(local, remote).merged[0]!.deletedAt).toBe(20);
  });
});
