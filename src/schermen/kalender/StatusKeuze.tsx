/**
 * Status zetten zonder het detailvenster: een knop (icoon op de chip, badge in de lijst) die een
 * klein keuzemenu opent. De meest logische volgende status heeft al de focus, dus klik + Enter
 * (of klik + klik) volstaat. Toetsen: pijltjes, 1-4, Enter, Esc.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { STATUS_STIJL, cx } from '../../componenten';
import { STATUS_VOLGORDE } from '../../domein/seed';
import type { Status } from '../../domein/types';

/** Welke status ligt voor de hand na de huidige? */
export function volgendeStatus(s: Status): Status {
  return s === 'gepland' ? 'bezig' : s === 'bezig' ? 'gereed' : s === 'risico' ? 'bezig' : 'gereed';
}

export function StatusIcoon({ status, className }: { status: Status; className?: string }) {
  const st = STATUS_STIJL[status] ?? STATUS_STIJL.gepland;
  const Icoon = st.icoon;
  return <Icoon className={cx('h-3.5 w-3.5', className)} aria-hidden style={{ strokeWidth: 2.4 }} />;
}

export interface StatusKeuzeProps {
  status: Status;
  onKies: (s: Status) => void;
  /** Naam van de activiteit (voor schermlezers en tooltip) */
  naam: string;
  /** icoon: klein rond knopje (matrixchip); badge: label met pijltje (lijst, actiebalk) */
  vorm?: 'icoon' | 'badge';
  /** Groter klikvlak voor het icoon (lijst, aanraakschermen) */
  groot?: boolean;
  className?: string;
}

export function StatusKeuze({ status, onKies, naam, vorm = 'icoon', groot, className }: StatusKeuzeProps) {
  const [open, setOpen] = useState(false);
  const knop = useRef<HTMLButtonElement>(null);
  const st = STATUS_STIJL[status] ?? STATUS_STIJL.gepland;
  const menuId = useId();

  function sluit(focusTerug = true) {
    setOpen(false);
    if (focusTerug) knop.current?.focus({ preventScroll: true });
  }

  function kies(s: Status) {
    sluit();
    if (s !== status) onKies(s);
  }

  return (
    <>
      <button
        ref={knop}
        type="button"
        data-rondleiding="status"
        data-statusknop
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Status van ${naam}: ${st.label}. Wijzigen`}
        title={`${st.label} · klik om de status te wijzigen`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cx(
          'shrink-0 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow',
          vorm === 'icoon'
            ? cx('grid place-items-center rounded-full hover:bg-surface-sunken', groot ? 'h-8 w-8' : 'h-5 w-5', status === 'gepland' ? 'text-gray-400 hover:text-ink-muted' : st.ink)
            : cx('inline-flex h-7 items-center gap-1 rounded-sm border border-line bg-surface-card pl-2 pr-1.5 text-xs font-semibold hover:border-gray-900', st.ink),
          open && 'ring-2 ring-gray-900',
          className,
        )}
      >
        <StatusIcoon status={status} className={groot ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {vorm === 'badge' && (
          <>
            {st.label}
            <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
          </>
        )}
      </button>
      {open && <StatusMenu id={menuId} anker={knop.current} huidig={status} onKies={kies} onSluit={sluit} />}
    </>
  );
}

function StatusMenu({
  id,
  anker,
  huidig,
  onKies,
  onSluit,
}: {
  id: string;
  anker: HTMLElement | null;
  huidig: Status;
  onKies: (s: Status) => void;
  onSluit: (focusTerug?: boolean) => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [plek, setPlek] = useState<{ top: number; left: number } | null>(null);
  const [actief, setActief] = useState(() => STATUS_VOLGORDE.indexOf(volgendeStatus(huidig)));

  const plaats = useCallback(() => {
    if (!anker || !menu.current) return;
    const r = anker.getBoundingClientRect();
    const m = menu.current.getBoundingClientRect();
    const onder = r.bottom + 4 + m.height <= window.innerHeight - 8;
    const top = onder ? r.bottom + 4 : Math.max(8, r.top - 4 - m.height);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - m.width - 8);
    setPlek({ top, left });
  }, [anker]);
  useLayoutEffect(plaats, [plaats]);

  useEffect(() => {
    menu.current?.querySelectorAll<HTMLElement>('[role=menuitemradio]')[actief]?.focus({ preventScroll: true });
  }, [actief, plek]);

  useEffect(() => {
    const buiten = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !anker?.contains(e.target as Node)) onSluit(false);
    };
    document.addEventListener('mousedown', buiten);
    window.addEventListener('resize', plaats);
    window.addEventListener('scroll', plaats, true);
    return () => {
      document.removeEventListener('mousedown', buiten);
      window.removeEventListener('resize', plaats);
      window.removeEventListener('scroll', plaats, true);
    };
  }, [anker, onSluit, plaats]);

  function toets(e: KeyboardEvent) {
    e.stopPropagation();
    const n = STATUS_VOLGORDE.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActief((a) => (a + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActief((a) => (a - 1 + n) % n);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActief(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActief(n - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onSluit();
    } else if (e.key === 'Tab') {
      onSluit(false);
    } else if (/^[1-4]$/.test(e.key)) {
      e.preventDefault();
      onKies(STATUS_VOLGORDE[Number(e.key) - 1]);
    }
  }

  return createPortal(
    <div
      ref={menu}
      id={id}
      role="menu"
      aria-label="Status kiezen"
      onKeyDown={toets}
      onClick={(e) => e.stopPropagation()}
      className="no-print fixed z-[1050] w-44 animate-fade rounded-md border border-line-subtle bg-surface-card p-1 shadow-pop"
      style={plek ? { top: plek.top, left: plek.left } : { top: -9999, left: -9999 }}
    >
      {STATUS_VOLGORDE.map((s, i) => {
        const st = STATUS_STIJL[s];
        const aan = s === huidig;
        return (
          <button
            key={s}
            type="button"
            role="menuitemradio"
            aria-checked={aan}
            tabIndex={i === actief ? 0 : -1}
            onClick={() => onKies(s)}
            onMouseEnter={() => setActief(i)}
            className={cx(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-ink-strong outline-none',
              i === actief && 'bg-surface-sunken',
            )}
          >
            <span className={cx('grid h-5 w-5 place-items-center', st.ink)}>
              <StatusIcoon status={s} className="h-3 w-3" />
            </span>
            <span className="flex-1">{st.label}</span>
            {aan ? <Check className="h-3.5 w-3.5 text-ink-muted" aria-hidden /> : <kbd className="text-2xs text-ink-subtle">{i + 1}</kbd>}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
