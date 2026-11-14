/**
 * Alle mutaties als pure functies: (state, ..., nu) → nieuwe state.
 * De store (src/store) roept ze aan met nu = Date.now().
 *
 * Regels voor samenwerken:
 * - elke gewijzigde entiteit (item, school, cluster, gesprek) krijgt `gewijzigd = stempel(nu, vorige)`;
 * - verwijderen zet een tombstone in `verwijderd` (sleutels: zie sleutels.ts);
 * - opnieuw toevoegen met dezelfde sleutel haalt de tombstone weg en krijgt een nieuwere tijdstempel;
 * - bestuursnaam en schooljaar krijgen elk een eigen tijdstempel in `tijden`.
 */
import {
  activiteitVan,
  gebiedUitStandaard,
  maandUitPeriode,
  nieuweUuid,
  nieuwId,
  stempel,
  vandaagISO,
  willekeurigeHex,
} from './hulp';
import {
  ACTIVITEIT_OP_ID,
  ACTIVITEITEN_BESTUUR,
  DOORLOPEND,
  STANDAARD_GESPREKSCYCLUS,
  VERPLICHTE_SCHOOLACTIVITEITEN,
} from './seed';
import { clusterSleutel, gesprekSleutel, itemSleutel, schoolSleutel } from './sleutels';
import { sjabloonItem, sjabloonPrefix } from './state';
import type {
  Bewijs,
  Cluster,
  EditScope,
  EigenActiviteitInvoer,
  Gesprek,
  ItemWijziging,
  KalenderItem,
  Maand,
  School,
  SchoolId,
  State,
  Status,
  Tijdstempel,
  WizardInvoer,
} from './types';

/* ------------------------------------------------------------------ */
/* Hulp                                                                 */
/* ------------------------------------------------------------------ */

function zonder(verwijderd: Record<string, number>, sleutel: string): Record<string, number> {
  if (!(sleutel in verwijderd)) return verwijderd;
  const kopie = { ...verwijderd };
  delete kopie[sleutel];
  return kopie;
}

function met(verwijderd: Record<string, number>, sleutel: string, ts: Tijdstempel): Record<string, number> {
  return { ...verwijderd, [sleutel]: ts };
}

/** Pas de lijst items van één kalender aan. */
function wijzigKalender(s: State, scope: EditScope, fn: (items: KalenderItem[]) => KalenderItem[]): State {
  if (scope.kind === 'bestuur') return { ...s, bestuurItems: fn(s.bestuurItems) };
  return { ...s, schoolKalenders: { ...s.schoolKalenders, [scope.schoolId]: fn(s.schoolKalenders[scope.schoolId] ?? []) } };
}

/** Pas één item aan; `fn` geeft het nieuwe item of hetzelfde object (= geen wijziging). */
function wijzigItem(s: State, scope: EditScope, uid: string, nu: Tijdstempel, fn: (i: KalenderItem) => KalenderItem): State {
  let veranderd = false;
  const na = wijzigKalender(s, scope, (items) =>
    items.map((i) => {
      if (i.uid !== uid) return i;
      const nieuw = fn(i);
      if (nieuw === i) return i;
      veranderd = true;
      return { ...nieuw, gewijzigd: stempel(nu, i.gewijzigd) };
    }),
  );
  return veranderd ? na : s;
}

/** Voeg een item toe (nieuwe tijdstempel, eventuele tombstone weg). */
function voegItemToe(s: State, scope: EditScope, item: KalenderItem, nu: Tijdstempel): State {
  const sleutel = itemSleutel(scope, item.uid);
  const metItem = wijzigKalender(s, scope, (items) => [...items, { ...item, gewijzigd: stempel(nu, s.verwijderd[sleutel]) }]);
  return { ...metItem, verwijderd: zonder(s.verwijderd, sleutel) };
}

function zetUndefinedWeg<T extends object>(o: T): T {
  const kopie = { ...o } as Record<string, unknown>;
  for (const k of Object.keys(kopie)) if (kopie[k] === undefined) delete kopie[k];
  return kopie as T;
}

