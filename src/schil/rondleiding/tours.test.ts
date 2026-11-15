import { describe, expect, it } from 'vitest';
import { ROUTES } from '../navigatie';
import { ALLE_RONDLEIDINGEN, EERSTE_RONDLEIDING, SCHERM_RONDLEIDINGEN, doeTekst, doelSelectors } from './tours';

describe('rondleidingen', () => {
  it('eerste rondleiding: elf stappen die het werk volgen, de laatste vier over waar je gegevens staan', () => {
    expect(EERSTE_RONDLEIDING.stappen.map((s) => s.id)).toEqual([
      'weergave', 'nu', 'plannen', 'ongedaan', 'toevoegen', 'zoeken', 'voorbereiden', 'delen', 'waar', 'koppelen', 'alleen-bestand',
    ]);
    // elke stap is een handeling (gaat verder na het doen), behalve de ene kijkstap over de browseropslag
    expect(EERSTE_RONDLEIDING.stappen.filter((s) => s.id !== 'waar').every((s) => !!s.klaar && !!s.doe && !!s.gelukt)).toBe(true);
  });

  it('per scherm een korte rondleiding op een bestaande route', () => {
    for (const t of SCHERM_RONDLEIDINGEN) {
      expect(ROUTES).toContain(t.pad as (typeof ROUTES)[number]);
      expect(t.stappen.length).toBeGreaterThanOrEqual(2);
      expect(t.stappen.length).toBeLessThanOrEqual(4);
    }
  });

  it('korte teksten, huisstijl: geen em dash, geen uitroeptekens', () => {
    for (const t of ALLE_RONDLEIDINGEN)
      for (const s of t.stappen) {
        for (const breed of [true, false]) {
          expect(doelSelectors(s, breed).length).toBeGreaterThan(0);
          const doe = doeTekst(s, breed) ?? '';
          expect(doe.length).toBeLessThanOrEqual(110);
          for (const tekst of [s.titel, s.wat, doe, s.gelukt ?? '', s.zonderDoel ?? '']) {
            expect(tekst).not.toMatch(/[—!]/);
          }
        }
        expect(s.wat.length).toBeLessThanOrEqual(130);
        expect(s.titel.length).toBeLessThanOrEqual(28);
      }
  });
});
