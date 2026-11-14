import { describe, expect, it } from 'vitest';
import {
  aandachtspunten,
  afwijkingen,
  deadlineVanGesprek,
  dekkingPerStandaard,
  editScopeVoor,
  filterActiviteiten,
  gemiddeldGereed,
  heatmapCel,
  komendGesprek,
  ontbrekendeVasteStandaarden,
  overzichtPerSchool,
  scopeLabel,
  scopeVoor,
  startjaar,
  statusVoorStandaardInGesprek,
  verstrekenDeadlines,
  voortgang,
} from './berekeningen';
import { effectieveNaam, gebiedUitStandaard, maandUitPeriode, stempel, vindGesprek } from './hulp';
import {
  ACTIVITEITEN_BESTUUR,
  ACTIVITEITEN_SCHOOL,
  STANDAARDEN,
  STANDAARDEN_BESTUUR,
  STANDAARDEN_SCHOOL,
  VERPLICHTE_SCHOOLACTIVITEITEN,
} from './seed';
import { demoState, standaardCyclus } from './state';
import type { KalenderItem } from './types';

const item = (p: Partial<KalenderItem>): KalenderItem => ({
  uid: p.uid ?? Math.random().toString(36),
  activiteitId: 'OP2-01',
  maand: 'Sep',
  gesprek: 'Herfst',
  status: 'gepland',
  ...p,
});

describe('seed', () => {
  it('bevat alle ingebouwde inhoud', () => {
    expect(ACTIVITEITEN_SCHOOL).toHaveLength(67);
    expect(ACTIVITEITEN_BESTUUR).toHaveLength(30);
    expect(VERPLICHTE_SCHOOLACTIVITEITEN).toHaveLength(19);
    expect(ACTIVITEITEN_BESTUUR.filter((a) => a.verplicht)).toHaveLength(4);
    expect(STANDAARDEN).toHaveLength(16);
    expect(STANDAARDEN_BESTUUR.map((s) => s.code)).toEqual(['BKA1', 'BKA2', 'BKA3']);
    expect(STANDAARDEN_SCHOOL).toHaveLength(13);
  });
  it('maakt OP0 kern, net als het origineel', () => {
    expect(STANDAARDEN.filter((s) => s.kern).map((s) => s.code)).toEqual(['OP0', 'OP2', 'OP3', 'VS1', 'OR1']);
  });
});

describe('hulpfuncties', () => {
  it('maandUitPeriode', () => {
    expect(maandUitPeriode('sep-okt')).toBe('Sep');
    expect(maandUitPeriode('nov, mrt')).toBe('Nov');
    expect(maandUitPeriode('maart')).toBe('Mrt');
    expect(maandUitPeriode('variabel')).toBe('Sep');
    expect(maandUitPeriode('')).toBe('Sep');
    expect(maandUitPeriode('jul-aug')).toBe('Jul');
  });
  it('gebiedUitStandaard', () => {
    expect(gebiedUitStandaard('OP2')).toBe('OP');
    expect(gebiedUitStandaard('bka1')).toBe('BKA');
    expect(gebiedUitStandaard('XX1')).toBe('OP');
  });
  it('effectieveNaam', () => {
    expect(effectieveNaam(item({ activiteitId: 'OP0-01' }))).toBe(ACTIVITEITEN_SCHOOL.find((a) => a.id === 'OP0-01')!.naam);
    expect(effectieveNaam(item({ activiteitId: 'OP0-01', eigenNaam: '  Toetsweek ' }))).toBe('Toetsweek');
    expect(effectieveNaam(item({ activiteitId: 'ONBEKEND' }))).toBe('ONBEKEND');
  });
  it('vindGesprek valt terug op Doorlopend', () => {
    const c = standaardCyclus();
    expect(vindGesprek(c, 'Winter').naam).toBe('Winter');
    expect(vindGesprek(c, 'g-weg').id).toBe('Doorlopend');
  });
  it('stempel is altijd later dan de vorige versie', () => {
    expect(stempel(100)).toBe(100);
    expect(stempel(100, 50)).toBe(100);
    expect(stempel(100, 500)).toBe(501);
  });
});

describe('voortgang', () => {
  it('telt per status en rondt af', () => {
    const v = voortgang([item({ status: 'gereed' }), item({ status: 'gereed' }), item({ status: 'bezig' })]);
    expect(v).toEqual({ totaal: 3, gereed: 2, bezig: 1, gepland: 0, risico: 0, pct: 67 });
  });
  it('is 0% bij een lege lijst', () => {
    expect(voortgang([]).pct).toBe(0);
  });
});

