import { describe, expect, it } from 'vitest';
import {
  addGoal, defaultBuckets, DEFAULT_TITLES, goalsOf, isPristine, moveGoal,
  patchGoal, removeGoal, renameBucket, sheetBuckets,
} from './buckets';
import { MAX_GOALS, type Goal } from './types';

const BUCKET = 'bucket-1';

/** Uma lista pronta com N objetivos, textos 'a', 'b', 'c'… */
const listOf = (count: number): Goal[] => {
  let goals: Goal[] = [];
  for (let i = 0; i < count; i += 1) {
    goals = addGoal(goals, BUCKET, String.fromCharCode(97 + i));
  }
  return goals;
};

const textsOf = (goals: Goal[]) => goalsOf(goals, BUCKET).map((g) => g.text);

describe('addGoal', () => {
  it('acrescenta no fim, com order sequencial', () => {
    const goals = listOf(3);
    expect(textsOf(goals)).toEqual(['a', 'b', 'c']);
    expect(goalsOf(goals, BUCKET).map((g) => g.order)).toEqual([0, 1, 2]);
  });

  it('para no limite de 6 por bucket', () => {
    const full = listOf(MAX_GOALS);
    expect(addGoal(full, BUCKET, 'sobra')).toBe(full);
  });

  it('ignora texto vazio ou só de espaço', () => {
    const goals = listOf(1);
    expect(addGoal(goals, BUCKET, '   ')).toBe(goals);
  });

  it('conta o limite por bucket, não no total', () => {
    const full = listOf(MAX_GOALS);
    expect(goalsOf(addGoal(full, 'outro', 'x'), 'outro')).toHaveLength(1);
  });

  it('um objetivo apagado libera vaga', () => {
    const full = listOf(MAX_GOALS);
    const freed = removeGoal(full, goalsOf(full, BUCKET)[0]!.id);
    expect(textsOf(addGoal(freed, BUCKET, 'nova'))).toEqual(['b', 'c', 'd', 'e', 'f', 'nova']);
  });
});

describe('removeGoal', () => {
  it('é soft delete e renumera os que ficaram', () => {
    const goals = listOf(3);
    const removed = removeGoal(goals, goalsOf(goals, BUCKET)[1]!.id);

    expect(removed).toHaveLength(3); // nada some do array: o sync precisa propagar
    expect(textsOf(removed)).toEqual(['a', 'c']);
    expect(goalsOf(removed, BUCKET).map((g) => g.order)).toEqual([0, 1]);
  });

  it('apagar duas vezes não mexe mais nada', () => {
    const goals = listOf(2);
    const once = removeGoal(goals, goalsOf(goals, BUCKET)[0]!.id);
    expect(removeGoal(once, goals[0]!.id)).toBe(once);
  });
});

describe('moveGoal', () => {
  it('leva um item do fim para o começo', () => {
    const goals = listOf(3);
    const moved = moveGoal(goals, goalsOf(goals, BUCKET)[2]!.id, 0);
    expect(textsOf(moved)).toEqual(['c', 'a', 'b']);
  });

  it('leva um item do começo para o fim', () => {
    const goals = listOf(3);
    const moved = moveGoal(goals, goalsOf(goals, BUCKET)[0]!.id, 2);
    expect(textsOf(moved)).toEqual(['b', 'c', 'a']);
  });

  it('índice fora da lista encosta na borda em vez de quebrar', () => {
    const goals = listOf(3);
    expect(textsOf(moveGoal(goals, goalsOf(goals, BUCKET)[0]!.id, 99))).toEqual(['b', 'c', 'a']);
    expect(textsOf(moveGoal(goals, goalsOf(goals, BUCKET)[2]!.id, -5))).toEqual(['c', 'a', 'b']);
  });

  it('mover para a própria posição não carimba updatedAt de ninguém', () => {
    const goals = listOf(3);
    expect(moveGoal(goals, goalsOf(goals, BUCKET)[1]!.id, 1)).toBe(goals);
  });

  it('só reescreve quem mudou de posição — o push não reenvia a lista toda', () => {
    const goals = listOf(4).map((g) => ({ ...g, updatedAt: 1 }));
    const moved = moveGoal(goals, goalsOf(goals, BUCKET)[0]!.id, 1, 999);
    const touched = moved.filter((g) => g.updatedAt === 999).map((g) => g.text);
    expect(touched.sort()).toEqual(['a', 'b']); // 'c' e 'd' ficam onde estavam
  });

  it('não mistura buckets: mover num não renumera o outro', () => {
    const goals = addGoal(listOf(2), 'outro', 'x');
    const moved = moveGoal(goals, goalsOf(goals, BUCKET)[0]!.id, 1);
    expect(goalsOf(moved, 'outro').map((g) => g.order)).toEqual([0]);
  });
});

describe('patchGoal', () => {
  it('tickar mexe só no done', () => {
    const goals = listOf(2);
    const id = goalsOf(goals, BUCKET)[0]!.id;
    const done = patchGoal(goals, id, { done: true });
    expect(goalsOf(done, BUCKET).map((g) => g.done)).toEqual([true, false]);
    expect(textsOf(done)).toEqual(['a', 'b']);
  });
});

describe('folha inicial', () => {
  it('nasce com os 8 buckets em ordem', () => {
    const buckets = sheetBuckets(defaultBuckets());
    expect(buckets).toHaveLength(8);
    expect(buckets.map((b) => b.title)).toEqual([...DEFAULT_TITLES]);
  });

  it('sheetBuckets ordena pelo order, não pela chegada do sync', () => {
    const [first, second, ...rest] = defaultBuckets();
    expect(sheetBuckets([second!, first!, ...rest])[0]!.title).toBe(DEFAULT_TITLES[0]);
  });
});

describe('renameBucket', () => {
  it('aceita título vazio — é como se usa menos de 8 áreas', () => {
    const buckets = defaultBuckets();
    const cleared = renameBucket(buckets, buckets[0]!.id, '');
    expect(sheetBuckets(cleared)[0]!.title).toBe('');
    expect(sheetBuckets(cleared)).toHaveLength(8); // o quadro continua existindo
  });

  it('esvaziar um título mantém os objetivos daquele bucket', () => {
    const buckets = defaultBuckets();
    const goals = addGoal([], buckets[0]!.id, 'correr');
    const cleared = renameBucket(buckets, buckets[0]!.id, '');
    expect(goalsOf(goals, cleared[0]!.id)).toHaveLength(1);
  });

  it('tira os espaços das pontas', () => {
    const buckets = defaultBuckets();
    expect(sheetBuckets(renameBucket(buckets, buckets[0]!.id, '  Trilha  '))[0]!.title)
      .toBe('Trilha');
  });
});

describe('isPristine', () => {
  it('folha de fábrica é pristine — o aparelho novo adota o remoto', () => {
    expect(isPristine(defaultBuckets(), [])).toBe(true);
  });

  it('um objetivo escrito já sujou', () => {
    const buckets = defaultBuckets();
    expect(isPristine(buckets, addGoal([], buckets[0]!.id, 'correr'))).toBe(false);
  });

  it('renomear um bucket já sujou', () => {
    const buckets = defaultBuckets();
    expect(isPristine(renameBucket(buckets, buckets[0]!.id, 'Trilha'), [])).toBe(false);
  });

  it('objetivo apagado não conta como uso', () => {
    const buckets = defaultBuckets();
    const goals = addGoal([], buckets[0]!.id, 'correr');
    expect(isPristine(buckets, removeGoal(goals, goals[0]!.id))).toBe(true);
  });
});
