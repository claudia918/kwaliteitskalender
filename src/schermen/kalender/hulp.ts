/**
 * Pure hulpfuncties voor de kalender-editor (matrix, lijst, detailvenster).
 * Geen React; getest in hulp.test.ts.
 */
import { activiteitVan, effectieveNaam } from '../../domein/hulp';
import { GEBIEDEN, KALENDERMAAND_INDEX, MAANDEN, MAANDNAMEN_VOLUIT } from '../../domein/seed';
import type { Activiteit, GebiedCode, Gesprek, KalenderItem, Maand, SchoolId, Standaard, State } from '../../domein/types';

/* ------------------------------------------------------------------ */
/* Maanden en periodes                                                  */
/* ------------------------------------------------------------------ */

/** Welke maanden de matrix toont: het hele schooljaar of een helft. */
export type Periode = 'heel' | 'eerste' | 'tweede';

export const PERIODE_MAANDEN: Record<Periode, Maand[]> = {
  heel: MAANDEN,
  eerste: MAANDEN.slice(0, 6),
  tweede: MAANDEN.slice(6),
};

/** Helft van het schooljaar waarin een maand valt. */
export function periodeVan(maand: Maand): 'eerste' | 'tweede' {
  return MAANDEN.indexOf(maand) < 6 ? 'eerste' : 'tweede';
}

/** Maand van een JS-datum in de kalendervolgorde ("Nov"). */
export function maandVanDatum(d: Date): Maand {
  const idx = d.getMonth();
  return (Object.keys(KALENDERMAAND_INDEX) as Maand[]).find((m) => KALENDERMAAND_INDEX[m] === idx) ?? 'Sep';
}

/** "Nov" → "november" */
export function maandVoluit(maand: Maand): string {
  return MAANDNAMEN_VOLUIT[KALENDERMAAND_INDEX[maand]] ?? maand;
}

