/**
 * Datamodel van de Kwaliteitskalender VO (stateversie 5).
 * Gebaseerd op het lokale model van de oude app (versie 4, zie analyse/inventaris.md §2.1),
 * uitgebreid met tijdstempels en tombstones voor samenwerken via een gedeeld bestand.
 */

export type Maand = 'Aug' | 'Sep' | 'Okt' | 'Nov' | 'Dec' | 'Jan' | 'Feb' | 'Mrt' | 'Apr' | 'Mei' | 'Jun' | 'Jul';
export type Status = 'gepland' | 'bezig' | 'gereed' | 'risico';
export type Niveau = 'bestuur' | 'cluster' | 'school';
export type GebiedCode = 'BKA' | 'SKA' | 'OP' | 'VS' | 'OR';
/** Kleurfamilie van een gesprek (= de vier seizoenen + Doorlopend). */
export type GesprekKleur = 'Herfst' | 'Winter' | 'Lente' | 'Zomer' | 'Doorlopend';
export type GesprekIcoon = 'blad' | 'sneeuw' | 'bloem' | 'zon' | 'herhaal' | 'vlag' | 'cirkel' | 'ster';
/** Standaardkoppeling van een bibliotheekactiviteit. */
export type StandaardGesprek = 'Herfst' | 'Winter' | 'Lente' | 'Zomer' | 'Doorlopend';
export type Modus = 'demo' | 'eigen';

/**
 * School-id. In oude back-ups is dit een getal (1, 2, ...); vanaf versie 5 altijd een string.
 * Oude id's worden "1", "2", ...; nieuwe id's zijn willekeurig (bv. "sch-k3f9a2c1q0") en dus
 * botsingsvrij als twee mensen tegelijk een school toevoegen.
 */
export type SchoolId = string;
/** Milliseconden sinds 1970 (Date.now()). */
export type Tijdstempel = number;

export interface Activiteit {
  id: string;
  naam: string;
  omschrijving: string;
  standaard: string;
  gebied: GebiedCode;
  gesprek: StandaardGesprek | string;
  periode: string;
  frequentie: string;
  verantwoordelijke: string;
  verplicht: boolean;
  tags: string[];
  type: 'school' | 'bestuur';
}

export interface Standaard {
  code: string;
  gebied: GebiedCode;
  gebiedNaam: string;
  naam: string;
  niveau: 'bestuur' | 'school';
  /** Vaste standaard (kernstandaard): OP0, OP2, OP3, VS1, OR1. */
  kern: boolean;
}

export interface School {
  id: SchoolId;
  naam: string;
  type: string;
  /** Cluster-id of "" (geen cluster). */
  cluster: string;
  gewijzigd?: Tijdstempel;
}

export interface Cluster {
  id: string;
  naam: string;
  gewijzigd?: Tijdstempel;
}

export interface Gesprek {
  /** "Herfst" | "Winter" | "Lente" | "Zomer" of "g-xxxxxxxx" voor eigen gesprekken. */
  id: string;
  naam: string;
  /** Deadline = de 1e van deze maand. */
  maand: Maand;
  kleur: GesprekKleur;
  icoon: GesprekIcoon;
  thema?: string;
  volgorde: number;
  gewijzigd?: Tijdstempel;
}

export interface Bewijs {
  id: string;
  label: string;
  url?: string;
}

export interface HistorieRegel {
  status: Status;
  /** "JJJJ-MM-DD" */
  datum: string;
}

export interface KalenderItem {
  /** "s{schoolId}-{activiteitId}" (sjabloon/demo), "bestuur-{activiteitId}" (demo) of een willekeurige uuid. */
  uid: string;
  /** Bibliotheek-id, of custom.id ("EIGEN-xxxxxxxx") bij een eigen activiteit. */
  activiteitId: string;
  maand: Maand;
  /** Gesprek.id of "Doorlopend". */
  gesprek: string;
  status: Status;
  /** Gezet als gesprek afwijkt van het standaardgesprek van de activiteit. */
  afwijking?: { reden: string };
  notitie?: string;
  eigenNaam?: string;
  /** Vrije tekst ("Naam of rol"), geen account. */
  eigenaar?: string;
  /** "JJJJ-MM-DD" */
  deadline?: string;
  bewijs?: Bewijs[];
  historie?: HistorieRegel[];
  /** Alleen bij een eigen activiteit: die bestaat alleen in dit item. */
  custom?: Activiteit;
  gewijzigd?: Tijdstempel;
}

export interface Organisatie {
  bestuurNaam: string;
  scholen: School[];
  clusters: Cluster[];
  gesprekscyclus: Gesprek[];
}

/** Tijdstempels van losse instellingen (elk apart samen te voegen). */
export interface InstellingTijden {
  bestuurNaam?: Tijdstempel;
  schooljaar?: Tijdstempel;
}

/**
 * Alles wat met collega's gedeeld wordt (inhoud van het kalenderbestand).
 * Sleutels in `verwijderd` (tombstones): zie entiteitSleutel() in samenvoegen.ts.
 */
export interface GedeeldeGegevens {
  schooljaar: string;
  organisatie: Organisatie;
  bestuurItems: KalenderItem[];
  schoolKalenders: Record<SchoolId, KalenderItem[]>;
  tijden: InstellingTijden;
  verwijderd: Record<string, Tijdstempel>;
}

/** De volledige lokale state (localStorage en JSON-back-up). */
export interface State extends GedeeldeGegevens {
  versie: 5;
  modus: Modus;
  setupVoltooid: boolean;
  onboardingVerborgen?: boolean;
}

/** Inhoud van een `.kwaliteitskalender.json`-bestand. */
export interface KalenderBestand extends GedeeldeGegevens {
  formaat: 'kwaliteitskalender-vo';
  versie: 5;
  /** ISO-tijdstip van het laatste wegschrijven. */
  opgeslagenOp: string;
}

/** Op welke kalender een mutatie werkt. */
export type EditScope = { kind: 'bestuur' } | { kind: 'school'; schoolId: SchoolId };

/** Afgeleide scope per niveau. */
export interface Scope {
  items: KalenderItem[];
  isBestuur: boolean;
  standaarden: Standaard[];
}

export interface EigenActiviteitInvoer {
  naam: string;
  standaard: string;
  gesprek: string;
  periode?: string;
  omschrijving?: string;
}

/** Velden die het detailvenster in één keer opslaat (knop "Opslaan"). */
export interface ItemWijziging {
  gesprek?: string;
  /** Reden voor afwijking; alleen gebruikt als `gesprek` is meegegeven. */
  reden?: string;
  notitie?: string;
  eigenNaam?: string;
  eigenaar?: string;
  deadline?: string;
  maand?: Maand;
}

export interface WizardInvoer {
  bestuurNaam: string;
  schooljaar: string;
  scholen: { naam: string; type?: string }[];
  sjabloon: boolean;
}
