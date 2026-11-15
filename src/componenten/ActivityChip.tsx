import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { GebiedCode, Status } from '../domein/types';
import { StatusDot } from './Badge';
import { cx } from './cx';
import { gebiedKlassen } from './stijlen';

export interface ActivityChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  gebied: GebiedCode | string;
  /** Standaardcode of activiteit-id, klein boven de naam */
  code?: string;
  naam: string;
  status?: Status;
  verplicht?: boolean;
  /** Reden van afwijking; toont "afwijking" */
  afwijking?: string;
  /** Opgepakt voor verplaatsen (zwarte ring) */
  selected?: boolean;
  /** Alleen code + stip, zonder naam */
  compact?: boolean;
}

/**
 * Activiteit in een matrixcel. Wit vlak met haarlijn; het kwaliteitsgebied blijkt uit het
 * kleurvlakje en de gekleurde code. Geselecteerd = 2px zwarte ring.
 */
export const ActivityChip = forwardRef<HTMLButtonElement, ActivityChipProps>(function ActivityChip(
  { gebied, code, naam, status, verplicht, afwijking, selected, compact, className, type = 'button', ...rest },
  ref,
) {
  const k = gebiedKlassen(gebied);
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cx(
        'group relative flex w-full flex-col gap-0.5 rounded-sm border bg-surface-card text-left transition-[box-shadow,transform,border-color] duration-fast ease-out',
        compact ? 'px-1.5 py-1' : 'px-2 py-1.5',
        selected
          ? 'z-[2] -translate-y-px border-transparent shadow-md ring-2 ring-gray-900'
          : 'z-[1] border-line-subtle hover:border-gray-900',
        className,
      )}
      {...rest}
    >
      <span className="flex items-center gap-1.5">
        <span aria-hidden className={cx('h-[7px] w-[7px] shrink-0 rounded-[2px]', k.dot)} />
        {code && <span className={cx('text-[10px] font-bold leading-none', k.ink)}>{code}</span>}
        {verplicht && (
          <span
            title="Verplicht"
            aria-label="Verplicht"
            className="grid h-3 w-3 place-items-center rounded-full bg-status-warning text-[8px] font-bold leading-none text-white"
          >
            !
          </span>
        )}
        {status && <StatusDot status={status} className="ml-auto" />}
      </span>
      {!compact && <span className="text-[11.5px] font-medium leading-tight text-ink-body">{naam}</span>}
      {afwijking !== undefined && !compact && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-status-warning" title={afwijking}>
          <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden />
          afwijking
        </span>
      )}
    </button>
  );
});
