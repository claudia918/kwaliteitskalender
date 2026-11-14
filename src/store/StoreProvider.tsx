/**
 * De store: één React-context met de state, het gekozen niveau/school/cluster en alle mutaties.
 * Volgt de lokale modus van de oude app (StoreProvider `Ew`), met tijdstempels voor samenwerken.
 *
 * - Elke mutatie is een pure functie uit src/domein/mutaties.ts, aangeroepen met nu = Date.now().
 * - Autosave naar localStorage bij elke wijziging.
 * - `data-niveau` op <html> volgt het niveau (welkom/wizard: altijd "bestuur").
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as m from '../domein/mutaties';
import { nieuweUuid, nieuwId, willekeurigeHex } from '../domein/hulp';
import { metGedeeld, samenvoegen } from '../domein/samenvoegen';
import { demoState, legeState } from '../domein/state';
import { ACTIVITEIT_OP_ID } from '../domein/seed';
import type {
  Cluster,
  EditScope,
  EigenActiviteitInvoer,
  GedeeldeGegevens,
  Gesprek,
  ItemWijziging,
  KalenderItem,
  Maand,
  Niveau,
  School,
  SchoolId,
  State,
  Status,
  WizardInvoer,
} from '../domein/types';
import { STATE_SLEUTEL, bewaarState, bewaarUi, laadState, laadUi } from './opslag';

export interface Store {
  state: State;

  /* ---- UI-keuze (per apparaat, onthouden in localStorage) ---- */
  niveau: Niveau;
  setNiveau: (n: Niveau) => void;
  clusterId: string;
  setClusterId: (id: string) => void;
  schoolId: SchoolId;
  setSchoolId: (id: SchoolId) => void;

  /** Tijdstip (ms) van de laatste autosave; voor de indicator "Opgeslagen". */
  laatstOpgeslagen: number | null;
  /** False als de browser het opslaan weigerde (bv. privévenster of opslag vol). */
  opslagWerkt: boolean;
  /** Telt op bij elke volledige vervanging (demo, leegmaken, import). De sync-laag ontkoppelt dan. */
  generatie: number;

  /* ---- Kalenderitems ---- */
  moveItem: (scope: EditScope, uid: string, maand: Maand) => void;
  setItemStatus: (scope: EditScope, uid: string, status: Status) => void;
  /** Voegt een bibliotheekactiviteit toe; geeft de uid van het nieuwe item (null bij onbekend id). */
  addActiviteit: (scope: EditScope, activiteitId: string) => string | null;
  addEigenActiviteit: (scope: EditScope, invoer: EigenActiviteitInvoer) => string;
  removeItem: (scope: EditScope, uid: string) => void;
  /** Ongedaan maken: zet een eerder bewaarde versie van een item terug (ook na verwijderen). */
  herstelItem: (scope: EditScope, item: KalenderItem) => void;
  setKoppeling: (scope: EditScope, uid: string, gesprek: string, reden: string) => void;
  setNotitie: (scope: EditScope, uid: string, notitie: string) => void;
  setEigenNaam: (scope: EditScope, uid: string, naam: string) => void;
  setEigenaar: (scope: EditScope, uid: string, eigenaar: string) => void;
  setDeadline: (scope: EditScope, uid: string, deadline: string) => void;
  /** Detailvenster "Opslaan": meerdere velden in één wijziging. */
  slaItemOp: (scope: EditScope, uid: string, wijziging: ItemWijziging) => void;
  addBewijs: (scope: EditScope, uid: string, bewijs: { label: string; url?: string }) => void;
  removeBewijs: (scope: EditScope, uid: string, bewijsId: string) => void;

  /* ---- Organisatie ---- */
  setBestuurNaam: (naam: string) => void;
  setSchooljaar: (schooljaar: string) => void;
  addSchool: (invoer: { naam: string; type?: string; cluster?: string }) => SchoolId;
  updateSchool: (id: SchoolId, patch: Partial<Omit<School, 'id' | 'gewijzigd'>>) => void;
  removeSchool: (id: SchoolId) => void;
  addCluster: (naam: string) => string;
  updateCluster: (id: string, patch: Partial<Omit<Cluster, 'id' | 'gewijzigd'>>) => void;
  removeCluster: (id: string) => void;

  /* ---- Gesprekscyclus ---- */
  addGesprek: () => string;
  updateGesprek: (id: string, patch: Partial<Omit<Gesprek, 'id' | 'gewijzigd'>>) => void;
  removeGesprek: (id: string) => void;
  moveGesprek: (id: string, richting: -1 | 1) => void;
  resetCyclus: () => void;

  /* ---- Setup, onboarding, demo ---- */
  /** Wizard in één keer afronden (bestuur, schooljaar, scholen, sjabloon). Zet niveau op bestuur. */
  voltooiWizard: (invoer: WizardInvoer) => void;
  /** "Kalender aanmaken": setup voltooid, modus eigen, niveau bestuur. */
  completeSetup: () => void;
  /** Laadt de demo; niveau school, eerste school/cluster. */
  loadDemo: () => void;
  /** Begint opnieuw leeg (welkomstscherm). Ook "Demo verlaten" en "Alles leegmaken". */
  beginLeeg: () => void;
  pasSjabloonToe: () => void;
  verbergOnboarding: () => void;
  /** Alias van beginLeeg (zoals het origineel). */
  reset: () => void;
  /** Vervangt alle gegevens door een (gemigreerde) back-up. */
  importeerState: (s: State) => void;

  /* ---- Voor de sync-laag (src/sync); schermen gebruiken dit niet ---- */
  /** Huidige state buiten de render om (voor asynchrone code). */
  haalState: () => State;
  /** Voegt (al samengevoegde) gedeelde gegevens samen met de actuele state (nieuwste wint per entiteit). */
  voegGedeeldSamen: (g: GedeeldeGegevens) => void;
  /** Vervangt de gedeelde gegevens (bestand overnemen); lokale velden blijven, setup voltooid. */
  neemGedeeldOver: (g: GedeeldeGegevens) => void;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore moet binnen een StoreProvider gebruikt worden');
  return s;
}

