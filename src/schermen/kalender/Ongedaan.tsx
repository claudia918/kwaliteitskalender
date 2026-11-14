/**
 * "Ongedaan maken" na verplaatsen, een statuswijziging, toevoegen, opslaan of verwijderen.
 * Een melding onderaan het scherm met één knop; verdwijnt na 8 seconden (niet zolang de muis of
 * focus erop staat). Ctrl/Cmd+Z werkt ook, behalve in een tekstveld of dialoog.
 *
 *   const ongedaan = useOngedaan();
 *   ongedaan.toon('Verplaatst naar oktober', () => store.herstelItem(scope, vorige));
 *   <Dock><OngedaanMelding {...ongedaan} /></Dock>
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Undo2, X } from 'lucide-react';
import { cx } from '../../componenten';

export interface OngedaanStaat {
  melding: { id: number; tekst: string; herstel: () => void } | null;
  toon: (tekst: string, herstel: () => void) => void;
  maakOngedaan: () => void;
  sluit: () => void;
  /** Pauzeer het verdwijnen (muis of focus op de melding). */
  pauzeer: (aan: boolean) => void;
}

const DUUR = 8000;

export function useOngedaan(): OngedaanStaat {
  const [melding, setMelding] = useState<OngedaanStaat['melding']>(null);
  const teller = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const gepauzeerd = useRef(false);

  const stopTimer = () => window.clearTimeout(timer.current);
  const startTimer = useCallback(() => {
    stopTimer();
    timer.current = window.setTimeout(() => {
      if (!gepauzeerd.current) setMelding(null);
    }, DUUR);
  }, []);

  const toon = useCallback(
    (tekst: string, herstel: () => void) => {
      setMelding({ id: ++teller.current, tekst, herstel });
      startTimer();
    },
    [startTimer],
  );

  const sluit = useCallback(() => {
    stopTimer();
    setMelding(null);
  }, []);

  const huidig = useRef(melding);
  huidig.current = melding;
  const maakOngedaan = useCallback(() => {
    const m = huidig.current;
    huidig.current = null;
    stopTimer();
    setMelding(null);
    m?.herstel();
  }, []);

  const pauzeer = useCallback(
    (aan: boolean) => {
      gepauzeerd.current = aan;
      if (aan) stopTimer();
      else startTimer();
    },
    [startTimer],
  );

  // Ctrl/Cmd+Z buiten tekstvelden en dialogen
  useEffect(() => {
    if (!melding) return;
    const opToets = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input,textarea,select,[contenteditable=true],[role=dialog]')) return;
      e.preventDefault();
      maakOngedaan();
    };
    document.addEventListener('keydown', opToets);
    return () => document.removeEventListener('keydown', opToets);
  }, [melding, maakOngedaan]);

  useEffect(() => () => stopTimer(), []);

  return { melding, toon, maakOngedaan, sluit, pauzeer };
}

/** Vaste plek onderaan het scherm voor de actiebalk en de ongedaan-melding. */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-3 z-[900] flex flex-col items-center gap-2 px-3 sm:bottom-5">
      {children}
    </div>
  );
}

export function OngedaanMelding({ melding, maakOngedaan, sluit, pauzeer }: OngedaanStaat) {
  if (!melding) return null;
  return (
    <div
      key={melding.id}
      role="status"
      data-rondleiding="ongedaan"
      onMouseEnter={() => pauzeer(true)}
      onMouseLeave={() => pauzeer(false)}
      onFocus={() => pauzeer(true)}
      onBlur={() => pauzeer(false)}
      className="pointer-events-auto flex max-w-[min(94vw,520px)] animate-rise items-center gap-3 rounded-md border border-line-subtle bg-surface-card py-1.5 pl-2 pr-1.5 shadow-lg"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-status-success-surface text-status-success">
        <Check className="h-4 w-4" aria-hidden strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-ink-strong">{melding.tekst}</span>
      <button
        type="button"
        onClick={maakOngedaan}
        title="Ongedaan maken (Ctrl+Z)"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold text-niveau-strong hover:bg-niveau-surface"
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        Ongedaan maken
      </button>
      <button
        type="button"
        onClick={sluit}
        aria-label="Melding sluiten"
        className={cx('shrink-0 rounded-sm p-1 text-ink-subtle hover:bg-surface-hover hover:text-ink-strong')}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
