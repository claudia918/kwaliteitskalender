/**
 * Badge-familie naar het design system: Badge, StandaardBadge, VasteStandaardBadge (kernstandaard),
 * VerplichtBadge, AfwijkingBadge, StatusBadge, StatusDot, SeizoenBadge, GesprekIcoonView en
 * KwaliteitsgebiedTag. Kleur is nooit de enige drager: er staat altijd een label, code of icoon bij.
 */
import type { ReactNode } from 'react';
import { ArrowLeftRight, KeyRound, type LucideIcon } from 'lucide-react';
import { GEBIEDEN } from '../domein/seed';
import type { GebiedCode, Gesprek, GesprekIcoon, GesprekKleur, Status } from '../domein/types';
import { cx } from './cx';
import { STATUS_STIJL, gebiedKlassen, gesprekIcoon, seizoenKlassen } from './stijlen';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'niveau';

/*
 * Badges zijn rechthoekig en rustig: wit met een haarlijn en tekst in de toon (soft), of alleen een
 * rand (outline). Geen getinte vlakken meer. Solid blijft voor de enkele plek waar het moet opvallen.
 */
const TONE: Record<BadgeTone, { soft: string; solid: string; outline: string; dot: string }> = {
  neutral: {
    soft: 'bg-surface-card text-ink-body border-line',
    solid: 'bg-status-neutral text-white border-transparent',
    outline: 'bg-transparent text-ink-muted border-line',
    dot: 'bg-status-neutral',
  },
  brand: {
    // geel als rand, tekst zwart (geel als tekst haalt geen AA)
    soft: 'bg-surface-card text-ink-strong border-brand-yellow',
    solid: 'bg-brand-yellow text-ink-on-brand border-transparent',
    outline: 'bg-transparent text-ink-strong border-brand-yellow',
    dot: 'bg-brand-yellow',
  },
  success: {
    soft: 'bg-surface-card text-status-success border-status-success-border',
    solid: 'bg-status-success text-white border-transparent',
    outline: 'bg-transparent text-status-success border-status-success-border',
    dot: 'bg-status-success',
  },
  warning: {
    soft: 'bg-surface-card text-status-warning border-status-warning-border',
    solid: 'bg-status-warning text-white border-transparent',
    outline: 'bg-transparent text-status-warning border-status-warning-border',
    dot: 'bg-status-warning',
  },
  danger: {
    soft: 'bg-surface-card text-status-danger border-status-danger-border',
    solid: 'bg-status-danger text-white border-transparent',
    outline: 'bg-transparent text-status-danger border-status-danger-border',
    dot: 'bg-status-danger',
  },
  info: {
    soft: 'bg-surface-card text-status-info border-status-info-border',
    solid: 'bg-status-info text-white border-transparent',
    outline: 'bg-transparent text-status-info border-status-info-border',
    dot: 'bg-status-info',
  },
  niveau: {
    // geen niveaukleur meer in de inhoud: zwart
    soft: 'bg-surface-card text-ink-strong border-line',
    solid: 'bg-gray-900 text-white border-transparent',
    outline: 'bg-transparent text-ink-strong border-line',
    dot: 'bg-gray-900',
  },
};

export interface BadgeProps {
  children?: ReactNode;
  tone?: BadgeTone;
  variant?: 'soft' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  /** Gekleurde stip voor de tekst */
  dot?: boolean;
  title?: string;
  className?: string;
}

/** Klein rechthoekig label met haarlijn en tekst in één toon. */
export function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  icon: Icon,
  dot,
  title,
  className,
}: BadgeProps) {
  const t = TONE[tone];
  return (
    <span
      title={title}
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-sm border font-semibold leading-none',
        size === 'sm' ? 'h-[18px] gap-1 px-1.5 text-2xs' : 'h-[22px] gap-1 px-2 text-xs',
        t[variant],
        className,
      )}
    >
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', variant === 'solid' ? 'bg-current' : t.dot)} aria-hidden />}
      {Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden style={{ strokeWidth: 2.2 }} />}
      {children}
    </span>
  );
}

/** Code van een standaard ("OP3"), neutraal, tabulair. */
export function StandaardBadge({ code, className, title }: { code: string; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cx(
        'tnum inline-flex h-5 items-center rounded-sm border border-line bg-surface-card px-1.5 text-2xs font-bold text-ink-strong',
        className,
      )}
    >
      {code}
    </span>
  );
}

/**
 * Vaste standaard (kernstandaard: OP0, OP2, OP3, VS1, OR1). Gele rand met sleutel, zwarte tekst.
 * `compact` toont "vast" (zoals in de matrix).
 */
export function VasteStandaardBadge({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Badge
      tone="brand"
      variant="soft"
      size="sm"
      icon={compact ? undefined : KeyRound}
      title="Deze standaard beoordeelt de inspectie bij elk onderzoek"
      className={className}
    >
      {compact ? 'vast' : 'Vaste standaard'}
    </Badge>
  );
}