/* ------------------------------------------------------------------ */
/* Kalenderitems                                                        */
/* ------------------------------------------------------------------ */

export function moveItem(s: State, scope: EditScope, uid: string, maand: Maand, nu: Tijdstempel): State {
  return wijzigItem(s, scope, uid, nu, (i) => (i.maand === maand ? i : { ...i, maand }));
}

/** Zet de status en voegt een historie-regel toe ({status, datum}). Zelfde status = geen wijziging. */
export function setItemStatus(s: State, scope: EditScope, uid: string, status: Status, nu: Tijdstempel): State {
  return wijzigItem(s, scope, uid, nu, (i) =>
    i.status === status ? i : { ...i, status, historie: [...(i.historie ?? []), { status, datum: vandaagISO(new Date(nu)) }] },
  );
}

/** Bibliotheekactiviteit toevoegen: maand uit periode, standaardgesprek, status gepland. */
export function addActiviteit(
  s: State,
  scope: EditScope,
  activiteitId: string,
  nu: Tijdstempel,
  uid: string = nieuweUuid(),
): { state: State; uid: string | null } {
  const a = ACTIVITEIT_OP_ID[activiteitId];
  if (!a) return { state: s, uid: null };
  const item: KalenderItem = { uid, activiteitId, maand: maandUitPeriode(a.periode), gesprek: a.gesprek, status: 'gepland' };
  return { state: voegItemToe(s, scope, item, nu), uid };
}

/** Eigen activiteit: bestaat alleen in dit item (veld custom), id "EIGEN-xxxxxxxx". */
export function addEigenActiviteit(
  s: State,
  scope: EditScope,
  invoer: EigenActiviteitInvoer,
  nu: Tijdstempel,
  uid: string = nieuweUuid(),
  id: string = `EIGEN-${willekeurigeHex(8)}`,
): { state: State; uid: string } {
  const periode = invoer.periode?.trim() ?? '';
  const custom = {
    id,
    naam: invoer.naam.trim(),
    omschrijving: invoer.omschrijving?.trim() ?? '',
    standaard: invoer.standaard,
    gebied: gebiedUitStandaard(invoer.standaard),
    gesprek: invoer.gesprek,
    periode,
    frequentie: 'Eigen',
    verantwoordelijke: '',
    verplicht: false,
    tags: ['eigen'],
    type: scope.kind === 'bestuur' ? ('bestuur' as const) : ('school' as const),
  };
  const item: KalenderItem = {
    uid,
    activiteitId: id,
    maand: maandUitPeriode(periode),
    gesprek: invoer.gesprek,
    status: 'gepland',
    custom,
  };
  return { state: voegItemToe(s, scope, item, nu), uid };
}

export function removeItem(s: State, scope: EditScope, uid: string, nu: Tijdstempel): State {
  const lijst = scope.kind === 'bestuur' ? s.bestuurItems : (s.schoolKalenders[scope.schoolId] ?? []);
  const item = lijst.find((i) => i.uid === uid);
  if (!item) return s;
  const na = wijzigKalender(s, scope, (items) => items.filter((i) => i.uid !== uid));
  return { ...na, verwijderd: met(s.verwijderd, itemSleutel(scope, uid), stempel(nu, item.gewijzigd)) };
}

/**
 * Ongedaan maken: zet een eerder vastgelegde versie van een item terug (verplaatsen, status,
 * opslaan in het detailvenster of verwijderen terugdraaien). Bestaat het item nog, dan wordt het
 * vervangen; anders weer toegevoegd en verdwijnt de tombstone. Het item krijgt een nieuwe
 * tijdstempel, zodat het terugzetten ook bij collega's doorkomt.
 */
