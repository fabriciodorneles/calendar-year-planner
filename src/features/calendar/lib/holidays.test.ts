import { describe, expect, it } from 'vitest';
import { easterSunday, holidaysFor } from './holidays';

describe('easterSunday', () => {
  // Datas conferidas contra o calendário litúrgico.
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
    [2038, '2038-04-25'],
  ])('Páscoa de %i', (year, expected) => {
    expect(easterSunday(year)).toBe(expected);
  });
});

describe('holidaysFor', () => {
  it('deriva os móveis de 2026 a partir da Páscoa', () => {
    const h = holidaysFor(2026);
    expect(h.get('2026-02-17')).toBe('Carnaval');
    expect(h.get('2026-04-03')).toBe('Sexta-feira Santa');
    expect(h.get('2026-06-04')).toBe('Corpus Christi');
  });

  it('inclui os fixos, com Consciência Negra', () => {
    const h = holidaysFor(2026);
    expect(h.get('2026-01-01')).toBe('Confraternização Universal');
    expect(h.get('2026-11-20')).toBe('Consciência Negra');
    expect(h.get('2026-12-25')).toBe('Natal');
  });
});
