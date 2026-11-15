/**
 * Vlakken en kopjes: Card, KpiTile, ProgressBar, IconTile, EmptyState, InfoBalk, PageHeader,
 * SectionHeader en Swoosh. Vlak papier: 1px haarlijn, kleine radius, geen schaduw en geen getinte vlakken.
 */
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { Info, type LucideIcon } from 'lucide-react';
import { cx } from './cx';

/* ------------------------------------------------------------------ */

export interface CardProps {
  children?: ReactNode;
  /** Kop met titel (h3), optioneel subtitel en actie rechts. */
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Binnenruimte: none | sm (12px) | md (20px, standaard) | lg (24px) */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Vervallen: kaarten zweven niet meer. Blijft voor compatibiliteit en doet niets. */
  elevated?: boolean;
  /** Kopregel met scheidingslijn (standaard true als er een titel is) */
  divider?: boolean;
  as?: ElementType;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  id?: string;
  /** Anker voor de rondleiding (`data-rondleiding`). */
  rondleiding?: string;
}

const PAD = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' } as const;
const PAD_X = { none: 'px-5', sm: 'px-3', md: 'px-5', lg: 'px-6' } as const;

/** Wit vlak met 1px haarlijn, kleine radius, geen schaduw. */
export function Card({
  children,
  title,
  subtitle,
  action,
  padding = 'md',
  divider = true,
  as: Tag = 'section',
  className,
  bodyClassName,
  style,
  id,
  rondleiding,
}: CardProps) {
  const heeftKop = title !== undefined || action !== undefined;
  return (
    <Tag
      id={id}
      data-rondleiding={rondleiding}
      style={style}
      className={cx(
        'min-w-0 rounded-md border border-line-subtle bg-surface-card',
        className,
      )}
    >
      {heeftKop && (
        <header
          className={cx(
            'flex items-start justify-between gap-4 pt-4',
            PAD_X[padding],
            divider ? 'border-b border-line-subtle pb-3' : 'pb-0',
          )}
        >
          <div className="min-w-0">
            {title !== undefined && <h3 className="text-h3 text-ink-strong">{title}</h3>}
            {subtitle !== undefined && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
          {action !== undefined && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cx(PAD[padding], bodyClassName)}>{children}</div>
    </Tag>
  );
}

/* ------------------------------------------------------------------ */

export type KpiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'niveau';

const KPI_TOON: Record<KpiTone, string> = {
  neutral: 'text-ink-muted',
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  niveau: 'text-ink-muted',
};

export interface KpiTileProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: LucideIcon;
  /** Kleurt icoon en (bij warning/danger/success) de waarde; de tegel zelf blijft rustig. */
  tone?: KpiTone;
  hint?: ReactNode;
  className?: string;
}

/** Snelle telling: label in gewone tekst, groot tabulair getal, optionele hint. */
export function KpiTile({ label, value, unit, icon: Icon, tone = 'neutral', hint, className }: KpiTileProps) {
  const waardeKleur = tone === 'warning' || tone === 'danger' || tone === 'success' ? KPI_TOON[tone] : 'text-ink-strong';
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col gap-2 rounded-md border border-line-subtle bg-surface-card p-4',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-ink-muted">{label}</span>
        {Icon && <Icon className={cx('h-4 w-4', KPI_TOON[tone])} aria-hidden />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cx('tnum text-h1 font-bold leading-none tracking-tight', waardeKleur)}>{value}</span>
        {unit && <span className="text-base font-semibold text-ink-muted">{unit}</span>}
      </div>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export interface ProgressBarProps {
  /** Percentage 0..100 */
  value: number;
  /** CSS-kleur van de vulling; standaard zwart. Gebruik bv. seizoenKlassen(k).var voor een seizoen. */
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Label links boven de balk */
  label?: ReactNode;
  /** Percentage rechts boven de balk tonen */
  showValue?: boolean;
  className?: string;
}

/** Voortgangsbalk; de waarde staat er als tekst bij als showValue (nooit alleen kleur/lengte). */
export function ProgressBar({ value, color = 'var(--text-strong)', size = 'md', label, showValue, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const h = size === 'sm' ? 'h-1' : size === 'lg' ? 'h-2' : 'h-1.5';
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      {(label !== undefined || showValue) && (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          {label !== undefined && <span className="min-w-0 truncate text-ink-muted">{label}</span>}
          {showValue && <span className="tnum ml-auto font-semibold text-ink-strong">{pct}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cx('overflow-hidden bg-gray-200', h)}
      >
        <div
          className="h-full transition-[width] duration-slow ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export type IconTileTone = 'niveau' | 'brand' | 'success' | 'info' | 'danger' | 'warning' | 'neutral';

const TEGEL: Record<IconTileTone, string> = {
  niveau: 'text-ink-strong',
  brand: 'text-ink-strong',
  success: 'text-status-success',
  info: 'text-status-info',
  danger: 'text-status-danger',
  warning: 'text-status-warning',
  neutral: 'text-ink-muted',
};

/**
 * Alleen het icoon, zonder getint tegeltje (geen versiering). De naam blijft voor compatibiliteit.
 * Statustonen houden hun kleur; niveau, brand en neutral zijn zwart of grijs.
 */
export function IconTile({
  icon: Icon,
  tone = 'niveau',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: IconTileTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const icoon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span className={cx('inline-flex shrink-0 items-start', TEGEL[tone], className)}>
      <Icon className={icoon} aria-hidden />
    </span>
  );
}

/* ------------------------------------------------------------------ */

const LV_PAD =
  'M33.73,95.07h46.48-.62,11.62c7.18,0,13.8-3.87,17.33-10.12L149.31,12.62h-23.24l-34.86,63.35V12.62h-23.24v63.35h-33.38L67.97,12.62h-23.24l-27.11,49.52c-8.77,14.66-10.45,32.94,16.11,32.94Z';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  /** Vaag LV-watermerk rechtsonder */
  watermark?: boolean;
  /** Minder ruimte (binnen een kaart) en zonder eigen rand */
  compact?: boolean;
  className?: string;
}

/** Lege toestand: los icoon, titel, uitleg, optionele actie. */
export function EmptyState({ icon: Icon, title, body, action, watermark, compact, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'relative flex flex-col items-center overflow-hidden text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 rounded-md border border-line-subtle bg-surface-card px-8 py-12',
        className,
      )}
    >
      {watermark && (
        <svg
          aria-hidden
          viewBox="14 8 140 92"
          className="pointer-events-none absolute -bottom-6 -right-5 h-[150px] w-[220px] opacity-[0.05]"
        >
          <path fill="var(--lv-black)" d={LV_PAD} />
        </svg>
      )}
      {Icon && (
        <Icon className="relative h-6 w-6 text-ink-muted" aria-hidden />
      )}
      <div className="relative flex max-w-md flex-col gap-1">
        <h3 className={cx(compact ? 'text-h4' : 'text-h3', 'text-ink-strong')}>{title}</h3>
        {body && <p className="text-sm text-ink-muted">{body}</p>}
      </div>
      {action && <div className="relative mt-1">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Informatieve balk, bv. "Op clusterniveau is de bibliotheek alleen-lezen." */
export function InfoBalk({
  children,
  icon: Icon = Info,
  tone = 'info',
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  tone?: 'info' | 'warning' | 'niveau' | 'neutral';
  className?: string;
}) {
  // Geen getint vlak: haarlijn op wit, de toon zit alleen in het icoon.
  const t = {
    info: 'text-status-info',
    warning: 'text-status-warning',
    niveau: 'text-ink-strong',
    neutral: 'text-ink-muted',
  }[tone];
  return (
    <div
      role="note"
      className={cx('flex items-start gap-2.5 rounded-md border border-line-subtle bg-surface-card px-3.5 py-2.5 text-sm', t, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 text-ink-body">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export interface PageHeaderProps {
  /**
   * Vervallen: het kleine label boven de titel (de menugroep) is weggehaald, want het herhaalde alleen
   * het menu. Wordt genegeerd.
   */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Knoppen rechts */
  actions?: ReactNode;
  className?: string;
}

/** Kop van elk scherm: h1, subtitel, acties rechts, met een haarlijn eronder. */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cx('flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line-subtle pb-5', className)}
    >
      <div className="min-w-0">
        <h1 className="text-h1 text-ink-strong">{title}</h1>
        {subtitle && <p className="mt-1.5 text-base text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Kop van een sectie binnen een kaart of pagina (h2 in h3-maat). */
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-h3 text-ink-strong">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** De gele S-curve van het merk; één keer per scherm, als stille scheiding. */
export function Swoosh({ className }: { className?: string }) {
  return <div aria-hidden className={cx('lv-swoosh', className)} />;
}
