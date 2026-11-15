/**
 * Spotlight van de rondleiding: het echte onderdeel licht op (de rest gedimd) met een korte kaart
 * ernaast. De kaart staat nooit over het uitgelichte onderdeel (`plaatsKaart`), volgt scrollen en
 * verkleinen, en de stap gaat verder zodra de handeling echt gedaan is.
 *
 * Robuust: is het onderdeel niet in beeld, dan zegt de kaart dat (met "Breng me erheen"); staat er
 * een venster open (bijvoorbeeld het keuzepaneel), dan licht dat venster op. Klikken buiten de kaart
 * mag altijd: de dimlaag vangt geen klikken.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Crosshair, X } from 'lucide-react';
import { cx, luisterNaarSignalen, useWisToasts } from '../../componenten';
import { meet, plaatsKaart, type KaartPlek, type OefenMeting, type Rechthoek } from '../../domein/oefenen';
import { useStore } from '../../store';
import { useRondleiding } from './RondleidingProvider';
import { doelSelectors, doeTekst, resetGesprekKeuze, vindTour, type Stap, type Tour } from './tours';

const RUIMTE = 8; // lucht rond het uitgelichte onderdeel
const GELUKT_MS = 1500;

export function useBreed(): boolean {
  const [breed, setBreed] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 768));
  useEffect(() => {
    const opResize = () => setBreed(window.innerWidth >= 768);
    window.addEventListener('resize', opResize);
    return () => window.removeEventListener('resize', opResize);
  }, []);
  return breed;
}

export function minderBeweging(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function zichtbaar(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const st = getComputedStyle(el);
  return st.visibility !== 'hidden' && st.display !== 'none';
}

function zoek(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(s)) {
      if (!el.closest('[data-rondleiding-laag]') && zichtbaar(el)) return el;
    }
  }
  return null;
}

/** Een open venster (modaal) dat niet van de rondleiding is. */
function openVenster(): HTMLElement | null {
  const lijst = [...document.querySelectorAll<HTMLElement>('[role=dialog][aria-modal="true"]')].filter(
    (d) => !d.closest('[data-rondleiding-laag]') && zichtbaar(d),
  );
  return lijst[lijst.length - 1] ?? null;
}

