import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, X } from 'lucide-react';
import { AppLogo, IconButton, cx } from '../componenten';
import { useStore } from '../store';
import { MENU, isActief, type MenuItem } from './navigatie';
import { DemoVerlatenKnop, SyncStatus } from './Topbar';
import { useOefenen, useRondleiding } from './rondleiding/RondleidingProvider';

function MenuLink({ item, pad, onKlik }: { item: MenuItem; pad: string; onKlik?: () => void }) {
  const actief = isActief(item, pad);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onKlik}
      aria-current={actief ? 'page' : undefined}
      title={item.beschrijving}
      className={cx(
        'flex h-9 items-center gap-3 rounded-md border-l-2 px-3 text-sm font-medium transition-colors duration-fast',
        actief
          ? 'border-niveau bg-niveau-surface text-niveau-strong'
          : 'border-transparent text-ink-body hover:bg-surface-hover hover:text-ink-strong',
      )}
    >
      <Icon className={cx('h-4 w-4 shrink-0', actief ? 'text-niveau' : 'text-ink-subtle')} aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Hulp > Rondleiding: opent de keuze (deze pagina, de eerste rondleiding, per scherm). */
function RondleidingKnop({ onKlik }: { onKlik?: () => void }) {
  const r = useRondleiding();
  return (
    <button
      type="button"
      data-rondleiding="menu-rondleiding"
      onClick={() => {
        onKlik?.();
        r.openKeuze();
      }}
      title="Oefen met de app op een oefenkalender"
      className="flex h-9 items-center gap-3 rounded-md border-l-2 border-transparent px-3 text-left text-sm font-medium text-ink-body transition-colors duration-fast hover:bg-surface-hover hover:text-ink-strong"
    >
      <GraduationCap className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
      <span className="truncate">Rondleiding</span>
      {r.voortgang.lopend && !r.oefenen && (
        <span className="ml-auto rounded-pill bg-brand-yellow px-1.5 text-2xs font-bold text-ink-on-brand">verder</span>
      )}
    </button>
  );
}

/** Menu in groepen: overzicht, plannen, voorbereiden, controleren; beheer en hulp onderaan. */
function Menu({ onKlik }: { onKlik?: () => void }) {
  const { pathname } = useLocation();
  const werk = MENU.filter((g) => g.id !== 'beheer' && g.id !== 'hulp');
  const apart = MENU.filter((g) => g.id === 'beheer' || g.id === 'hulp');
  const groep = (g: (typeof MENU)[number]) => (
    <div key={g.id} role="group" aria-labelledby={g.titel ? `menu-${g.id}` : undefined} data-rondleiding={`menu-${g.id}`}>
      {g.titel && (
        <p id={`menu-${g.id}`} className="eyebrow px-3 pb-1 pt-4">
          {g.titel}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {g.items.map((item) => (
          <MenuLink key={item.to} item={item} pad={pathname} onKlik={onKlik} />
        ))}
        {g.id === 'hulp' && <RondleidingKnop onKlik={onKlik} />}
      </div>
    </div>
  );
  return (
    <nav aria-label="Hoofdmenu" className="flex flex-1 flex-col p-3">
      {werk.map(groep)}
      <div className="mt-4 border-t border-line-subtle" role="separator" />
      {apart.map(groep)}
    </nav>
  );
}

/** Vaste zijbalk vanaf 768px. */
export function Sidebar() {
  return (
    <aside className="no-print hidden w-sidebar shrink-0 border-r border-line-subtle bg-surface-card md:block">
      <div className="sticky top-[59px] flex max-h-[calc(100vh-59px)] flex-col overflow-y-auto">
        <Menu />
      </div>
    </aside>
  );
}

/** Mobiele lade (onder 768px), opent via de hamburger in de topbar. */
export function Lade({ open, onSluit }: { open: boolean; onSluit: () => void }) {
  const { pathname } = useLocation();
  const { state } = useStore();
  const oefenen = useOefenen();
  const isDemo = state.modus === 'demo' && !oefenen;
  useEffect(() => {
    onSluit(); // sluiten bij navigeren
  }, [pathname, onSluit]);
  useEffect(() => {
    if (!open) return;
    const opToets = (e: KeyboardEvent) => e.key === 'Escape' && onSluit();
    document.addEventListener('keydown', opToets);
    return () => document.removeEventListener('keydown', opToets);
  }, [open, onSluit]);
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 animate-fade" style={{ background: 'var(--scrim)' }} onClick={onSluit} />
      <div className="absolute inset-y-0 left-0 flex w-[min(86vw,300px)] animate-slide-in flex-col overflow-y-auto border-t-[3px] border-niveau bg-surface-card shadow-pop">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line-subtle px-4">
          <AppLogo compact={false} />
          <IconButton icon={X} label="Menu sluiten" onClick={onSluit} />
        </div>
        <Menu onKlik={onSluit} />
        <div className="space-y-3 border-t border-line-subtle p-3">
          <SyncStatus />
          <p className="tnum px-2 text-xs text-ink-muted">Schooljaar {state.schooljaar}</p>
          {isDemo && <DemoVerlatenKnop volledig />}
        </div>
      </div>
    </div>
  );
}
