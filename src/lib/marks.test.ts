import { describe, expect, it } from 'vitest';
import {
  applyEvent, applyRoutine, clearRange, clearRoutine, eventAt, routinesAt, segmentFor,
} from './marks';
import type { Mark } from './types';

const mark = (id: string, start: string, end: string, activityId = 'trip'): Mark => ({
  id, activityId, start, end, title: null, details: null, updatedAt: 0, deletedAt: null,
});

/** No app real isso vem do cadastro da atividade; aqui basta um conjunto de ids. */
const EVENTS = new Set(['trip', 'birthday']);
const isEvent = (m: Mark) => EVENTS.has(m.activityId);

const live = (marks: Mark[]) =>
  marks.filter((m) => m.deletedAt === null).map((m) => `${m.start}..${m.end}`).sort();

describe('clearRange', () => {
  it('apaga a marcação inteiramente contida', () => {
    expect(live(clearRange([mark('a', '2026-03-10', '2026-03-12')], '2026-03-09', '2026-03-15')))
      .toEqual([]);
  });

  it('trunca quando o intervalo cobre só o começo', () => {
    expect(live(clearRange([mark('a', '2026-03-10', '2026-03-20')], '2026-03-08', '2026-03-12')))
      .toEqual(['2026-03-13..2026-03-20']);
  });

  it('trunca quando o intervalo cobre só o fim', () => {
    expect(live(clearRange([mark('a', '2026-03-10', '2026-03-20')], '2026-03-18', '2026-03-25')))
      .toEqual(['2026-03-10..2026-03-17']);
  });

  it('divide em duas quando o intervalo cai no miolo', () => {
    expect(live(clearRange([mark('a', '2026-03-10', '2026-03-20')], '2026-03-14', '2026-03-15')))
      .toEqual(['2026-03-10..2026-03-13', '2026-03-16..2026-03-20']);
  });

  it('preserva título e detalhes nos dois pedaços da divisão', () => {
    const original = { ...mark('a', '2026-03-10', '2026-03-20'), title: 'Serra', details: 'levar corda' };
    const out = clearRange([original], '2026-03-14', '2026-03-15');
    const kept = out.filter((m) => m.deletedAt === null);
    expect(kept.every((m) => m.title === 'Serra' && m.details === 'levar corda')).toBe(true);
  });

  it('ignora marcações fora do escopo', () => {
    const marks = [mark('a', '2026-03-10', '2026-03-12'), mark('b', '2026-03-10', '2026-03-10', 'gym')];
    expect(live(clearRange(marks, '2026-03-09', '2026-03-15', isEvent)))
      .toEqual(['2026-03-10..2026-03-10']);
  });
});

describe('applyEvent', () => {
  it('normaliza intervalo invertido (arrasto da direita para a esquerda)', () => {
    expect(live(applyEvent([], { activityId: 'trip', start: '2026-03-20', end: '2026-03-10' }, isEvent)))
      .toEqual(['2026-03-10..2026-03-20']);
  });

  it('mantém no máximo um evento por dia', () => {
    let marks = applyEvent([], { activityId: 'trip', start: '2026-03-10', end: '2026-03-20' }, isEvent);
    marks = applyEvent(marks, { activityId: 'birthday', start: '2026-03-15', end: '2026-03-15' }, isEvent);
    expect(eventAt(marks, '2026-03-15', isEvent)?.activityId).toBe('birthday');
    expect(marks.filter((m) => m.deletedAt === null && m.start <= '2026-03-15' && '2026-03-15' <= m.end))
      .toHaveLength(1);
  });

  it('não apaga rotinas do mesmo dia', () => {
    const withRoutine = applyRoutine([], 'gym', '2026-03-15', '2026-03-15');
    const out = applyEvent(withRoutine, { activityId: 'trip', start: '2026-03-14', end: '2026-03-16' }, isEvent);
    expect(routinesAt(out, '2026-03-15', isEvent)).toHaveLength(1);
    expect(eventAt(out, '2026-03-15', isEvent)?.activityId).toBe('trip');
  });
});

describe('applyRoutine', () => {
  it('cria um registro por dia, não uma barra', () => {
    const out = applyRoutine([], 'gym', '2026-03-10', '2026-03-13');
    expect(live(out)).toEqual([
      '2026-03-10..2026-03-10', '2026-03-11..2026-03-11',
      '2026-03-12..2026-03-12', '2026-03-13..2026-03-13',
    ]);
  });

  it('repintar por cima não duplica', () => {
    let out = applyRoutine([], 'gym', '2026-03-10', '2026-03-11');
    out = applyRoutine(out, 'gym', '2026-03-11', '2026-03-12');
    expect(live(out)).toHaveLength(3);
  });

  it('rotinas diferentes coexistem no mesmo dia', () => {
    let out = applyRoutine([], 'gym', '2026-03-10', '2026-03-10');
    out = applyRoutine(out, 'reading', '2026-03-10', '2026-03-10');
    expect(routinesAt(out, '2026-03-10', isEvent)).toHaveLength(2);
  });

  it('clearRoutine remove só a rotina indicada', () => {
    let out = applyRoutine([], 'gym', '2026-03-10', '2026-03-10');
    out = applyRoutine(out, 'reading', '2026-03-10', '2026-03-10');
    out = clearRoutine(out, 'gym', '2026-03-10', '2026-03-10');
    expect(routinesAt(out, '2026-03-10', isEvent).map((m) => m.activityId)).toEqual(['reading']);
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
