/** Kleine pure hulpfuncties voor het domein. */
import {
  ACTIVITEIT_OP_ID,
  ACTIVITEITEN_BESTUUR,
  ACTIVITEITEN_SCHOOL,
  DOORLOPEND,
  GEBIED_CODES,
  GESPREK_DOORLOPEND,
  MAANDNAMEN_VOLUIT,
  PERIODE_PREFIX_NAAR_MAAND,
  STANDAARDEN_BESTUUR,
  STANDAARDEN_SCHOOL,
} from './seed';
import type { Activiteit, EditScope, GebiedCode, Gesprek, KalenderItem, Maand, Standaard, Tijdstempel } from './types';

/** Maand uit een periodetekst: "sep-okt" → "Sep", "nov, mrt" → "Nov", onbekend → "Sep". */
export function maandUitPeriode(periode: string | undefined): Maand {
  const prefix = (periode || '')
    .toLowerCase()
    .split(/[-–/ ]/)[0]
    ?.slice(0, 3);
  return (prefix && PERIODE_PREFIX_NAAR_MAAND[prefix]) || 'Sep';
}

/** Kwaliteitsgebied uit een standaardcode ("OP2" → "OP"); fallback "OP". */
export function gebiedUitStandaard(code: string): GebiedCode {
  const prefix = (code || '').toUpperCase().match(/^[A-Z]+/)?.[0] ?? '';
  return GEBIED_CODES.find((g) => g === prefix) ?? 'OP';
}

/** Bibliotheek voor bestuur (30) of school (67). */
export function bibliotheek(isBestuur: boolean): Activiteit[] {
  return isBestuur ? ACTIVITEITEN_BESTUUR : ACTIVITEITEN_SCHOOL;
}

/** Standaarden voor bestuur (BKA1-3) of school (13). */
export function standaardenVoor(isBestuur: boolean): Standaard[] {
  return isBestuur ? STANDAARDEN_BESTUUR : STANDAARDEN_SCHOOL;
}

/** De activiteit achter een item: de eigen activiteit of die uit de bibliotheek. */
export function activiteitVan(item: KalenderItem): Activiteit | undefined {
  return item.custom ?? ACTIVITEIT_OP_ID[item.activiteitId];
}

/** Naam zoals getoond: eigen naam, anders bibliotheeknaam, anders het id. */
export function effectieveNaam(item: KalenderItem): string {
  return item.eigenNaam?.trim() || activiteitVan(item)?.naam || item.activiteitId;
}

/** Standaardgesprek van de activiteit achter een item. */
export function standaardGesprekVan(item: KalenderItem): string | undefined {
  return activiteitVan(item)?.gesprek;
}

/** Het pseudo-gesprek "Doorlopend". */
export function doorlopend(): Gesprek {
  return { ...GESPREK_DOORLOPEND };
}

/** Cyclus gesorteerd op volgorde. */
export function gesorteerdeCyclus(cyclus: Gesprek[]): Gesprek[] {
  return [...cyclus].sort((a, b) => a.volgorde - b.volgorde);
}

/** Kiesbare gesprekken: de cyclus (op volgorde) plus Doorlopend. */
export function gesprekOpties(cyclus: Gesprek[]): Gesprek[] {
  return [...gesorteerdeCyclus(cyclus), doorlopend()];
}

/**
 * Zoek een gesprek op id. Onbekende id's (bv. een gesprek dat een collega verwijderde)
 * en "Doorlopend" geven het pseudo-gesprek Doorlopend terug.
 */
export function vindGesprek(cyclus: Gesprek[], id: string): Gesprek {
  if (id === DOORLOPEND) return doorlopend();
  return cyclus.find((g) => g.id === id) ?? doorlopend();
}

/** "JJJJ-MM-DD" in lokale tijd. */
export function vandaagISO(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dag = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dag}`;
}

/** "1 februari 2027" */
export function formatDatumLang(d: Date): string {
  return `${d.getDate()} ${MAANDNAMEN_VOLUIT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "JJJJ-MM-DD" → "d-m-jjjj" (zoals historie en gespreksdossier). Ongeldig → invoer terug. */
export function formatDatumKort(iso: string | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${Number(m[3])}-${Number(m[2])}-${m[1]}`;
}

/** Tijd als "14:05" of, als het niet vandaag is, "3 nov 14:05". */
export function formatTijdstip(ts: Tijdstempel, nu: Date = new Date()): string {
  const d = new Date(ts);
  const tijd = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (vandaagISO(d) === vandaagISO(nu)) return tijd;
  return `${d.getDate()} ${MAANDNAMEN_VOLUIT[d.getMonth()].slice(0, 3)} ${tijd}`;
}

/** Slug voor bestandsnamen en oude cluster-id's: "Cluster Noord!" → "cluster-noord". */
export function slug(tekst: string): string {
  return (
    tekst
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || ''
  );
}

/** Willekeurige hex-tekst van `lengte` tekens (crypto als beschikbaar). */
export function willekeurigeHex(lengte: number): string {
  const bytes = new Uint8Array(Math.ceil(lengte / 2));
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, lengte);
}

/** Uuid (v4-vorm) voor kalenderitems en bewijsstukken. */
export function nieuweUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* val terug */
    }
  }
  const h = willekeurigeHex(32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Botsingsvrij id met prefix, bv. nieuwId('sch') → "sch-3f9a2c1d0b7e". */
export function nieuwId(prefix: string): string {
  return `${prefix}-${willekeurigeHex(12)}`;
}

/**
 * Tijdstempel voor een wijziging: nu, maar altijd later dan de vorige versie van die entiteit.
 * Zo wint een bewerking altijd van de versie waarop ze gebaseerd is, ook bij een scheve klok.
 */
export function stempel(nu: Tijdstempel, ...vorige: (Tijdstempel | undefined)[]): Tijdstempel {
  const max = Math.max(0, ...vorige.map((v) => v ?? 0));
  return Math.max(nu, max + 1);
}

/** Sleutel van een kalender in een EditScope: "bestuur" of het school-id. */
export function kalenderSleutel(scope: EditScope): string {
  return scope.kind === 'bestuur' ? 'bestuur' : scope.schoolId;
}

/** Enkelvoud/meervoud: aantal(1, 'activiteit', 'activiteiten') → "1 activiteit". */
export function aantal(n: number, enkel: string, meer: string): string {
  return `${n} ${n === 1 ? enkel : meer}`;
}
