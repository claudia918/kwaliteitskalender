/**
 * Logo's van Leren verbeteren (design-system/assets/logos), ingesloten in de bundel.
 * - AppLogo: zwarte tegel met het gele LV-monogram + woordmerk "Kwaliteitskalender".
 * - LvLogo: het volledige logo (footer).
 */
import lvLogoVolledig from '../assets/lv-logo-full.svg';
import { cx } from './cx';

const LV_PAD =
  'M33.73,95.07h46.48-.62,11.62c7.18,0,13.8-3.87,17.33-10.12L149.31,12.62h-23.24l-34.86,63.35V12.62h-23.24v63.35h-33.38L67.97,12.62h-23.24l-27.11,49.52c-8.77,14.66-10.45,32.94,16.11,32.94Z';

/** Het LV-monogram als inline SVG (kleur via `kleur`, standaard merkgeel). */
export function LvMonogram({ className, kleur = 'var(--lv-yellow)' }: { className?: string; kleur?: string }) {
  return (
    <svg viewBox="14 8 140 92" aria-hidden className={className}>
      <path fill={kleur} d={LV_PAD} />
    </svg>
  );
}

/** App-merk: monogram in zwarte tegel, met woordmerk (verborgen onder 640px als `compact`). */
export function AppLogo({ groot, compact = true, className }: { groot?: boolean; compact?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <span
        className={cx(
          'grid shrink-0 place-items-center bg-brand-black',
          groot ? 'h-14 w-14 rounded-md' : 'h-9 w-9 rounded-sm',
        )}
      >
        <LvMonogram className={groot ? 'w-9' : 'w-[22px]'} />
      </span>
      <span className={cx('flex-col leading-tight', compact ? 'hidden sm:flex' : 'flex')}>
        <span className={cx('font-bold tracking-tight text-ink-strong', groot ? 'text-h3' : 'text-sm')}>Kwaliteitskalender</span>
        <span className="text-2xs font-medium text-ink-muted">Leren verbeteren · VO</span>
      </span>
    </span>
  );
}

/** Volledig logo Leren verbeteren (bevat "Een project in opdracht van het ministerie van OCW"). */
export function LvLogo({ className }: { className?: string }) {
  return <img src={lvLogoVolledig} alt="Leren verbeteren" className={className} />;
}
