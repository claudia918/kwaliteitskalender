/**
 * Dialog (modaal venster) met scrim, kop (titel + sluiten), scrollende inhoud en voettekst.
 * Esc en klik op de achtergrond sluiten; focus blijft binnen het venster en keert na sluiten terug.
 *
 * Bevestigen: gebruik useBevestig() in plaats van window.confirm():
 *   const bevestig = useBevestig();
 *   if (await bevestig({ titel: 'Cluster verwijderen?', tekst: '...', bevestigLabel: 'Verwijderen', gevaarlijk: true })) { ... }
 */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  /** Knoppen onderaan (rechts uitgelijnd; geef een knop className="mr-auto" om hem links te zetten) */
  footer?: ReactNode;
  /** Maximale breedte: sm 420px, md 520px (standaard), lg 640px, xl 760px */
  width?: 'sm' | 'md' | 'lg' | 'xl';
  /** Klik op de achtergrond sluit niet (bv. bij een half ingevuld formulier) */
  blokkeerAchtergrond?: boolean;
  className?: string;
}

const BREEDTE = { sm: 'max-w-[420px]', md: 'max-w-[520px]', lg: 'max-w-[640px]', xl: 'max-w-[760px]' } as const;

const FOCUSBAAR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
  blokkeerAchtergrond,
  className,
}: DialogProps) {
  const paneel = useRef<HTMLDivElement>(null);
  const titelId = useId();
  const sluitRef = useRef(onClose);
  sluitRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const vorige = document.activeElement as HTMLElement | null;
    const p = paneel.current;
    // focus op het eerste invoerveld, anders op het paneel
    const eerste = p?.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
    (eerste ?? p)?.focus();
    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        sluitRef.current();
      } else if (e.key === 'Tab' && p) {
        const lijst = Array.from(p.querySelectorAll<HTMLElement>(FOCUSBAAR)).filter((el) => el.offsetParent !== null);
        if (lijst.length === 0) return;
        const eersteEl = lijst[0];
        const laatste = lijst[lijst.length - 1];
        if (e.shiftKey && document.activeElement === eersteEl) {
          e.preventDefault();
          laatste.focus();
        } else if (!e.shiftKey && document.activeElement === laatste) {
          e.preventDefault();
          eersteEl.focus();
        }
      }
    };
    document.addEventListener('keydown', opToets);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', opToets);
      document.body.style.overflow = overflow;
      vorige?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className="no-print fixed inset-0 z-[1000] grid animate-fade place-items-center overflow-y-auto p-4 sm:p-6"
      style={{ background: 'var(--scrim)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !blokkeerAchtergrond) onClose();
      }}
    >
      <div
        ref={paneel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        tabIndex={-1}
        className={cx(
          'flex max-h-[90vh] w-full animate-rise flex-col overflow-hidden rounded-xl bg-surface-card shadow-pop outline-none',
          BREEDTE[width],
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titelId} className="text-h3 text-ink-strong">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="-mr-1 -mt-0.5 rounded-md p-1 text-ink-muted hover:bg-surface-hover hover:text-ink-strong"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-surface-subtle px-5 py-3 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Bevestigen                                                           */
/* ------------------------------------------------------------------ */

export interface BevestigOpties {
  titel: string;
  tekst?: ReactNode;
  bevestigLabel?: string;
  annuleerLabel?: string;
  /** Rode bevestigknop */
  gevaarlijk?: boolean;
}

type Bevestig = (o: BevestigOpties) => Promise<boolean>;

const BevestigContext = createContext<Bevestig | null>(null);

/** Bevestigingsvraag als Promise<boolean>. Vereist <BevestigProvider> (zit in de app-schil). */
export function useBevestig(): Bevestig {
  const b = useContext(BevestigContext);
  if (!b) throw new Error('useBevestig moet binnen een BevestigProvider gebruikt worden');
  return b;
}

export function BevestigProvider({ children }: { children: ReactNode }) {
  const [vraag, setVraag] = useState<(BevestigOpties & { klaar: (ja: boolean) => void }) | null>(null);

  const bevestig = useCallback<Bevestig>(
    (o) =>
      new Promise<boolean>((resolve) => {
        setVraag({ ...o, klaar: resolve });
      }),
    [],
  );

  const sluit = (ja: boolean) => {
    vraag?.klaar(ja);
    setVraag(null);
  };

  return (
    <BevestigContext.Provider value={bevestig}>
      {children}
      <Dialog
        open={!!vraag}
        onClose={() => sluit(false)}
        width="sm"
        title={vraag?.titel ?? ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => sluit(false)}>
              {vraag?.annuleerLabel ?? 'Annuleren'}
            </Button>
            <Button variant={vraag?.gevaarlijk ? 'danger' : 'primary'} onClick={() => sluit(true)} autoFocus>
              {vraag?.bevestigLabel ?? 'Doorgaan'}
            </Button>
          </>
        }
      >
        {typeof vraag?.tekst === 'string' ? <p className="text-sm text-ink-body">{vraag.tekst}</p> : vraag?.tekst}
      </Dialog>
    </BevestigContext.Provider>
  );
}
