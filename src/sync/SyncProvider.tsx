/**
 * Samenwerken via een gedeeld kalenderbestand (`.kwaliteitskalender.json`), bijvoorbeeld in een
 * SharePoint-, OneDrive- of netwerkmap van de organisatie. Geen server, geen netwerkverkeer:
 * de browser leest en schrijft alleen dat ene bestand op de eigen schijf.
 *
 * Chrome/Edge (File System Access API): bestand koppelen; de koppeling wordt onthouden in IndexedDB.
 * Synchroniseren gebeurt na elke wijziging (1,5 s vertraagd), bij terugkeer naar het venster en
 * elke 30 s: bestand lezen, samenvoegen (src/domein/samenvoegen.ts), terugschrijven als nodig.
 *
 * Andere browsers: handmatig openen, opslaan als bestand en samenvoegen met een bestand.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useToast } from '../componenten/Toast';
import {
  maakBasis,
  samenvoegen,
  vingerafdruk,
  type Conflict,
  type SamenvoegResultaat,
  type SyncBasis,
} from '../domein/samenvoegen';
import {
  bestandNaarTekst,
  gedeeldDeel,
  heeftEigenGegevens,
  leesKalenderJson,
  naarBestand,
  voorgesteldeBestandsnaam,
} from '../domein/state';
import type { GedeeldeGegevens, State } from '../domein/types';
import { useStore } from '../store/StoreProvider';
import {
  bestandGewijzigdOp,
  bewaarKoppeling,
  downloadTekst,
  heeftToestemming,
  kiesBestaandBestand,
  laadKoppeling,
  leesBestand,
  maakNieuwBestand,
  ondersteuntKoppelen,
  schrijfBestand,
  vergeetKoppeling,
} from './bestandstoegang';

/** Wachttijd na een wijziging voordat er gesynchroniseerd wordt. */
export const SYNC_VERTRAGING_MS = 1500;
/** Interval voor controle op wijzigingen van collega's. */
export const SYNC_INTERVAL_MS = 30_000;

const META_SLEUTEL = 'kwaliteitskalender:sync:v1';

export type KoppelStatus = 'geen' | 'verbinden' | 'gekoppeld' | 'toestemming-nodig' | 'fout';

/** Vraagt de gebruiker hoe een bestand met bestaande lokale gegevens gecombineerd wordt. */
export type KeuzeVrager = (bestandsnaam: string) => Promise<'samenvoegen' | 'overnemen' | null>;

export interface SyncInfo {
  /** Kan deze browser een bestand blijvend koppelen (Chrome/Edge)? */
  ondersteund: boolean;
  status: KoppelStatus;
  /** Naam van het gekoppelde (of laatst gebruikte) bestand. */
  bestandsnaam: string | null;
  /** Tijdstip (ms) van de laatste geslaagde synchronisatie of handmatige samenvoeging. */
  laatsteSync: number | null;
  bezig: boolean;
  /** Laatste foutmelding (gewone taal), of null. */
  fout: string | null;
  /** Conflicten die nog gemeld moeten worden (dialoog in de schil). */
  conflicten: Conflict[];

  /** Bestaand bestand kiezen en koppelen. `kies` wordt gevraagd als er lokaal al eigen gegevens zijn. */
  koppelBestaand: (kies?: KeuzeVrager) => Promise<boolean>;
  /** Nieuw gedeeld bestand aanmaken met de huidige gegevens en koppelen. */
  maakGedeeldBestand: () => Promise<boolean>;
  /** Toestemming opnieuw vragen (na herladen vraagt de browser dat soms). Alleen vanuit een klik. */
  herstelToestemming: () => Promise<boolean>;
  synchroniseerNu: () => Promise<void>;
  ontkoppel: () => Promise<void>;

  /** Handmatig: een bestand openen (overnemen of samenvoegen). */
  openBestand: (file: File, kies?: KeuzeVrager) => Promise<boolean>;
  /** Handmatig: samenvoegen met een bestand (bv. van een collega of een conflictkopie). */
  samenvoegenMetBestand: (file: File) => Promise<boolean>;
  /** Handmatig: huidige gegevens downloaden als kalenderbestand. */
  opslaanAlsBestand: () => void;

  sluitConflicten: () => void;
}

interface SyncMeta {
  bestandsnaam: string | null;
  laatsteSync: number | null;
  basis: SyncBasis | null;
  bestandTijd: number | null;
  vingerafdruk: string | null;
}

const LEGE_META: SyncMeta = { bestandsnaam: null, laatsteSync: null, basis: null, bestandTijd: null, vingerafdruk: null };

