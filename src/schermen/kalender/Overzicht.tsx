/**
 * Strook boven de kalender: hoe ver ben je (balk per status), het filter "Toon" en rechts ruimte
 * voor de maandkeuze en de legenda. De balk is meteen de legenda van de statuskleuren.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleHelp, GripVertical, KeyRound, Plus } from 'lucide-react';
import { STATUS_STIJL, cx, gesprekIcoon, seizoenKlassen } from '../../componenten';
import { voortgang, type KomendGesprek } from '../../domein/berekeningen';
import { formatDatumLang } from '../../domein/hulp';
import { STATUS_VOLGORDE } from '../../domein/seed';
import type { KalenderItem } from '../../domein/types';
import { pastBijFilter, type KalenderFilter } from './hulp';
import { StatusIcoon } from './StatusKeuze';

export interface OverzichtProps {
  items: KalenderItem[];
  filter: KalenderFilter;
  onFilter: (f: KalenderFilter) => void;
  komend: KomendGesprek | null;
  rechts?: ReactNode;
}

export function Overzicht({ items, filter, onFilter, komend, rechts }: OverzichtProps) {
  const v = voortgang(items);
  const gesprekId = komend?.gesprek.id ?? null;
  const tel = (f: KalenderFilter) => items.filter((i) => pastBijFilter(i, f, gesprekId)).length;
  const verborgen = items.length - tel(filter);

  const opties: { value: KalenderFilter; label: string; aantal?: number; titel?: string; icoon?: KomendGesprek['gesprek'] }[] = [
    { value: 'alles', label: 'Alles' },
    { value: 'te-doen', label: 'Nog te doen', aantal: tel('te-doen') },
  ];
  if (komend)
    opties.push({
      value: 'gesprek',
      label: komend.gesprek.naam,
      icoon: komend.gesprek,
      aantal: tel('gesprek'),
      titel: `Alleen activiteiten voor het komende gesprek ${komend.gesprek.naam} (${formatDatumLang(komend.datum)})`,
    });
  opties.push({ value: 'risico', label: 'Met risico', aantal: tel('risico') });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-lg border border-line-subtle bg-surface-card px-3 py-2.5">
        <div className="flex shrink-0 items-center gap-3" data-rondleiding="voortgang">
          <div
            className="flex h-2 w-20 shrink-0 overflow-hidden rounded-sm bg-surface-sunken"
            role="img"
            aria-label={`${v.gereed} gereed, ${v.bezig} bezig, ${v.risico} risico, ${v.gepland} gepland`}
          >
            {(['gereed', 'bezig', 'risico'] as const).map((s) =>
              v[s] ? <span key={s} className={STATUS_STIJL[s].dot} style={{ width: `${(v[s] / Math.max(1, v.totaal)) * 100}%` }} /> : null,
            )}
          </div>
          <p className="tnum whitespace-nowrap text-sm text-ink-body">
            <strong className="font-semibold text-ink-strong">{v.gereed}</strong> van {v.totaal} gereed
          </p>
        </div>

        <div className="flex min-w-0 max-w-full items-center gap-2" data-rondleiding="filter">
          <span className="eyebrow shrink-0">Toon</span>
          <div role="radiogroup" aria-label="Toon alleen" className="-my-1 flex min-w-0 gap-1 overflow-x-auto py-1 sm:flex-wrap sm:overflow-visible">
            {opties.map((o) => {
              const aan = filter === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={aan}
                  title={o.titel}
                  onClick={() => onFilter(o.value)}
                  className={cx(
                    'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 text-xs font-semibold transition-colors duration-fast',
                    aan
                      ? 'border-transparent bg-brand-magenta text-white'
                      : 'border-line-subtle bg-surface-card text-ink-body hover:border-line hover:bg-surface-hover',
                  )}
                >
                  {o.icoon && <GesprekIcoon gesprek={o.icoon} wit={aan} />}
                  {o.label}
                  {o.aantal !== undefined && (
                    <span className={cx('tnum text-2xs', aan ? 'text-white' : 'text-ink-subtle')}>{o.aantal}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {rechts && <div className="ml-auto flex shrink-0 items-center gap-1">{rechts}</div>}
      </div>
      {filter !== 'alles' && verborgen > 0 && (
        <p className="text-xs text-ink-muted" aria-live="polite">
          {verborgen === 1 ? '1 activiteit' : `${verborgen} activiteiten`} verborgen door het filter.{' '}
          <button type="button" onClick={() => onFilter('alles')} className="font-semibold kk-link">
            Toon alles
          </button>
        </p>
      )}
    </div>
  );
}

/** Legenda op aanvraag: klein knopje, paneel met wat de tekens betekenen. */
export function Legenda({ editable }: { editable: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const buiten = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', buiten);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', buiten);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Legenda"
        title="Legenda"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold text-ink-muted hover:bg-surface-hover hover:text-ink-strong"
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
        <span className="hidden 2xl:inline">Legenda</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 animate-fade rounded-md border border-line-subtle bg-surface-card p-3 shadow-pop">
          <ul className="space-y-1.5 text-xs text-ink-body">
            {STATUS_VOLGORDE.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className={cx('grid h-5 w-5 place-items-center', STATUS_STIJL[s].ink)}>
                  <StatusIcoon status={s} className="h-3 w-3" />
                </span>
                {STATUS_STIJL[s].label}
              </li>
            ))}
            <li className="flex items-center gap-2 border-t border-line-subtle pt-1.5">
              <span className="grid h-5 w-5 place-items-center text-ink-subtle">
                <KeyRound className="h-3 w-3" aria-hidden />
              </span>
              Vaste standaard
            </li>
            {editable && (
              <>
                <li className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center text-ink-subtle">
                    <GripVertical className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Sleep naar een andere maand
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center text-ink-subtle">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Activiteit toevoegen
                </li>
              </>
            )}
            <li className="border-t border-line-subtle pt-1.5 text-ink-muted">Een gekleurde maandkop is een gespreksmaand.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function GesprekIcoon({ gesprek, wit }: { gesprek: KomendGesprek['gesprek']; wit: boolean }) {
  const Icoon = gesprekIcoon(gesprek.icoon);
  return <Icoon aria-hidden className={cx('h-3.5 w-3.5', wit ? 'text-white' : seizoenKlassen(gesprek.kleur).ink)} />;
}
