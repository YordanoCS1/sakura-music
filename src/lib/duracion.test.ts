import { describe, expect, it } from 'vitest';
import { duracionASegundos, pasaFiltroDuracion } from './duracion';

describe('filtro de duración', () => {
  it('parsea mm:ss y hh:mm:ss', () => {
    expect(duracionASegundos('3:58')).toBe(238);
    expect(duracionASegundos('1:02:03')).toBe(3723);
    expect(duracionASegundos('n/a')).toBeNull();
  });

  it('filtra por tramos', () => {
    expect(pasaFiltroDuracion('2:30', 'cortas')).toBe(true);
    expect(pasaFiltroDuracion('7:00', 'medianas')).toBe(true);
    expect(pasaFiltroDuracion('12:00', 'largas')).toBe(true);
    expect(pasaFiltroDuracion('12:00', 'cortas')).toBe(false);
  });
});