function rechthoek(el: Element): Rechthoek {
  const r = el.getBoundingClientRect();
  // binnen het venster houden (een groot onderdeel als de matrix steekt eruit)
  const left = Math.max(0, r.left - RUIMTE);
  const top = Math.max(0, r.top - RUIMTE);
  const right = Math.min(window.innerWidth, r.right + RUIMTE);
  const bottom = Math.min(window.innerHeight, r.bottom + RUIMTE);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

function omvat(a: Rechthoek, b: Rechthoek): Rechthoek {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  return { left, top, width: Math.max(a.left + a.width, b.left + b.width) - left, height: Math.max(a.top + a.height, b.top + b.height) - top };
}

const zelfde = (a: Rechthoek | null, b: Rechthoek | null) =>
  a === b ||
  (!!a && !!b && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

export function Spotlight() {
  const r = useRondleiding();
  const lopend = r.voortgang.lopend;
  const tour = lopend ? vindTour(lopend.tour) : undefined;
  if (!r.oefenen || !lopend || !tour) return null;
  const i = Math.min(lopend.stap, tour.stappen.length - 1);
  return <StapKaart key={`${tour.id}:${i}`} tour={tour} index={i} />;
}

interface Beeld {
  doel: Rechthoek | null;
  ook: Rechthoek[];
  /** Een open venster neemt het over */
  venster: boolean;
  /** Het element (voor "Naar het onderdeel") */
  el: HTMLElement | null;
}

function StapKaart({ tour, index }: { tour: Tour; index: number }) {
  const r = useRondleiding();
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const breed = useBreed();
  const wisToasts = useWisToasts();
  const stap: Stap = tour.stappen[index];
  const laatste = index === tour.stappen.length - 1;
  const titelId = useId();
  const titel = useRef<HTMLHeadingElement>(null);
  const kaart = useRef<HTMLElement>(null);

  const [fase, setFase] = useState<'doen' | 'gelukt'>('doen');
  const [beeld, setBeeld] = useState<Beeld>({ doel: null, ook: [], venster: false, el: null });
  const [plek, setPlek] = useState<KaartPlek | null>(null);
  const [wachtOpVenster, setWachtOpVenster] = useState(false);
  const begin = useRef<OefenMeting>(meet(store.state));
  const signalen = useRef<Record<string, number>>({});
  const [, setTik] = useState(0);
  const ingescrold = useRef<Element | null>(null);
  const [gestart, setGestart] = useState(false);
  const [mini, setMini] = useState(false);
  const kaartMaat = useRef({ width: 380, height: 240 });

  /* ---------- begin van de stap ---------- */
  useEffect(() => {
    resetGesprekKeuze();
    if (!stap.houdMeldingen) wisToasts();
    stap.bijBegin?.(storeRef.current);
    begin.current = meet(storeRef.current.state);
    setGestart(true);
    if (stap.pad && window.location.hash.replace(/^#/, '').split('?')[0] !== stap.pad) navigate(stap.pad);
    // Focus op de kaart, tenzij er een venster open is (dat houdt zijn eigen focus).
    const t = window.setTimeout(() => {
      if (!openVenster()) titel.current?.focus({ preventScroll: true });
    }, 60);
    const stopLuisteren = luisterNaarSignalen((s) => {
      signalen.current = { ...signalen.current, [s]: (signalen.current[s] ?? 0) + 1 };
      setTik((n) => n + 1);
    });
    return () => {
      window.clearTimeout(t);
      stopLuisteren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- uitlichten: elk beeldje opnieuw meten ---------- */
  useLayoutEffect(() => {
    let raf = 0;
    let vorige: Beeld = { doel: null, ook: [], venster: false, el: null };
    const meetBeeld = () => {
      const venster = openVenster();
      const el = zoek(doelSelectors(stap, window.innerWidth >= 768));
      let nieuw: Beeld;
      if (venster && !(el && venster.contains(el))) {
        nieuw = { doel: rechthoek(venster), ook: [], venster: true, el: venster };
      } else if (el) {
        const ook = (stap.ook ?? []).map((s) => zoek([s])).filter((x): x is HTMLElement => !!x && x !== el);
        nieuw = { doel: rechthoek(el), ook: ook.map(rechthoek), venster: false, el };
        // Eén keer in beeld brengen (niet bij vaste onderdelen zoals de topbalk of meldingen).
        if (ingescrold.current !== el) {
          ingescrold.current = el;
          const b = el.getBoundingClientRect();
          if (b.top < 64 || b.bottom > window.innerHeight - 8) {
            el.scrollIntoView({ block: b.height > window.innerHeight - 120 ? 'start' : 'center', behavior: minderBeweging() ? 'auto' : 'smooth' });
          }
        }
      } else {
        nieuw = { doel: null, ook: [], venster: false, el: null };
      }
      // kaart plaatsen: niet over het doel en niet over wat erbij oplicht (bv. een open keuzelijst)
      const k = kaart.current;
      if (k && k.offsetWidth > 0) kaartMaat.current = { width: k.offsetWidth, height: k.offsetHeight };
      // Open venster en geen plek ernaast (smal scherm of groot venster): de kaart wordt een smalle
      // balk bovenaan, zodat hij nooit over het venster en zijn knoppen valt.
      const alsBalk =
        nieuw.venster &&
        (window.innerWidth < 768 ||
          plaatsKaart(nieuw.doel, kaartMaat.current, { width: window.innerWidth, height: window.innerHeight }).kant.startsWith('blad'));
      setMini(alsBalk);
      if (k && !alsBalk) {
        const vermijd = nieuw.doel ? nieuw.ook.reduce(omvat, nieuw.doel) : null;
        const p = plaatsKaart(vermijd, { width: k.offsetWidth, height: k.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
        setPlek((oud) => (oud && oud.left === p.left && oud.top === p.top && oud.kant === p.kant ? oud : p));
        // Past de kaart nergens naast (groot onderdeel, smal scherm), dan licht alleen het deel op dat
        // niet achter de kaart valt: de kaart staat nooit over wat uitgelicht is.
        if (nieuw.doel && p.kant.startsWith('blad')) {
          const d = nieuw.doel;
          const top = p.kant === 'blad-boven' ? Math.max(d.top, p.top + k.offsetHeight + 8) : d.top;
          const onder = p.kant === 'blad-boven' ? d.top + d.height : Math.min(d.top + d.height, p.top - 8);
          if (onder - top > 24) nieuw = { ...nieuw, doel: { ...d, top, height: onder - top } };
        }
      }
      if (
        !zelfde(nieuw.doel, vorige.doel) ||
        nieuw.venster !== vorige.venster ||
        nieuw.el !== vorige.el ||
        nieuw.ook.length !== vorige.ook.length ||
        nieuw.ook.some((o, k) => !zelfde(o, vorige.ook[k]))
      ) {
        vorige = nieuw;
        setBeeld(nieuw);
      }
      raf = requestAnimationFrame(meetBeeld);
    };
    raf = requestAnimationFrame(meetBeeld);
    return () => cancelAnimationFrame(raf);
  }, [stap]);

  /* ---------- is de handeling gedaan? ---------- */
  const klaarNu =
    gestart &&
    !!stap.klaar &&
    stap.klaar({
      store,
      pad: pathname,
      begin: begin.current,
      nu: meet(store.state),
      signalen: signalen.current,
      breed,
    });
  const faseRef = useRef(fase);
  faseRef.current = fase;
  const telOpRef = useRef(r.telOp);
  telOpRef.current = r.telOp;
  const markeerGelukt = useCallback(() => {
    if (faseRef.current !== 'doen') return;
    faseRef.current = 'gelukt';
    setFase('gelukt');
    if (stap.telt) telOpRef.current(stap.telt);
  }, [stap]);
  useEffect(() => {
    if (klaarNu) markeerGelukt();
  }, [klaarNu, markeerGelukt]);
  // Sommige controles kijken naar het scherm (bv. een invoerveld of de actiebalk): regelmatig opnieuw kijken.
  const controleRef = useRef<() => boolean>(() => false);
  controleRef.current = () =>
    gestart &&
    !!stap.klaar &&
    stap.klaar({
      store: storeRef.current,
      pad: window.location.hash.replace(/^#/, '').split('?')[0] || '/',
      begin: begin.current,
      nu: meet(storeRef.current.state),
      signalen: signalen.current,
      breed: window.innerWidth >= 768,
    });
  useEffect(() => {
    if (!stap.klaar || fase !== 'doen') return;
    const t = window.setInterval(() => {
      if (controleRef.current()) markeerGelukt();
      else setTik((n) => n + 1);
    }, 300);
    return () => window.clearInterval(t);
  }, [stap, fase, markeerGelukt]);

  const volgendeRef = useRef<() => void>(() => undefined);
  volgendeRef.current = () => {
    if (laatste) r.rond();
    else r.naarStap(index + 1);
  };
  const volgende = useCallback(() => volgendeRef.current(), []);

  // Na "gelukt" even laten zien, dan door (eerst een open venster laten sluiten).
  useEffect(() => {
    if (fase !== 'gelukt') return;
    let t = 0;
    const probeer = (wacht: number) => {
      t = window.setTimeout(() => {
        if (openVenster()) {
          setWachtOpVenster(true);
          probeer(300);
        } else volgende();
      }, wacht);
    };
    probeer(GELUKT_MS);
    return () => window.clearTimeout(t);
  }, [fase, volgende]);

  const naarOnderdeel = () => {
    const el = beeld.el;
    if (!el) return;
    const focusbaar = el.matches('button,a,input,select,textarea,[tabindex]')
      ? el
      : el.querySelector<HTMLElement>('button:not([disabled]),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    (focusbaar ?? el).focus();
  };

  const doe = doeTekst(stap, breed);
  const kijkstap = !stap.klaar;
  const totaal = tour.stappen.length;
  const fractie = (index + (fase === 'gelukt' ? 1 : 0)) / totaal;
  const eerste = tour.id === 'eerste';
  const mask = useId().replace(/:/g, '');
  const zonderDoel = !beeld.doel;
  const blad = plek?.kant.startsWith('blad');

  const status =
    fase === 'gelukt'
      ? `${stap.gelukt ?? 'Gelukt.'}${wachtOpVenster ? ' Sluit het venster om verder te gaan.' : ''}`
      : `Stap ${index + 1} van ${totaal}: ${stap.titel}. ${stap.wat} ${doe ?? ''}`;

  return createPortal(
    <div data-rondleiding-laag className="no-print">
      {/* Dimlaag met een gat voor elk uitgelicht onderdeel. Vangt geen klikken. */}
      {!zonderDoel && (
        <svg className="pointer-events-none fixed inset-0 z-[1050] h-full w-full animate-fade" aria-hidden>
          <defs>
            <mask id={mask}>
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {[beeld.doel!, ...beeld.ook].map((h, k) => (
                <rect key={k} className="kk-gat" x={h.left} y={h.top} width={h.width} height={h.height} rx="12" fill="black" />
              ))}
            </mask>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="var(--rondleiding-dim)" mask={`url(#${mask})`} />
        </svg>
      )}
      {beeld.doel && (
        <div
          aria-hidden
          className={cx('kk-ring pointer-events-none fixed z-[1051] rounded-[12px]', fase === 'gelukt' && 'kk-ring-gelukt')}
          style={{ left: beeld.doel.left, top: beeld.doel.top, width: beeld.doel.width, height: beeld.doel.height }}
        />
      )}

      {mini && (
        <div
          data-rondleiding-kaart
          data-mini
          className="fixed inset-x-4 top-1.5 z-[1150] flex h-8 items-center gap-2 rounded-pill bg-brand-yellow pl-3 pr-1 text-xs text-ink-on-brand shadow-lg"
        >
          <span className="tnum shrink-0 font-bold">stap {index + 1} van {totaal}</span>
          <span className="min-w-0 flex-1 truncate">
            {fase === 'gelukt' ? (wachtOpVenster ? 'Gelukt. Sluit het venster om verder te gaan.' : stap.gelukt) : doe ?? stap.wat}
          </span>
          <button
            type="button"
            onClick={r.onderbreek}
            aria-label="Rondleiding onderbreken (later verder)"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-pill hover:bg-brand-yellow-600"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
      <section
        ref={kaart}
        hidden={mini}
        role="region"
        aria-labelledby={titelId}
        data-rondleiding-kaart
        data-fase={fase}
        data-stap={stap.id}
        data-klaar={gestart ? String(klaarNu) : 'wacht'}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            r.onderbreek();
          }
        }}
        className={cx(
          'fixed z-[1150] w-[min(380px,calc(100vw-32px))] rounded-xl border border-line-subtle bg-surface-card shadow-pop',
          'kk-kaart',
          !plek && 'invisible',
        )}
        style={plek ? { left: plek.left, top: plek.top } : { left: 16, top: 16 }}
      >
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-yellow px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-ink-on-brand">
            Oefenen
          </span>
          <span className="tnum text-xs font-medium text-ink-muted">
            {eerste ? '' : `${tour.titel} · `}stap {index + 1} van {totaal}
          </span>
          <button
            type="button"
            onClick={r.onderbreek}
            aria-label="Rondleiding onderbreken (later verder)"
            title="Onderbreken, later verder (Esc)"
            className="ml-auto grid h-8 w-8 place-items-center rounded-md text-ink-subtle hover:bg-surface-hover hover:text-ink-strong"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <Voortgangslijn fractie={fractie} stappen={totaal} />

        <div className="px-4 pb-1 pt-2">
          <h2 id={titelId} ref={titel} tabIndex={-1} className="text-h4 text-ink-strong outline-none focus-visible:shadow-none">
            {stap.titel}
          </h2>
          <p className="mt-1 text-sm text-ink-body">{stap.wat}</p>

          {fase === 'gelukt' ? (
            <p className="mt-3 flex items-start gap-2 rounded-md bg-status-success-surface px-3 py-2 text-sm font-semibold text-ink-strong">
              <span className="kk-vinkje mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-yellow text-ink-on-brand">
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </span>
              <span>
                {stap.gelukt ?? 'Gelukt.'}
                {wachtOpVenster && <span className="block font-normal text-ink-muted">Sluit het venster om verder te gaan.</span>}
              </span>
            </p>
          ) : zonderDoel && !kijkstap && stap.zonderDoel ? (
            <p className="mt-3 rounded-md bg-surface-sunken px-3 py-2 text-sm text-ink-body">{stap.zonderDoel}</p>
          ) : zonderDoel ? (
            <p className="mt-3 rounded-md bg-surface-sunken px-3 py-2 text-sm text-ink-body">
              Dit onderdeel is nu niet in beeld.{' '}
              {stap.pad && (
                <button type="button" onClick={() => navigate(stap.pad!)} className="font-semibold text-niveau-strong underline">
                  Breng me erheen
                </button>
              )}
            </p>
          ) : doe ? (
            <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-ink-strong">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-yellow-700" aria-hidden />
              {doe}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 pt-2">
          <button
            type="button"
            onClick={() => r.naarStap(index - 1)}
            disabled={index === 0}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-ink-muted hover:bg-surface-hover hover:text-ink-strong disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Vorige
          </button>
          {beeld.el && !beeld.venster && (
            <button
              type="button"
              onClick={naarOnderdeel}
              className="sr-only inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-ink-muted focus:not-sr-only"
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden />
              Naar het onderdeel
            </button>
          )}
          <span className="flex-1" />
          {kijkstap ? (
            <button
              type="button"
              onClick={volgende}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-yellow px-3.5 text-sm font-semibold text-ink-on-brand hover:bg-brand-yellow-600"
            >
              {laatste ? 'Klaar' : 'Volgende'}
              {!laatste && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          ) : (
            <button
              type="button"
              onClick={volgende}
              className={cx(
                'inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold',
                fase === 'gelukt' ? 'bg-brand-yellow text-ink-on-brand hover:bg-brand-yellow-600' : 'text-ink-muted hover:bg-surface-hover hover:text-ink-strong',
              )}
            >
              {fase === 'gelukt' ? (laatste ? 'Afronden' : 'Verder') : 'Sla over'}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
        {blad && <span className="sr-only">Het uitgelichte onderdeel staat {plek?.kant === 'blad-boven' ? 'onder' : 'boven'} deze kaart.</span>}
      </section>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </div>,
    document.body,
  );
}

/** Voortgang als een lijn die zich trekt, met een stip per stap. */
export function Voortgangslijn({ fractie, stappen }: { fractie: number; stappen: number }) {
  return (
    <div className="px-4 pt-2" role="progressbar" aria-valuemin={0} aria-valuemax={stappen} aria-valuenow={Math.round(fractie * stappen)} aria-label="Voortgang rondleiding">
      <svg viewBox="0 0 300 16" className="h-4 w-full" preserveAspectRatio="none" aria-hidden>
        <path d="M2 12 C 80 2, 200 2, 298 8" fill="none" stroke="var(--border-subtle)" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M2 12 C 80 2, 200 2, 298 8"
          fill="none"
          stroke="var(--lv-yellow)"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - Math.max(0.001, fractie)}
          className="kk-lijn"
        />
      </svg>
    </div>
  );
}
