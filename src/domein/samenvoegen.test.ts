import { describe, expect, it } from 'vitest';
import * as m from './mutaties';
import { canoniek, maakBasis, metGedeeld, samenvoegen, vingerafdruk } from './samenvoegen';
import { demoState, gedeeldDeel, legeState, migreer } from './state';
import { oudeBackupV4 } from './testdata';
import type { EditScope, State } from './types';

const school1: EditScope = { kind: 'school', schoolId: '1' };
const uid = 's1-OP0-01';
const item = (s: State, u = uid, schoolId = '1') => s.schoolKalenders[schoolId]?.find((i) => i.uid === u);

/** Simuleer twee collega's met een gemeenschappelijke start. */
function tweeKanten() {
  const basisState = demoState(1000);
  const basis = maakBasis(basisState);
  return { a: structuredClone(basisState), b: structuredClone(basisState), basis };
}

/** Synchroniseer: voeg samen en neem het resultaat over. */
function sync(lokaal: State, extern: State, basis?: Record<string, string>) {
  const r = samenvoegen(lokaal, extern, basis);
  return { ...r, state: metGedeeld(lokaal, r.resultaat) };
}

describe('samenvoegen: basis', () => {
  it('identieke kanten: niets te doen', () => {
    const { a, b, basis } = tweeKanten();
    const r = samenvoegen(a, b, basis);
    expect(r.lokaalGewijzigd).toBe(false);
    expect(r.externGewijzigd).toBe(false);
    expect(r.conflicten).toEqual([]);
    expect(r.binnenkomend).toEqual([]);
  });

  it('volgorde maakt niet uit voor de vergelijking', () => {
    const { a, b } = tweeKanten();
    b.schoolKalenders['1'] = [...b.schoolKalenders['1']].reverse();
    b.organisatie.scholen = [...b.organisatie.scholen].reverse();
    expect(vingerafdruk(a)).toBe(vingerafdruk(b));
    expect(samenvoegen(a, b).externGewijzigd).toBe(false);
  });

  it('is commutatief: beide kanten komen op hetzelfde uit', () => {
    let { a, b } = tweeKanten();
    a = m.moveItem(a, school1, uid, 'Mei', 2000);
    a = m.setBestuurNaam(a, 'Naam A', 2100);
    b = m.moveItem(b, school1, uid, 'Jun', 2500);
    b = m.removeItem(b, school1, 's1-OP0-02', 2600);
    b = m.addSchool(b, { naam: 'Nieuw' }, 2700).state;
    const ab = samenvoegen(a, b).resultaat;
    const ba = samenvoegen(b, a).resultaat;
    expect(vingerafdruk(ab)).toBe(vingerafdruk(ba));
  });

  it('is idempotent', () => {
    let { a, b } = tweeKanten();
    a = m.moveItem(a, school1, uid, 'Mei', 2000);
    b = m.removeItem(b, school1, 's1-OP0-02', 2600);
    const r1 = samenvoegen(a, b).resultaat;
    const r2 = samenvoegen(r1, b);
    expect(r2.lokaalGewijzigd).toBe(false);
    const r3 = samenvoegen(r1, r1);
    expect(r3.externGewijzigd).toBe(false);
  });
});

