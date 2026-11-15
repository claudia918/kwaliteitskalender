/**
 * Rondleiding: start, onderbreken, hervatten en afronden, en de oefenomgeving.
 *
 * Oefenen zonder risico: tijdens een rondleiding rendert de app binnen een TWEEDE StoreProvider met
 * een oefenkalender (`oefenState`), zonder opslag (`zonderOpslag`) en met een sync-laag zonder bestand
 * (`OefenSyncProvider`). De echte store blijft gewoon gemonteerd en onaangeroerd; de echte
 * synchronisatie ligt stil (`SyncProvider gepauzeerd`). Voorkeuren gaan naar een tijdelijk geheugen
 * (`store/oefenopslag`). Na afloop of bij stoppen verdwijnt de oefenomgeving en sta je weer op het
 * scherm waar je was, met je eigen gegevens precies zoals ze waren.
 *
 * Volgorde in App: Store → Toasts → Bevestigen → HashRouter → RondleidingProvider → SyncProvider → Poort.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast, useWisToasts } from '../../componenten';
import { OEFENSCHOOL_ID, oefenState } from '../../domein/oefenen';
import type { State } from '../../domein/types';
import { bewaarBibliotheekFilters } from '../../schermen/Bibliotheek';
import { StoreProvider, useStore } from '../../store';
import type { UiVoorkeur } from '../../store/opslag';
import { oefenGeheugenInhoud, zetOefenGeheugen } from '../../store/oefenopslag';
import { OefenSyncProvider } from '../../sync/SyncProvider';
import {
  LEGE_TELLER,
  bewaarOefenSessie,
  bewaarVoortgang,
  laadOefenSessie,
  laadVoortgang,
  wisOefenSessie,
  type Teller,
  type TourId,
  type Voortgang,
} from './opslag';
import { EERSTE_RONDLEIDING, vindTour } from './tours';

/* ------------------------------------------------------------------ */
/* Waarom de app net voor het eerst opent (welkomstscherm)              */
/* ------------------------------------------------------------------ */

export type StartReden = 'demo' | 'eigen' | 'bestand';
let startReden: StartReden | null = null;

/** Het welkomstscherm en de wizard melden hoe iemand begint; dat bepaalt hoe de rondleiding zich aanbiedt. */
export function rondleidingNa(reden: StartReden): void {
  startReden = reden;
}

/* ------------------------------------------------------------------ */
/* Context                                                              */
/* ------------------------------------------------------------------ */

export type Aanbod = 'intro' | 'compact' | 'hervat' | null;

export interface Afsluiting {
  teller: Teller;
  duurMs: number;
}

interface OefenBegin {
  state: State;
  ui: UiVoorkeur;
}

export interface RondleidingApi {
  /** Draait er nu een rondleiding op de oefenkalender? */
  oefenen: boolean;
  voortgang: Voortgang;
  /** Begin een rondleiding vooraan. */
  start: (tour: TourId) => void;
  /** Ga verder met de onderbroken rondleiding. */
  hervat: () => void;
  /** Stoppen, later verder (de stap blijft bewaard). */
  onderbreek: () => void;
  /** Stoppen zonder te bewaren. */
  stop: () => void;
  naarStap: (i: number) => void;
  telOp: (k: keyof Teller) => void;
  /** Laatste stap gedaan. */
  rond: () => void;
  aanbod: Aanbod;
  sluitAanbod: () => void;
  afsluiting: Afsluiting | null;
  sluitAfsluiting: () => void;
  keuzeOpen: boolean;
  openKeuze: () => void;
  sluitKeuze: () => void;
  /** Intern (OefenOmgeving) */
  oefenBegin: OefenBegin | null;
  sessie: number;
}

const Context = createContext<RondleidingApi | null>(null);

export function useRondleiding(): RondleidingApi {
  const c = useContext(Context);
  if (!c) throw new Error('useRondleiding moet binnen RondleidingProvider gebruikt worden');
  return c;
}

/** Voor componenten die ook buiten de provider renderen (tests, stijlgids). */
export function useOefenen(): boolean {
  return useContext(Context)?.oefenen ?? false;
}

function nieuwBegin(tour: TourId): OefenBegin {
  const state = oefenState(Date.now());
  return {
    state,
    ui: {
      // De eerste rondleiding begint bij het hele bestuur: de eerste opdracht is een school kiezen.
      niveau: tour === EERSTE_RONDLEIDING.id ? 'bestuur' : 'school',
      schoolId: OEFENSCHOOL_ID,
      clusterId: state.organisatie.clusters[0]?.id ?? '',
    },
  };
}

