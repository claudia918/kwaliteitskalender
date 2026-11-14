/**
 * Actiebalk onderaan zodra een activiteit in de matrix geselecteerd is: alles wat je ermee kunt,
 * zichtbaar als knoppen (status, een maand eerder of later, details, verwijderen).
 */
import { ChevronLeft, ChevronRight, PanelRightOpen, Trash2, X } from 'lucide-react';
import { STATUS_STIJL, cx } from '../../componenten';
import { effectieveNaam } from '../../domein/hulp';
import { STATUS_VOLGORDE } from '../../domein/seed';
import type { KalenderItem, Status } from '../../domein/types';
import { maandVoluit, verschuifMaand } from './hulp';
import { StatusIcoon } from './StatusKeuze';

export interface ActiebalkProps {
  item: KalenderItem;
  onStatus: (s: Status) => void;
  onStap: (richting: -1 | 1) => void;
  onDetails: () => void;
  onVerwijder: () => void;
  onSluit: () => void;
}

const knop =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-semibold text-ink-body transition-colors duration-fast hover:bg-surface-hover hover:text-ink-strong disabled:pointer-events-none disabled:opacity-40';

export function Actiebalk({ item, onStatus, onStap, onDetails, onVerwijder, onSluit }: ActiebalkProps) {
  const naam = effectieveNaam(item);
  const eerder = verschuifMaand(item.maand, -1);
  const later = verschuifMaand(item.maand, 1);
  return (
    <div
      data-selectiebalk
      data-rondleiding="actiebalk"
      role="region"
      aria-label={`Acties voor ${naam}`}
      className="pointer-events-auto flex w-full max-w-[920px] animate-rise flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line-subtle bg-surface-card px-3 py-2 shadow-pop"
    >
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-semibold text-ink-strong" title={naam}>
          {naam}
        </p>
        <p className="text-2xs text-ink-muted">
          In {maandVoluit(item.maand)} · <span className="hidden sm:inline">sleep of klik een gemarkeerde maand</span>
          <span className="sm:hidden">tik een gemarkeerde maand</span>
        </p>
      </div>

      <div role="radiogroup" aria-label="Status" className="flex shrink-0 items-center gap-0.5 rounded-md bg-surface-sunken p-0.5">
        {STATUS_VOLGORDE.map((s, i) => {
          const st = STATUS_STIJL[s];
          const aan = item.status === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={aan}
              title={`${st.label} (${i + 1})`}
              onClick={() => onStatus(s)}
              className={cx(
                'inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs font-semibold transition-colors duration-fast',
                aan ? cx('bg-surface-card shadow-xs', st.ink) : 'text-ink-muted hover:text-ink-strong',
              )}
            >
              <span className={aan ? st.ink : undefined}>
                <StatusIcoon status={s} className="h-3.5 w-3.5" />
              </span>
              <span className={cx(!aan && 'hidden md:inline')}>{st.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          className={knop}
          disabled={!eerder}
          onClick={() => onStap(-1)}
          title={eerder ? `Naar ${maandVoluit(eerder)} (pijl links)` : 'Dit is al de eerste maand'}
          aria-label={eerder ? `Een maand eerder, naar ${maandVoluit(eerder)}` : 'Een maand eerder'}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">Eerder</span>
        </button>
        <button
          type="button"
          className={knop}
          disabled={!later}
          onClick={() => onStap(1)}
          title={later ? `Naar ${maandVoluit(later)} (pijl rechts)` : 'Dit is al de laatste maand'}
          aria-label={later ? `Een maand later, naar ${maandVoluit(later)}` : 'Een maand later'}
        >
          <span className="hidden lg:inline">Later</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-l border-line-subtle pl-2">
        <button type="button" className={knop} onClick={onDetails} title="Details (Enter)">
          <PanelRightOpen className="h-4 w-4" aria-hidden />
          Details
        </button>
        <button
          type="button"
          className={cx(knop, 'hover:bg-status-danger-surface hover:text-status-danger')}
          onClick={onVerwijder}
          aria-label={`${naam} verwijderen`}
          title="Verwijderen (Delete)"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={knop} onClick={onSluit} aria-label="Selectie opheffen" title="Selectie opheffen (Esc)">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
