/**
 * Samenvoegen van twee versies van de gedeelde kalender (lokaal en extern, bv. het bestand op
 * SharePoint). Puur en deterministisch: beide kanten komen op hetzelfde resultaat uit.
 *
 * Regels
 * 1. Per entiteit (kalenderitem, school, cluster, gesprek) en per instelling (bestuursnaam,
 *    schooljaar) wint de versie met de nieuwste tijdstempel (`gewijzigd`, resp. `tijden`).
 * 2. Een verwijdering is een tombstone (`verwijderd[sleutel] = tijdstempel`) en doet mee als
 *    versie: een verwijderd item komt niet terug, tenzij iemand het daarna opnieuw wijzigt of toevoegt.
 * 3. Gelijke tijdstempel: verwijdering wint van wijziging; anders wint de inhoud die in
 *    canonieke JSON het grootst is (willekeurig maar voor iedereen gelijk).
 * 4. Items van een school die na het samenvoegen niet (meer) bestaat, vervallen.
 * 5. Conflict = beide kanten wijzigden dezelfde entiteit sinds de vorige synchronisatie
 *    (volgens `basis`) en de inhoud verschilt. De nieuwste wint; het conflict wordt gemeld.
 */
import { effectieveNaam } from './hulp';
import type { Cluster, GedeeldeGegevens, Gesprek, KalenderItem, School, State, Tijdstempel } from './types';

export type EntiteitSoort = 'item' | 'school' | 'cluster' | 'gesprek' | 'instelling';

interface Versie {
  sleutel: string;
  soort: EntiteitSoort;
  ts: Tijdstempel;
  verwijderd: boolean;
  waarde?: unknown;
  /** Alleen bij items: "b" of het school-id. */
  kalender?: { kind: 'bestuur' } | { kind: 'school'; schoolId: string };
}

/** Basis = handtekening (tijdstempel, "x" bij tombstone) per sleutel na de vorige synchronisatie. */
export type SyncBasis = Record<string, string>;

export interface Wijziging {
  sleutel: string;
  soort: EntiteitSoort;
  actie: 'toegevoegd' | 'gewijzigd' | 'verwijderd';
  /** Leesbare naam, bv. "Lesbezoeken ronde 1 (Lyceum Noord)" of "School Lyceum Noord". */
  omschrijving: string;
}

export interface Conflict {
  sleutel: string;
  soort: EntiteitSoort;
  omschrijving: string;
  /** Welke versie is bewaard (de nieuwste). */
  bewaard: 'lokaal' | 'extern';
}

export interface SamenvoegResultaat {
  resultaat: GedeeldeGegevens;
  /** Beide kanten wijzigden dezelfde entiteit sinds de basis. Leeg zonder basis. */
  conflicten: Conflict[];
  /** Wijzigingen die van de externe kant kwamen (voor de melding "wijzigingen van collega's"). */
  binnenkomend: Wijziging[];
  /** Resultaat verschilt van de lokale versie (lokale state bijwerken). */
  lokaalGewijzigd: boolean;
  /** Resultaat verschilt van de externe versie (terugschrijven naar het bestand). */
  externGewijzigd: boolean;
  /** Nieuwe basis voor de volgende synchronisatie. */
  basis: SyncBasis;
}

/* ------------------------------------------------------------------ */
/* Canonieke vergelijking                                               */
/* ------------------------------------------------------------------ */

