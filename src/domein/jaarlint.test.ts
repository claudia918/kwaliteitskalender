import { describe, expect, it } from 'vitest';
import { LINT, duurTekst, maakJaarlint } from './jaarlint';
import { OEFENSCHOOL_ID, oefenState } from './oefenen';
import { STANDAARD_GESPREKSCYCLUS } from './seed';

describe('jaarlint', () => {
  const s = oefenState(Date.UTC(2026, 10, 14));
  const items = s.schoolKalenders[OEFENSCHOOL_ID];
  const lint = maakJaarlint(items, STANDAARD_GESPREKSCYCLUS, 'Nov');

  it('twaalf maanden van augustus tot juli, alle activiteiten geteld', () => {
    expect(lint.maanden.map((m) => m.maand)).toEqual(['Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul']);
    expect(lint.maanden.reduce((t, m) => t + m.aantal, 0)).toBe(items.length);
    expect(lint.totaal).toBe(items.length);
  });

  it('gereed onderaan, blokjes binnen de tekening', () => {
    for (const m of lint.maanden) {
      expect(m.blokken.filter((b) => b.gereed).length).toBe(Math.min(m.gereed, m.blokken.length));
      for (const b of m.blokken) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + LINT.blok).toBeLessThanOrEqual(LINT.breedte);
        expect(b.y).toBeGreaterThan(0);
      }
    }
  });

  it('elk blokje kent gebied, status en naam; de maandlijst is compleet', () => {
    for (const m of lint.maanden) {
      expect(m.lijst.length).toBe(m.aantal);
      for (const b of m.blokken) {
        expect(b.naam.length).toBeGreaterThan(0);
        expect(['BKA', 'SKA', 'OP', 'VS', 'OR']).toContain(b.gebied);
        expect(b.gereed).toBe(b.status === 'gereed');
      }
      // gereed staat onderaan in de stapel
      const eersteOpen = m.blokken.findIndex((b) => !b.gereed);
      if (eersteOpen >= 0) expect(m.blokken.slice(eersteOpen).every((b) => !b.gereed)).toBe(true);
    }
    expect(lint.gebieden.length).toBeGreaterThan(0);
  });

  it('gesprekken in hun maand en een punt bij nu', () => {
    expect(lint.maanden.find((m) => m.maand === 'Feb')?.gesprekken.map((g) => g.id)).toContain('Winter');
    expect(lint.nu?.x).toBe(lint.maanden[3].x);
    expect(lint.lijn.startsWith('M')).toBe(true);
    expect(lint.lijn).not.toContain('NaN');
  });

  it('een lege kalender geeft een vlakke lijn zonder fouten', () => {
    const leeg = maakJaarlint([], STANDAARD_GESPREKSCYCLUS, 'Aug');
    expect(leeg.totaal).toBe(0);
    expect(leeg.drukste).toBeNull();
    expect(leeg.lijn).not.toContain('NaN');
  });

  it('duur in gewone taal', () => {
    expect(duurTekst(161_000)).toBe('2 min 41 s');
    expect(duurTekst(48_200)).toBe('48 s');
  });
});