export interface StoreProviderProps {
  children: ReactNode;
  /** Alleen voor tests: begintoestand in plaats van localStorage. */
  initieel?: State;
  /** Alleen voor tests: niet naar localStorage schrijven. */
  zonderOpslag?: boolean;
}

export function StoreProvider({ children, initieel, zonderOpslag }: StoreProviderProps) {
  const [state, setState] = useState<State>(() => initieel ?? laadState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const ui = useMemo(() => laadUi(), []);
  const [niveau, setNiveauRuw] = useState<Niveau>(ui.niveau ?? 'school');
  const [clusterId, setClusterId] = useState<string>(ui.clusterId ?? '');
  const [schoolId, setSchoolId] = useState<SchoolId>(ui.schoolId ?? '');
  const [laatstOpgeslagen, setLaatstOpgeslagen] = useState<number | null>(null);
  const [opslagWerkt, setOpslagWerkt] = useState(true);
  const [generatie, setGeneratie] = useState(0);
  const eersteRender = useRef(true);

  const setNiveau = useCallback((n: Niveau) => setNiveauRuw(n), []);

  // Autosave
  useEffect(() => {
    if (zonderOpslag) return;
    const ok = bewaarState(state);
    setOpslagWerkt(ok);
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    if (ok) setLaatstOpgeslagen(Date.now());
  }, [state, zonderOpslag]);

  useEffect(() => {
    if (!zonderOpslag) bewaarUi({ niveau, clusterId, schoolId });
  }, [niveau, clusterId, schoolId, zonderOpslag]);

  // Andere tabbladen in dezelfde browser: hun wijzigingen samenvoegen in plaats van overschrijven
  useEffect(() => {
    if (zonderOpslag) return;
    const opWijziging = (e: StorageEvent) => {
      if (e.key !== STATE_SLEUTEL || !e.newValue) return;
      try {
        const ander = JSON.parse(e.newValue) as State;
        setState((cur) => {
          if (ander.setupVoltooid !== cur.setupVoltooid || ander.modus !== cur.modus) return { ...cur, ...ander };
          const r = samenvoegen(cur, ander);
          return r.lokaalGewijzigd ? metGedeeld(cur, r.resultaat) : cur;
        });
      } catch {
        /* negeren */
      }
    };
    window.addEventListener('storage', opWijziging);
    return () => window.removeEventListener('storage', opWijziging);
  }, [zonderOpslag]);

  // Niveaukleur op <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-niveau', state.setupVoltooid ? niveau : 'bestuur');
  }, [niveau, state.setupVoltooid]);

  // Geldige keuzes houden (zoals het origineel)
  useEffect(() => {
    const org = state.organisatie;
    if (org.scholen.length && !org.scholen.some((s) => s.id === schoolId)) setSchoolId(org.scholen[0].id);
    if (org.clusters.length && !org.clusters.some((c) => c.id === clusterId)) setClusterId(org.clusters[0].id);
    if (niveau === 'cluster' && org.clusters.length === 0) setNiveauRuw('bestuur');
    if (niveau === 'school' && org.scholen.length === 0 && state.setupVoltooid) setNiveauRuw('bestuur');
  }, [state.organisatie, state.setupVoltooid, schoolId, clusterId, niveau]);

  /** Voer een pure mutatie uit met de huidige tijd. */
  const muteer = useCallback((fn: (s: State, nu: number) => State) => {
    setState((s) => fn(s, Date.now()));
  }, []);

  const vervang = useCallback((s: State) => {
    setState(s);
    setGeneratie((g) => g + 1);
  }, []);

  const acties = useMemo(() => {
    return {
      moveItem: (scope: EditScope, uid: string, maand: Maand) => muteer((s, nu) => m.moveItem(s, scope, uid, maand, nu)),
      setItemStatus: (scope: EditScope, uid: string, status: Status) =>
        muteer((s, nu) => m.setItemStatus(s, scope, uid, status, nu)),
      addActiviteit: (scope: EditScope, activiteitId: string) => {
        if (!ACTIVITEIT_OP_ID[activiteitId]) return null;
        const uid = nieuweUuid();
        muteer((s, nu) => m.addActiviteit(s, scope, activiteitId, nu, uid).state);
        return uid;
      },
      addEigenActiviteit: (scope: EditScope, invoer: EigenActiviteitInvoer) => {
        const uid = nieuweUuid();
        const id = `EIGEN-${willekeurigeHex(8)}`;
        muteer((s, nu) => m.addEigenActiviteit(s, scope, invoer, nu, uid, id).state);
        return uid;
      },
      removeItem: (scope: EditScope, uid: string) => muteer((s, nu) => m.removeItem(s, scope, uid, nu)),
      herstelItem: (scope: EditScope, item: KalenderItem) => muteer((s, nu) => m.herstelItem(s, scope, item, nu)),
      setKoppeling: (scope: EditScope, uid: string, gesprek: string, reden: string) =>
        muteer((s, nu) => m.setKoppeling(s, scope, uid, gesprek, reden, nu)),
      setNotitie: (scope: EditScope, uid: string, v: string) => muteer((s, nu) => m.setNotitie(s, scope, uid, v, nu)),
      setEigenNaam: (scope: EditScope, uid: string, v: string) => muteer((s, nu) => m.setEigenNaam(s, scope, uid, v, nu)),
      setEigenaar: (scope: EditScope, uid: string, v: string) => muteer((s, nu) => m.setEigenaar(s, scope, uid, v, nu)),
      setDeadline: (scope: EditScope, uid: string, v: string) => muteer((s, nu) => m.setDeadline(s, scope, uid, v, nu)),
      slaItemOp: (scope: EditScope, uid: string, w: ItemWijziging) => muteer((s, nu) => m.slaItemOp(s, scope, uid, w, nu)),
      addBewijs: (scope: EditScope, uid: string, bewijs: { label: string; url?: string }) => {
        const id = nieuweUuid();
        muteer((s, nu) => m.addBewijs(s, scope, uid, bewijs, nu, id));
      },
      removeBewijs: (scope: EditScope, uid: string, bewijsId: string) =>
        muteer((s, nu) => m.removeBewijs(s, scope, uid, bewijsId, nu)),

      setBestuurNaam: (naam: string) => muteer((s, nu) => m.setBestuurNaam(s, naam, nu)),
      setSchooljaar: (jaar: string) => muteer((s, nu) => m.setSchooljaar(s, jaar, nu)),
      addSchool: (invoer: { naam: string; type?: string; cluster?: string }) => {
        const id = nieuwId('sch');
        muteer((s, nu) => m.addSchool(s, invoer, nu, id).state);
        return id;
      },
      updateSchool: (id: SchoolId, patch: Partial<Omit<School, 'id' | 'gewijzigd'>>) =>
        muteer((s, nu) => m.updateSchool(s, id, patch, nu)),
      removeSchool: (id: SchoolId) => muteer((s, nu) => m.removeSchool(s, id, nu)),
      addCluster: (naam: string) => {
        const id = nieuwId('cl');
        muteer((s, nu) => m.addCluster(s, naam, nu, id).state);
        return id;
      },
      updateCluster: (id: string, patch: Partial<Omit<Cluster, 'id' | 'gewijzigd'>>) =>
        muteer((s, nu) => m.updateCluster(s, id, patch, nu)),
      removeCluster: (id: string) => muteer((s, nu) => m.removeCluster(s, id, nu)),

      addGesprek: () => {
        const id = nieuwId('g');
        muteer((s, nu) => m.addGesprek(s, nu, id).state);
        return id;
      },
      updateGesprek: (id: string, patch: Partial<Omit<Gesprek, 'id' | 'gewijzigd'>>) =>
        muteer((s, nu) => m.updateGesprek(s, id, patch, nu)),
      removeGesprek: (id: string) => muteer((s, nu) => m.removeGesprek(s, id, nu)),
      moveGesprek: (id: string, richting: -1 | 1) => muteer((s, nu) => m.moveGesprek(s, id, richting, nu)),
      resetCyclus: () => muteer((s, nu) => m.resetCyclus(s, nu)),

      voltooiWizard: (invoer: WizardInvoer) => {
        muteer((s, nu) => m.voltooiWizard(s, invoer, nu));
        setNiveauRuw('bestuur');
      },
      completeSetup: () => {
        setState((s) => m.voltooiSetup(s));
        setNiveauRuw('bestuur');
      },
      loadDemo: () => {
        const d = demoState(Date.now());
        vervang(d);
        setNiveauRuw('school');
        setSchoolId(d.organisatie.scholen[0]?.id ?? '');
        setClusterId(d.organisatie.clusters[0]?.id ?? '');
      },
      beginLeeg: () => {
        vervang(legeState());
        setNiveauRuw('school');
        setSchoolId('');
        setClusterId('');
      },
      pasSjabloonToe: () => muteer((s, nu) => m.pasSjabloonToe(s, nu)),
      verbergOnboarding: () => setState((s) => m.verbergOnboarding(s)),
      reset: () => {
        vervang(legeState());
        setNiveauRuw('school');
      },
      importeerState: (s: State) => vervang(s),

      haalState: () => stateRef.current,
      voegGedeeldSamen: (g: GedeeldeGegevens) => {
        // tegen de actuele state, zodat een wijziging van zojuist niet verloren gaat
        setState((cur) => {
          const r = samenvoegen(cur, g);
          return r.lokaalGewijzigd ? metGedeeld(cur, r.resultaat) : cur;
        });
      },
      neemGedeeldOver: (g: GedeeldeGegevens) => {
        setState((cur) => ({ ...metGedeeld(cur, g), setupVoltooid: true, modus: 'eigen' }));
      },
    };
  }, [muteer, vervang]);

  const waarde = useMemo<Store>(
    () => ({
      state,
      niveau,
      setNiveau,
      clusterId,
      setClusterId,
      schoolId,
      setSchoolId,
      laatstOpgeslagen,
      opslagWerkt,
      generatie,
      ...acties,
    }),
    [state, niveau, setNiveau, clusterId, schoolId, laatstOpgeslagen, opslagWerkt, generatie, acties],
  );

  return <StoreContext.Provider value={waarde}>{children}</StoreContext.Provider>;
}
