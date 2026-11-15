/**
 * Eenvoudig modaal venster voor de rondleiding (introductie, afsluiting, keuze): focus erin, Tab blijft
 * erin, Esc sluit, focus terug naar waar hij was. Eigen vormgeving, daarom niet de gewone Dialog.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../componenten';

const FOCUSBAAR = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Venster({
  labelId,
  onSluit,
  children,
  className,
  breedte = 'max-w-[560px]',
}: {
  labelId: string;
  onSluit: () => void;
  children: ReactNode;
  className?: string;
  breedte?: string;
}) {
  const paneel = useRef<HTMLDivElement>(null);
  const sluit = useRef(onSluit);
  sluit.current = onSluit;
  useEffect(() => {
    const vorige = document.activeElement as HTMLElement | null;
    const p = paneel.current;
    const t = window.setTimeout(() => (p?.querySelector<HTMLElement>('[data-autofocus]') ?? p)?.focus(), 30);
    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        sluit.current();
      } else if (e.key === 'Tab' && p) {
        const lijst = Array.from(p.querySelectorAll<HTMLElement>(FOCUSBAAR)).filter((el) => el.offsetParent !== null);
        if (!lijst.length) return;
        const eerste = lijst[0];
        const laatste = lijst[lijst.length - 1];
        if (e.shiftKey && (document.activeElement === eerste || document.activeElement === p)) {
          e.preventDefault();
          laatste.focus();
        } else if (!e.shiftKey && document.activeElement === laatste) {
          e.preventDefault();
          eerste.focus();
        }
      }
    };
    document.addEventListener('keydown', opToets);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', opToets);
      document.body.style.overflow = overflow;
      if (vorige && document.contains(vorige)) vorige.focus?.();
    };
  }, []);
  return createPortal(
    <div
      data-rondleiding-laag
      className="no-print fixed inset-0 z-[1200] grid animate-fade place-items-center overflow-y-auto p-4 sm:p-6"
      style={{ background: 'var(--scrim)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onSluit()}
    >
      <div
        ref={paneel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        className={cx('w-full animate-rise overflow-hidden rounded-xl bg-surface-card shadow-pop outline-none', breedte, className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