export function RondleidingProvider({ children }: { children: ReactNode }) {
  const echt = useStore();
  const toast = useToast();
  const wisToasts = useWisToasts();
  const navigate = useNavigate();
  const location = useLocation();

  // Begin: na herladen midden in een rondleiding gaat het oefenen verder (sessionStorage van dit tabblad).
  const [begin] = useState(() => {
    const v = laadVoortgang();
    const s = v.lopend ? laadOefenSessie() : null;
    if (v.lopend && s) {
      zetOefenGeheugen(true, s.voorkeuren);
      return { v, oefenBegin: { state: s.state, ui: { niveau: s.niveau, schoolId: s.schoolId, clusterId: s.clusterId } } as OefenBegin };
    }
    return { v, oefenBegin: null };
  });
  const [voortgang, setVoortgang] = useState<Voortgang>(begin.v);
  const [oefenBegin, setOefenBegin] = useState<OefenBegin | null>(begin.oefenBegin);
  const [sessie, setSessie] = useState(0);
  const [aanbod, setAanbod] = useState<Aanbod>(begin.v.lopend && !begin.oefenBegin ? 'hervat' : null);
  const [afsluiting, setAfsluiting] = useState<Afsluiting | null>(null);
  const [keuzeOpen, setKeuzeOpen] = useState(false);
  const herstelFilters = useRef<(() => void) | null>(null);
  const oefenen = oefenBegin !== null;

  useEffect(() => bewaarVoortgang(voortgang), [voortgang]);

  const locRef = useRef(location);
  locRef.current = location;

  const beginOefenen = useCallback(
    (tour: TourId, stap: number) => {
      const lopend = voortgang.lopend;
      const terug = oefenen && lopend ? lopend.terug : `${locRef.current.pathname}${locRef.current.search}`;
      const b = nieuwBegin(tour);
      wisToasts();
      zetOefenGeheugen(true);
      if (!herstelFilters.current) herstelFilters.current = bewaarBibliotheekFilters();
      setOefenBegin(b);
      setSessie((n) => n + 1);
      bewaarOefenSessie({
        state: b.state,
        niveau: b.ui.niveau!,
        schoolId: b.ui.schoolId!,
        clusterId: b.ui.clusterId!,
        voorkeuren: {},
      });
      setVoortgang((v) => ({
        ...v,
        aangeboden: true,
        lopend: {
          tour,
          stap,
          terug,
          begonnen: lopend && lopend.tour === tour && stap > 0 ? lopend.begonnen : Date.now(),
          teller: lopend && lopend.tour === tour && stap > 0 ? lopend.teller : { ...LEGE_TELLER },
        },
      }));
      setAanbod(null);
      setKeuzeOpen(false);
      setAfsluiting(null);
    },
    [oefenen, voortgang.lopend, wisToasts],
  );

  /** Oefenen beëindigen en terug naar waar je was. */
  const eindigOefenen = useCallback(
    (terug: string) => {
      wisToasts();
      zetOefenGeheugen(false);
      wisOefenSessie();
      herstelFilters.current?.();
      herstelFilters.current = null;
      setOefenBegin(null);
      navigate(terug || '/', { replace: true });
    },
    [navigate, wisToasts],
  );

  const start = useCallback((tour: TourId) => beginOefenen(tour, 0), [beginOefenen]);

  const hervat = useCallback(() => {
    const l = voortgang.lopend;
    if (!l || !vindTour(l.tour)) return start(EERSTE_RONDLEIDING.id);
    beginOefenen(l.tour, l.stap);
  }, [beginOefenen, start, voortgang.lopend]);

  const onderbreek = useCallback(() => {
    const l = voortgang.lopend;
    eindigOefenen(l?.terug ?? '/');
    toast('Rondleiding onderbroken. Verder gaan kan via het vraagteken bovenin.', 'info', 4500);
  }, [eindigOefenen, toast, voortgang.lopend]);

  const stop = useCallback(() => {
    const l = voortgang.lopend;
    setVoortgang((v) => ({ ...v, lopend: null }));
    eindigOefenen(l?.terug ?? '/');
  }, [eindigOefenen, voortgang.lopend]);

  const naarStap = useCallback((i: number) => {
    setVoortgang((v) => (v.lopend ? { ...v, lopend: { ...v.lopend, stap: Math.max(0, i) } } : v));
  }, []);

  const telOp = useCallback((k: keyof Teller) => {
    setVoortgang((v) => (v.lopend ? { ...v, lopend: { ...v.lopend, teller: { ...v.lopend.teller, [k]: v.lopend.teller[k] + 1 } } } : v));
  }, []);

  const rond = useCallback(() => {
    const l = voortgang.lopend;
    if (!l) return;
    const eerste = l.tour === EERSTE_RONDLEIDING.id;
    const pad = vindTour(l.tour)?.pad;
    setVoortgang((v) => ({
      ...v,
      lopend: null,
      eersteAf: v.eersteAf || eerste,
      schermen: pad && !v.schermen.includes(pad) ? [...v.schermen, pad] : v.schermen,
    }));
    eindigOefenen(l.terug);
    if (eerste) setAfsluiting({ teller: l.teller, duurMs: Date.now() - l.begonnen });
    else toast('Rondleiding klaar. Je bent terug in je eigen kalender.', 'success', 3500);
  }, [eindigOefenen, toast, voortgang.lopend]);

  // Eerste gebruik in deze browser: aanbieden zodra de app (na welkom, wizard of bestand) open is.
  const klaarVoorGebruik = echt.state.setupVoltooid;
  useEffect(() => {
    if (!klaarVoorGebruik || voortgang.aangeboden || oefenen || voortgang.lopend) return;
    // Demo en eigen bestuur: de introductie in het midden. Een bestand van een collega (of een
    // bestaande gebruiker na een update): een rustig aanbod in de hoek, zodat je meteen kunt werken.
    setAanbod(startReden === 'demo' || startReden === 'eigen' ? 'intro' : 'compact');
    setVoortgang((v) => ({ ...v, aangeboden: true }));
  }, [klaarVoorGebruik, oefenen, voortgang.aangeboden, voortgang.lopend]);

  const api = useMemo<RondleidingApi>(
    () => ({
      oefenen,
      voortgang,
      start,
      hervat,
      onderbreek,
      stop,
      naarStap,
      telOp,
      rond,
      aanbod: klaarVoorGebruik ? aanbod : null,
      sluitAanbod: () => setAanbod(null),
      afsluiting,
      sluitAfsluiting: () => setAfsluiting(null),
      keuzeOpen,
      openKeuze: () => setKeuzeOpen(true),
      sluitKeuze: () => setKeuzeOpen(false),
      oefenBegin,
      sessie,
    }),
    [oefenen, voortgang, start, hervat, onderbreek, stop, naarStap, telOp, rond, klaarVoorGebruik, aanbod, afsluiting, keuzeOpen, oefenBegin, sessie],
  );

  return <Context.Provider value={api}>{children}</Context.Provider>;
}

