/**
 * Startstanden (leeg, demo), migratie van oude back-ups (versie 2 t/m 4) naar versie 5,
 * en (de)serialisatie van back-ups en kalenderbestanden.
 */
import { maandUitPeriode } from './hulp';
import {
  ACTIVITEITEN_BESTUUR,
  ACTIVITEITEN_SCHOOL,
  DEMO_AFWIJKINGEN,
  DEMO_CLUSTERS,
  DEMO_SCHOLEN,
  DEMO_VOORTGANG_PER_SCHOOL,
  STANDAARD_GESPREKSCYCLUS,
  STANDAARD_SCHOOLJAAR,
} from './seed';
import type {
  Activiteit,
  Cluster,
  GedeeldeGegevens,
  Gesprek,
  KalenderBestand,
  KalenderItem,
  School,
  State,
  Status,
  Tijdstempel,
} from './types';

export const STATE_VERSIE = 5 as const;
export const BESTAND_FORMAAT = 'kwaliteitskalender-vo' as const;
/** Extensie van het gedeelde kalenderbestand. */
export const BESTAND_EXTENSIE = '.kwaliteitskalender.json';

/** De vier seizoensgesprekken (nieuwe kopie), optioneel met tijdstempel. */
export function standaardCyclus(nu?: Tijdstempel): Gesprek[] {
  return STANDAARD_GESPREKSCYCLUS.map((g) => (nu === undefined ? { ...g } : { ...g, gewijzigd: nu }));
}

/** Lege begintoestand: welkomstscherm, geen scholen, standaardcyclus. */
export function legeState(): State {
  return {
    versie: STATE_VERSIE,
    schooljaar: STANDAARD_SCHOOLJAAR,
    organisatie: { bestuurNaam: '', scholen: [], clusters: [], gesprekscyclus: standaardCyclus() },
    modus: 'eigen',
    setupVoltooid: false,
    bestuurItems: [],
    schoolKalenders: {},
    tijden: {},
    verwijderd: {},
  };
}

/* ------------------------------------------------------------------ */
/* Demo                                                                 */
/* ------------------------------------------------------------------ */

