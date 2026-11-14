import type { Niveau } from '../domein/types';
import { cx } from './cx';
import { NIVEAU_ICONEN, NIVEAU_LABELS } from './stijlen';

const ACTIEF: Record<Niveau, string> = {
  bestuur: 'bg-niveau-bestuur',
  cluster: 'bg-niveau-cluster',
  school: 'bg-niveau-school',
};

export interface NiveauSwitcherProps {
  value: Niveau;
  onChange: (n: Niveau) => void;
  /** Cluster alleen tonen als er clusters bestaan */
  toonCluster?: boolean;
  /** Labels verbergen onder 640px (alleen iconen) */
  compactOpMobiel?: boolean;
  className?: string;
}

/**
 * Niveauwisselaar Bestuur / Cluster / School. Elk actief segment krijgt de eigen niveaukleur,
 * zodat het besturingselement de kleurbetekenis leert. Iconen staan altijd naast het label.
 */
export function NiveauSwitcher({ value, onChange, toonCluster = true, compactOpMobiel = true, className }: NiveauSwitcherProps) {
  const niveaus: Niveau[] = toonCluster ? ['bestuur', 'cluster', 'school'] : ['bestuur', 'school'];
  return (
    <div
      role="tablist"
      aria-label="Niveau"
      className={cx('inline-flex items-center gap-0.5 rounded-pill bg-surface-sunken p-[3px]', className)}
    >
      {niveaus.map((n) => {
        const actief = n === value;
        const Icon = NIVEAU_ICONEN[n];
        return (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={actief}
            onClick={() => onChange(n)}
            title={NIVEAU_LABELS[n]}
            className={cx(
              'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-xs font-semibold transition-colors duration-base ease-out sm:px-3.5 sm:text-sm',
              actief ? cx(ACTIEF[n], 'text-white shadow-sm') : 'text-ink-muted hover:bg-surface-card hover:text-ink-strong',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className={cx(compactOpMobiel && 'hidden sm:inline')}>{NIVEAU_LABELS[n]}</span>
          </button>
        );
      })}
    </div>
  );
}