export function herstelItem(s: State, scope: EditScope, versie: KalenderItem, nu: Tijdstempel): State {
  const lijst = scope.kind === 'bestuur' ? s.bestuurItems : (s.schoolKalenders[scope.schoolId] ?? []);
  const huidig = lijst.find((i) => i.uid === versie.uid);
  if (!huidig) return voegItemToe(s, scope, versie, nu);
  if (JSON.stringify({ ...huidig, gewijzigd: 0 }) === JSON.stringify({ ...versie, gewijzigd: 0 })) return s;
  return wijzigKalender(s, scope, (items) =>
    items.map((i) => (i.uid === versie.uid ? { ...versie, gewijzigd: stempel(nu, i.gewijzigd, versie.gewijzigd) } : i)),
  );
}

/** Gesprek koppelen. Wijkt het af van het standaardgesprek, dan afwijking met reden (leeg → "Aangepast door school"). */
function koppel(i: KalenderItem, gesprek: string, reden: string): KalenderItem {
  const standaard = activiteitVan(i)?.gesprek;
  const afwijking = gesprek !== standaard ? { reden: reden.trim() || 'Aangepast door school' } : undefined;
  return zetUndefinedWeg({ ...i, gesprek, afwijking });
}

export function setKoppeling(s: State, scope: EditScope, uid: string, gesprek: string, reden: string, nu: Tijdstempel): State {
  return wijzigItem(s, scope, uid, nu, (i) => {
    const nieuw = koppel(i, gesprek, reden);
    return nieuw.gesprek === i.gesprek && nieuw.afwijking?.reden === i.afwijking?.reden ? i : nieuw;
  });
}

function tekstVeld(veld: 'notitie' | 'eigenNaam' | 'eigenaar') {
  return (s: State, scope: EditScope, uid: string, waarde: string, nu: Tijdstempel): State =>
    wijzigItem(s, scope, uid, nu, (i) => {
      const v = waarde.trim() || undefined;
      return i[veld] === v ? i : zetUndefinedWeg({ ...i, [veld]: v });
    });
}

export const setNotitie = tekstVeld('notitie');
export const setEigenNaam = tekstVeld('eigenNaam');
export const setEigenaar = tekstVeld('eigenaar');

export function setDeadline(s: State, scope: EditScope, uid: string, deadline: string, nu: Tijdstempel): State {
  return wijzigItem(s, scope, uid, nu, (i) => {
    const v = deadline || undefined;
    return i.deadline === v ? i : zetUndefinedWeg({ ...i, deadline: v });
  });
}

/**
 * "Opslaan" in het detailvenster: alle velden in één wijziging (één tijdstempel).
 * Velden die niet zijn meegegeven blijven ongewijzigd. Lege tekst wist een veld.
 */
export function slaItemOp(s: State, scope: EditScope, uid: string, w: ItemWijziging, nu: Tijdstempel): State {
  return wijzigItem(s, scope, uid, nu, (i) => {
    let n: KalenderItem = { ...i };
    if (w.gesprek !== undefined) n = koppel(n, w.gesprek, w.reden ?? '');
    if (w.notitie !== undefined) n.notitie = w.notitie.trim() || undefined;
    if (w.eigenNaam !== undefined) n.eigenNaam = w.eigenNaam.trim() || undefined;
    if (w.eigenaar !== undefined) n.eigenaar = w.eigenaar.trim() || undefined;
    if (w.deadline !== undefined) n.deadline = w.deadline || undefined;
    if (w.maand !== undefined) n.maand = w.maand;
    n = zetUndefinedWeg(n);
    return JSON.stringify(n) === JSON.stringify(zetUndefinedWeg(i)) ? i : n;
  });
}

export function addBewijs(
  s: State,
  scope: EditScope,
  uid: string,
  bewijs: { label: string; url?: string },
  nu: Tijdstempel,
  bewijsId: string = nieuweUuid(),
): State {
  const nieuw: Bewijs = zetUndefinedWeg({ id: bewijsId, label: bewijs.label.trim(), url: bewijs.url?.trim() || undefined });
  return wijzigItem(s, scope, uid, nu, (i) => ({ ...i, bewijs: [...(i.bewijs ?? []), nieuw] }));
}

export function removeBewijs(s: State, scope: EditScope, uid: string, bewijsId: string, nu: Tijdstempel): State {
  return wijzigItem(s, scope, uid, nu, (i) =>
    (i.bewijs ?? []).some((b) => b.id === bewijsId) ? { ...i, bewijs: (i.bewijs ?? []).filter((b) => b.id !== bewijsId) } : i,
  );
}

