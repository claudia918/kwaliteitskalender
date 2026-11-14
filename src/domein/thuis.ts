/**
 * Berekeningen voor het startscherm: de volgende stap in één zin, en de lijsten "Deze maand" en
 * "Voor het komende gesprek". Puur, zonder React.
 */
import {
  itemsVoorGesprek,
  ontbrekendeVasteStandaarden,
  verstrekenDeadlines,
  type KomendGesprek,
} from './berekeningen';
import { activiteitVan, aantal, effectieveNaam } from './hulp';
import { KALENDERMAAND_INDEX, MAANDEN, MAANDNAMEN_VOLUIT } from './seed';
import type { Gesprek, KalenderItem, Maand, Niveau, Standaard, Status } from './types';

/** Kalendermaand van een datum ("Nov"). */
export function maandVan(d: Date = new Date()): Maand {
  // MAANDEN loopt van Aug t/m Jul; getMonth() 7 = augustus
  return MAANDEN[(d.getMonth() + 5) % 12];
}

/** "november" bij "Nov". */
export function maandVoluit(m: Maand | string): string {
  return MAANDNAMEN_VOLUIT[KALENDERMAAND_INDEX[m as Maand]] ?? m;
}

const STATUS_URGENTIE: Record<Status, number> = { risico: 0, bezig: 1, gepland: 2, gereed: 3 };

/**
 * Vaste volgorde voor een werklijst: eerst op deadline (zonder deadline achteraan), dan verplicht,
 * dan naam. Bewust niet op status, zodat een regel niet verspringt als je hem op gereed zet.
 */