/** "Nov" → "November" */
export function maandTitel(maand: Maand): string {
  const v = maandVoluit(maand);
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** Maand `stap` plaatsen verder in Aug..Jul; null buiten het schooljaar (zoals het origineel: geen omloop). */
export function verschuifMaand(maand: Maand, stap: number): Maand | null {
  const i = MAANDEN.indexOf(maand) + stap;
  return i >= 0 && i < MAANDEN.length ? MAANDEN[i] : null;
}

/** Gesprekken per maand (een maand kan meer dan één gesprek hebben). */
export function gesprekkenPerMaand(cyclus: Gesprek[]): Record<Maand, Gesprek[]> {
  const uit = Object.fromEntries(MAANDEN.map((m) => [m, [] as Gesprek[]])) as Record<Maand, Gesprek[]>;
  for (const g of [...cyclus].sort((a, b) => a.volgorde - b.volgorde)) uit[g.maand]?.push(g);
  return uit;
}

/* ------------------------------------------------------------------ */
/* Matrix                                                               */
/* ------------------------------------------------------------------ */

/** Standaardcode van een item; "?" als de activiteit onbekend is. */
export function standaardVan(item: KalenderItem): string {
  return activiteitVan(item)?.standaard ?? '?';
}

export interface MatrixRij {
  code: string;
  naam: string;
  kern: boolean;
  gebied: GebiedCode | null;
  /** Items per maand, op naam gesorteerd. */
  cellen: Record<Maand, KalenderItem[]>;
  aantal: number;
}

export interface MatrixGroep {
  /** Gebiedscode, of null voor "Overige activiteiten" (standaard hoort niet bij dit niveau). */
  gebied: GebiedCode | null;
  titel: string;
  rijen: MatrixRij[];
}

function legeCellen(): Record<Maand, KalenderItem[]> {
  return Object.fromEntries(MAANDEN.map((m) => [m, [] as KalenderItem[]])) as Record<Maand, KalenderItem[]>;
}

/**
 * Rijen van de matrix: standaarden gegroepeerd per kwaliteitsgebied (volgorde van de standaardenlijst).
 * Items met een standaard die niet bij dit niveau hoort (of een onbekende activiteit) komen in een
 * extra groep, zodat niets onzichtbaar wordt.
 */
export function matrixGroepen(standaarden: Standaard[], items: KalenderItem[]): MatrixGroep[] {
  const rijOpCode = new Map<string, MatrixRij>();
  const groepen: MatrixGroep[] = [];
  for (const s of standaarden) {
    let groep = groepen.find((g) => g.gebied === s.gebied);
    if (!groep) {
      groep = { gebied: s.gebied, titel: `${s.gebied} · ${s.gebiedNaam || GEBIEDEN[s.gebied]?.naam || ''}`, rijen: [] };
      groepen.push(groep);
    }
    const rij: MatrixRij = { code: s.code, naam: s.naam, kern: s.kern, gebied: s.gebied, cellen: legeCellen(), aantal: 0 };
    groep.rijen.push(rij);
    rijOpCode.set(s.code, rij);
  }
  let overig: MatrixGroep | null = null;
  for (const item of items) {
    const code = standaardVan(item);
    let rij = rijOpCode.get(code);
    if (!rij) {
      if (!overig) {
        overig = { gebied: null, titel: 'Overige activiteiten', rijen: [] };
        groepen.push(overig);
      }
      const a = activiteitVan(item);
      rij = {
        code,
        naam: code === '?' ? 'Onbekende activiteit' : 'Standaard van een ander niveau',
        kern: false,
        gebied: a?.gebied ?? null,
        cellen: legeCellen(),
        aantal: 0,
      };
      overig.rijen.push(rij);
      rijOpCode.set(code, rij);
    }
    (rij.cellen[item.maand] ?? rij.cellen.Sep).push(item);
    rij.aantal++;
  }
  for (const rij of rijOpCode.values()) {
    for (const m of MAANDEN) rij.cellen[m].sort((a, b) => effectieveNaam(a).localeCompare(effectieveNaam(b), 'nl'));
  }
  return groepen;
}

/**
 * Clusterweergave: dezelfde activiteit van meerdere scholen in één cel wordt één chip.
 * Sleutel = activiteitId (eigen activiteiten hebben een uniek id en blijven dus los).
 */
export interface GebundeldItem {
  sleutel: string;
  naam: string;
  items: KalenderItem[];
}

export function bundel(items: KalenderItem[]): GebundeldItem[] {
  const uit = new Map<string, GebundeldItem>();
  for (const i of items) {
    const sleutel = i.activiteitId;
    const b = uit.get(sleutel);
    if (b) b.items.push(i);
    else uit.set(sleutel, { sleutel, naam: activiteitVan(i)?.naam ?? effectieveNaam(i), items: [i] });
  }
  return [...uit.values()];
}

/* ------------------------------------------------------------------ */
/* Lijst                                                                */
/* ------------------------------------------------------------------ */

/** Maanden met items, in kalendervolgorde, items op naam. */
export function itemsPerMaand(items: KalenderItem[]): { maand: Maand; items: KalenderItem[] }[] {
  return MAANDEN.map((maand) => ({
    maand,
    items: items
      .filter((i) => i.maand === maand)
      .sort((a, b) => effectieveNaam(a).localeCompare(effectieveNaam(b), 'nl')),
  })).filter((g) => g.items.length > 0);
}

/* ------------------------------------------------------------------ */
/* Items opzoeken (route /kalender?item=<uid>)                          */
/* ------------------------------------------------------------------ */

export type ItemPlek = { kind: 'bestuur' } | { kind: 'school'; schoolId: SchoolId };

/** Waar staat een item? Zoekt in de bestuurskalender en alle schoolkalenders. */
export function zoekItem(state: Pick<State, 'bestuurItems' | 'schoolKalenders'>, uid: string): { item: KalenderItem; plek: ItemPlek } | null {
  const b = state.bestuurItems.find((i) => i.uid === uid);
  if (b) return { item: b, plek: { kind: 'bestuur' } };
  for (const [schoolId, lijst] of Object.entries(state.schoolKalenders)) {
    const i = lijst.find((x) => x.uid === uid);
    if (i) return { item: i, plek: { kind: 'school', schoolId } };
  }
  return null;
}

/** School-id per item-uid (voor de clusterweergave: "van welke school is dit?"). */
export function schoolPerUid(state: Pick<State, 'schoolKalenders'>, schoolIds: SchoolId[]): Map<string, SchoolId> {
  const uit = new Map<string, SchoolId>();
  for (const id of schoolIds) for (const i of state.schoolKalenders[id] ?? []) uit.set(i.uid, id);
  return uit;
}

/* ------------------------------------------------------------------ */
/* Detailvenster                                                        */
/* ------------------------------------------------------------------ */

/** Laatste `n` statuswijzigingen, nieuwste eerst. */
export function recenteHistorie(item: KalenderItem, n = 5) {
  return [...(item.historie ?? [])].reverse().slice(0, n);
}

/**
 * Lichte controle van een bewijslink. De app opent of haalt de link nooit op; dit voorkomt alleen
 * dat er iets anders dan een verwijzing in staat (bv. "javascript:").
 */
export function isBruikbareLink(url: string): boolean {
  const t = url.trim();
  if (!t) return true;
  if (/^(javascript|data|vbscript|blob):/i.test(t)) return false;
  // netwerkpad of schijfpad (mag spaties bevatten)
  if (/^(\\\\|[a-z]:[\\/])/i.test(t)) return true;
  if (/\s/.test(t)) return false;
  return /^(https?:\/\/|file:\/\/)/i.test(t) || /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(t);
}

/* ------------------------------------------------------------------ */
/* Filter "Toon alleen"                                                 */
/* ------------------------------------------------------------------ */

/** Wat de kalender toont: alles, nog te doen (niet gereed), het komende gesprek of alleen risico. */
export type KalenderFilter = 'alles' | 'te-doen' | 'gesprek' | 'risico';

export function pastBijFilter(item: KalenderItem, filter: KalenderFilter, gesprekId: string | null): boolean {
  switch (filter) {
    case 'te-doen':
      return item.status !== 'gereed';
    case 'gesprek':
      return gesprekId !== null && item.gesprek === gesprekId;
    case 'risico':
      return item.status === 'risico';
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/* Toevoegen: periodes en suggesties                                    */
/* ------------------------------------------------------------------ */

const MAAND_OP_INDEX = Object.fromEntries(Object.entries(KALENDERMAAND_INDEX).map(([m, i]) => [i, m])) as Record<number, Maand>;

function naarMaand(tekst: string): Maand | null {
  const p = tekst.trim().toLowerCase().slice(0, 3);
  if (p === 'maa') return 'Mrt';
  return MAANDEN.find((m) => m.toLowerCase() === p) ?? null;
}

/**
 * Maanden die een periodetekst beslaat: "sep-okt" → Sep, Okt; "okt-feb" → Okt t/m Feb;
 * "jul-aug" → Jul, Aug (over de jaargrens); "nov, mrt" → Nov, Mrt; "variabel" → [].
 */
export function periodeMaanden(periode: string | undefined): Maand[] {
  const uit: Maand[] = [];
  const voeg = (m: Maand) => {
    if (!uit.includes(m)) uit.push(m);
  };
  for (const deel of (periode ?? '').split(/[,;/]/)) {
    const [van, tot] = deel.split(/[-–]/).map(naarMaand);
    if (!van) continue;
    if (!tot) {
      voeg(van);
      continue;
    }
    let i = KALENDERMAAND_INDEX[van];
    const eind = KALENDERMAAND_INDEX[tot];
    for (let n = 0; n < 12; n++) {
      voeg(MAAND_OP_INDEX[i]);
      if (i === eind) break;
      i = (i + 1) % 12;
    }
  }
  return uit;
}

export interface Suggestie {
  activiteit: Activiteit;
  /** Het item als de activiteit al op de kalender staat. */
  opKalender: KalenderItem | null;
  /** De aanbevolen periode omvat de gekozen maand. */
  pastInMaand: boolean;
}

/**
 * Activiteiten voor het keuzepaneel "Activiteit toevoegen": gefilterd op standaard en zoektekst,
 * gesorteerd op wat het meest voor de hand ligt: nog niet op de kalender, past in de maand,
 * verplicht, dan op naam.
 */
export function toevoegSuggesties(
  bibliotheek: Activiteit[],
  items: KalenderItem[],
  f: { zoek?: string; standaard?: string | null; maand?: Maand | null },
): Suggestie[] {
  const q = (f.zoek ?? '').trim().toLowerCase();
  const opId = new Map<string, KalenderItem>();
  for (const i of items) if (!opId.has(i.activiteitId)) opId.set(i.activiteitId, i);
  return bibliotheek
    .filter((a) => !f.standaard || a.standaard === f.standaard)
    .filter((a) => !q || `${a.id} ${a.naam} ${a.omschrijving} ${a.standaard}`.toLowerCase().includes(q))
    .map((a) => ({
      activiteit: a,
      opKalender: opId.get(a.id) ?? null,
      pastInMaand: !!f.maand && periodeMaanden(a.periode).includes(f.maand),
    }))
    .sort(
      (x, y) =>
        Number(!!x.opKalender) - Number(!!y.opKalender) ||
        Number(y.pastInMaand) - Number(x.pastInMaand) ||
        Number(y.activiteit.verplicht) - Number(x.activiteit.verplicht) ||
        x.activiteit.naam.localeCompare(y.activiteit.naam, 'nl'),
    );
}

/** Verplichte activiteiten uit de bibliotheek die nog niet op de kalender staan (optioneel voor één gesprek). */
export function ontbrekendeVerplichte(bibliotheek: Activiteit[], items: KalenderItem[], gesprekId?: string | null): Activiteit[] {
  const aanwezig = new Set(items.map((i) => i.activiteitId));
  return bibliotheek.filter((a) => a.verplicht && !aanwezig.has(a.id) && (!gesprekId || a.gesprek === gesprekId));
}