/* ------------------------------------------------------------------ */
/* Instellingen                                                         */
/* ------------------------------------------------------------------ */

export function setBestuurNaam(s: State, naam: string, nu: Tijdstempel): State {
  if (s.organisatie.bestuurNaam === naam) return s;
  return {
    ...s,
    organisatie: { ...s.organisatie, bestuurNaam: naam },
    tijden: { ...s.tijden, bestuurNaam: stempel(nu, s.tijden.bestuurNaam) },
  };
}

export function setSchooljaar(s: State, schooljaar: string, nu: Tijdstempel): State {
  if (s.schooljaar === schooljaar) return s;
  return { ...s, schooljaar, tijden: { ...s.tijden, schooljaar: stempel(nu, s.tijden.schooljaar) } };
}

/* ------------------------------------------------------------------ */
/* Scholen en clusters                                                  */
/* ------------------------------------------------------------------ */

/** Nieuwe school met botsingsvrij id ("sch-..."). Lege naam → "School {n}", leeg type → "vo". */
export function addSchool(
  s: State,
  invoer: { naam: string; type?: string; cluster?: string },
  nu: Tijdstempel,
  id: SchoolId = nieuwId('sch'),
): { state: State; id: SchoolId } {
  const school: School = {
    id,
    naam: invoer.naam.trim() || `School ${s.organisatie.scholen.length + 1}`,
    type: invoer.type?.trim() || 'vo',
    cluster: invoer.cluster ?? '',
    gewijzigd: nu,
  };
  return {
    id,
    state: {
      ...s,
      organisatie: { ...s.organisatie, scholen: [...s.organisatie.scholen, school] },
      schoolKalenders: { ...s.schoolKalenders, [id]: [] },
    },
  };
}

export function updateSchool(s: State, id: SchoolId, patch: Partial<Omit<School, 'id' | 'gewijzigd'>>, nu: Tijdstempel): State {
  return {
    ...s,
    organisatie: {
      ...s.organisatie,
      scholen: s.organisatie.scholen.map((sch) =>
        sch.id === id ? { ...sch, ...patch, gewijzigd: stempel(nu, sch.gewijzigd) } : sch,
      ),
    },
  };
}

/** Verwijdert de school en haar kalender. */
export function removeSchool(s: State, id: SchoolId, nu: Tijdstempel): State {
  const school = s.organisatie.scholen.find((x) => x.id === id);
  if (!school) return s;
  const kalenders = { ...s.schoolKalenders };
  delete kalenders[id];
  return {
    ...s,
    organisatie: { ...s.organisatie, scholen: s.organisatie.scholen.filter((x) => x.id !== id) },
    schoolKalenders: kalenders,
    verwijderd: met(s.verwijderd, schoolSleutel(id), stempel(nu, school.gewijzigd)),
  };
}

/** Nieuw cluster met botsingsvrij id ("cl-..."). Oude cluster-id's (slugs) blijven geldig. */
export function addCluster(s: State, naam: string, nu: Tijdstempel, id: string = nieuwId('cl')): { state: State; id: string } {
  const cluster: Cluster = { id, naam: naam.trim() || 'Cluster', gewijzigd: nu };
  return { id, state: { ...s, organisatie: { ...s.organisatie, clusters: [...s.organisatie.clusters, cluster] } } };
}

export function updateCluster(s: State, id: string, patch: Partial<Omit<Cluster, 'id' | 'gewijzigd'>>, nu: Tijdstempel): State {
  return {
    ...s,
    organisatie: {
      ...s.organisatie,
      clusters: s.organisatie.clusters.map((c) => (c.id === id ? { ...c, ...patch, gewijzigd: stempel(nu, c.gewijzigd) } : c)),
    },
  };
}

