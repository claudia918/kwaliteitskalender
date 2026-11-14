/**
 * Afgeleide berekeningen (inventaris §2.3). Allemaal puur: geen React, geen Date.now()
 * zonder parameter, zodat ze te testen zijn.
 */
import { activiteitVan, effectieveNaam, gesorteerdeCyclus, standaardenVoor, vandaagISO } from './hulp';
import { KALENDERMAAND_INDEX, MAANDEN } from './seed';
import type {
  Activiteit,
  EditScope,
  Gesprek,
  KalenderItem,
  Niveau,
  Organisatie,
  School,
  SchoolId,
  Scope,
  Standaard,
  State,
} from './types';

/* ------------------------------------------------------------------ */
/* Organisatie                                                          */
/* ------------------------------------------------------------------ */

export function vindSchool(org: Organisatie, id: SchoolId): School | undefined {
  return org.scholen.find((s) => s.id === id);
}

export function vindCluster(org: Organisatie, id: string) {
  return org.clusters.find((c) => c.id === id);
}

/** Naam van het cluster van een school, of undefined als die geen (bestaand) cluster heeft. */
export function clusterNaamVan(org: Organisatie, school: School | undefined): string | undefined {
  if (!school?.cluster) return undefined;
  return vindCluster(org, school.cluster)?.naam;
}

export function scholenInCluster(org: Organisatie, clusterId: string): School[] {
  return org.scholen.filter((s) => s.cluster === clusterId);
}

export function itemsVanSchool(state: Pick<State, 'schoolKalenders'>, id: SchoolId): KalenderItem[] {
  return state.schoolKalenders[id] ?? [];
}

/** Items van een EditScope (bestuurskalender of één schoolkalender). */
export function itemsVanEditScope(state: Pick<State, 'schoolKalenders' | 'bestuurItems'>, scope: EditScope) {
  return scope.kind === 'bestuur' ? state.bestuurItems : itemsVanSchool(state, scope.schoolId);
}

/* ------------------------------------------------------------------ */
/* Scope per niveau                                                     */
/* ------------------------------------------------------------------ */

/**
 * - bestuur: bestuurItems met de bestuursstandaarden (BKA1-3);
 * - cluster: samengevoegde items van de scholen in het cluster (alleen-lezen), schoolstandaarden;
 * - school: items van die school, schoolstandaarden.
 */
export function scopeVoor(state: State, niveau: Niveau, clusterId: string, schoolId: SchoolId): Scope {
  if (niveau === 'bestuur') {
    return { items: state.bestuurItems, isBestuur: true, standaarden: standaardenVoor(true) };
  }
  if (niveau === 'cluster') {
    const items = scholenInCluster(state.organisatie, clusterId).flatMap((s) => itemsVanSchool(state, s.id));
    return { items, isBestuur: false, standaarden: standaardenVoor(false) };
  }
  return { items: itemsVanSchool(state, schoolId), isBestuur: false, standaarden: standaardenVoor(false) };
}

/** Bewerkbare kalender bij een niveau: null op clusterniveau (alleen-lezen). */
export function editScopeVoor(niveau: Niveau, schoolId: SchoolId): EditScope | null {
  if (niveau === 'bestuur') return { kind: 'bestuur' };
  if (niveau === 'school') return { kind: 'school', schoolId };
  return null;
}

/** Naam van de scope: schoolnaam, clusternaam of bestuursnaam (met fallbacks zoals het origineel). */
export function scopeLabel(state: State, niveau: Niveau, clusterId: string, schoolId: SchoolId): string {
  const org = state.organisatie;
  if (niveau === 'school') return vindSchool(org, schoolId)?.naam ?? 'School';
  if (niveau === 'cluster') return vindCluster(org, clusterId)?.naam ?? 'Cluster';
  return org.bestuurNaam || 'Bestuur';
}

/** School-id's die bij het niveau horen: cluster → scholen van het cluster, anders alle scholen. */
export function schoolIdsVoorNiveau(org: Organisatie, niveau: Niveau, clusterId: string): SchoolId[] {
  return (niveau === 'cluster' ? scholenInCluster(org, clusterId) : org.scholen).map((s) => s.id);
}

