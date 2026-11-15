/**
 * Toasts: korte meldingen onderaan in het midden. Maximaal 3 tegelijk, elk 2400 ms (zoals het origineel),
 * vormgegeven als de Toast van het design system (witte kaart met getinte icoontegel).
 *
 *   const toast = useToast();
 *   toast('Wijzigingen opgeslagen');                 // success
 *   toast('Activiteit verwijderd', 'danger');
 *   toast('3 wijzigingen van collega’s verwerkt', 'info');
 *   toast('Toets staat in oktober', 'success', { actie: { label: 'Ongedaan maken', onClick: herstel } });
 *
 * Een toast met een actie (zoals "Ongedaan maken") blijft 8 seconden staan, niet zolang de muis of
 * focus erop staat, en Ctrl/Cmd+Z voert de actie van de nieuwste uit (niet in een tekstveld of venster).
 *
 * `<ToastDock>` zet iets (bijvoorbeeld de actiebalk van de kalender) in dezelfde kolom onderaan,
 * zodat meldingen en balk nooit over elkaar heen vallen.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, Trash2, TriangleAlert, Undo2, X } from 'lucide-react';
import { cx } from './cx';
import { meldSignaal } from './signaal';
import { oefenGeheugenActief } from '../store/oefenopslag';

export type ToastToon = 'success' | 'info' | 'danger' | 'warning';

export interface ToastActie {
  label: string;
  onClick: () => void;
}

export interface ToastOpties {
  /** ms; standaard 2400, met een actie 8000 */
  duur?: number;
  actie?: ToastActie;
}

export interface ToastBericht {
  id: number;
  tekst: string;
  toon: ToastToon;
  duur: number;
  actie?: ToastActie;
}

/** Toont een toast; geeft een functie terug die hem weer weghaalt. */
export type ToonToast = (tekst: string, toon?: ToastToon, duurOfOpties?: number | ToastOpties) => () => void;

const ToastContext = createContext<ToonToast | null>(null);
const DockContext = createContext<HTMLElement | null>(null);
const WisContext = createContext<() => void>(() => undefined);

/** Alle meldingen weghalen (bv. bij begin en einde van het oefenen: een "Ongedaan maken" van de oefenkalender hoort daar niet meer). */
export function useWisToasts(): () => void {
  return useContext(WisContext);
}

export function useToast(): ToonToast {
  const t = useContext(ToastContext);
  if (!t) throw new Error('useToast moet binnen een ToastProvider gebruikt worden');
  return t;
}

const TOON: Record<ToastToon, { icoon: typeof Check; kleur: string; tegel: string }> = {
  success: { icoon: Check, kleur: 'text-status-success', tegel: 'bg-status-success-surface' },
  info: { icoon: Info, kleur: 'text-status-info', tegel: 'bg-status-info-surface' },
  danger: { icoon: Trash2, kleur: 'text-status-danger', tegel: 'bg-status-danger-surface' },
  warning: { icoon: TriangleAlert, kleur: 'text-status-warning', tegel: 'bg-status-warning-surface' },
};

export const ACTIE_DUUR = 8000;