/** Verwijdert het cluster; scholen in dat cluster krijgen cluster "". */
export function removeCluster(s: State, id: string, nu: Tijdstempel): State {
  const cluster = s.organisatie.clusters.find((c) => c.id === id);
  if (!cluster) return s;
  return {
    ...s,
    organisatie: {
      ...s.organisatie,
      clusters: s.organisatie.clusters.filter((c) => c.id !== id),
      scholen: s.organisatie.scholen.map((sch) =>
        sch.cluster === id ? { ...sch, cluster: '', gewijzigd: stempel(nu, sch.gewijzigd) } : sch,
      ),
    },
    verwijderd: met(s.verwijderd, clusterSleutel(id), stempel(nu, cluster.gewijzigd)),
  };
}

/* ------------------------------------------------------------------ */
/* Gesprekscyclus                                                       */
/* ------------------------------------------------------------------ */

/** "Gesprek {n+1}", maand Nov, kleur Doorlopend, icoon vlag, achteraan. */
export function addGesprek(s: State, nu: Tijdstempel, id: string = nieuwId('g')): { state: State; id: string } {
  const cyclus = s.organisatie.gesprekscyclus;
  const gesprek: Gesprek = {
    id,
    naam: `Gesprek ${cyclus.length + 1}`,
    maand: 'Nov',
    kleur: 'Doorlopend',
    icoon: 'vlag',
    volgorde: cyclus.reduce((m, g) => Math.max(m, g.volgorde), -1) + 1,
    gewijzigd: nu,
  };
  return { id, state: { ...s, organisatie: { ...s.organisatie, gesprekscyclus: [...cyclus, gesprek] } } };
}

export function updateGesprek(s: State, id: string, patch: Partial<Omit<Gesprek, 'id' | 'gewijzigd'>>, nu: Tijdstempel): State {
  return {
    ...s,
    organisatie: {
      ...s.organisatie,
      gesprekscyclus: s.organisatie.gesprekscyclus.map((g) =>
        g.id === id ? { ...g, ...patch, gewijzigd: stempel(nu, g.gewijzigd) } : g,
      ),
    },
  };
}

/** Zet alle items met deze gesprekken op Doorlopend en wist hun afwijking. */
function itemsNaarDoorlopend(s: State, ids: Set<string>, nu: Tijdstempel): State {
  const fix = (items: KalenderItem[]) =>
    items.map((i) => {
      if (!ids.has(i.gesprek)) return i;
      const n: KalenderItem = { ...i, gesprek: DOORLOPEND, gewijzigd: stempel(nu, i.gewijzigd) };
      delete n.afwijking;
      return n;
    });
  const kalenders: Record<string, KalenderItem[]> = {};
  for (const [k, v] of Object.entries(s.schoolKalenders)) kalenders[k] = fix(v);
  return { ...s, bestuurItems: fix(s.bestuurItems), schoolKalenders: kalenders };
}

/** Verwijdert het gesprek; gekoppelde activiteiten worden "Doorlopend" (afwijking gewist). */
export function removeGesprek(s: State, id: string, nu: Tijdstempel): State {
  const gesprek = s.organisatie.gesprekscyclus.find((g) => g.id === id);
  if (!gesprek) return s;
  const na = itemsNaarDoorlopend(s, new Set([id]), nu);
  return {
    ...na,
    organisatie: { ...na.organisatie, gesprekscyclus: na.organisatie.gesprekscyclus.filter((g) => g.id !== id) },
    verwijderd: met(na.verwijderd, gesprekSleutel(id), stempel(nu, gesprek.gewijzigd)),
  };
}

/** Verschuif een gesprek in de volgorde (richting -1 = omhoog, +1 = omlaag). */
export function moveGesprek(s: State, id: string, richting: -1 | 1, nu: Tijdstempel): State {
  const gesorteerd = [...s.organisatie.gesprekscyclus].sort((a, b) => a.volgorde - b.volgorde);
  const i = gesorteerd.findIndex((g) => g.id === id);
  const j = i + richting;
  if (i < 0 || j < 0 || j >= gesorteerd.length) return s;
  const a = gesorteerd[i];
  const b = gesorteerd[j];
  return {
    ...s,
    organisatie: {
      ...s.organisatie,
      gesprekscyclus: s.organisatie.gesprekscyclus.map((g) =>
        g.id === a.id
          ? { ...g, volgorde: b.volgorde, gewijzigd: stempel(nu, g.gewijzigd) }
          : g.id === b.id
            ? { ...g, volgorde: a.volgorde, gewijzigd: stempel(nu, g.gewijzigd) }
            : g,
      ),
    },
  };
}