describe('samenvoegen: nieuwste wint per entiteit', () => {
  it('verschillende velden op verschillende items blijven allebei bewaard', () => {
    let { a, b, basis } = tweeKanten();
    a = m.setItemStatus(a, school1, uid, 'risico', 2000);
    b = m.setEigenaar(b, school1, 's1-OP0-02', 'Teamleider', 2500);
    const r = sync(a, b, basis);
    expect(item(r.state)!.status).toBe('risico');
    expect(item(r.state, 's1-OP0-02')!.eigenaar).toBe('Teamleider');
    expect(r.conflicten).toEqual([]);
    expect(r.lokaalGewijzigd).toBe(true);
    expect(r.externGewijzigd).toBe(true);
    expect(r.binnenkomend).toHaveLength(1);
    expect(r.binnenkomend[0]).toMatchObject({ soort: 'item', actie: 'gewijzigd' });
    expect(r.binnenkomend[0].omschrijving).toContain('(Lyceum Noord)');
  });

  it('zelfde item op beide kanten gewijzigd: nieuwste wint en het is een conflict', () => {
    let { a, b, basis } = tweeKanten();
    a = m.moveItem(a, school1, uid, 'Mei', 3000);
    b = m.setItemStatus(b, school1, uid, 'risico', 2000);
    const r = sync(a, b, basis);
    expect(item(r.state)).toMatchObject({ maand: 'Mei', gewijzigd: 3000 });
    expect(r.conflicten).toHaveLength(1);
    expect(r.conflicten[0]).toMatchObject({ soort: 'item', bewaard: 'lokaal' });
    expect(r.conflicten[0].omschrijving).toMatch(/^Afname genormeerde toetsen Taal \(1\) \(Lyceum Noord\)$/);
    // de andere kant krijgt hetzelfde resultaat en hetzelfde conflict
    const r2 = sync(b, a, basis);
    expect(item(r2.state)).toMatchObject({ maand: 'Mei', gewijzigd: 3000 });
    expect(r2.conflicten[0].bewaard).toBe('extern');
  });

  it('zonder basis worden geen conflicten gemeld', () => {
    let { a, b } = tweeKanten();
    a = m.moveItem(a, school1, uid, 'Mei', 3000);
    b = m.setItemStatus(b, school1, uid, 'risico', 2000);
    expect(samenvoegen(a, b).conflicten).toEqual([]);
  });

  it('alleen een wijziging aan één kant is geen conflict', () => {
    let { a, b, basis } = tweeKanten();
    b = m.moveItem(b, school1, uid, 'Mei', 3000);
    const r = sync(a, b, basis);
    expect(r.conflicten).toEqual([]);
    expect(r.binnenkomend).toHaveLength(1);
    a = r.state;
    // na synchronisatie: basis bijwerken; nu wijzigt alleen A hetzelfde item
    const basis2 = r.basis;
    a = m.moveItem(a, school1, uid, 'Jun', 4000);
    expect(samenvoegen(a, b, basis2).conflicten).toEqual([]);
  });

  it('gelijke tijdstempel en verschillende inhoud: deterministische keuze', () => {
    let { a, b } = tweeKanten();
    a = m.moveItem(a, school1, uid, 'Mei', 3000);
    b = m.moveItem(b, school1, uid, 'Jun', 3000);
    const r1 = samenvoegen(a, b).resultaat;
    const r2 = samenvoegen(b, a).resultaat;
    expect(canoniek(r1.schoolKalenders['1'].find((i) => i.uid === uid))).toBe(
      canoniek(r2.schoolKalenders['1'].find((i) => i.uid === uid)),
    );
  });

  it('instellingen hebben elk een eigen tijdstempel', () => {
    let { a, b, basis } = tweeKanten();
    a = m.setBestuurNaam(a, 'Naam A', 2000);
    b = m.setSchooljaar(b, '2027/2028', 2500);
    const r = sync(a, b, basis);
    expect(r.state.organisatie.bestuurNaam).toBe('Naam A');
    expect(r.state.schooljaar).toBe('2027/2028');
    expect(r.conflicten).toEqual([]);
    b = m.setBestuurNaam(b, 'Naam B', 3000);
    const r2 = sync(a, b, basis);
    expect(r2.state.organisatie.bestuurNaam).toBe('Naam B');
    expect(r2.conflicten.map((c) => c.omschrijving)).toEqual(['Naam van het bestuur']);
  });
});

