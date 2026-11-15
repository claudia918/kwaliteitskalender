import { describe, expect, it } from 'vitest';
import { ACTIVITEITEN_SCHOOL } from './seed';
import { demoState } from './state';
import { maandVan } from './thuis';
import {
  OEFENBESTUUR_NAAM,
  OEFENSCHOOL_ID,
  alleItems,
  ietsVerschoven,
  meet,
  oefenState,
  overlapt,
  plaatsKaart,
  type Rechthoek,
} from './oefenen';

const NU = Date.UTC(2026, 10, 14, 12);

describe('oefenState', () => {
  it('is herkenbaar als oefenen en klaar voor gebruik', () => {
    const s = oefenState(NU);
    expect(s.organisatie.bestuurNaam).toBe(OEFENBESTUUR_NAAM);
    expect(s.setupVoltooid).toBe(true);
    expect(s.modus).toBe('demo');
  });

  it('heeft op de oefenschool iets om toe te voegen', () => {
    const s = oefenState(NU);
    const opKalender = new Set(s.schoolKalenders[OEFENSCHOOL_ID].map((i) => i.activiteitId));
    const ontbreekt = ACTIVITEITEN_SCHOOL.filter((a) => !opKalender.has(a.id));
    expect(ontbreekt.length).toBeGreaterThanOrEqual(5);
    expect(ontbreekt.every((a) => !a.verplicht)).toBe(true);
  });

  it('heeft in elke maand minstens drie open activiteiten om af te vinken', () => {
    for (let m = 0; m < 12; m++) {
      const vandaag = new Date(2026, m, 15);
      const s = oefenState(NU, vandaag);
      const open = s.schoolKalenders[OEFENSCHOOL_ID].filter((i) => i.maand === maandVan(vandaag) && i.status !== 'gereed');
      expect(open.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('is deterministisch en raakt de demo niet', () => {
    const demo = JSON.stringify(demoState(NU));
    expect(JSON.stringify(oefenState(NU))).toBe(JSON.stringify(oefenState(NU)));
    oefenState(NU);
    expect(JSON.stringify(demoState(NU))).toBe(demo);
  });
});

describe('meten', () => {
  it('ziet gereed, toevoegen en verschuiven', () => {
    const s = oefenState(NU);
    const voor = meet(s);
    expect(voor.aantal).toBe(alleItems(s).length);
    const [eerste] = s.schoolKalenders[OEFENSCHOOL_ID];
    const na = structuredClone(s);
    na.schoolKalenders[OEFENSCHOOL_ID][0] = { ...eerste, maand: eerste.maand === 'Jan' ? 'Feb' : 'Jan' };
    expect(ietsVerschoven(voor, meet(na))).toBe(true);
    expect(ietsVerschoven(voor, meet(s))).toBe(false);
    // een nieuw item telt niet als verschuiving
    na.schoolKalenders[OEFENSCHOOL_ID][0] = eerste;
    na.schoolKalenders[OEFENSCHOOL_ID].push({ ...eerste, uid: 'nieuw', maand: 'Jul' });
    expect(ietsVerschoven(voor, meet(na))).toBe(false);
    expect(meet(na).aantal).toBe(voor.aantal + 1);
  });
});

describe('plaatsKaart', () => {
  const kaart = { width: 360, height: 200 };
  const venster = { width: 1440, height: 900 };
  const binnen = (p: { left: number; top: number }, v = venster, k = kaart) =>
    p.left >= 16 && p.top >= 16 && p.left + k.width <= v.width - 16 && p.top + k.height <= v.height - 16;

  it('zonder doel in het midden', () => {
    expect(plaatsKaart(null, kaart, venster).kant).toBe('midden');
  });

  it('nooit over het doel als er plek is', () => {
    const doelen: Rechthoek[] = [
      { left: 250, top: 10, width: 170, height: 40 }, // weergaveknop linksboven
      { left: 690, top: 10, width: 260, height: 40 }, // zoeken
      { left: 260, top: 400, width: 1150, height: 380 }, // werklijst
      { left: 0, top: 230, width: 230, height: 120 }, // menu-groep links
      { left: 1200, top: 820, width: 220, height: 60 }, // rechtsonder
      { left: 500, top: 840, width: 440, height: 48 }, // toast onderaan
    ];
    for (const d of doelen) {
      const p = plaatsKaart(d, kaart, venster);
      expect(p.kant.startsWith('blad')).toBe(false);
      expect(binnen(p)).toBe(true);
      expect(overlapt({ ...p, ...kaart }, d)).toBe(false);
    }
  });

  it('op 390 breed een blad aan de andere kant van het doel', () => {
    const smal = { width: 390, height: 844 };
    const k = { width: 358, height: 220 };
    const boven = plaatsKaart({ left: 16, top: 70, width: 358, height: 600 }, k, smal);
    expect(boven.kant).toBe('blad-onder');
    const onder = plaatsKaart({ left: 16, top: 200, width: 358, height: 600 }, k, smal);
    expect(onder.kant).toBe('blad-boven');
    expect(binnen(onder, smal, k)).toBe(true);
  });
});
