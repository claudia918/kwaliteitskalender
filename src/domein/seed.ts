/**
 * Alle ingebouwde inhoud, letterlijk uit de oude app (seed-data.json in deze map).
 * Dit bestand geeft er getypeerde toegang toe. Pas seed-data.json niet aan.
 */
import ruw from './seed-data.json';
import type { Activiteit, GebiedCode, Gesprek, GesprekIcoon, GesprekKleur, Maand, Niveau, Standaard, Status } from './types';

export const SEED = ruw;

export const MAANDEN = ruw.maanden_kalender as Maand[];
export const MAANDNAMEN_VOLUIT: string[] = ruw.maandnamen_voluit;
export const VASTE_STANDAARDEN: string[] = ruw.vaste_standaarden;
export const SEIZOENSGESPREKKEN = ruw.seizoensgesprekken as ('Herfst' | 'Winter' | 'Lente' | 'Zomer')[];
export const GESPREK_FILTER_OPTIES = ruw.gesprek_filter_opties as GesprekKleur[];
export const ICOON_OPTIES = ruw.icoon_opties as GesprekIcoon[];
export const KLEUR_OPTIES = ruw.kleur_opties as GesprekKleur[];
export const STATUS_VOLGORDE = ruw.status_volgorde as Status[];
export const NIVEAUS = ruw.niveaus as { id: Niveau; label: string }[];
export const SCHOOLTYPE_SUGGESTIES: string[] = ruw.schooltype_suggesties;
export const STANDAARD_SCHOOLJAAR: string = ruw.standaard_schooljaar;
export const PERIODE_PREFIX_NAAR_MAAND = ruw.periode_prefix_naar_maand as Record<string, Maand>;
export const KALENDERMAAND_INDEX = ruw.kalendermaand_index as Record<Maand, number>;

export const ACTIVITEITEN_SCHOOL = ruw.activiteiten_school as Activiteit[];
export const ACTIVITEITEN_BESTUUR = ruw.activiteiten_bestuur as Activiteit[];
export const ALLE_ACTIVITEITEN: Activiteit[] = [...ACTIVITEITEN_SCHOOL, ...ACTIVITEITEN_BESTUUR];
export const ACTIVITEIT_OP_ID: Record<string, Activiteit> = Object.fromEntries(ALLE_ACTIVITEITEN.map((a) => [a.id, a]));
/** De 19 verplichte schoolactiviteiten (startsjabloon). */
export const VERPLICHTE_SCHOOLACTIVITEITEN = ACTIVITEITEN_SCHOOL.filter((a) => a.verplicht);

/** Net als de oude app: kern = code staat in vaste_standaarden (de bron zet OP0 ten onrechte op false). */
export const STANDAARDEN: Standaard[] = (ruw.standaarden as Standaard[]).map((s) => ({
  ...s,
  kern: VASTE_STANDAARDEN.includes(s.code),
}));
export const STANDAARD_OP_CODE: Record<string, Standaard> = Object.fromEntries(STANDAARDEN.map((s) => [s.code, s]));
export const STANDAARDEN_SCHOOL = STANDAARDEN.filter((s) => s.niveau === 'school');
export const STANDAARDEN_BESTUUR = STANDAARDEN.filter((s) => s.niveau === 'bestuur');

export const GEBIEDEN = ruw.kwaliteitsgebieden as Record<GebiedCode, { naam: string }>;
export const GEBIED_CODES = Object.keys(GEBIEDEN) as GebiedCode[];

export const STANDAARD_GESPREKSCYCLUS = ruw.standaard_gesprekscyclus as Gesprek[];
export const GESPREK_DOORLOPEND = ruw.gesprek_doorlopend as Gesprek;
export const DOORLOPEND = 'Doorlopend';

export interface GesprekInhoud {
  key: string;
  naam: string;
  periode: string;
  thema: string;
  schoolinput: string[];
  standaarden: string[];
  bestuursinput: string[];
  output: string[];
  volgorde: number;
}
/** Vaste inhoud van de vier seizoensgesprekken (emoji wordt niet getoond). */
export const GESPREKKEN_INHOUD = ruw.gesprekken_inhoud as (GesprekInhoud & { emoji: string })[];

export const STATUSSEN = ruw.statussen as Record<Status, { label: string; icoon: string; tint: string }>;

export const DEMO_ORGANISATIE = ruw.demo_organisatie;
export const DEMO_SCHOLEN = ruw.demo_scholen;
export const DEMO_CLUSTERS = ruw.demo_clusters;
export const DEMO_VOORTGANG_PER_SCHOOL = ruw.demo_voortgang_per_school as Record<string, number>;
export const DEMO_AFWIJKINGEN = ruw.demo_afwijkingen;

/** Lucide-namen per menu-item/tegel ("lucide:Gauge" → "Gauge"). */
export function lucideNaam(waarde: string): string {
  return waarde.replace(/^lucide:/, '');
}
