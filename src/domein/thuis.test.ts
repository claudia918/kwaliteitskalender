import { describe, expect, it } from 'vitest';
import { BEGRIPPEN, BEGRIPPEN_LIJST } from './begrippen';
import { komendGesprek } from './berekeningen';
import { STANDAARDEN_SCHOOL, VASTE_STANDAARDEN } from './seed';
import { standaardCyclus } from './state';
import {
  eersteOpenItem,
  gewijzigdSinds,
  itemsInMaand,
  lijstTekst,
  maandVan,
  maandVoluit,
  stapTekst,
  volgendeStap,
  werklijstVolgorde,
} from './thuis';
import type { KalenderItem } from './types';
import { normaliseer, zoekIn, zoekScore } from './zoeken';

const item = (uid: string, p: Partial<KalenderItem> = {}): KalenderItem => ({
  uid,
  activiteitId: 'OP2-01',
  maand: 'Nov',
  gesprek: 'Winter',
  status: 'gepland',
  ...p,
});

/** Eén item per vaste standaard, zodat die niet als stap terugkomen. */
const vasteDekking = (): KalenderItem[] =>
  VASTE_STANDAARDEN.map((code, i) => ({
    ...item(`v${i}`, { gesprek: 'Doorlopend', status: 'gereed' }),
    activiteitId: `EIGEN-${code}`,
    custom: {
      id: `EIGEN-${code}`,
      naam: `Dekking ${code}`,
      omschrijving: '',
      standaard: code,
      gebied: 'OP',
      gesprek: 'Doorlopend',
      periode: '',
      frequentie: '',
      verantwoordelijke: '',
      verplicht: false,
      tags: [],
      type: 'school',
    },
  }));

const vandaag = new Date(2026, 10, 14); // 14 november 2026
const komend = komendGesprek(standaardCyclus(), '2026/2027', vandaag);

describe('maandVan', () => {
  it('geeft de kalendermaand', () => {
    expect(maandVan(new Date(2026, 10, 14))).toBe('Nov');
    expect(maandVan(new Date(2027, 0, 1))).toBe('Jan');
    expect(maandVan(new Date(2026, 7, 31))).toBe('Aug');
    expect(maandVan(new Date(2027, 6, 1))).toBe('Jul');
    expect(maandVoluit('Nov')).toBe('november');
    expect(maandVoluit('Mrt')).toBe('maart');
  });
});

describe('werklijst', () => {
  it('sorteert op deadline, niet op status', () => {
    const lijst = werklijstVolgorde([
      item('a', { deadline: '2026-12-01', status: 'gereed' }),
      item('b'),
      item('c', { deadline: '2026-11-20' }),
    ]);
    expect(lijst.map((i) => i.uid)).toEqual(['c', 'a', 'b']);
  });
  it('itemsInMaand filtert op maand', () => {
    expect(itemsInMaand([item('a'), item('b', { maand: 'Dec' })], 'Nov').map((i) => i.uid)).toEqual(['a']);
  });
  it('eersteOpenItem kiest risico boven bezig boven gepland', () => {
    expect(eersteOpenItem([item('a'), item('b', { status: 'bezig' }), item('c', { status: 'risico' })])?.uid).toBe('c');
    expect(eersteOpenItem([item('a', { status: 'gereed' })])).toBeUndefined();
  });
});