/** Verplichte activiteit: oranje stip en tekst, haarlijn. */
export function VerplichtBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" size="sm" dot className={className}>
      Verplicht
    </Badge>
  );
}

/** Afwijking van de standaardkoppeling (stippellijn). */
export function AfwijkingBadge({
  reden,
  className,
  label = 'afwijking',
}: {
  reden?: string;
  className?: string;
  label?: string;
}) {
  return (
    <Badge
      tone="warning"
      variant="outline"
      size="sm"
      icon={ArrowLeftRight}
      title={reden}
      className={cx('border-dashed', className)}
    >
      {label}
    </Badge>
  );
}

/** Status met icoon en label: Gepland, Bezig, Gereed, Risico. Geen vlak: icoon in de statuskleur, tekst donker. */
export function StatusBadge({ status, size = 'sm', className }: { status: Status; size?: 'sm' | 'md'; className?: string }) {
  const s = STATUS_STIJL[status] ?? STATUS_STIJL.gepland;
  const Icoon = s.icoon;
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap font-medium leading-none text-ink-body',
        size === 'sm' ? 'h-5 gap-1 text-xs' : 'h-6 gap-1.5 text-sm',
        className,
      )}
    >
      <Icoon className={cx(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', s.ink)} aria-hidden style={{ strokeWidth: 2.2 }} />
      {s.label}
    </span>
  );
}

/** Kleine statusstip (6px), bv. in een matrixchip. Heeft een title voor schermlezers/tooltip. */
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  const s = STATUS_STIJL[status] ?? STATUS_STIJL.gepland;
  return (
    <span
      role="img"
      aria-label={s.label}
      title={s.label}
      className={cx('inline-block h-1.5 w-1.5 shrink-0 rounded-full', s.dot, className)}
    />
  );
}

/** Lijnicoon van een gesprek in de inktkleur van het seizoen. */
export function GesprekIcoonView({
  icoon,
  kleur,
  className,
}: {
  icoon: GesprekIcoon | string;
  kleur?: GesprekKleur | string;
  className?: string;
}) {
  const Icoon = gesprekIcoon(icoon);
  return <Icoon aria-hidden className={cx('h-4 w-4', kleur && seizoenKlassen(kleur).ink, className)} />;
}

export interface SeizoenBadgeProps {
  /** Het gesprek (naam, kleur, icoon). Gebruik vindGesprek() voor een id. */
  gesprek: Pick<Gesprek, 'naam' | 'kleur' | 'icoon'>;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  /** Andere tekst dan de naam (bv. "Herfst (standaard)") */
  label?: ReactNode;
  className?: string;
}

/** Gesprek/seizoen: lijnicoon in de seizoenskleur + naam, zonder vlak. */
export function SeizoenBadge({ gesprek, size = 'sm', showLabel = true, label, className }: SeizoenBadgeProps) {
  const k = seizoenKlassen(gesprek.kleur);
  const Icoon = gesprekIcoon(gesprek.icoon);
  return (
    <span
      title={showLabel ? undefined : gesprek.naam}
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap font-medium leading-none text-ink-body',
        size === 'sm' ? 'h-5 gap-1 text-xs' : 'h-[26px] gap-1.5 text-sm',
        className,
      )}
    >
      <Icoon className={cx(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', k.ink)} aria-hidden style={{ strokeWidth: 2 }} />
      {showLabel && (label ?? gesprek.naam)}
      {!showLabel && <span className="sr-only">{gesprek.naam}</span>}
    </span>
  );
}

/** Kwaliteitsgebied: kleurvlakje + code op wit (geen getint vak), optioneel met naam. */
export function KwaliteitsgebiedTag({
  gebied,
  showName,
  size = 'md',
  className,
}: {
  gebied: GebiedCode | string;
  showName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const k = gebiedKlassen(gebied);
  const naam = GEBIEDEN[gebied as GebiedCode]?.naam;
  return (
    <span
      className={cx('inline-flex items-center whitespace-nowrap', size === 'sm' ? 'gap-1' : 'gap-1.5', className)}
      title={showName ? undefined : naam}
    >
      <span aria-hidden className={cx('shrink-0 rounded-xs', k.dot, size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
      <span className={cx('font-bold', k.ink, size === 'sm' ? 'text-2xs' : 'text-xs')}>{gebied}</span>
      {showName && naam && (
        <span className={cx('font-medium text-ink-body', size === 'sm' ? 'text-2xs' : 'text-xs')}>{naam}</span>
      )}
    </span>
  );
}

/** Ronde stip in de kleur van een gebied (filterchips, legenda's). */
export function GebiedDot({ gebied, className }: { gebied: GebiedCode | string; className?: string }) {
  return <span aria-hidden className={cx('inline-block h-2 w-2 shrink-0 rounded-full', gebiedKlassen(gebied).dot, className)} />;
}