/* ------------------------------------------------------------------ */
/* Voortgang                                                            */
/* ------------------------------------------------------------------ */

export interface Voortgang {
  totaal: number;
  gereed: number;
  bezig: number;
  gepland: number;
  risico: number;
  /** round(gereed / totaal * 100), 0 bij een lege lijst. */
  pct: number;
}

export function voortgang(items: KalenderItem[]): Voortgang {
  const tel = (s: KalenderItem['status']) => items.filter((i) => i.status === s).length;
  const totaal = items.length;
  const gereed = tel('gereed');
  return {
    totaal,
    gereed,
    bezig: tel('bezig'),
    gepland: tel('gepland'),
    risico: tel('risico'),
    pct: totaal === 0 ? 0 : Math.round((gereed / totaal) * 100),
  };
}

export function itemsVoorGesprek(items: KalenderItem[], gesprekId: string): KalenderItem[] {
  return items.filter((i) => i.gesprek === gesprekId);
}

export function voortgangVoorGesprek(items: KalenderItem[], gesprekId: string): Voortgang {
  return voortgang(itemsVoorGesprek(items, gesprekId));
}

/* ------------------------------------------------------------------ */
/* Komend gesprek                                                       */
/* ------------------------------------------------------------------ */

/** Startjaar van het schooljaar: parseInt("2026/2027") = 2026, anders het fallbackjaar. */
export function startjaar(schooljaar: string, fallbackJaar: number): number {
  return parseInt(schooljaar, 10) || fallbackJaar;
}

/** Deadline van een gesprek: de 1e van de maand; Aug-Dec in het startjaar, Jan-Jul in startjaar + 1. */
export function deadlineVanGesprek(gesprek: Pick<Gesprek, 'maand'>, startJaar: number): Date {
  const jaar = MAANDEN.indexOf(gesprek.maand) <= 4 ? startJaar : startJaar + 1;
  return new Date(jaar, KALENDERMAAND_INDEX[gesprek.maand], 1);
}

export interface KomendGesprek {
  gesprek: Gesprek;
  datum: Date;
  /** Afgerond aantal dagen van vandaag tot de deadline. */
  dagenTot: number;
  /** true als alle deadlines voorbij zijn (dan is het eerste gesprek gekozen). */
  verstreken: boolean;
}

/** Eerste gesprek met deadline >= vandaag; zijn alle voorbij, dan het eerste (verstreken = true). */
export function komendGesprek(cyclus: Gesprek[], schooljaar: string, vandaag: Date = new Date()): KomendGesprek | null {
  if (cyclus.length === 0) return null;
  const jaar = startjaar(schooljaar, vandaag.getFullYear());
  const dag = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());
  const lijst = cyclus
    .map((g) => ({ gesprek: g, datum: deadlineVanGesprek(g, jaar) }))
    .sort((a, b) => a.datum.getTime() - b.datum.getTime());
  const eerstvolgend = lijst.find((x) => x.datum >= dag);
  const gekozen = eerstvolgend ?? lijst[0];
  const dagenTot = Math.round((gekozen.datum.getTime() - dag.getTime()) / 86_400_000);
  return { gesprek: gekozen.gesprek, datum: gekozen.datum, dagenTot, verstreken: !eerstvolgend };
}

/* ------------------------------------------------------------------ */
/* Deadlines, dekking, afwijkingen                                      */
/* ------------------------------------------------------------------ */

/** Items met deadline < vandaag en status ongelijk aan gereed. */
export function verstrekenDeadlines(items: KalenderItem[], vandaag: Date = new Date()): KalenderItem[] {
  const v = vandaagISO(vandaag);
  return items.filter((i) => !!i.deadline && i.deadline < v && i.status !== 'gereed');
}

export interface StandaardDekking {
  standaard: Standaard;
  aantal: number;
  gereed: number;
  /** Minstens één item met deze standaard, ongeacht status. */
  afgedekt: boolean;
}

