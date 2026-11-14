/**
 * Toasts: korte meldingen onderaan in het midden. Maximaal 3 tegelijk, elk 2400 ms (zoals het origineel),
 * vormgegeven als de Toast van het design system (witte kaart met getinte icoontegel).
 *
 *   const toast = useToast();
 *   toast('Wijzigingen opgeslagen');                 // success
 *   toast('Activiteit verwijderd', 'danger');
 *   toast('3 wijzigingen van collega’s verwerkt', 'info');
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Info, Trash2, TriangleAlert, X } from 'lucide-react';
import { cx } from './cx';

export type ToastToon = 'success' | 'info' | 'danger' | 'warning';

export interface ToastBericht {
  id: number;
  tekst: string;
  toon: ToastToon;
  /** ms; standaard 2400 */
  duur: number;
}

type ToonToast = (tekst: string, toon?: ToastToon, duur?: number) => void;

const ToastContext = createContext<ToonToast | null>(null);

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

/** Losse toast (ook bruikbaar buiten de provider, bv. in een voorbeeld). */
export function Toast({
  tekst,
  toon = 'success',
  onSluit,
  verdwijnt = false,
}: {
  tekst: string;
  toon?: ToastToon;
  onSluit?: () => void;
  verdwijnt?: boolean;
}) {
  const t = TOON[toon];
  const Icoon = t.icoon;
  return (
    <div
      role="status"
      className={cx(
        'pointer-events-auto flex items-center gap-3 max-w-[min(92vw,440px)] rounded-md border border-line-subtle bg-surface-card py-2 pl-2 pr-3 shadow-lg',
        'transition-all duration-base ease-out animate-rise',
        verdwijnt && 'opacity-0 translate-y-1',
      )}
    >
      <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-md', t.tegel, t.kleur)}>
        <Icoon className="h-4 w-4" aria-hidden strokeWidth={2.2} />
      </span>
      <span className="text-sm font-medium text-ink-strong">{tekst}</span>
      {onSluit && (
        <button
          type="button"
          onClick={onSluit}
          aria-label="Sluiten"
          className="ml-1 rounded-sm p-0.5 text-ink-subtle hover:text-ink-strong"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lijst, setLijst] = useState<(ToastBericht & { weg?: boolean })[]>([]);
  const teller = useRef(0);
  const timers = useRef(new Map<number, number[]>());

  const verwijder = useCallback((id: number) => {
    setLijst((l) => l.map((t) => (t.id === id ? { ...t, weg: true } : t)));
    const t = window.setTimeout(() => setLijst((l) => l.filter((x) => x.id !== id)), 220);
    timers.current.set(id, [...(timers.current.get(id) ?? []), t]);
  }, []);

  const toon = useCallback<ToonToast>(
    (tekst, toonSoort = 'success', duur = 2400) => {
      const id = ++teller.current;
      setLijst((l) => [...l, { id, tekst, toon: toonSoort, duur }].slice(-3));
      const t = window.setTimeout(() => verwijder(id), duur);
      timers.current.set(id, [t]);
    },
    [verwijder],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((ts) => ts.forEach((t) => window.clearTimeout(t)));
  }, []);

  return (
    <ToastContext.Provider value={toon}>
      {children}
      <div
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[1100] flex flex-col items-center gap-2 px-4"
      >
        {lijst.map((t) => (
          <Toast key={t.id} tekst={t.tekst} toon={t.toon} verdwijnt={t.weg} onSluit={() => verwijder(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