/** FNV-1a-hash genormaliseerd naar [0, 1] (zoals het origineel). */
export function fnv1a(tekst: string): number {
  let h = 2166136261;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Deterministische demostatus per school en activiteit. */
export function demoStatus(schoolId: number | string, a: Activiteit): Status {
  const drempel = DEMO_VOORTGANG_PER_SCHOOL[String(schoolId)] ?? 0.7;
  const r = fnv1a(`${schoolId}:${a.id}`);
  switch (a.gesprek) {
    case 'Herfst':
      return r < drempel ? 'gereed' : a.verplicht && r > 0.85 ? 'risico' : 'bezig';
    case 'Winter':
      return r < drempel - 0.35 ? 'gereed' : r < drempel + 0.1 ? 'bezig' : a.verplicht && r > 0.9 ? 'risico' : 'gepland';
    default:
      return 'gepland';
  }
}

/**
 * Demodata: "Stichting Leren Verbeteren", 5 scholen, 2 clusters, alle 67 schoolactiviteiten per school,
 * alle 30 bestuursactiviteiten, 2 afwijkingen. Na laden: modus demo, setup voltooid.
 */
export function demoState(nu: Tijdstempel): State {
  const scholen: School[] = DEMO_SCHOLEN.map((s) => ({
    id: String(s.id),
    naam: s.naam,
    type: s.type,
    cluster: s.cluster,
    gewijzigd: nu,
  }));
  const clusters: Cluster[] = DEMO_CLUSTERS.map((c) => ({ id: c.id, naam: c.naam, gewijzigd: nu }));
  const schoolKalenders: Record<string, KalenderItem[]> = {};
  for (const s of DEMO_SCHOLEN) {
    schoolKalenders[String(s.id)] = ACTIVITEITEN_SCHOOL.map((a) => {
      const afw = DEMO_AFWIJKINGEN.find((x) => x.schoolId === s.id && x.activiteitId === a.id);
      const item: KalenderItem = {
        uid: `s${s.id}-${a.id}`,
        activiteitId: a.id,
        maand: maandUitPeriode(a.periode),
        gesprek: afw ? afw.gesprek : a.gesprek,
        status: demoStatus(s.id, a),
        gewijzigd: nu,
      };
      if (afw) item.afwijking = { reden: afw.reden };
      return item;
    });
  }
  const bestuurItems: KalenderItem[] = ACTIVITEITEN_BESTUUR.map((a) => ({
    uid: `bestuur-${a.id}`,
    activiteitId: a.id,
    maand: maandUitPeriode(a.periode),
    gesprek: a.gesprek,
    status: demoStatus(1, a),
    gewijzigd: nu,
  }));
  return {
    versie: STATE_VERSIE,
    schooljaar: STANDAARD_SCHOOLJAAR,
    organisatie: {
      bestuurNaam: 'Stichting Leren Verbeteren',
      scholen,
      clusters,
      gesprekscyclus: standaardCyclus(nu),
    },
    modus: 'demo',
    setupVoltooid: true,
    bestuurItems,
    schoolKalenders,
    tijden: { bestuurNaam: nu, schooljaar: nu },
    verwijderd: {},
  };
}

/* ------------------------------------------------------------------ */
/* Startsjabloon                                                        */
/* ------------------------------------------------------------------ */

/** Sjabloonitem voor een activiteit: uid "{prefix}-{id}", maand uit periode, standaardgesprek, gepland. */
export function sjabloonItem(prefix: string, a: Activiteit): KalenderItem {
  return {
    uid: `${prefix}-${a.id}`,
    activiteitId: a.id,
    maand: maandUitPeriode(a.periode),
    gesprek: a.gesprek,
    status: 'gepland',
  };
}

/** Prefix van sjabloon-uid's voor een school ("s{id}") of het bestuur ("bestuur"). */
export function sjabloonPrefix(schoolId: string | null): string {
  return schoolId === null ? 'bestuur' : `s${schoolId}`;
}

/* ------------------------------------------------------------------ */
/* Migratie                                                             */
/* ------------------------------------------------------------------ */

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function alsArray<T>(x: unknown): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

/**
 * Zet een back-up (versie 2, 3, 4 of 5) of een kalenderbestand om naar State versie 5.
 * Geeft null als het geen (leesbare) kwaliteitskalender-gegevens zijn.
 * Verliesvrij: onbekende velden in items, scholen, clusters en gesprekken blijven behouden.
 * - v2 → v3: gesprekscyclus toegevoegd (standaardcyclus als die ontbreekt);
 * - v3 → v4: geen wijziging;
 * - v4 → v5: school-id's worden strings ("1"), tijden/verwijderd toegevoegd.
 */
export function migreer(ruw: unknown): State | null {
  if (!isObject(ruw)) return null;
  const isBestand = ruw.formaat === BESTAND_FORMAAT;
  if (typeof ruw.versie !== 'number' || !isObject(ruw.organisatie)) return null;
  if (ruw.versie < 2 || ruw.versie > STATE_VERSIE) return null;

  let s: Record<string, unknown> = { ...ruw };
  if (s.versie === 2) {
    const org = s.organisatie as Record<string, unknown>;
    s = { ...s, versie: 3, organisatie: { ...org, gesprekscyclus: org.gesprekscyclus ?? standaardCyclus() } };
  }
  if (s.versie === 3) s = { ...s, versie: 4 };

  const org = s.organisatie as Record<string, unknown>;
  if (!Array.isArray(org.scholen)) return null;

  const scholen: School[] = alsArray<Record<string, unknown>>(org.scholen)
    .filter(isObject)
    .map((sch) => ({
      ...(sch as object),
      id: String(sch.id),
      naam: typeof sch.naam === 'string' ? sch.naam : '',
      type: typeof sch.type === 'string' ? sch.type : 'vo',
      cluster: typeof sch.cluster === 'string' ? sch.cluster : '',
    }));
  const clusters = alsArray<Cluster>(org.clusters)
    .filter(isObject)
    .map((c) => ({ ...c, id: String(c.id) }));
  const cyclusRuw = org.gesprekscyclus;
  const gesprekscyclus = Array.isArray(cyclusRuw) ? (cyclusRuw.filter(isObject) as unknown as Gesprek[]) : standaardCyclus();

  const kalendersRuw = isObject(s.schoolKalenders) ? s.schoolKalenders : {};
  const schoolKalenders: Record<string, KalenderItem[]> = {};
  for (const [id, lijst] of Object.entries(kalendersRuw)) {
    schoolKalenders[String(id)] = alsArray<KalenderItem>(lijst).filter(isObject);
  }

  const state: State = {
    ...(s as object),
    versie: STATE_VERSIE,
    schooljaar: typeof s.schooljaar === 'string' ? s.schooljaar : STANDAARD_SCHOOLJAAR,
    organisatie: {
      ...(org as object),
      bestuurNaam: typeof org.bestuurNaam === 'string' ? org.bestuurNaam : '',
      scholen,
      clusters,
      gesprekscyclus,
    },
    modus: isBestand ? 'eigen' : s.modus === 'demo' ? 'demo' : 'eigen',
    setupVoltooid: isBestand ? true : s.setupVoltooid !== false,
    bestuurItems: alsArray<KalenderItem>(s.bestuurItems).filter(isObject),
    schoolKalenders,
    tijden: isObject(s.tijden) ? (s.tijden as State['tijden']) : {},
    verwijderd: isObject(s.verwijderd) ? (s.verwijderd as State['verwijderd']) : {},
  };
  if (s.onboardingVerborgen === true) state.onboardingVerborgen = true;
  // velden die alleen in een kalenderbestand horen, niet meenemen in de lokale state
  delete (state as unknown as Record<string, unknown>).formaat;
  delete (state as unknown as Record<string, unknown>).opgeslagenOp;
  return state;
}

/* ------------------------------------------------------------------ */
/* Serialisatie                                                         */
/* ------------------------------------------------------------------ */

export const FOUT_GEEN_JSON = 'Dit is geen geldig JSON-bestand';
export const FOUT_GEEN_KALENDER = 'Dit bestand is geen (leesbare) kwaliteitskalender-back-up';

export type LeesResultaat = { ok: true; state: State; isBestand: boolean } | { ok: false; fout: string };

/** Leest een back-up of kalenderbestand (tekst). Foutteksten zoals het origineel. */
export function leesKalenderJson(tekst: string): LeesResultaat {
  let ruw: unknown;
  try {
    ruw = JSON.parse(tekst);
  } catch {
    return { ok: false, fout: FOUT_GEEN_JSON };
  }
  const state = migreer(ruw);
  if (!state) return { ok: false, fout: FOUT_GEEN_KALENDER };
  return { ok: true, state, isBestand: isObject(ruw) && ruw.formaat === BESTAND_FORMAAT };
}

/** Het gedeelde deel van de state (zonder lokale velden als modus en setupVoltooid). */
export function gedeeldDeel(s: GedeeldeGegevens): GedeeldeGegevens {
  return {
    schooljaar: s.schooljaar,
    organisatie: s.organisatie,
    bestuurItems: s.bestuurItems,
    schoolKalenders: s.schoolKalenders,
    tijden: s.tijden,
    verwijderd: s.verwijderd,
  };
}

/** Inhoud voor het gedeelde kalenderbestand. */
export function naarBestand(s: GedeeldeGegevens, nu: Date = new Date()): KalenderBestand {
  return { formaat: BESTAND_FORMAAT, versie: STATE_VERSIE, opgeslagenOp: nu.toISOString(), ...gedeeldDeel(s) };
}

export function bestandNaarTekst(b: KalenderBestand): string {
  return JSON.stringify(b, null, 2);
}

/** JSON-back-up: de volledige state, leesbaar ingesprongen (formaat §2.1, versie 5). */
export function naarBackupTekst(s: State): string {
  return JSON.stringify(s, null, 2);
}

/** Voorgestelde bestandsnaam: "stichting-x.kwaliteitskalender.json". */
export function voorgesteldeBestandsnaam(bestuurNaam: string): string {
  const basis =
    bestuurNaam
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'kalender';
  return `${basis}${BESTAND_EXTENSIE}`;
}

/** Heeft deze state inhoud die het bewaren waard is (geen lege begintoestand)? */
export function heeftEigenGegevens(s: State): boolean {
  return s.modus === 'eigen' && (s.organisatie.scholen.length > 0 || !!s.organisatie.bestuurNaam || s.bestuurItems.length > 0);
}
