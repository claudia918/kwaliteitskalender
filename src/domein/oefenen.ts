/**
 * Rondleiding, puur deel: de oefenkalender en de plek van de uitlegkaart naast het uitgelichte
 * onderdeel. Zonder React of DOM, met tests.
 */
import { activiteitVan } from './hulp';
import { demoState } from './state';
import { maandVan } from './thuis';
import type { KalenderItem, State } from './types';

/** De school waarop de rondleiding oefent (eerste demoschool). */
export const OEFENSCHOOL_ID = '1';
export const OEFENBESTUUR_NAAM = 'Oefenbestuur De Zandbak';

/**
 * De oefenkalender: de demo, met
 * - een eigen naam, zodat je altijd ziet dat je oefent;
 * - op de oefenschool een paar open activiteiten in de huidige maand (iets om af te vinken);
 * - op de oefenschool een aantal activiteiten nog niet gepland (iets om toe te voegen).
 * Altijd dezelfde uitkomst voor dezelfde `nu` en `vandaag`.
 */
export function oefenState(nu: number, vandaag: Date = new Date(nu)): State {
  const s = demoState(nu);
  const maand = maandVan(vandaag);
  const items = s.schoolKalenders[OEFENSCHOOL_ID] ?? [];
  // Elke derde niet-verplichte activiteit van de oefenschool gaat eraf: die kun je toevoegen.
  let teller = 0;
  const blijven = items.filter((i) => {
    if (activiteitVan(i)?.verplicht) return true;
    teller += 1;
    return teller % 3 !== 0;
  });
  // Zorg voor minstens drie open activiteiten in deze maand.
  const inMaand = blijven.filter((i) => i.maand === maand && i.status !== 'gereed').length;
  let tekort = Math.max(0, 3 - inMaand);
  const aangepast: KalenderItem[] = blijven.map((i) => {
    if (tekort > 0 && i.maand !== maand && i.status !== 'gereed' && !i.afwijking) {
      tekort -= 1;
      return { ...i, maand, status: 'gepland' };
    }
    return i;
  });
  if (tekort > 0) {
    // alles was al gereed: zet een paar terug op gepland
    for (const i of aangepast) {
      if (tekort === 0) break;
      if (i.status === 'gereed') {
        i.maand = maand;
        i.status = 'gepland';
        delete i.historie;
        tekort -= 1;
      }
    }
  }
  return {
    ...s,
    organisatie: { ...s.organisatie, bestuurNaam: OEFENBESTUUR_NAAM },
    schoolKalenders: { ...s.schoolKalenders, [OEFENSCHOOL_ID]: aangepast },
  };
}

/** Alle items van alle kalenders (bestuur en scholen). */
export function alleItems(s: State): KalenderItem[] {
  return [...s.bestuurItems, ...Object.values(s.schoolKalenders).flat()];
}

/** Telling voor de rondleiding: hoeveel items, hoeveel gereed, en per uid de maand. */
export interface OefenMeting {
  aantal: number;
  gereed: number;
  maanden: Record<string, string>;
  /** Vingerafdruk van alle statussen (verandert bij elke statuswijziging). */
  statussen: string;
}

export function meet(s: State): OefenMeting {
  const items = alleItems(s);
  const maanden: Record<string, string> = {};
  for (const i of items) maanden[i.uid] = i.maand;
  return {
    aantal: items.length,
    gereed: items.filter((i) => i.status === 'gereed').length,
    maanden,
    statussen: items.map((i) => `${i.uid}:${i.status}`).join('|'),
  };
}

/** Is er sinds `voor` een bestaand item naar een andere maand verschoven? */
export function ietsVerschoven(voor: OefenMeting, na: OefenMeting): boolean {
  return Object.entries(na.maanden).some(([uid, m]) => voor.maanden[uid] !== undefined && voor.maanden[uid] !== m);
}

/* ------------------------------------------------------------------ */
/* Plek van de kaart                                                    */
/* ------------------------------------------------------------------ */

export interface Rechthoek {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Kant = 'onder' | 'boven' | 'rechts' | 'links' | 'midden' | 'blad-onder' | 'blad-boven';

export interface KaartPlek {
  left: number;
  top: number;
  kant: Kant;
}

/** Overlappen twee rechthoeken (met een marge)? */
export function overlapt(a: Rechthoek, b: Rechthoek, marge = 0): boolean {
  return !(
    a.left + a.width + marge <= b.left ||
    b.left + b.width + marge <= a.left ||
    a.top + a.height + marge <= b.top ||
    b.top + b.height + marge <= a.top
  );
}

const klem = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Waar komt de kaart (breedte `kaart.width`, hoogte `kaart.height`) naast het doel? Probeert onder,
 * boven, rechts en links; de eerste plek die helemaal in het venster past zonder het doel te raken,
 * wint. Past er niets (groot doel of smal scherm), dan wordt de kaart een blad onderaan of bovenaan,
 * aan de kant waar het minst van het doel zit. Zonder doel: in het midden.
 */
export function plaatsKaart(
  doel: Rechthoek | null,
  kaart: { width: number; height: number },
  venster: { width: number; height: number },
  ruimte = 12,
): KaartPlek {
  const rand = 16;
  if (!doel) {
    return {
      kant: 'midden',
      left: Math.max(rand, (venster.width - kaart.width) / 2),
      top: Math.max(rand, (venster.height - kaart.height) / 2),
    };
  }
  const maxL = venster.width - kaart.width - rand;
  const maxT = venster.height - kaart.height - rand;
  const midX = doel.left + doel.width / 2 - kaart.width / 2;
  const midY = doel.top + doel.height / 2 - kaart.height / 2;
  const kandidaten: KaartPlek[] = [
    { kant: 'onder', left: klem(midX, rand, maxL), top: doel.top + doel.height + ruimte },
    { kant: 'boven', left: klem(midX, rand, maxL), top: doel.top - ruimte - kaart.height },
    { kant: 'rechts', left: doel.left + doel.width + ruimte, top: klem(midY, rand, maxT) },
    { kant: 'links', left: doel.left - ruimte - kaart.width, top: klem(midY, rand, maxT) },
  ];
  const past = (p: KaartPlek) =>
    p.left >= rand - 0.5 &&
    p.top >= rand - 0.5 &&
    p.left + kaart.width <= venster.width - rand + 0.5 &&
    p.top + kaart.height <= venster.height - rand + 0.5 &&
    !overlapt({ ...p, width: kaart.width, height: kaart.height }, doel);
  const goed = kandidaten.find(past);
  if (goed) return goed;
  // Blad: onderaan, tenzij het doel vooral in de onderste helft zit.
  const left = klem((venster.width - kaart.width) / 2, rand, Math.max(rand, maxL));
  const doelMidden = doel.top + doel.height / 2;
  return doelMidden > venster.height / 2
    ? { kant: 'blad-boven', left, top: rand }
    : { kant: 'blad-onder', left, top: Math.max(rand, maxT) };
}
