import { describe, expect, it } from 'vitest';
import { ACTIVITEITEN_SCHOOL } from './seed';
import {
  FOUT_GEEN_JSON,
  FOUT_GEEN_KALENDER,
  demoState,
  fnv1a,
  leesKalenderJson,
  legeState,
  migreer,
  naarBackupTekst,
  naarBestand,
  bestandNaarTekst,
  voorgesteldeBestandsnaam,
} from './state';
import { scopeVoor } from './berekeningen';
import { oudeBackupV4 } from './testdata';

describe('lege state en demo', () => {
  it('lege state toont het welkomstscherm', () => {
    const s = legeState();
    expect(s.versie).toBe(5);
    expect(s.setupVoltooid).toBe(false);
    expect(s.organisatie.gesprekscyclus.map((g) => g.id)).toEqual(['Herfst', 'Winter', 'Lente', 'Zomer']);
  });
  it('demo is deterministisch en volledig', () => {
    const a = demoState(1);
    const b = demoState(1);
    expect(a).toEqual(b);
    expect(a.modus).toBe('demo');
    expect(a.setupVoltooid).toBe(true);
    expect(a.organisatie.scholen.map((s) => s.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(Object.values(a.schoolKalenders).every((l) => l.length === 67)).toBe(true);
    expect(a.bestuurItems).toHaveLength(30);
    expect(a.schoolKalenders['2'].find((i) => i.activiteitId === 'VS2-01')).toMatchObject({
      gesprek: 'Winter',
      afwijking: { reden: 'Afgestemd op de MTO-cyclus van het bestuur.' },
    });
    expect(a.schoolKalenders['5'].find((i) => i.activiteitId === 'OP3-05')!.gesprek).toBe('Doorlopend');
  });
  it('demostatussen komen overeen met het origineel (screenshots)', () => {
    // Lyceum Noord: 67 activiteiten, 21% gereed (14 gereed, 4 bezig, 49 gepland, 0 risico)
    const s = demoState(1);
    const items = scopeVoor(s, 'school', '', '1').items;
    const tel = (st: string) => items.filter((i) => i.status === st).length;
    expect([tel('gereed'), tel('bezig'), tel('gepland'), tel('risico')]).toEqual([14, 4, 49, 0]);
    const bestuur = s.bestuurItems;
    expect(bestuur.filter((i) => i.status === 'gereed')).toHaveLength(8);
  });
  it('fnv1a', () => {
    expect(fnv1a('')).toBeCloseTo(2166136261 / 4294967295);
  });
});

describe('migratie', () => {
  it('v4 → v5 zonder verlies', () => {
    const oud = oudeBackupV4();
    const s = migreer(JSON.parse(JSON.stringify(oud)))!;
    expect(s).not.toBeNull();
    expect(s.versie).toBe(5);
    expect(s.schooljaar).toBe('2025/2026');
    expect(s.onboardingVerborgen).toBe(true);
    expect(s.organisatie.scholen.map((x) => x.id)).toEqual(['1', '7']);
    expect(s.organisatie.scholen[0]).toMatchObject({ naam: 'Lyceum Noord', type: 'havo/vwo', cluster: 'noord' });
    // extra velden blijven behouden
    expect((s.organisatie.clusters[0] as unknown as { scholen: number[] }).scholen).toEqual([1]);
    expect(s.organisatie.gesprekscyclus).toEqual(oud.organisatie.gesprekscyclus);
    // items exact gelijk
    expect(s.schoolKalenders['1']).toEqual(oud.schoolKalenders['1']);
    expect(s.schoolKalenders['7']).toEqual([]);
    expect(s.bestuurItems).toEqual(oud.bestuurItems);
    expect(s.tijden).toEqual({});
    expect(s.verwijderd).toEqual({});
  });
  it('v3 en v2 (zonder cyclus) worden ook gelezen', () => {
    const v3 = { ...oudeBackupV4(), versie: 3 };
    expect(migreer(v3)?.versie).toBe(5);
    const v2 = oudeBackupV4() as Record<string, unknown>;
    v2.versie = 2;
    delete (v2.organisatie as Record<string, unknown>).gesprekscyclus;
    const s = migreer(v2)!;
    expect(s.organisatie.gesprekscyclus.map((g) => g.id)).toEqual(['Herfst', 'Winter', 'Lente', 'Zomer']);
  });
  it('weigert onzin en onbekende versies', () => {
    expect(migreer(null)).toBeNull();
    expect(migreer({})).toBeNull();
    expect(migreer({ versie: 1, organisatie: { scholen: [] } })).toBeNull();
    expect(migreer({ versie: 6, organisatie: { scholen: [] } })).toBeNull();
    expect(migreer({ versie: 4, organisatie: {} })).toBeNull();
  });
  it('v5-back-up is idempotent', () => {
    const s = demoState(5);
    expect(migreer(JSON.parse(naarBackupTekst(s)))).toEqual(s);
  });
  it('kalenderbestand wordt een state in eigen modus', () => {
    const d = demoState(5);
    const tekst = bestandNaarTekst(naarBestand(d, new Date(0)));
    const r = leesKalenderJson(tekst);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isBestand).toBe(true);
    expect(r.state.modus).toBe('eigen');
    expect(r.state.setupVoltooid).toBe(true);
    expect(r.state.schoolKalenders).toEqual(d.schoolKalenders);
    expect('formaat' in r.state).toBe(false);
  });
  it('foutmeldingen zoals het origineel', () => {
    expect(leesKalenderJson('{kapot')).toEqual({ ok: false, fout: FOUT_GEEN_JSON });
    expect(leesKalenderJson('{"a":1}')).toEqual({ ok: false, fout: FOUT_GEEN_KALENDER });
  });
  it('kalenderbestand bevat geen lokale velden', () => {
    const b = naarBestand(demoState(1));
    expect(Object.keys(b).sort()).toEqual(
      [
        'bestuurItems',
        'formaat',
        'opgeslagenOp',
        'organisatie',
        'schoolKalenders',
        'schooljaar',
        'tijden',
        'verwijderd',
        'versie',
      ].sort(),
    );
  });
  it('bestandsnaam', () => {
    expect(voorgesteldeBestandsnaam('Stichting Één & Twee')).toBe('stichting-een-twee.kwaliteitskalender.json');
    expect(voorgesteldeBestandsnaam('')).toBe('kalender.kwaliteitskalender.json');
  });
});

it('alle demo-activiteiten verwijzen naar de bibliotheek', () => {
  const ids = new Set(ACTIVITEITEN_SCHOOL.map((a) => a.id));
  expect(demoState(1).schoolKalenders['1'].every((i) => ids.has(i.activiteitId))).toBe(true);
});