export function werklijstVolgorde(items: KalenderItem[]): KalenderItem[] {
  return [...items].sort(
    (a, b) =>
      (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') ||
      Number(!!activiteitVan(b)?.verplicht) - Number(!!activiteitVan(a)?.verplicht) ||
      effectieveNaam(a).localeCompare(effectieveNaam(b), 'nl'),
  );
}

/** Items die in deze maand gepland staan. */
export function itemsInMaand(items: KalenderItem[], maand: Maand): KalenderItem[] {
  return werklijstVolgorde(items.filter((i) => i.maand === maand));
}

/** Het item waarmee je het best kunt beginnen: risico, dan bezig, dan vroegste deadline, dan verplicht. */
export function eersteOpenItem(items: KalenderItem[]): KalenderItem | undefined {
  const open = items.filter((i) => i.status !== 'gereed');
  return werklijstVolgorde(open).sort((a, b) => STATUS_URGENTIE[a.status] - STATUS_URGENTIE[b.status])[0];
}

/* ------------------------------------------------------------------ */
/* Volgende stap                                                        */
/* ------------------------------------------------------------------ */

export type VolgendeStap =
  | { soort: 'scholen-toevoegen' }
  | { soort: 'kalender-leeg' }
  | { soort: 'verstreken'; items: KalenderItem[] }
  | { soort: 'risico'; items: KalenderItem[] }
  | { soort: 'vaste-standaard'; codes: string[] }
  | { soort: 'school-vaste-standaard'; schoolId: string; schoolNaam: string; codes: string[] }
  | { soort: 'gesprek-open'; gesprek: Gesprek; dagenTot: number; open: KalenderItem[]; eerste: KalenderItem }
  | { soort: 'gesprek-klaar'; gesprek: Gesprek; dagenTot: number }
  | { soort: 'gesprek-leeg'; gesprek: Gesprek; dagenTot: number }
  | { soort: 'geen-cyclus' };

export interface VolgendeStapInvoer {
  niveau: Niveau;
  /** Items van wat je bekijkt (school, bestuurskalender of cluster samen). */
  items: KalenderItem[];
  standaarden: Standaard[];
  komend: KomendGesprek | null;
  aantalScholen: number;
  /** Bestuur en cluster: per school de ontbrekende vaste standaarden. */
  scholenZonderVaste?: { schoolId: string; schoolNaam: string; codes: string[] }[];
  /** Bestuur: staan er op de schoolkalenders wel activiteiten? Dan is een lege bestuurskalender geen beginsituatie. */
  elders?: boolean;
  vandaag?: Date;
}

/** De belangrijkste volgende stap voor wat de gebruiker nu bekijkt. */
export function volgendeStap(i: VolgendeStapInvoer): VolgendeStap {
  const vandaag = i.vandaag ?? new Date();
  if (i.niveau === 'bestuur' && i.aantalScholen === 0) return { soort: 'scholen-toevoegen' };
  if (i.items.length === 0 && (i.niveau === 'school' || (i.niveau === 'bestuur' && !i.elders))) return { soort: 'kalender-leeg' };

  const verlopen = verstrekenDeadlines(i.items, vandaag);
  if (verlopen.length > 0) return { soort: 'verstreken', items: werklijstVolgorde(verlopen) };
  const risico = i.items.filter((x) => x.status === 'risico');
  if (risico.length > 0) return { soort: 'risico', items: werklijstVolgorde(risico) };

  if (i.niveau !== 'cluster') {
    const codes = ontbrekendeVasteStandaarden(i.items, i.standaarden).map((s) => s.code);
    if (codes.length > 0) return { soort: 'vaste-standaard', codes };
  }
  const school = i.scholenZonderVaste?.find((s) => s.codes.length > 0);
  if (school) return { soort: 'school-vaste-standaard', ...school };

  if (!i.komend) return { soort: 'geen-cyclus' };
  const g = i.komend.gesprek;
  const voorGesprek = itemsVoorGesprek(i.items, g.id);
  if (voorGesprek.length === 0) return { soort: 'gesprek-leeg', gesprek: g, dagenTot: i.komend.dagenTot };
  const open = voorGesprek.filter((x) => x.status !== 'gereed');
  const eerste = eersteOpenItem(open);
  if (eerste) return { soort: 'gesprek-open', gesprek: g, dagenTot: i.komend.dagenTot, open, eerste };
  return { soort: 'gesprek-klaar', gesprek: g, dagenTot: i.komend.dagenTot };
}

function overDagen(n: number): string {
  if (n < 0) return `${aantal(-n, 'dag', 'dagen')} geleden`;
  if (n === 0) return 'vandaag';
  if (n === 1) return 'morgen';
  return `over ${aantal(n, 'dag', 'dagen')}`;
}

/** Zin en knoptekst bij een stap. `bewerkbaar` is false op clusterniveau. */
export function stapTekst(stap: VolgendeStap, bewerkbaar = true): { zin: string; knop: string } {
  switch (stap.soort) {
    case 'scholen-toevoegen':
      return { zin: 'Voeg eerst je scholen toe, dan kun je hun kalenders vullen.', knop: 'Scholen toevoegen' };
    case 'kalender-leeg':
      return {
        zin: 'Je kalender is nog leeg. Begin met de aanbevolen activiteiten; je kunt ze daarna aanpassen of weghalen.',
        knop: 'Aanbevolen activiteiten toevoegen',
      };
    case 'verstreken': {
      const n = stap.items.length;
      return {
        zin:
          n === 1
            ? `De deadline van ${effectieveNaam(stap.items[0])} is voorbij. Rond haar af of kies een nieuwe datum.`
            : `Bij ${n} activiteiten is de deadline voorbij. Begin met ${effectieveNaam(stap.items[0])}.`,
        knop: bewerkbaar ? 'Activiteit openen' : 'Bekijken',
      };
    }
    case 'risico': {
      const n = stap.items.length;
      return {
        zin:
          n === 1
            ? `${effectieveNaam(stap.items[0])} loopt risico. Kijk wat er nodig is om haar op tijd af te ronden.`
            : `${n} activiteiten lopen risico. Begin met ${effectieveNaam(stap.items[0])}.`,
        knop: bewerkbaar ? 'Activiteit openen' : 'Bekijken',
      };
    }
    case 'vaste-standaard':
      return {
        zin: `Voor ${stap.codes.length === 1 ? 'vaste standaard' : 'de vaste standaarden'} ${lijstTekst(stap.codes)} staat nog geen activiteit op de kalender. De inspectie kijkt hier altijd naar.`,
        knop: 'Activiteit kiezen',
      };
    case 'school-vaste-standaard':
      return {
        zin: `${stap.schoolNaam} heeft nog geen activiteit voor ${stap.codes.length === 1 ? 'vaste standaard' : 'de vaste standaarden'} ${lijstTekst(stap.codes)}.`,
        knop: `Naar ${stap.schoolNaam}`,
      };
    case 'gesprek-open':
      return {
        zin: `Voor het ${gesprekNaam(stap.gesprek)} (${overDagen(stap.dagenTot)}) ${stap.open.length === 1 ? 'staat nog 1 activiteit' : `staan nog ${stap.open.length} activiteiten`} open. Begin met ${effectieveNaam(stap.eerste)}.`,
        knop: bewerkbaar ? 'Activiteit openen' : 'Bekijken',
      };
    case 'gesprek-klaar':
      return {
        zin: `Alles voor het ${gesprekNaam(stap.gesprek)} is gereed. Maak het gespreksdossier om het gesprek voor te bereiden.`,
        knop: 'Gespreksdossier maken',
      };
    case 'gesprek-leeg':
      return {
        zin: `Aan het ${gesprekNaam(stap.gesprek)} (${overDagen(stap.dagenTot)}) is nog geen activiteit gekoppeld. Kies wat je voor dit gesprek wilt laten zien.`,
        knop: 'Activiteiten kiezen',
      };
    case 'geen-cyclus':
      return { zin: 'Er is nog geen gesprekscyclus ingesteld. Leg vast wanneer de seizoensgesprekken zijn.', knop: 'Gesprekken instellen' };
  }
}

/** "gesprek Winter", of "Gesprek 5" als de naam al met gesprek begint. */
function gesprekNaam(g: Gesprek): string {
  return g.naam.toLowerCase().startsWith('gesprek') ? g.naam : `gesprek ${g.naam}`;
}

/** "OP2", "OP2 en VS1", "OP0, OP2 en VS1". */
export function lijstTekst(delen: string[]): string {
  if (delen.length <= 1) return delen.join('');
  return `${delen.slice(0, -1).join(', ')} en ${delen[delen.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* Sinds je vorige bezoek                                               */
/* ------------------------------------------------------------------ */

/**
 * Items die tussen het vorige bezoek en het begin van dit bezoek gewijzigd zijn: dat zijn
 * wijzigingen van collega's (via het gedeelde bestand) of van jezelf in een ander venster.
 */
export function gewijzigdSinds(items: KalenderItem[], vorigBezoek: number, ditBezoek: number): KalenderItem[] {
  return items
    .filter((i) => (i.gewijzigd ?? 0) > vorigBezoek && (i.gewijzigd ?? 0) <= ditBezoek)
    .sort((a, b) => (b.gewijzigd ?? 0) - (a.gewijzigd ?? 0));
}