/* ------------------------------------------------------------------ */
/* De oefenomgeving                                                     */
/* ------------------------------------------------------------------ */

/** Bewaart de oefenkalender in sessionStorage, zodat herladen midden in de rondleiding werkt. */
function OefenBewaarder() {
  const { state, niveau, schoolId, clusterId } = useStore();
  useEffect(() => {
    bewaarOefenSessie({ state, niveau, schoolId, clusterId, voorkeuren: oefenGeheugenInhoud() });
  }, [state, niveau, schoolId, clusterId]);
  return null;
}

/**
 * Alles hieronder werkt op de oefenkalender: een eigen store zonder opslag en een sync-laag zonder
 * bestand. De echte store en sync blijven erboven gemonteerd en worden niet aangeraakt.
 */
export function OefenOmgeving({ children }: { children: ReactNode }) {
  const { oefenBegin, sessie } = useRondleiding();
  const echt = useStore();
  const echtRef = useRef(echt);
  echtRef.current = echt;
  // Na het oefenen de niveaukleur van je eigen weergave terugzetten.
  useEffect(
    () => () => {
      const e = echtRef.current;
      document.documentElement.setAttribute('data-niveau', e.state.setupVoltooid ? e.niveau : 'bestuur');
    },
    [],
  );
  if (!oefenBegin) return null;
  return (
    <StoreProvider key={sessie} initieel={oefenBegin.state} initieelUi={oefenBegin.ui} zonderOpslag>
      <OefenSyncProvider>
        <OefenBewaarder />
        {children}
      </OefenSyncProvider>
    </StoreProvider>
  );
}