function laadMeta(): SyncMeta {
  try {
    const t = localStorage.getItem(META_SLEUTEL);
    return t ? { ...LEGE_META, ...(JSON.parse(t) as SyncMeta) } : { ...LEGE_META };
  } catch {
    return { ...LEGE_META };
  }
}

function bewaarMeta(m: SyncMeta) {
  try {
    localStorage.setItem(META_SLEUTEL, JSON.stringify(m));
  } catch {
    /* niet erg */
  }
}

/** Foutmelding in gewone taal. */
export function foutTekst(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === 'NotFoundError')
      return 'Het gekoppelde bestand is niet gevonden. Is het verplaatst of hernoemd? Koppel het dan opnieuw.';
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      return 'De browser geeft geen toegang tot het bestand. Klik op Opnieuw verbinden.';
    if (e.name === 'NoModificationAllowedError' || e.name === 'InvalidStateError')
      return 'Het bestand is even niet beschikbaar (bijvoorbeeld omdat OneDrive het bijwerkt). We proberen het zo opnieuw.';
  }
  if (e instanceof Error && e.message) return e.message;
  return 'Synchroniseren is niet gelukt. We proberen het zo opnieuw.';
}

class SyncFout extends Error {}

const SyncContext = createContext<SyncInfo | null>(null);

