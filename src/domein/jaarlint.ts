/**
 * Het jaarlint: je schooljaar op één regel, voor de afsluiting van de rondleiding en de poster.
 * Per maand een stapel blokjes (één per activiteit, gereed eerst), de seizoensgesprekken in hun
 * maand, en een lijn die over de stapels heen loopt: de vorm van je jaar. Puur, met tests.
 */
import { activiteitVan, effectieveNaam, gebiedUitStandaard } from './hulp';
import { GEBIED_CODES, MAANDEN } from './seed';
import type { GebiedCode, Gesprek, KalenderItem, Maand, Status } from './types';

export const LINT = { breedte: 1200, hoogte: 356, links: 30, basis: 296, blok: 14, tussen: 4, perRij: 4, maxRijen: 12 } as const;

export interface LintBlok {
  x: number;
  y: number;
  gereed: boolean;
  status: Status;
  gebied: GebiedCode;
  /** Code van de standaard, bv. "OP2". */
  standaard: string;
  naam: string;
}

/** Eén regel in de maandlijst van de poster. */
export interface LintRegel {
  naam: string;
  standaard: string;
  gebied: GebiedCode;
  status: Status;
}

export const STATUS_NAAM: Record<Status, string> = { gepland: 'Gepland', bezig: 'Bezig', gereed: 'Gereed', risico: 'Risico' };

/** In de stapel: gereed onderaan, dan bezig, risico, gepland. */
const STATUS_VOLGORDE: Record<Status, number> = { gereed: 0, bezig: 1, risico: 2, gepland: 3 };

function regelVan(item: KalenderItem): LintRegel {
  const a = activiteitVan(item);
  const standaard = a?.standaard ?? '';
  return { naam: effectieveNaam(item), standaard, gebied: a?.gebied ?? gebiedUitStandaard(standaard), status: item.status };
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
  /** Alle activiteiten van de maand, op kwaliteitsgebied en standaard, voor de lijst op de poster. */
  lijst: LintRegel[];
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
  /** Kwaliteitsgebieden die voorkomen, in vaste volgorde (voor de legenda). */
  gebieden: GebiedCode[];
}

export function maakJaarlint(items: KalenderItem[], cyclus: Gesprek[], huidig: Maand): Jaarlint {
  const kolom = (LINT.breedte - 2 * LINT.links) / 12;
  const stap = LINT.blok + LINT.tussen;
  const maanden: LintMaand[] = MAANDEN.map((maand, k) => {
    const hier = items.filter((i) => i.maand === maand).map(regelVan);
    const gereed = hier.filter((i) => i.status === 'gereed').length;
    const opGebied = (a: LintRegel, b: LintRegel) =>
      GEBIED_CODES.indexOf(a.gebied) - GEBIED_CODES.indexOf(b.gebied) || a.standaard.localeCompare(b.standaard) || a.naam.localeCompare(b.naam);
    const lijst = [...hier].sort(opGebied);
    const stapel = [...hier].sort((a, b) => STATUS_VOLGORDE[a.status] - STATUS_VOLGORDE[b.status] || opGebied(a, b));
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
        gereed: stapel[n].status === 'gereed',
        ...stapel[n],
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
      lijst,
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
    gebieden: GEBIED_CODES.filter((g) => maanden.some((m) => m.lijst.some((r) => r.gebied === g))),
  };
}

const r = (v: number) => Math.round(v * 10) / 10;

/** "2 min 41 s" of "48 s". */
export function duurTekst(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  const min = Math.floor(s / 60);
  return min ? `${min} min ${s % 60} s` : `${s} s`;
}