describe('komend gesprek', () => {
  const cyclus = standaardCyclus();
  it('startjaar uit schooljaar, anders fallback', () => {
    expect(startjaar('2026/2027', 2000)).toBe(2026);
    expect(startjaar('volgend jaar', 2031)).toBe(2031);
  });
  it('deadline is de 1e van de maand; Aug-Dec startjaar, Jan-Jul startjaar + 1', () => {
    expect(deadlineVanGesprek({ maand: 'Nov' }, 2026)).toEqual(new Date(2026, 10, 1));
    expect(deadlineVanGesprek({ maand: 'Feb' }, 2026)).toEqual(new Date(2027, 1, 1));
  });
  it('kiest de eerste deadline vanaf vandaag', () => {
    const k = komendGesprek(cyclus, '2026/2027', new Date(2026, 10, 14))!;
    expect(k.gesprek.id).toBe('Winter');
    expect(k.dagenTot).toBe(79);
    expect(k.verstreken).toBe(false);
  });
  it('een deadline van vandaag telt nog mee', () => {
    const k = komendGesprek(cyclus, '2026/2027', new Date(2026, 10, 1, 15, 30))!;
    expect(k.gesprek.id).toBe('Herfst');
    expect(k.dagenTot).toBe(0);
  });
  it('zijn alle deadlines voorbij, dan het eerste gesprek met verstreken = true', () => {
    const k = komendGesprek(cyclus, '2026/2027', new Date(2027, 7, 15))!;
    expect(k.gesprek.id).toBe('Herfst');
    expect(k.verstreken).toBe(true);
    expect(k.dagenTot).toBeLessThan(0);
  });
  it('zonder cyclus null', () => {
    expect(komendGesprek([], '2026/2027')).toBeNull();
  });
});

describe('deadlines, dekking en afwijkingen', () => {
  const vandaag = new Date(2026, 10, 14);
  it('verstreken deadline: deadline < vandaag en niet gereed', () => {
    const lijst = [
      item({ uid: 'a', deadline: '2026-11-13' }),
      item({ uid: 'b', deadline: '2026-11-13', status: 'gereed' }),
      item({ uid: 'c', deadline: '2026-11-14' }),
      item({ uid: 'd' }),
    ];
    expect(verstrekenDeadlines(lijst, vandaag).map((i) => i.uid)).toEqual(['a']);
  });
  it('dekking: afgedekt = minstens één item, ongeacht status', () => {
    const d = dekkingPerStandaard(
      [item({ activiteitId: 'OP2-01', status: 'gereed' }), item({ activiteitId: 'OP2-02' })],
      STANDAARDEN_SCHOOL,
    );
    const op2 = d.find((x) => x.standaard.code === 'OP2')!;
    expect(op2).toMatchObject({ aantal: 2, gereed: 1, afgedekt: true });
    expect(d.find((x) => x.standaard.code === 'OP3')!.afgedekt).toBe(false);
  });
  it('ontbrekende vaste standaarden', () => {
    const codes = ontbrekendeVasteStandaarden([item({ activiteitId: 'OP2-01' })], STANDAARDEN_SCHOOL).map((s) => s.code);
    expect(codes).toEqual(['OP0', 'OP3', 'VS1', 'OR1']);
    expect(ontbrekendeVasteStandaarden([], STANDAARDEN_BESTUUR)).toEqual([]);
  });
  it('eigen activiteit telt mee via custom.standaard', () => {
    const eigen = item({
      activiteitId: 'EIGEN-1',
      custom: { ...ACTIVITEITEN_SCHOOL[0], id: 'EIGEN-1', standaard: 'VS1', gebied: 'VS' },
    });
    expect(ontbrekendeVasteStandaarden([eigen], STANDAARDEN_SCHOOL).map((s) => s.code)).not.toContain('VS1');
  });
  it('afwijkingen', () => {
    expect(afwijkingen([item({ afwijking: { reden: 'x' } }), item({})])).toHaveLength(1);
  });
  it('aandachtspunten met de originele teksten', () => {
    const lijst = [item({ activiteitId: 'OP2-01', status: 'risico', deadline: '2026-01-01', afwijking: { reden: 'r' } })];
    expect(aandachtspunten(lijst, STANDAARDEN_SCHOOL, vandaag).map((a) => a.tekst)).toEqual([
      'Vaste standaard OP0 (Basisvaardigheden) nog niet afgedekt',
      'Vaste standaard OP3 (Pedagogisch-didactisch handelen) nog niet afgedekt',
      'Vaste standaard VS1 (Veiligheid) nog niet afgedekt',
      'Vaste standaard OR1 (Resultaten) nog niet afgedekt',
      '1 activiteit(en) met een verstreken deadline',
      '1 activiteit(en) met status risico',
      '1 afwijking(en) van de standaardkoppeling',
    ]);
  });
});