export function dekkingPerStandaard(items: KalenderItem[], standaarden: Standaard[]): StandaardDekking[] {
  return standaarden.map((standaard) => {
    const lijst = items.filter((i) => activiteitVan(i)?.standaard === standaard.code);
    return {
      standaard,
      aantal: lijst.length,
      gereed: lijst.filter((i) => i.status === 'gereed').length,
      afgedekt: lijst.length > 0,
    };
  });
}

/** Vaste (kern)standaarden zonder enig item. Op bestuursniveau altijd leeg (geen kernstandaarden). */
export function ontbrekendeVasteStandaarden(items: KalenderItem[], standaarden: Standaard[]): Standaard[] {
  return dekkingPerStandaard(items, standaarden)
    .filter((d) => d.standaard.kern && !d.afgedekt)
    .map((d) => d.standaard);
}

/** Items met een afwijking van de standaardkoppeling. */
export function afwijkingen(items: KalenderItem[]): KalenderItem[] {
  return items.filter((i) => !!i.afwijking);
}

/** Staat er al een item met deze activiteit op de kalender? */
export function staatOpKalender(items: KalenderItem[], activiteitId: string): boolean {
  return items.some((i) => i.activiteitId === activiteitId);
}

/* ------------------------------------------------------------------ */
/* Per school (bestuur- en clusterniveau)                               */
/* ------------------------------------------------------------------ */

export interface SchoolOverzicht {
  schoolId: SchoolId;
  school: School | undefined;
  voortgang: Voortgang;
  afwijkingen: number;
  ontbrekendeKern: number;
}

export function overzichtPerSchool(state: State, schoolIds: SchoolId[]): SchoolOverzicht[] {
  const standaarden = standaardenVoor(false);
  return schoolIds.map((schoolId) => {
    const items = itemsVanSchool(state, schoolId);
    return {
      schoolId,
      school: vindSchool(state.organisatie, schoolId),
      voortgang: voortgang(items),
      afwijkingen: afwijkingen(items).length,
      ontbrekendeKern: ontbrekendeVasteStandaarden(items, standaarden).length,
    };
  });
}

/** Gemiddelde van de voortgangspercentages per school (afgerond), 0 zonder scholen. */
export function gemiddeldGereed(overzicht: SchoolOverzicht[]): number {
  if (overzicht.length === 0) return 0;
  return Math.round(overzicht.reduce((som, o) => som + o.voortgang.pct, 0) / overzicht.length);
}

/* ------------------------------------------------------------------ */
/* Aandachtspunten (dashboard)                                          */
/* ------------------------------------------------------------------ */

export type AandachtspuntSoort = 'vaste-standaard' | 'verstreken' | 'risico' | 'afwijking';

export interface Aandachtspunt {
  soort: AandachtspuntSoort;
  tekst: string;
}

/** Teksten letterlijk zoals het origineel. Rekent met de items van de scope. */
export function aandachtspunten(items: KalenderItem[], standaarden: Standaard[], vandaag: Date = new Date()): Aandachtspunt[] {
  const lijst: Aandachtspunt[] = [];
  for (const s of ontbrekendeVasteStandaarden(items, standaarden)) {
    lijst.push({ soort: 'vaste-standaard', tekst: `Vaste standaard ${s.code} (${s.naam}) nog niet afgedekt` });
  }
  const verlopen = verstrekenDeadlines(items, vandaag).length;
  if (verlopen > 0) lijst.push({ soort: 'verstreken', tekst: `${verlopen} activiteit(en) met een verstreken deadline` });
  const risico = items.filter((i) => i.status === 'risico').length;
  if (risico > 0) lijst.push({ soort: 'risico', tekst: `${risico} activiteit(en) met status risico` });
  const afw = afwijkingen(items).length;
  if (afw > 0) lijst.push({ soort: 'afwijking', tekst: `${afw} afwijking(en) van de standaardkoppeling` });
  return lijst;
}

/* ------------------------------------------------------------------ */
/* Heatmap en status per standaard (bestuur/cluster)                    */
/* ------------------------------------------------------------------ */

