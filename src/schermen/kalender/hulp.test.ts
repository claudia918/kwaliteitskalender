import { describe, expect, it } from 'vitest';
import { STANDAARDEN_SCHOOL } from '../../domein/seed';
import type { KalenderItem } from '../../domein/types';
import {
  bundel,
  gesprekkenPerMaand,
  isBruikbareLink,
  itemsPerMaand,
  maandTitel,
  maandVanDatum,
  matrixGroepen,
  periodeVan,
  recenteHistorie,
  verschuifMaand,
  zoekItem,
} from './hulp';

const item = (uid: string, activiteitId: string, maand: KalenderItem['maand'], extra: Partial<KalenderItem> = {}): KalenderItem => ({
  uid,
  activiteitId,
  maand,
  gesprek: 'Herfst',
  status: 'gepland',
  ...extra,
});

describe('kalender-hulp', () => {
  it('maanden en periodes', () => {
    expect(verschuifMaand('Aug', -1)).toBeNull();
    expect(verschuifMaand('Jul', 1)).toBeNull();
    expect(verschuifMaand('Dec', 1)).toBe('Jan');
    expect(periodeVan('Jan')).toBe('eerste');
    expect(periodeVan('Feb')).toBe('tweede');
    expect(maandVanDatum(new Date(2026, 10, 14))).toBe('Nov');
    expect(maandTitel('Mrt')).toBe('Maart');
  });

  it('gesprekken per maand', () => {
    const g = gesprekkenPerMaand([
      { id: 'Herfst', naam: 'Herfst', maand: 'Nov', kleur: 'Herfst', icoon: 'blad', volgorde: 0 },
      { id: 'g-1', naam: 'Extra', maand: 'Nov', kleur: 'Winter', icoon: 'vlag', volgorde: 1 },
    ]);
    expect(g.Nov.map((x) => x.id)).toEqual(['Herfst', 'g-1']);
    expect(g.Dec).toEqual([]);
  });

  it('matrix: items per standaard en maand, onbekende in een extra groep', () => {
    const items = [item('a', 'OP2-01', 'Nov'), item('b', 'OP2-02', 'Nov'), item('c', 'BKA1-01', 'Sep'), item('d', 'BESTAATNIET', 'Okt')];
    const groepen = matrixGroepen(STANDAARDEN_SCHOOL, items);
    const op2 = groepen.flatMap((g) => g.rijen).find((r) => r.code === 'OP2')!;
    expect(op2.cellen.Nov.map((i) => i.uid).sort()).toEqual(['a', 'b']);
    expect(op2.aantal).toBe(2);
    const overig = groepen.find((g) => g.gebied === null)!;
    expect(overig.rijen.map((r) => r.code).sort()).toEqual(['?', 'BKA1']);
    expect(groepen[0].titel).toMatch(/^SKA · /);
  });

  it('bundel per activiteit (cluster)', () => {
    const b = bundel([item('s1-x', 'OP2-01', 'Nov'), item('s2-x', 'OP2-01', 'Nov'), item('s1-y', 'OP2-02', 'Nov')]);
    expect(b.map((x) => x.items.length)).toEqual([2, 1]);
  });

  it('lijst per maand in kalendervolgorde', () => {
    const l = itemsPerMaand([item('a', 'OP2-01', 'Jan'), item('b', 'OP2-02', 'Aug')]);
    expect(l.map((x) => x.maand)).toEqual(['Aug', 'Jan']);
  });

  it('item zoeken over alle kalenders', () => {
    const s = { bestuurItems: [item('b1', 'BKA1-01', 'Sep')], schoolKalenders: { '2': [item('x', 'OP2-01', 'Nov')] } };
    expect(zoekItem(s, 'x')?.plek).toEqual({ kind: 'school', schoolId: '2' });
    expect(zoekItem(s, 'b1')?.plek).toEqual({ kind: 'bestuur' });
    expect(zoekItem(s, 'nee')).toBeNull();
  });

  it('historie: laatste vijf, nieuwste eerst', () => {
    const h = Array.from({ length: 7 }, (_, i) => ({ status: 'bezig' as const, datum: `2026-01-0${i + 1}` }));
    const r = recenteHistorie(item('a', 'OP2-01', 'Nov', { historie: h }));
    expect(r.length).toBe(5);
    expect(r[0].datum).toBe('2026-01-07');
  });

  it('bewijslinks', () => {
    expect(isBruikbareLink('')).toBe(true);
    expect(isBruikbareLink('https://school.sharepoint.com/sites/kwaliteit/verslag.docx')).toBe(true);
    expect(isBruikbareLink('\\\\server\\kwaliteit\\Verslag herfst.docx')).toBe(true);
    expect(isBruikbareLink('intranet.school.nl/kwaliteit')).toBe(true);
    expect(isBruikbareLink('javascript:alert(1)')).toBe(false);
    expect(isBruikbareLink('zomaar wat tekst')).toBe(false);
  });
});