describe('volgendeStap', () => {
  const basis = { niveau: 'school' as const, standaarden: STANDAARDEN_SCHOOL, komend, aantalScholen: 1, vandaag };

  it('bestuur zonder scholen: scholen toevoegen', () => {
    expect(volgendeStap({ ...basis, niveau: 'bestuur', aantalScholen: 0, items: [] }).soort).toBe('scholen-toevoegen');
  });
  it('lege kalender', () => {
    expect(volgendeStap({ ...basis, items: [] }).soort).toBe('kalender-leeg');
  });
  it('verstreken deadline gaat voor', () => {
    const s = volgendeStap({ ...basis, items: [...vasteDekking(), item('x', { deadline: '2026-11-01', status: 'risico' })] });
    expect(s.soort).toBe('verstreken');
  });
  it('risico daarna', () => {
    expect(volgendeStap({ ...basis, items: [...vasteDekking(), item('x', { status: 'risico' })] }).soort).toBe('risico');
  });
  it('ontbrekende vaste standaard', () => {
    const s = volgendeStap({ ...basis, items: [item('x', { status: 'gereed' })] });
    expect(s.soort).toBe('vaste-standaard');
    if (s.soort === 'vaste-standaard') expect(s.codes).not.toContain('OP2');
  });
  it('open activiteiten voor het komende gesprek, met de beste om mee te beginnen', () => {
    const s = volgendeStap({ ...basis, items: [...vasteDekking(), item('a'), item('b', { status: 'bezig' })] });
    expect(s.soort).toBe('gesprek-open');
    if (s.soort === 'gesprek-open') {
      expect(s.gesprek.id).toBe('Winter');
      expect(s.open).toHaveLength(2);
      expect(s.eerste.uid).toBe('b');
    }
    expect(stapTekst(s).zin).toContain('gesprek Winter (over 79 dagen) staan nog 2 activiteiten open');
  });
  it('alles gereed: dossier maken', () => {
    const s = volgendeStap({ ...basis, items: [...vasteDekking(), item('a', { status: 'gereed' })] });
    expect(s.soort).toBe('gesprek-klaar');
    expect(stapTekst(s).knop).toBe('Gespreksdossier maken');
  });
  it('cluster: school met ontbrekende vaste standaard', () => {
    const s = volgendeStap({
      ...basis,
      niveau: 'cluster',
      items: [item('a', { status: 'gereed' })],
      scholenZonderVaste: [{ schoolId: '2', schoolNaam: 'VMBO Zuid', codes: ['OP0', 'VS1'] }],
    });
    expect(s.soort).toBe('school-vaste-standaard');
    expect(stapTekst(s, false).zin).toBe('VMBO Zuid heeft nog geen activiteit voor de vaste standaarden OP0 en VS1.');
  });
  it('bestuur met lege bestuurskalender maar gevulde scholen: niet leeg', () => {
    const s = volgendeStap({ ...basis, niveau: 'bestuur', standaarden: [], items: [], elders: true });
    expect(s.soort).toBe('gesprek-leeg');
  });
  it('zonder cyclus', () => {
    expect(volgendeStap({ ...basis, komend: null, items: vasteDekking() }).soort).toBe('geen-cyclus');
  });
  it('teksten zonder em dash', () => {
    for (const s of [
      volgendeStap({ ...basis, items: [] }),
      volgendeStap({ ...basis, items: [...vasteDekking(), item('a')] }),
    ]) {
      expect(stapTekst(s).zin).not.toMatch(/—/);
    }
  });
});

describe('lijstTekst en gewijzigdSinds', () => {
  it('lijstTekst', () => {
    expect(lijstTekst(['A'])).toBe('A');
    expect(lijstTekst(['A', 'B', 'C'])).toBe('A, B en C');
  });
  it('alleen wijzigingen tussen vorig en dit bezoek', () => {
    const items = [item('a', { gewijzigd: 5 }), item('b', { gewijzigd: 15 }), item('c', { gewijzigd: 25 }), item('d')];
    expect(gewijzigdSinds(items, 10, 20).map((i) => i.uid)).toEqual(['b']);
  });
});

describe('zoeken', () => {
  it('normaliseert accenten en hoofdletters', () => {
    expect(normaliseer('Ideeën  Café')).toBe('ideeen cafe');
  });
  it('alle woorden moeten voorkomen', () => {
    expect(zoekScore('lesuitval analyse', 'Analyse lesuitval eerste semester')).toBeGreaterThan(0);
    expect(zoekScore('lesuitval zomer', 'Analyse lesuitval eerste semester')).toBe(0);
    expect(zoekScore('zomer', 'Analyse lesuitval', 'Zomer')).toBeGreaterThan(0);
  });
  it('begin van de naam scoort hoger', () => {
    const r = zoekIn(['Vaste standaard', 'Dekking vaste standaarden', 'Iets anders'], 'vaste', (x) => [x]);
    expect(r.map((t) => t.waarde)).toEqual(['Vaste standaard', 'Dekking vaste standaarden']);
  });
});

describe('begrippen', () => {
  it('hebben een korte uitleg zonder em dash', () => {
    for (const b of BEGRIPPEN_LIJST) {
      expect(b.uitleg.length).toBeGreaterThan(20);
      expect(b.uitleg.length).toBeLessThan(260);
      expect(b.uitleg).not.toMatch(/—/);
      expect(BEGRIPPEN[b.sleutel]).toBe(b);
    }
  });
});