/**
 * Terug naar de vier seizoensgesprekken. Anders dan het origineel worden activiteiten
 * van verdwenen eigen gesprekken (net als bij verwijderen) op "Doorlopend" gezet.
 */
export function resetCyclus(s: State, nu: Tijdstempel): State {
  const standaardIds = new Set(STANDAARD_GESPREKSCYCLUS.map((g) => g.id));
  const weg = s.organisatie.gesprekscyclus.filter((g) => !standaardIds.has(g.id));
  let na = itemsNaarDoorlopend(s, new Set(weg.map((g) => g.id)), nu);
  let verwijderd = na.verwijderd;
  for (const g of weg) verwijderd = met(verwijderd, gesprekSleutel(g.id), stempel(nu, g.gewijzigd));
  const cyclus = STANDAARD_GESPREKSCYCLUS.map((g) => {
    const oud = s.organisatie.gesprekscyclus.find((x) => x.id === g.id);
    verwijderd = zonder(verwijderd, gesprekSleutel(g.id));
    return { ...g, gewijzigd: stempel(nu, oud?.gewijzigd, s.verwijderd[gesprekSleutel(g.id)]) };
  });
  na = { ...na, organisatie: { ...na.organisatie, gesprekscyclus: cyclus }, verwijderd };
  return na;
}

/* ------------------------------------------------------------------ */
/* Startsjabloon, setup, onboarding                                     */
/* ------------------------------------------------------------------ */

/**
 * Startsjabloon: elke school krijgt de 19 verplichte schoolactiviteiten die ze nog niet heeft
 * (uid "s{id}-{activiteitId}"), en de bestuurskalender alle 30 bestuursactiviteiten die ontbreken.
 * Bestaande items worden niet overschreven.
 */
export function pasSjabloonToe(s: State, nu: Tijdstempel): State {
  let na = s;
  const vul = (scope: EditScope, prefix: string, activiteiten: typeof ACTIVITEITEN_BESTUUR) => {
    const huidig = scope.kind === 'bestuur' ? na.bestuurItems : (na.schoolKalenders[scope.schoolId] ?? []);
    const aanwezig = new Set(huidig.map((i) => i.activiteitId));
    for (const a of activiteiten) {
      if (aanwezig.has(a.id)) continue;
      na = voegItemToe(na, scope, sjabloonItem(prefix, a), nu);
    }
  };
  for (const school of s.organisatie.scholen) {
    vul({ kind: 'school', schoolId: school.id }, sjabloonPrefix(school.id), VERPLICHTE_SCHOOLACTIVITEITEN);
  }
  vul({ kind: 'bestuur' }, sjabloonPrefix(null), ACTIVITEITEN_BESTUUR);
  return na;
}

/** "Kalender aanmaken": setup voltooid, modus eigen. (Niveau bestuur zet de store.) */
export function voltooiSetup(s: State): State {
  return { ...s, setupVoltooid: true, modus: 'eigen' };
}

export function verbergOnboarding(s: State): State {
  return { ...s, onboardingVerborgen: true };
}

/** De hele wizard in één keer: bestuur, schooljaar, scholen, optioneel sjabloon, setup voltooid. */
export function voltooiWizard(s: State, invoer: WizardInvoer, nu: Tijdstempel): State {
  let na = setBestuurNaam(s, invoer.bestuurNaam.trim(), nu);
  na = setSchooljaar(na, invoer.schooljaar.trim() || na.schooljaar, nu);
  for (const school of invoer.scholen) na = addSchool(na, school, nu).state;
  if (invoer.sjabloon) na = pasSjabloonToe(na, nu);
  return voltooiSetup(na);
}
