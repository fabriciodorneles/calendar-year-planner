import { describe, expect, it } from 'vitest';
import { pendingSince } from './cursor';

const row = (id: string, updatedAt: number) => ({ id, updatedAt });

describe('cursor da sincronização', () => {
  /**
   * O bug que originou este teste: o cursor era carimbado com a hora do FIM da
   * passada. Uma rotina marcada no celular enquanto o push corria nascia com
   * `updatedAt` menor que esse carimbo e nunca mais entrava em `updatedAt >
   * cursor` — ficava presa no aparelho, sem erro e com o indicador verde.
   */
  it('edição feita durante a passada continua pendente', () => {
    const startedAt = 1000;
    const finishedAt = 1500;

    const antes = [row('a', 900)];
    expect(pendingSince(antes, 0).map((r) => r.id)).toEqual(['a']);

    // O dedo do usuário cai no meio do push: carimbo entre o início e o fim.
    const duranteOPush = row('b', 1200);
    const depois = [...antes, duranteOPush];

    // Com o cursor do fim ela some para sempre — este era o bug.
    expect(pendingSince(depois, finishedAt)).toEqual([]);

    // Com o cursor do início ela entra na passada seguinte.
    expect(pendingSince(depois, startedAt).map((r) => r.id)).toEqual(['b']);
  });

  it('o que já subiu antes do cursor não volta a subir', () => {
    expect(pendingSince([row('a', 900), row('b', 950)], 1000)).toEqual([]);
  });

  it('empate no carimbo não reenvia — o cursor é exclusivo', () => {
    expect(pendingSince([row('a', 1000)], 1000)).toEqual([]);
  });

  it('cursor zero (aparelho novo) manda tudo', () => {
    const tudo = [row('a', 1), row('b', 2)];
    expect(pendingSince(tudo, 0)).toEqual(tudo);
  });
});
