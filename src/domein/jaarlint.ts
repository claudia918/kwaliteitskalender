/**
 * Het jaarlint: je schooljaar op één regel, voor de afsluiting van de rondleiding en de poster.
 * Per maand een stapel blokjes (één per activiteit, gereed eerst), de seizoensgesprekken in hun
 * maand, en een lijn die over de stapels heen loopt: de vorm van je jaar. Puur, met tests.
 */
import { MAANDEN } from './seed';
import type { Gesprek, KalenderItem, Maand } from './types';

export const LINT = { breedte: 1200, hoogte: 360, links: 30, basis: 296, blok: 14, tussen: 4, perRij: 4, maxRijen: 12 } as const;

export interface LintBlok {
  x: number;
  y: number;
  gereed: boolean;
}

export interface LintMaand {
  maand: Maand;
  x: number; // midden van de kolom
  aantal: number;
  gereed: number;
  blokken: LintBlok[];
  /** Niet getekend omdat de stapel vol is. */
  meer: number;
  /** Bovenkant van de stapel. */
  top: number;
  gesprekken: Gesprek[];
  nu: boolean;
}

export interface Jaarlint {
  maanden: LintMaand[];
  /** SVG-pad van de lijn over de stapels. */
  lijn: string;
  /** Bovenkant van de tekening (voor een strakke viewBox): ruimte voor de gesprekslabels. */
  boven: number;
  /** Punt van de lijn bij de huidige maand. */
  nu: { x: number; y: number } | null;
  totaal: number;
  gereed: number;
  drukste: Maand | null;
}

export function maakJaarlint(items: KalenderItem[], cyclus: Gesprek[], huidig: Maand): Jaarlint {
  const kolom = (LINT.breedte - 2 * LINT.links) / 12;
  const stap = LINT.blok + LINT.tussen;
  const maanden: LintMaand[] = MAANDEN.map((maand, k) => {
    const hier = items.filter((i) => i.maand === maand);
    const gereed = hier.filter((i) => i.status === 'gereed').length;
    const x = LINT.links + kolom * (k + 0.5);
    const max = LINT.perRij * LINT.maxRijen;
    const getekend = Math.min(hier.length, max);
    const blokken: LintBlok[] = [];
    const breedte = LINT.perRij * stap - LINT.tussen;
    for (let n = 0; n < getekend; n++) {
      const rij = Math.floor(n / LINT.perRij);
      const pos = n % LINT.perRij;
      blokken.push({
        x: x - breedte / 2 + pos * stap,
        y: LINT.basis - (rij + 1) * stap,
        gereed: n < gereed,
      });
    }
    const rijen = Math.ceil(getekend / LINT.perRij);
    return {
      maand,
      x,
      aantal: hier.length,
      gereed,
      blokken,
      meer: hier.length - getekend,
      top: LINT.basis - rijen * stap,
      gesprekken: cyclus.filter((g) => g.maand === maand),
      nu: maand === huidig,
    };
  });
  // De lijn loopt 18px boven elke stapel; vloeiend via Catmull-Rom naar Bézier.
  const punten = maanden.map((m) => ({ x: m.x, y: m.top - 18 }));
  const alle = [{ x: LINT.links - 10, y: punten[0].y }, ...punten, { x: LINT.breedte - LINT.links + 10, y: punten[punten.length - 1].y }];
  let lijn = `M${r(alle[0].x)} ${r(alle[0].y)}`;
  for (let k = 0; k < alle.length - 1; k++) {
    const p0 = alle[Math.max(0, k - 1)];
    const p1 = alle[k];
    const p2 = alle[k + 1];
    const p3 = alle[Math.min(alle.length - 1, k + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    lijn += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  const nuMaand = maanden.find((m) => m.nu);
  const drukste = maanden.reduce<LintMaand | null>((a, m) => (m.aantal > (a?.aantal ?? 0) ? m : a), null);
  const boven = Math.max(0, Math.min(...maanden.map((m) => m.top - 18 - 26 - 22 * Math.max(1, m.gesprekken.length))) - 12);
  return {
    maanden,
    lijn,
    boven,
    nu: nuMaand ? { x: nuMaand.x, y: nuMaand.top - 18 } : null,
    totaal: items.length,
    gereed: items.filter((i) => i.status === 'gereed').length,
    drukste: drukste?.maand ?? null,
  };
}

const r = (v: number) => Math.round(v * 10) / 10;

/** "2 min 41 s" of "48 s". */
export function duurTekst(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  const min = Math.floor(s / 60);
  return min ? `${min} min ${s % 60} s` : `${s} s`;
}