export function useSync(): SyncInfo {
  const s = useContext(SyncContext);
  if (!s) throw new Error('useSync moet binnen een SyncProvider gebruikt worden');
  return s;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const toast = useToast();
  const storeRef = useRef(store);
  storeRef.current = store;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const ondersteund = useMemo(() => ondersteuntKoppelen(), []);
  const metaRef = useRef<SyncMeta>(laadMeta());
  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const bezigRef = useRef(false);
  const opnieuwRef = useRef(false);

  const [status, setStatusRuw] = useState<KoppelStatus>(ondersteund && metaRef.current.bestandsnaam ? 'verbinden' : 'geen');
  const statusRef = useRef(status);
  const setStatus = useCallback((s: KoppelStatus) => {
    statusRef.current = s;
    setStatusRuw(s);
  }, []);
  const [bestandsnaam, setBestandsnaam] = useState<string | null>(metaRef.current.bestandsnaam);
  const [laatsteSync, setLaatsteSync] = useState<number | null>(metaRef.current.laatsteSync);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [conflicten, setConflicten] = useState<Conflict[]>([]);

  const zetMeta = useCallback((m: Partial<SyncMeta>) => {
    metaRef.current = { ...metaRef.current, ...m };
    bewaarMeta(metaRef.current);
    if (m.bestandsnaam !== undefined) setBestandsnaam(m.bestandsnaam);
    if (m.laatsteSync !== undefined) setLaatsteSync(m.laatsteSync);
  }, []);

  /** Meldingen na samenvoegen: toast voor binnenkomende wijzigingen, dialoog voor conflicten. */
  const meld = useCallback((r: SamenvoegResultaat | null) => {
    if (!r) return;
    const echte = r.binnenkomend;
    if (echte.length === 1) toastRef.current(`Bijgewerkt door een collega: ${echte[0].omschrijving}`, 'info', 3500);
    else if (echte.length > 1) toastRef.current(`${echte.length} wijzigingen van collega’s verwerkt`, 'info', 3500);
    if (r.conflicten.length) setConflicten((c) => [...c, ...r.conflicten]);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Synchroniseren met het gekoppelde bestand                          */
  /* ---------------------------------------------------------------- */

  const synchroniseer = useCallback(async (): Promise<void> => {
    const h = handleRef.current;
    if (!h || statusRef.current !== 'gekoppeld') return;
    if (bezigRef.current) {
      opnieuwRef.current = true;
      return;
    }
    bezigRef.current = true;
    setBezig(true);
    try {
      const lokaal = storeRef.current.haalState();
      const { tekst, gewijzigd } = await leesBestand(h);
      const meta = metaRef.current;
      const afdrukLokaal = vingerafdruk(lokaal);
      if (gewijzigd === meta.bestandTijd && afdrukLokaal === meta.vingerafdruk) {
        zetMeta({ laatsteSync: Date.now() });
        setFout(null);
        return;
      }
      let resultaat: GedeeldeGegevens;
      let schrijven: boolean;
      let r: SamenvoegResultaat | null = null;
      if (!tekst.trim()) {
        resultaat = gedeeldDeel(lokaal);
        schrijven = true;
      } else {
        const gelezen = leesKalenderJson(tekst);
        if (!gelezen.ok) throw new SyncFout('Het gekoppelde bestand is geen leesbaar kalenderbestand. Er is niets overschreven.');
        r = samenvoegen(lokaal, gelezen.state, meta.basis ?? undefined);
        resultaat = r.resultaat;
        schrijven = r.externGewijzigd;
        if (r.lokaalGewijzigd) storeRef.current.voegGedeeldSamen(resultaat);
      }
      let tijd = gewijzigd;
      if (schrijven) {
        await schrijfBestand(h, bestandNaarTekst(naarBestand(resultaat)));
        tijd = await bestandGewijzigdOp(h);
      }
      zetMeta({ basis: maakBasis(resultaat), bestandTijd: tijd, vingerafdruk: vingerafdruk(resultaat), laatsteSync: Date.now() });
      setFout(null);
      meld(r);
    } catch (e) {
      setFout(foutTekst(e));
      if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError'))
        setStatus('toestemming-nodig');
      if (e instanceof DOMException && e.name === 'NotFoundError') setStatus('fout');
    } finally {
      bezigRef.current = false;
      setBezig(false);
      if (opnieuwRef.current) {
        opnieuwRef.current = false;
        void synchroniseer();
      }
    }
  }, [meld, setStatus, zetMeta]);

  /** Voer bestands-IO uit terwijl de automatische synchronisatie wacht. */
  const metSlot = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      while (bezigRef.current) await new Promise((r) => setTimeout(r, 50));
      bezigRef.current = true;
      setBezig(true);
      try {
        return await fn();
      } finally {
        bezigRef.current = false;
        setBezig(false);
        if (opnieuwRef.current) {
          opnieuwRef.current = false;
          void synchroniseer();
        }
      }
    },
    [synchroniseer],
  );

  /** Koppeling activeren met een handle waarvoor toestemming is gegeven. */
  const activeer = useCallback(
    async (h: FileSystemFileHandle) => {
      handleRef.current = h;
      const onthouden = await bewaarKoppeling(h);
      if (!onthouden) {
        toastRef.current('Let op: deze browser onthoudt de koppeling niet na herladen.', 'warning', 4000);
      }
      zetMeta({ bestandsnaam: h.name });
      setStatus('gekoppeld');
      setFout(null);
    },
    [setStatus, zetMeta],
  );

  /** Combineer een gelezen bestand met de lokale gegevens: overnemen of samenvoegen. */
  const combineer = useCallback(
    async (
      naam: string,
      extern: State,
      kies?: KeuzeVrager,
      basis?: SyncBasis,
    ): Promise<{ resultaat: GedeeldeGegevens; r: SamenvoegResultaat | null } | null> => {
      const lokaal = storeRef.current.haalState();
      let wijze: 'samenvoegen' | 'overnemen' = 'overnemen';
      if (heeftEigenGegevens(lokaal)) {
        const keuze = kies ? await kies(naam) : 'samenvoegen';
        if (!keuze) return null;
        wijze = keuze;
      }
      if (wijze === 'overnemen') {
        const g = gedeeldDeel(extern);
        storeRef.current.neemGedeeldOver(g);
        return { resultaat: g, r: null };
      }
      const r = samenvoegen(lokaal, extern, basis);
      storeRef.current.voegGedeeldSamen(r.resultaat);
      return { resultaat: r.resultaat, r };
    },
    [],
  );

  const koppelHandle = useCallback(
    async (h: FileSystemFileHandle, kies?: KeuzeVrager): Promise<boolean> => {
      if (!(await heeftToestemming(h, true))) {
        toastRef.current('Zonder toestemming kan de kalender het bestand niet bijwerken.', 'warning', 4000);
        return false;
      }
      const { tekst } = await leesBestand(h);
      let resultaat: GedeeldeGegevens;
      let r: SamenvoegResultaat | null = null;
      if (!tekst.trim()) {
        const lokaal = storeRef.current.haalState();
        if (lokaal.modus === 'demo' || !lokaal.setupVoltooid) {
          toastRef.current(
            'Dit bestand is leeg. Stel eerst je eigen kalender in, of open een gevuld kalenderbestand.',
            'warning',
            4500,
          );
          return false;
        }
        resultaat = gedeeldDeel(lokaal);
      } else {
        const gelezen = leesKalenderJson(tekst);
        if (!gelezen.ok) {
          toastRef.current('Dit bestand is geen kalenderbestand', 'danger', 3500);
          return false;
        }
        const c = await combineer(h.name, gelezen.state, kies);
        if (!c) return false;
        resultaat = c.resultaat;
        r = c.r;
      }
      await activeer(h);
      let tijd = await bestandGewijzigdOp(h);
      if (!tekst.trim() || r?.externGewijzigd) {
        await schrijfBestand(h, bestandNaarTekst(naarBestand(resultaat)));
        tijd = await bestandGewijzigdOp(h);
      }
      zetMeta({ basis: maakBasis(resultaat), bestandTijd: tijd, vingerafdruk: vingerafdruk(resultaat), laatsteSync: Date.now() });
      toastRef.current(`Gekoppeld aan ${h.name}`, 'success');
      return true;
    },
    [activeer, combineer, zetMeta],
  );

  const koppelBestaand = useCallback(
    async (kies?: KeuzeVrager): Promise<boolean> => {
      if (!ondersteund) return false;
      try {
        const h = await kiesBestaandBestand();
        if (!h) return false;
        return await metSlot(() => koppelHandle(h, kies));
      } catch (e) {
        setFout(foutTekst(e));
        toastRef.current(foutTekst(e), 'danger', 4500);
        return false;
      }
    },
    [koppelHandle, metSlot, ondersteund],
  );

  const maakGedeeldBestand = useCallback(async (): Promise<boolean> => {
    if (!ondersteund) return false;
    const lokaal = storeRef.current.haalState();
    if (lokaal.modus === 'demo') {
      toastRef.current('In de demo maak je geen gedeeld bestand. Verlaat eerst de demo.', 'warning', 4000);
      return false;
    }
    if (!lokaal.setupVoltooid) {
      toastRef.current('Stel eerst je eigen kalender in.', 'warning');
      return false;
    }
    try {
      const h = await maakNieuwBestand(voorgesteldeBestandsnaam(lokaal.organisatie.bestuurNaam));
      if (!h) return false;
      await metSlot(async () => {
        const g = gedeeldDeel(storeRef.current.haalState());
        await schrijfBestand(h, bestandNaarTekst(naarBestand(g)));
        await activeer(h);
        zetMeta({
          basis: maakBasis(g),
          bestandTijd: await bestandGewijzigdOp(h),
          vingerafdruk: vingerafdruk(g),
          laatsteSync: Date.now(),
        });
      });
      toastRef.current(`Gedeeld bestand ${h.name} aangemaakt`, 'success');
      return true;
    } catch (e) {
      setFout(foutTekst(e));
      toastRef.current(foutTekst(e), 'danger', 4500);
      return false;
    }
  }, [activeer, metSlot, ondersteund, zetMeta]);

  const herstelToestemming = useCallback(async (): Promise<boolean> => {
    const h = handleRef.current ?? (await laadKoppeling());
    if (!h) {
      setStatus('geen');
      return false;
    }
    if (await heeftToestemming(h, true)) {
      handleRef.current = h;
      setStatus('gekoppeld');
      setFout(null);
      await synchroniseer();
      return true;
    }
    return false;
  }, [setStatus, synchroniseer]);

  const ontkoppel = useCallback(async () => {
    handleRef.current = null;
    await vergeetKoppeling();
    metaRef.current = { ...LEGE_META, bestandsnaam: null };
    bewaarMeta(metaRef.current);
    setBestandsnaam(null);
    setLaatsteSync(null);
    setFout(null);
    setStatus('geen');
  }, [setStatus]);

  /* ---------------------------------------------------------------- */
  /* Handmatig                                                          */
  /* ---------------------------------------------------------------- */

  const leesFile = async (file: File): Promise<State | null> => {
    const gelezen = leesKalenderJson(await file.text());
    if (!gelezen.ok) {
      toastRef.current(gelezen.fout, 'danger', 3500);
      return null;
    }
    return gelezen.state;
  };

  const openBestand = useCallback(
    async (file: File, kies?: KeuzeVrager): Promise<boolean> => {
      const extern = await leesFile(file);
      if (!extern) return false;
      const c = await combineer(file.name, extern, kies, metaRef.current.basis ?? undefined);
      if (!c) return false;
      zetMeta({ bestandsnaam: file.name, basis: maakBasis(c.resultaat), laatsteSync: Date.now() });
      meld(c.r);
      toastRef.current(`${file.name} geopend`, 'success');
      return true;
    },
    [combineer, meld, zetMeta],
  );

  const samenvoegenMetBestand = useCallback(
    async (file: File): Promise<boolean> => {
      const extern = await leesFile(file);
      if (!extern) return false;
      const lokaal = storeRef.current.haalState();
      const r = samenvoegen(lokaal, extern, metaRef.current.basis ?? undefined);
      storeRef.current.voegGedeeldSamen(r.resultaat);
      zetMeta({
        bestandsnaam: metaRef.current.bestandsnaam ?? file.name,
        basis: maakBasis(r.resultaat),
        laatsteSync: Date.now(),
      });
      if (r.conflicten.length) setConflicten((c) => [...c, ...r.conflicten]);
      const n = r.binnenkomend.length;
      toastRef.current(
        n === 0
          ? 'Samengevoegd: geen nieuwe wijzigingen'
          : `Samengevoegd: ${n} ${n === 1 ? 'wijziging' : 'wijzigingen'} verwerkt`,
        'success',
        3000,
      );
      // gekoppeld bestand direct bijwerken
      if (statusRef.current === 'gekoppeld') void synchroniseer();
      return true;
    },
    [synchroniseer, zetMeta],
  );

  const opslaanAlsBestand = useCallback(() => {
    const lokaal = storeRef.current.haalState();
    const naam = voorgesteldeBestandsnaam(lokaal.organisatie.bestuurNaam);
    const g = gedeeldDeel(lokaal);
    downloadTekst(naam, bestandNaarTekst(naarBestand(g)));
    zetMeta({ basis: maakBasis(g), laatsteSync: Date.now(), bestandsnaam: metaRef.current.bestandsnaam ?? naam });
    toastRef.current('Kalenderbestand gedownload', 'success');
  }, [zetMeta]);

  /* ---------------------------------------------------------------- */
  /* Levenscyclus                                                       */
  /* ---------------------------------------------------------------- */

  // Bij openen: onthouden koppeling herstellen (zonder te vragen; vragen kan alleen na een klik)
  useEffect(() => {
    if (!ondersteund) return;
    let actief = true;
    void (async () => {
      const h = await laadKoppeling();
      if (!actief) return;
      if (!h) {
        if (statusRef.current === 'verbinden') setStatus('geen');
        return;
      }
      handleRef.current = h;
      setBestandsnaam(h.name);
      if (await heeftToestemming(h, false)) {
        setStatus('gekoppeld');
        void synchroniseer();
      } else {
        setStatus('toestemming-nodig');
      }
    })();
    return () => {
      actief = false;
    };
  }, [ondersteund, setStatus, synchroniseer]);

  // Na elke wijziging (vertraagd)
  const { state, generatie } = store;
  useEffect(() => {
    if (statusRef.current !== 'gekoppeld') return;
    const t = window.setTimeout(() => void synchroniseer(), SYNC_VERTRAGING_MS);
    return () => window.clearTimeout(t);
  }, [state, synchroniseer]);

  // Bij terugkeer naar het venster en elke 30 s
  useEffect(() => {
    const opFocus = () => void synchroniseer();
    const opZichtbaar = () => {
      if (document.visibilityState === 'visible') void synchroniseer();
    };
    window.addEventListener('focus', opFocus);
    document.addEventListener('visibilitychange', opZichtbaar);
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void synchroniseer();
    }, SYNC_INTERVAL_MS);
    return () => {
      window.removeEventListener('focus', opFocus);
      document.removeEventListener('visibilitychange', opZichtbaar);
      window.clearInterval(t);
    };
  }, [synchroniseer]);

  // Alles vervangen (demo, leegmaken, back-up importeren): koppeling verbreken, bestand blijft ongemoeid
  const vorigeGeneratie = useRef(generatie);
  useEffect(() => {
    if (generatie === vorigeGeneratie.current) return;
    vorigeGeneratie.current = generatie;
    if (statusRef.current !== 'geen') {
      void ontkoppel();
      toastRef.current('De koppeling met het gedeelde bestand is verbroken. Het bestand zelf is niet gewijzigd.', 'info', 4500);
    } else {
      metaRef.current = { ...LEGE_META };
      bewaarMeta(metaRef.current);
      setBestandsnaam(null);
      setLaatsteSync(null);
    }
  }, [generatie, ontkoppel]);

  const waarde = useMemo<SyncInfo>(
    () => ({
      ondersteund,
      status,
      bestandsnaam,
      laatsteSync,
      bezig,
      fout,
      conflicten,
      koppelBestaand,
      maakGedeeldBestand,
      herstelToestemming,
      synchroniseerNu: synchroniseer,
      ontkoppel,
      openBestand,
      samenvoegenMetBestand,
      opslaanAlsBestand,
      sluitConflicten: () => setConflicten([]),
    }),
    [
      ondersteund,
      status,
      bestandsnaam,
      laatsteSync,
      bezig,
      fout,
      conflicten,
      koppelBestaand,
      maakGedeeldBestand,
      herstelToestemming,
      synchroniseer,
      ontkoppel,
      openBestand,
      samenvoegenMetBestand,
      opslaanAlsBestand,
    ],
  );

  return <SyncContext.Provider value={waarde}>{children}</SyncContext.Provider>;
}