export type HeatmapToon = 'leeg' | 'risico' | 'gereed' | 'half' | 'laag';

export interface HeatmapCel {
  voortgang: Voortgang;
  toon: HeatmapToon;
  /** "—" of "43%" */
  tekst: string;
  /** Tooltip: "Geen activiteiten gekoppeld" of "x/y gereed · n risico". */
  titel: string;
}

/** Cel voor school x gesprek. Kleur: leeg grijs, risico oranje, 100% groen, >= 50% blauw, anders grijs. */
export function heatmapCel(itemsVanSchool: KalenderItem[], gesprekId: string): HeatmapCel {
  const v = voortgangVoorGesprek(itemsVanSchool, gesprekId);
  const leeg = v.totaal === 0;
  const risico = v.risico > 0;
  const toon: HeatmapToon = leeg ? 'leeg' : risico ? 'risico' : v.pct === 100 ? 'gereed' : v.pct >= 50 ? 'half' : 'laag';
  return {
    voortgang: v,
    toon,
    tekst: leeg ? '—' : `${v.pct}%`,
    titel: leeg ? 'Geen activiteiten gekoppeld' : `${v.gereed}/${v.totaal} gereed${risico ? ` · ${v.risico} risico` : ''}`,
  };
}

export type CelStatus = 'leeg' | 'risico' | 'gereed' | 'bezig' | 'gepland';

/** Gesprekken-scherm, status per school x standaard voor één gesprek. */
export function statusVoorStandaardInGesprek(items: KalenderItem[], gesprekId: string, standaardCode: string): CelStatus {
  const lijst = items.filter((i) => i.gesprek === gesprekId && activiteitVan(i)?.standaard === standaardCode);
  if (lijst.length === 0) return 'leeg';
  if (lijst.some((i) => i.status === 'risico')) return 'risico';
  if (lijst.every((i) => i.status === 'gereed')) return 'gereed';
  if (lijst.some((i) => i.status === 'bezig' || i.status === 'gereed')) return 'bezig';
  return 'gepland';
}

/* ------------------------------------------------------------------ */
/* Bibliotheek                                                          */
/* ------------------------------------------------------------------ */

export interface BibliotheekFilter {
  zoek?: string;
  /** "Alle" of undefined = geen filter; anders Herfst/Winter/Lente/Zomer/Doorlopend. */
  gesprek?: string;
  /** "Alle" of undefined = geen filter; anders een gebiedscode. */
  gebied?: string;
}

/** Zoekt in `${id} ${naam} ${omschrijving} ${standaard}` (lowercase), plus filters. */
export function filterActiviteiten(lijst: Activiteit[], f: BibliotheekFilter): Activiteit[] {
  const q = (f.zoek ?? '').trim().toLowerCase();
  return lijst.filter((a) => {
    if (f.gesprek && f.gesprek !== 'Alle' && a.gesprek !== f.gesprek) return false;
    if (f.gebied && f.gebied !== 'Alle' && a.gebied !== f.gebied) return false;
    if (!q) return true;
    return `${a.id} ${a.naam} ${a.omschrijving} ${a.standaard}`.toLowerCase().includes(q);
  });
}

/* ------------------------------------------------------------------ */
/* Overig                                                               */
/* ------------------------------------------------------------------ */

/** Cyclus op volgorde (handig voor tabs en kolommen). */
export function cyclusOpVolgorde(state: State): Gesprek[] {
  return gesorteerdeCyclus(state.organisatie.gesprekscyclus);
}

/** Items gesorteerd op naam (stabiel, nl-collatie). */
export function sorteerOpNaam(items: KalenderItem[]): KalenderItem[] {
  return [...items].sort((a, b) => effectieveNaam(a).localeCompare(effectieveNaam(b), 'nl'));
}

/** Heeft de organisatie al ergens een activiteit gepland? (onboarding-stap 3) */
export function heeftActiviteiten(state: State): boolean {
  return state.bestuurItems.length > 0 || Object.values(state.schoolKalenders).some((l) => l.length > 0);
}