describe('scope per niveau (demo)', () => {
  const s = demoState(1000);
  it('bestuur: bestuursitems en BKA-standaarden', () => {
    const sc = scopeVoor(s, 'bestuur', 'Noord', '1');
    expect(sc.items).toHaveLength(30);
    expect(sc.isBestuur).toBe(true);
    expect(sc.standaarden.map((x) => x.code)).toEqual(['BKA1', 'BKA2', 'BKA3']);
  });
  it('cluster: samengevoegde items van de scholen in het cluster', () => {
    expect(scopeVoor(s, 'cluster', 'Noord', '1').items).toHaveLength(2 * 67);
    expect(scopeVoor(s, 'cluster', 'Zuid', '1').items).toHaveLength(3 * 67);
  });
  it('school: items van die school', () => {
    expect(scopeVoor(s, 'school', 'Noord', '3').items).toHaveLength(67);
    expect(scopeVoor(s, 'school', 'Noord', 'bestaat-niet').items).toHaveLength(0);
  });
  it('editScope: cluster is alleen-lezen', () => {
    expect(editScopeVoor('cluster', '1')).toBeNull();
    expect(editScopeVoor('school', '1')).toEqual({ kind: 'school', schoolId: '1' });
    expect(editScopeVoor('bestuur', '1')).toEqual({ kind: 'bestuur' });
  });
  it('scopeLabel toont namen, ook de clusternaam', () => {
    expect(scopeLabel(s, 'school', 'Noord', '1')).toBe('Lyceum Noord');
    expect(scopeLabel(s, 'cluster', 'Noord', '1')).toBe('Cluster Noord');
    expect(scopeLabel(s, 'bestuur', 'Noord', '1')).toBe('Stichting Leren Verbeteren');
  });
  it('overzicht per school en gemiddeld gereed', () => {
    const o = overzichtPerSchool(s, ['1', '2']);
    expect(o[0].school?.naam).toBe('Lyceum Noord');
    expect(o[1].afwijkingen).toBe(1);
    expect(gemiddeldGereed(o)).toBe(Math.round((o[0].voortgang.pct + o[1].voortgang.pct) / 2));
    expect(gemiddeldGereed([])).toBe(0);
  });
});

describe('heatmap en status per standaard', () => {
  it('heatmapCel kleurt volgens de regels', () => {
    expect(heatmapCel([], 'Herfst')).toMatchObject({ toon: 'leeg', tekst: '—', titel: 'Geen activiteiten gekoppeld' });
    expect(heatmapCel([item({ status: 'gereed' })], 'Herfst').toon).toBe('gereed');
    expect(heatmapCel([item({ status: 'gereed' }), item({})], 'Herfst').toon).toBe('half');
    expect(heatmapCel([item({ status: 'gereed' }), item({}), item({})], 'Herfst').toon).toBe('laag');
    const r = heatmapCel([item({ status: 'gereed' }), item({ status: 'risico' })], 'Herfst');
    expect(r.toon).toBe('risico');
    expect(r.titel).toBe('1/2 gereed · 1 risico');
  });
  it('statusVoorStandaardInGesprek', () => {
    const g = 'Herfst';
    expect(statusVoorStandaardInGesprek([], g, 'OP2')).toBe('leeg');
    expect(statusVoorStandaardInGesprek([item({ status: 'gereed' })], g, 'OP2')).toBe('gereed');
    expect(statusVoorStandaardInGesprek([item({ status: 'gereed' }), item({})], g, 'OP2')).toBe('bezig');
    expect(statusVoorStandaardInGesprek([item({}), item({ status: 'risico' })], g, 'OP2')).toBe('risico');
    expect(statusVoorStandaardInGesprek([item({})], g, 'OP2')).toBe('gepland');
    expect(statusVoorStandaardInGesprek([item({})], 'Winter', 'OP2')).toBe('leeg');
  });
});

describe('bibliotheekfilter', () => {
  it('zoekt in id, naam, omschrijving en standaard', () => {
    expect(filterActiviteiten(ACTIVITEITEN_SCHOOL, { zoek: 'op0-01' }).map((a) => a.id)).toEqual(['OP0-01']);
    expect(filterActiviteiten(ACTIVITEITEN_SCHOOL, { gebied: 'VS' }).every((a) => a.gebied === 'VS')).toBe(true);
    expect(filterActiviteiten(ACTIVITEITEN_SCHOOL, { gesprek: 'Alle', gebied: 'Alle' })).toHaveLength(67);
    expect(filterActiviteiten(ACTIVITEITEN_SCHOOL, { gesprek: 'Herfst' }).every((a) => a.gesprek === 'Herfst')).toBe(true);
  });
});
