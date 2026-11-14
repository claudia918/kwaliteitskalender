/**
 * Begrip: een vakterm met een subtiele stippellijn. Bij hover, focus of tik verschijnt een korte
 * uitleg in gewone taal (uit `domein/begrippen.ts`). Esc of wegklikken sluit.
 *
 *   <Begrip term="vaste-standaard" />            toont "vaste standaard"
 *   <Begrip term="seizoensgesprek">gesprek</Begrip>  eigen tekst
 *
 * Het is een knop: zet hem niet binnen een andere knop of link.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BEGRIPPEN, type BegripSleutel } from '../domein/begrippen';
import { cx } from './cx';

export interface BegripProps {
  term: BegripSleutel;
  children?: ReactNode;
  className?: string;
}

const BREEDTE = 288;
const MARGE = 12;

export function Begrip({ term, children, className }: BegripProps) {
  const b = BEGRIPPEN[term];
  const id = useId();
  const knop = useRef<HTMLButtonElement>(null);
  const paneel = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [vast, setVast] = useState(false);
  const [plek, setPlek] = useState<{ left: number; top: number; boven: boolean } | null>(null);
  const timer = useRef<number>();

  const sluit = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(false);
    setVast(false);
  }, []);

  const plaats = useCallback(() => {
    const k = knop.current;
    if (!k) return;
    const r = k.getBoundingClientRect();
    const breedte = Math.min(BREEDTE, window.innerWidth - 2 * MARGE);
    const left = Math.max(MARGE, Math.min(r.left + r.width / 2 - breedte / 2, window.innerWidth - breedte - MARGE));
    const hoogte = paneel.current?.offsetHeight ?? 120;
    const boven = r.bottom + 8 + hoogte > window.innerHeight && r.top - 8 - hoogte > 0;
    setPlek({ left, top: boven ? r.top - 8 - hoogte : r.bottom + 8, boven });
  }, []);

  useLayoutEffect(() => {
    if (open) plaats();
  }, [open, plaats]);

  useEffect(() => {
    if (!open) return;
    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        sluit();
      }
    };
    const opKlik = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!knop.current?.contains(t) && !paneel.current?.contains(t)) sluit();
    };
    const opScroll = () => plaats();
    document.addEventListener('keydown', opToets, true);
    document.addEventListener('pointerdown', opKlik);
    window.addEventListener('scroll', opScroll, true);
    window.addEventListener('resize', opScroll);
    return () => {
      document.removeEventListener('keydown', opToets, true);
      document.removeEventListener('pointerdown', opKlik);
      window.removeEventListener('scroll', opScroll, true);
      window.removeEventListener('resize', opScroll);
    };
  }, [open, sluit, plaats]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <button
        ref={knop}
        type="button"
        aria-describedby={`${id}-uitleg`}
        aria-expanded={open}
        data-begrip={term}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (vast) sluit();
          else {
            setOpen(true);
            setVast(true);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => !vast && sluit()}
        onMouseEnter={() => {
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setOpen(true), 120);
        }}
        onMouseLeave={() => {
          window.clearTimeout(timer.current);
          if (!vast) timer.current = window.setTimeout(() => setOpen(false), 150);
        }}
        className={cx(
          'inline cursor-help rounded-sm [letter-spacing:inherit] [text-transform:inherit] bg-transparent p-0 text-left font-[inherit] text-[length:inherit] leading-[inherit] text-inherit underline decoration-ink-subtle decoration-dotted decoration-1 underline-offset-[3px] transition-colors duration-fast hover:decoration-niveau focus-visible:decoration-niveau',
          open && 'decoration-niveau',
          className,
        )}
      >
        {children ?? b.term}
      </button>
      <span id={`${id}-uitleg`} className="sr-only">
        {b.uitleg}
      </span>
      {open &&
        createPortal(
          <span
            ref={paneel}
            aria-hidden
            data-begrip-uitleg={term}
            onMouseEnter={() => window.clearTimeout(timer.current)}
            onMouseLeave={() => !vast && sluit()}
            className="no-print fixed z-[1100] block animate-fade rounded-lg border border-line-subtle bg-surface-card p-3 text-left shadow-pop"
            style={{
              left: plek?.left ?? -9999,
              top: plek?.top ?? -9999,
              width: Math.min(BREEDTE, window.innerWidth - 2 * MARGE),
            }}
          >
            <span className="block text-xs font-semibold text-ink-strong first-letter:uppercase">{b.term}</span>
            <span className="mt-1 block text-xs leading-relaxed text-ink-body">{b.uitleg}</span>
          </span>,
          document.body,
        )}
    </>
  );
}
