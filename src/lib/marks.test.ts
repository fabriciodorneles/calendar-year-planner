import { describe, expect, it } from 'vitest';
import { applyMark, clearRange, markAt, segmentFor } from './marks';
import type { Mark } from './types';

const mark = (id: string, start: string, end: string): Mark => ({
  id,
  activityId: 'run',
  start,
  end,
  note: null,
  updatedAt: 0,
  deletedAt: null,
});

const live = (marks: Mark[]) =>
  marks.filter((m) => m.deletedAt === null).map((m) => `${m.start}..${m.end}`).sort();

describe('clearRange', () => {
  it('apaga a marcação inteiramente contida', () => {
    const out = clearRange([mark('a', '2026-03-10', '2026-03-12')], '2026-03-09', '2026-03-15');
    expect(live(out)).toEqual([]);
  });

  it('trunca quando o intervalo cobre só o começo', () => {
    const out = clearRange([mark('a', '2026-03-10', '2026-03-20')], '2026-03-08', '2026-03-12');
    expect(live(out)).toEqual(['2026-03-13..2026-03-20']);
  });

  it('trunca quando o intervalo cobre só o fim', () => {
    const out = clearRange([mark('a', '2026-03-10', '2026-03-20')], '2026-03-18', '2026-03-25');
    expect(live(out)).toEqual(['2026-03-10..2026-03-17']);
  });

  it('divide em duas quando o intervalo cai no miolo', () => {
    const out = clearRange([mark('a', '2026-03-10', '2026-03-20')], '2026-03-14', '2026-03-15');
    expect(live(out)).toEqual(['2026-03-10..2026-03-13', '2026-03-16..2026-03-20']);
  });

  it('preserva a nota nos dois pedaços da divisão', () => {
    const original = { ...mark('a', '2026-03-10', '2026-03-20'), note: 'Serra do Cipó' };
    const out = clearRange([original], '2026-03-14', '2026-03-15');
    expect(out.filter((m) => m.deletedAt === null).every((m) => m.note === 'Serra do Cipó')).toBe(true);
  });

  it('não toca em marcações que não se sobrepõem', () => {
    const out = clearRange([mark('a', '2026-03-10', '2026-03-12')], '2026-03-13', '2026-03-14');
    expect(live(out)).toEqual(['2026-03-10..2026-03-12']);
  });

  it('resolve várias sobreposições de uma vez', () => {
    const out = clearRange(
      [mark('a', '2026-03-01', '2026-03-05'), mark('b', '2026-03-06', '2026-03-08'), mark('c', '2026-03-09', '2026-03-20')],
      '2026-03-04',
      '2026-03-10',
    );
    expect(live(out)).toEqual(['2026-03-01..2026-03-03', '2026-03-11..2026-03-20']);
  });
});

describe('applyMark', () => {
  it('normaliza intervalo invertido (arrasto da direita para a esquerda)', () => {
    const out = applyMark([], { activityId: 'run', start: '2026-03-20', end: '2026-03-10' });
    expect(live(out)).toEqual(['2026-03-10..2026-03-20']);
  });

  it('mantém o invariante de um dia por marcação', () => {
    let marks = applyMark([], { activityId: 'run', start: '2026-03-10', end: '2026-03-20' });
    marks = applyMark(marks, { activityId: 'gym', start: '2026-03-15', end: '2026-03-15' });
    const day = markAt(marks, '2026-03-15');
    expect(day?.activityId).toBe('gym');
    expect(marks.filter((m) => m.deletedAt === null && m.start <= '2026-03-15' && '2026-03-15' <= m.end)).toHaveLength(1);
  });
});

describe('segmentFor', () => {
  it('fatia a barra que atravessa a virada do mês', () => {
    const crossing = mark('a', '2026-01-30', '2026-02-02');
    expect(segmentFor(crossing, '2026-01-01', '2026-01-31')).toMatchObject({
      start: '2026-01-30', end: '2026-01-31', openStart: false, openEnd: true,
    });
    expect(segmentFor(crossing, '2026-02-01', '2026-02-28')).toMatchObject({
      start: '2026-02-01', end: '2026-02-02', openStart: true, openEnd: false,
    });
  });

  it('devolve null quando a marcação está fora do mês', () => {
    expect(segmentFor(mark('a', '2026-01-05', '2026-01-06'), '2026-02-01', '2026-02-28')).toBeNull();
  });
});
