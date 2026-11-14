import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppLogo, IconButton, cx } from '../componenten';
import { useStore } from '../store';
import { HULPMENU, hoofdmenu, isActief, type MenuItem } from './navigatie';

function MenuLink({ item, pad, onKlik }: { item: MenuItem; pad: string; onKlik?: () => void }) {
  const actief = isActief(item, pad);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onKlik}
      aria-current={actief ? 'page' : undefined}
      className={cx(
        'flex h-10 items-center gap-3 rounded-md border-l-2 px-3 text-sm font-medium transition-colors duration-fast',
        actief
          ? 'border-niveau bg-niveau-surface text-niveau-strong'
          : 'border-transparent text-ink-body hover:bg-surface-hover hover:text-ink-strong',
      )}
    >
      <Icon className={cx('h-4 w-4', actief ? 'text-niveau' : 'text-ink-subtle')} aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Menu({ onKlik }: { onKlik?: () => void }) {
  const { niveau } = useStore();
  const { pathname } = useLocation();
  return (
    <nav aria-label="Hoofdmenu" className="flex flex-1 flex-col gap-0.5 p-3">
      {hoofdmenu(niveau).map((item) => (
        <MenuLink key={item.to + item.label} item={item} pad={pathname} onKlik={onKlik} />
      ))}
      <div className="my-3 border-t border-line-subtle" role="separator" />
      <p className="eyebrow px-3 pb-1">Hulp en gegevens</p>
      {HULPMENU.map((item) => (
        <MenuLink key={item.to} item={item} pad={pathname} onKlik={onKlik} />
      ))}
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
        <div className="flex h-14 items-center justify-between border-b border-line-subtle px-4">
          <AppLogo compact={false} />
          <IconButton icon={X} label="Menu sluiten" onClick={onSluit} />
        </div>
        <Menu onKlik={onSluit} />
      </div>
    </div>
  );
}