/** JSON met gesorteerde sleutels, zonder undefined-velden. */
export function canoniek(x: unknown): string {
  if (x === undefined) return 'null';
  if (x === null || typeof x !== 'object') return JSON.stringify(x);
  if (Array.isArray(x)) return `[${x.map(canoniek).join(',')}]`;
  const o = x as Record<string, unknown>;
  const delen = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canoniek(o[k])}`);
  return `{${delen.join(',')}}`;
}

/** Inhoud zonder tijdstempel (om "echt" verschil te zien). */
function inhoud(v: Versie): string {
  if (v.verwijderd) return 'x';
  if (v.waarde !== null && typeof v.waarde === 'object') {
    const { gewijzigd: _g, ...rest } = v.waarde as Record<string, unknown>;
    void _g;
    return canoniek(rest);
  }
  return canoniek(v.waarde);
}

function handtekening(v: Versie): string {
  return v.verwijderd ? `x${v.ts}` : String(v.ts);
}

function volledig(v: Versie): string {
  return `${handtekening(v)}|${v.verwijderd ? '' : canoniek(v.waarde)}`;
}

/* ------------------------------------------------------------------ */
/* Versies verzamelen                                                   */
/* ------------------------------------------------------------------ */

function verzamel(d: GedeeldeGegevens): Map<string, Versie> {
  const m = new Map<string, Versie>();
  const zet = (v: Versie) => {
    const bestaand = m.get(v.sleutel);
    if (!bestaand || v.ts > bestaand.ts) m.set(v.sleutel, v);
  };
  for (const s of d.organisatie.scholen)
    zet({ sleutel: `school:${s.id}`, soort: 'school', ts: s.gewijzigd ?? 0, verwijderd: false, waarde: s });
  for (const c of d.organisatie.clusters)
    zet({ sleutel: `cluster:${c.id}`, soort: 'cluster', ts: c.gewijzigd ?? 0, verwijderd: false, waarde: c });
  for (const g of d.organisatie.gesprekscyclus)
    zet({ sleutel: `gesprek:${g.id}`, soort: 'gesprek', ts: g.gewijzigd ?? 0, verwijderd: false, waarde: g });
  for (const i of d.bestuurItems) {
    zet({
      sleutel: `item:b:${i.uid}`,
      soort: 'item',
      ts: i.gewijzigd ?? 0,
      verwijderd: false,
      waarde: i,
      kalender: { kind: 'bestuur' },
    });
  }
  for (const [schoolId, items] of Object.entries(d.schoolKalenders)) {
    for (const i of items) {
      zet({
        sleutel: `item:s:${schoolId}:${i.uid}`,
        soort: 'item',
        ts: i.gewijzigd ?? 0,
        verwijderd: false,
        waarde: i,
        kalender: { kind: 'school', schoolId },
      });
    }
  }
  zet({
    sleutel: 'instelling:bestuurNaam',
    soort: 'instelling',
    ts: d.tijden?.bestuurNaam ?? 0,
    verwijderd: false,
    waarde: d.organisatie.bestuurNaam,
  });
  zet({
    sleutel: 'instelling:schooljaar',
    soort: 'instelling',
    ts: d.tijden?.schooljaar ?? 0,
    verwijderd: false,
    waarde: d.schooljaar,
  });
  for (const [sleutel, ts] of Object.entries(d.verwijderd ?? {})) {
    if (sleutel.startsWith('instelling:')) continue;
    const soort = sleutel.split(':')[0] as EntiteitSoort;
    const bestaand = m.get(sleutel);
    // tombstone wint bij gelijke tijd van de entiteit aan dezelfde kant
    if (!bestaand || ts >= bestaand.ts) m.set(sleutel, { sleutel, soort, ts, verwijderd: true });
  }
  return m;
}

/** Kies de winnende versie (regels 1 t/m 3). */
function kies(l: Versie | undefined, r: Versie | undefined): { v: Versie; kant: 'lokaal' | 'extern' } {
  if (!l) return { v: r!, kant: 'extern' };
  if (!r) return { v: l, kant: 'lokaal' };
  if (l.ts !== r.ts) return l.ts > r.ts ? { v: l, kant: 'lokaal' } : { v: r, kant: 'extern' };
  if (l.verwijderd !== r.verwijderd) return l.verwijderd ? { v: l, kant: 'lokaal' } : { v: r, kant: 'extern' };
  if (l.verwijderd) return { v: l, kant: 'lokaal' };
  const cl = canoniek(l.waarde);
  const cr = canoniek(r.waarde);
  return cl >= cr ? { v: l, kant: 'lokaal' } : { v: r, kant: 'extern' };
}

/* ------------------------------------------------------------------ */
/* Omschrijvingen                                                       */
/* ------------------------------------------------------------------ */

function omschrijf(v: Versie, ander: Versie | undefined, scholen: Map<string, School>): string {
  const w = (v.verwijderd ? ander?.waarde : v.waarde) as Record<string, unknown> | undefined;
  switch (v.soort) {
    case 'item': {
      const naam = w ? effectieveNaam(w as unknown as KalenderItem) : (v.sleutel.split(':').pop() ?? '');
      const kal = v.kalender ?? ander?.kalender;
      const waar =
        kal?.kind === 'school'
          ? (scholen.get(kal.schoolId)?.naam ?? 'school')
          : kal?.kind === 'bestuur'
            ? 'bestuurskalender'
            : '';
      return waar ? `${naam} (${waar})` : naam;
    }
    case 'school':
      return `School ${(w?.naam as string) ?? ''}`.trim();
    case 'cluster':
      return `Cluster ${(w?.naam as string) ?? ''}`.trim();
    case 'gesprek':
      return `Gesprek ${(w?.naam as string) ?? ''}`.trim();
    case 'instelling':
      return v.sleutel === 'instelling:bestuurNaam' ? 'Naam van het bestuur' : 'Schooljaar';
  }
}

/* ------------------------------------------------------------------ */
/* Samenvoegen                                                          */
/* ------------------------------------------------------------------ */

/**
 * Voeg `lokaal` en `extern` samen. Met `basis` (handtekeningen van de vorige synchronisatie)
 * worden echte conflicten gemeld; zonder basis (eerste keer, of handmatig) niet.
 */
export function samenvoegen(lokaal: GedeeldeGegevens, extern: GedeeldeGegevens, basis?: SyncBasis): SamenvoegResultaat {
  const L = verzamel(lokaal);
  const R = verzamel(extern);
  const sleutels = new Set([...L.keys(), ...R.keys()]);

  const winnaars = new Map<string, { v: Versie; kant: 'lokaal' | 'extern' }>();
  for (const k of sleutels) winnaars.set(k, kies(L.get(k), R.get(k)));

  // Scholen in het resultaat (nodig voor namen en om wees-items weg te laten)
  const scholenResultaat = new Map<string, School>();
  for (const [k, w] of winnaars)
    if (k.startsWith('school:') && !w.v.verwijderd) scholenResultaat.set((w.v.waarde as School).id, w.v.waarde as School);
  const scholenAlle = new Map<string, School>(scholenResultaat);
  for (const kant of [L, R])
    for (const v of kant.values())
      if (v.soort === 'school' && !v.verwijderd) {
        const s = v.waarde as School;
        if (!scholenAlle.has(s.id)) scholenAlle.set(s.id, s);
      }

  const conflicten: Conflict[] = [];
  const binnenkomend: Wijziging[] = [];
  for (const k of sleutels) {
    const l = L.get(k);
    const r = R.get(k);
    const { v, kant } = winnaars.get(k)!;
    const verschilt = !!l && !!r && inhoud(l) !== inhoud(r);
    if (basis && l && r && verschilt && handtekening(l) !== basis[k] && handtekening(r) !== basis[k]) {
      conflicten.push({
        sleutel: k,
        soort: v.soort,
        omschrijving: omschrijf(v, kant === 'lokaal' ? r : l, scholenAlle),
        bewaard: kant,
      });
    }
    if (kant === 'extern' && (!l || verschilt)) {
      if (!l && r!.verwijderd) continue; // tombstone van iets dat hier nooit bestond
      const actie: Wijziging['actie'] = r!.verwijderd ? 'verwijderd' : !l || l.verwijderd ? 'toegevoegd' : 'gewijzigd';
      binnenkomend.push({ sleutel: k, soort: v.soort, actie, omschrijving: omschrijf(v, l, scholenAlle) });
    }
  }

  // Resultaat opbouwen: volgorde van de lokale kant, daarna nieuwe externe entiteiten
  const volgorde = (lijstL: { id: string }[], lijstR: { id: string }[], prefix: string) => {
    const ids: string[] = [];
    const gezien = new Set<string>();
    for (const x of [...lijstL, ...lijstR])
      if (!gezien.has(x.id)) {
        gezien.add(x.id);
        ids.push(x.id);
      }
    return ids
      .map((id) => winnaars.get(`${prefix}:${id}`)!)
      .filter((w) => w && !w.v.verwijderd)
      .map((w) => w.v.waarde);
  };
  const scholen = volgorde(lokaal.organisatie.scholen, extern.organisatie.scholen, 'school') as School[];
  const clusters = volgorde(lokaal.organisatie.clusters, extern.organisatie.clusters, 'cluster') as Cluster[];
  const gesprekscyclus = volgorde(lokaal.organisatie.gesprekscyclus, extern.organisatie.gesprekscyclus, 'gesprek') as Gesprek[];

  const itemVolgorde = (lijstL: KalenderItem[], lijstR: KalenderItem[], prefix: string) => {
    const uids: string[] = [];
    const gezien = new Set<string>();
    for (const x of [...lijstL, ...lijstR])
      if (!gezien.has(x.uid)) {
        gezien.add(x.uid);
        uids.push(x.uid);
      }
    return uids
      .map((uid) => winnaars.get(`${prefix}:${uid}`))
      .filter((w) => w && !w.v.verwijderd)
      .map((w) => w!.v.waarde as KalenderItem);
  };
  const bestuurItems = itemVolgorde(lokaal.bestuurItems, extern.bestuurItems, 'item:b');
  const schoolKalenders: Record<string, KalenderItem[]> = {};
  for (const s of scholen) {
    schoolKalenders[s.id] = itemVolgorde(
      lokaal.schoolKalenders[s.id] ?? [],
      extern.schoolKalenders[s.id] ?? [],
      `item:s:${s.id}`,
    );
  }

  const verwijderd: Record<string, Tijdstempel> = {};
  for (const [k, w] of winnaars) if (w.v.verwijderd) verwijderd[k] = w.v.ts;

  const naam = winnaars.get('instelling:bestuurNaam')!.v;
  const jaar = winnaars.get('instelling:schooljaar')!.v;
  const tijden: GedeeldeGegevens['tijden'] = {};
  if (naam.ts) tijden.bestuurNaam = naam.ts;
  if (jaar.ts) tijden.schooljaar = jaar.ts;

  const resultaat: GedeeldeGegevens = {
    schooljaar: jaar.waarde as string,
    organisatie: { bestuurNaam: naam.waarde as string, scholen, clusters, gesprekscyclus },
    bestuurItems,
    schoolKalenders,
    tijden,
    verwijderd,
  };

  const vingerafdrukResultaat = vingerafdruk(resultaat);
  return {
    resultaat,
    conflicten,
    binnenkomend,
    lokaalGewijzigd: vingerafdrukResultaat !== vingerafdruk(lokaal),
    externGewijzigd: vingerafdrukResultaat !== vingerafdruk(extern),
    basis: maakBasis(resultaat),
  };
}

/** Volgorde-onafhankelijke vingerafdruk van alle versies (inclusief tombstones). */
export function vingerafdruk(d: GedeeldeGegevens): string {
  const m = verzamel(d);
  // items van niet-bestaande scholen tellen niet mee (die vallen bij samenvoegen weg)
  const scholen = new Set(d.organisatie.scholen.map((s) => s.id));
  return [...m.values()]
    .filter((v) => !(v.kalender?.kind === 'school' && !v.verwijderd && !scholen.has(v.kalender.schoolId)))
    .map((v) => `${v.sleutel}=${volledig(v)}`)
    .sort()
    .join('\n');
}

/** Handtekeningen van alle entiteiten en tombstones; bewaren als basis voor de volgende keer. */
export function maakBasis(d: GedeeldeGegevens): SyncBasis {
  const b: SyncBasis = {};
  for (const v of verzamel(d).values()) b[v.sleutel] = handtekening(v);
  return b;
}

/** Zet samengevoegde gedeelde gegevens in een lokale state (lokale velden blijven). */
export function metGedeeld(s: State, g: GedeeldeGegevens): State {
  return {
    ...s,
    schooljaar: g.schooljaar,
    organisatie: g.organisatie,
    bestuurItems: g.bestuurItems,
    schoolKalenders: g.schoolKalenders,
    tijden: g.tijden,
    verwijderd: g.verwijderd,
  };
}