/** Losse toast (ook bruikbaar buiten de provider, bv. in een voorbeeld). */
export function Toast({
  tekst,
  toon = 'success',
  onSluit,
  verdwijnt = false,
  actie,
  onPauze,
}: {
  tekst: string;
  toon?: ToastToon;
  onSluit?: () => void;
  verdwijnt?: boolean;
  actie?: ToastActie;
  /** Muis of focus op de melding: verdwijnen pauzeren. */
  onPauze?: (aan: boolean) => void;
}) {
  const t = TOON[toon];
  const Icoon = t.icoon;
  return (
    <div
      role="status"
      data-rondleiding={actie ? 'ongedaan' : undefined}
      onMouseEnter={onPauze && (() => onPauze(true))}
      onMouseLeave={onPauze && (() => onPauze(false))}
      onFocus={onPauze && (() => onPauze(true))}
      onBlur={onPauze && (() => onPauze(false))}
      className={cx(
        'pointer-events-auto flex items-center gap-3 rounded-md border border-line-subtle bg-surface-card py-2 pl-2 shadow-lg',
        actie ? 'max-w-[min(94vw,520px)] pr-1.5' : 'max-w-[min(92vw,440px)] pr-3',
        'transition-all duration-base ease-out animate-rise',
        verdwijnt && 'opacity-0 translate-y-1',
      )}
    >
      <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-md', t.tegel, t.kleur)}>
        <Icoon className="h-4 w-4" aria-hidden strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-ink-strong">{tekst}</span>
      {actie && (
        <button
          type="button"
          onClick={actie.onClick}
          title={`${actie.label} (Ctrl+Z)`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold text-niveau-strong hover:bg-niveau-surface"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden />
          {actie.label}
        </button>
      )}
      {onSluit && (
        <button
          type="button"
          onClick={onSluit}
          aria-label="Melding sluiten"
          className="shrink-0 rounded-sm p-1 text-ink-subtle hover:bg-surface-hover hover:text-ink-strong"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lijst, setLijst] = useState<(ToastBericht & { weg?: boolean })[]>([]);
  const lijstRef = useRef(lijst);
  lijstRef.current = lijst;
  const teller = useRef(0);
  const timers = useRef(new Map<number, number>());
  const [dock, setDock] = useState<HTMLElement | null>(null);

  const verwijder = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setLijst((l) => l.map((t) => (t.id === id ? { ...t, weg: true } : t)));
    window.setTimeout(() => setLijst((l) => l.filter((x) => x.id !== id)), 220);
  }, []);

  const startTimer = useCallback(
    (id: number, duur: number) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        window.setTimeout(() => verwijder(id), duur),
      );
    },
    [verwijder],
  );

  const toon = useCallback<ToonToast>(
    (tekst, toonSoort = 'success', duurOfOpties) => {
      const opties: ToastOpties = typeof duurOfOpties === 'number' ? { duur: duurOfOpties } : (duurOfOpties ?? {});
      const id = ++teller.current;
      const duur = opties.duur ?? (opties.actie ? ACTIE_DUUR : 2400);
      const actie = opties.actie
        ? {
            label: opties.actie.label,
            onClick: () => {
              verwijder(id);
              opties.actie!.onClick();
            },
          }
        : undefined;
      // Een nieuwe actie vervangt een oudere: er is altijd hooguit één "Ongedaan maken".
      setLijst((l) => [...l.map((t) => (actie && t.actie ? { ...t, actie: undefined } : t)), { id, tekst, toon: toonSoort, duur, actie }].slice(-3));
      startTimer(id, duur);
      return () => verwijder(id);
    },
    [startTimer, verwijder],
  );

  const pauzeer = useCallback(
    (id: number, aan: boolean) => {
      if (aan) window.clearTimeout(timers.current.get(id));
      else {
        const t = lijstRef.current.find((x) => x.id === id);
        if (t) startTimer(id, t.duur);
      }
    },
    [startTimer],
  );

  // Ctrl/Cmd+Z: actie van de nieuwste toast met actie (niet in tekstvelden of vensters)
  const heeftActie = lijst.some((t) => t.actie && !t.weg);
  useEffect(() => {
    if (!heeftActie) return;
    const opToets = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input,textarea,select,[contenteditable=true],[role=dialog]')) return;
      const t = [...lijstRef.current].reverse().find((x) => x.actie && !x.weg);
      if (!t?.actie) return;
      e.preventDefault();
      t.actie.onClick();
    };
    document.addEventListener('keydown', opToets);
    return () => document.removeEventListener('keydown', opToets);
  }, [heeftActie]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  const wis = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.clear();
    setLijst([]);
  }, []);

  return (
    <ToastContext.Provider value={toon}>
      <WisContext.Provider value={wis}>
        <DockContext.Provider value={dock}>{children}</DockContext.Provider>
      </WisContext.Provider>
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-3 z-[1100] flex flex-col items-center gap-2 px-3 sm:bottom-5">
        <div aria-live="polite" className="flex w-full flex-col items-center gap-2">
          {lijst.map((t) => (
            <Toast
              key={t.id}
              tekst={t.tekst}
              toon={t.toon}
              verdwijnt={t.weg}
              actie={t.actie}
              onPauze={(aan) => pauzeer(t.id, aan)}
              onSluit={() => verwijder(t.id)}
            />
          ))}
        </div>
        <div ref={setDock} className="flex w-full flex-col items-center gap-2 empty:hidden" />
      </div>
    </ToastContext.Provider>
  );
}

/** Zet iets onderaan in de kolom van de meldingen (onder de toasts), bijvoorbeeld een actiebalk. */
export function ToastDock({ children }: { children: ReactNode }) {
  const plek = useContext(DockContext);
  if (!plek) return null;
  return createPortal(children, plek);
}

/**
 * "Ongedaan maken" na een wijziging: een toast met die actie.
 *
 *   const ongedaan = useOngedaan();
 *   ongedaan.toon('Toets staat nu in oktober', () => store.herstelItem(scope, vorige));
 */
export function useOngedaan(): { toon: (tekst: string, herstel: () => void) => void; sluit: () => void } {
  const toast = useToast();
  const weg = useRef<(() => void) | null>(null);
  const toon = useCallback(
    (tekst: string, herstel: () => void) => {
      weg.current = toast(tekst, 'success', {
        // Tijdens het oefenen blijft de melding langer staan: de rondleiding wijst hem aan.
        duur: oefenGeheugenActief() ? 30_000 : ACTIE_DUUR,
        actie: {
          label: 'Ongedaan maken',
          onClick: () => {
            herstel();
            meldSignaal('ongedaan');
          },
        },
      });
    },
    [toast],
  );
  const sluit = useCallback(() => {
    weg.current?.();
    weg.current = null;
  }, []);
  return { toon, sluit };
}