describe('samenvoegen: verwijderen', () => {
  it('een verwijderd item komt niet terug', () => {
    let { a, b, basis } = tweeKanten();
    a = m.removeItem(a, school1, uid, 2000);
    const r = sync(a, b, basis);
    expect(item(r.state)).toBeUndefined();
    expect(r.state.verwijderd[`item:s:1:${uid}`]).toBe(2000);
    expect(r.externGewijzigd).toBe(true);
    // B neemt het bestand over en verliest het item ook
    const rb = sync(b, r.state, basis);
    expect(item(rb.state)).toBeUndefined();
    expect(rb.binnenkomend).toEqual([expect.objectContaining({ actie: 'verwijderd', soort: 'item' })]);
  });

  it('verwijderen wint van een oudere wijziging, een latere wijziging wint van verwijderen', () => {
    let { a, b, basis } = tweeKanten();
    a = m.removeItem(a, school1, uid, 3000);
    b = m.moveItem(b, school1, uid, 'Mei', 2000);
    expect(item(sync(a, b, basis).state)).toBeUndefined();
    const b2 = m.moveItem(b, school1, uid, 'Jun', 4000);
    const r = sync(a, b2, basis);
    expect(item(r.state)?.maand).toBe('Jun');
    expect(r.state.verwijderd[`item:s:1:${uid}`]).toBeUndefined();
    expect(r.conflicten).toHaveLength(1);
  });

  it('school verwijderd: haar kalender verdwijnt, ook items die de ander nog toevoegde', () => {
    let { a, b, basis } = tweeKanten();
    a = m.removeSchool(a, '2', 5000);
    b = m.addActiviteit(b, { kind: 'school', schoolId: '2' }, 'OP2-01', 4000).state;
    const r = sync(a, b, basis);
    expect(r.state.organisatie.scholen.map((s) => s.id)).not.toContain('2');
    expect(r.state.schoolKalenders['2']).toBeUndefined();
  });

  it('cluster verwijderen en school verplaatsen tegelijk', () => {
    let { a, b, basis } = tweeKanten();
    a = m.removeCluster(a, 'Noord', 2000);
    b = m.updateSchool(b, '3', { naam: 'VMBO Zuid-West' }, 2500);
    const r = sync(a, b, basis);
    expect(r.state.organisatie.clusters.map((c) => c.id)).toEqual(['Zuid']);
    expect(r.state.organisatie.scholen.find((s) => s.id === '1')!.cluster).toBe('');
    expect(r.state.organisatie.scholen.find((s) => s.id === '3')!.naam).toBe('VMBO Zuid-West');
  });

  it('gesprek verwijderd: items gaan naar Doorlopend en het gesprek komt niet terug', () => {
    let { a, b, basis } = tweeKanten();
    a = m.removeGesprek(a, 'Lente', 2000);
    const r = sync(a, b, basis);
    expect(r.state.organisatie.gesprekscyclus.map((g) => g.id)).toEqual(['Herfst', 'Winter', 'Zomer']);
    expect(
      Object.values(r.state.schoolKalenders)
        .flat()
        .some((i) => i.gesprek === 'Lente'),
    ).toBe(false);
  });
});

describe('samenvoegen: gelijktijdig toevoegen', () => {
  it('twee nieuwe scholen tegelijk botsen niet', () => {
    let { a, b, basis } = tweeKanten();
    const ra = m.addSchool(a, { naam: 'School A' }, 2000);
    const rb = m.addSchool(b, { naam: 'School B' }, 2000);
    a = m.addActiviteit(ra.state, { kind: 'school', schoolId: ra.id }, 'OP2-01', 2100).state;
    b = m.addActiviteit(rb.state, { kind: 'school', schoolId: rb.id }, 'OP3-01', 2100).state;
    const r = sync(a, b, basis);
    expect(r.state.organisatie.scholen.map((s) => s.naam)).toEqual(
      expect.arrayContaining(['School A', 'School B', 'Lyceum Noord']),
    );
    expect(r.state.organisatie.scholen).toHaveLength(7);
    expect(r.state.schoolKalenders[ra.id]).toHaveLength(1);
    expect(r.state.schoolKalenders[rb.id]).toHaveLength(1);
    expect(r.conflicten).toEqual([]);
  });

  it('twee keer hetzelfde sjabloon toepassen geeft geen dubbele items of conflicten', () => {
    const start = m.addSchool(legeState(), { naam: 'A' }, 1);
    const basis = maakBasis(start.state);
    const a = m.pasSjabloonToe(start.state, 2000);
    const b = m.pasSjabloonToe(start.state, 2500);
    const r = sync(a, b, basis);
    expect(r.state.schoolKalenders[start.id]).toHaveLength(19);
    expect(r.conflicten).toEqual([]);
  });

  it('gelijktijdig dezelfde bibliotheekactiviteit toevoegen geeft twee items (uuid)', () => {
    let { a, b, basis } = tweeKanten();
    a = m.addActiviteit(a, { kind: 'bestuur' }, 'MON-02', 2000).state;
    b = m.addActiviteit(b, { kind: 'bestuur' }, 'MON-02', 2000).state;
    const r = sync(a, b, basis);
    expect(r.state.bestuurItems.filter((i) => i.activiteitId === 'MON-02').length).toBe(
      a.bestuurItems.filter((i) => i.activiteitId === 'MON-02').length + 1,
    );
  });
});

describe('samenvoegen: oude back-ups en eerste koppeling', () => {
  it('oude back-up (zonder tijdstempels) samenvoegen met een lege kalender', () => {
    const oud = migreer(oudeBackupV4())!;
    const r = sync(legeState(), oud);
    expect(r.state.organisatie.bestuurNaam).toBe('Stichting Voorbeeld');
    expect(r.state.schoolKalenders['1']).toEqual(oud.schoolKalenders['1']);
    expect(r.state.organisatie.gesprekscyclus.map((g) => g.id)).toEqual(
      expect.arrayContaining(['Herfst', 'g-1a2b3c4d', 'Winter']),
    );
  });

  it('wijziging na import wint van de oude versie', () => {
    const oud = migreer(oudeBackupV4())!;
    const a = m.moveItem(oud, school1, uid, 'Jul', 10);
    const r = sync(oud, a);
    expect(item(r.state)!.maand).toBe('Jul');
  });

  it('gedeeldDeel bevat geen lokale velden', () => {
    const g = gedeeldDeel(demoState(1)) as unknown as Record<string, unknown>;
    expect(g.modus).toBeUndefined();
    expect(g.setupVoltooid).toBeUndefined();
  });

  it('drie collega’s convergeren', () => {
    let { a, b, basis } = tweeKanten();
    let c = structuredClone(a);
    a = m.setItemStatus(a, school1, uid, 'risico', 2000);
    b = m.removeItem(b, school1, 's1-OP0-02', 2100);
    c = m.updateSchool(c, '4', { type: 'isk/vso' }, 2200);
    // bestand begint als basis; ieder synchroniseert om de beurt (bestand = laatste resultaat)
    let bestand: State = structuredClone(a);
    bestand = { ...bestand, ...samenvoegen(a, bestand, basis).resultaat };
    bestand = { ...bestand, ...samenvoegen(b, bestand, basis).resultaat };
    bestand = { ...bestand, ...samenvoegen(c, bestand, basis).resultaat };
    const fa = metGedeeld(a, samenvoegen(a, bestand, basis).resultaat);
    const fb = metGedeeld(b, samenvoegen(b, bestand, basis).resultaat);
    const fc = metGedeeld(c, samenvoegen(c, bestand, basis).resultaat);
    expect(vingerafdruk(fa)).toBe(vingerafdruk(fb));
    expect(vingerafdruk(fb)).toBe(vingerafdruk(fc));
    expect(item(fa)!.status).toBe('risico');
    expect(item(fa, 's1-OP0-02')).toBeUndefined();
    expect(fa.organisatie.scholen.find((s) => s.id === '4')!.type).toBe('isk/vso');
  });
});
