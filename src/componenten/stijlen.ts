/**
 * Klassen per datacategorie (kwaliteitsgebied, seizoen/gesprekskleur, status, niveau).
 * Alle klassen staan hier letterlijk uitgeschreven zodat Tailwind ze vindt.
 * Gebruik deze tabellen in plaats van zelf klassen samen te stellen.
 */
import {
  Building2,
  Calendar,
  Check,
  Circle,
  CircleCheckBig,
  CircleDashed,
  CircleDot,
  CircleHelp,
  Download,
  Flag,
  Flower2,
  Gauge,
  GitBranch,
  House,
  Layers,
  Leaf,
  Library,
  Mail,
  MessagesSquare,
  Repeat,
  School,
  ShieldCheck,
  Snowflake,
  Star,
  Sun,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { GebiedCode, GesprekIcoon, GesprekKleur, Niveau, Status } from '../domein/types';

export interface KleurKlassen {
  /** tekst in de inktkleur */
  ink: string;
  /** achtergrond in de lichte tint */
  surface: string;
  /** rand in de tint */
  border: string;
  /** volle kleur (stip, balk) */
  dot: string;
  /** CSS-waarde van de inktkleur, voor inline style (bv. ProgressBar) */
  var: string;
}

export const GEBIED_KLASSEN: Record<GebiedCode, KleurKlassen> = {
  BKA: {
    ink: 'text-kg-bka',
    surface: 'bg-kg-bka-surface',
    border: 'border-kg-bka-border',
    dot: 'bg-kg-bka',
    var: 'var(--kg-bka-ink)',
  },
  SKA: {
    ink: 'text-kg-ska',
    surface: 'bg-kg-ska-surface',
    border: 'border-kg-ska-border',
    dot: 'bg-kg-ska',
    var: 'var(--kg-ska-ink)',
  },
  OP: { ink: 'text-kg-op', surface: 'bg-kg-op-surface', border: 'border-kg-op-border', dot: 'bg-kg-op', var: 'var(--kg-op-ink)' },
  VS: { ink: 'text-kg-vs', surface: 'bg-kg-vs-surface', border: 'border-kg-vs-border', dot: 'bg-kg-vs', var: 'var(--kg-vs-ink)' },
  OR: { ink: 'text-kg-or', surface: 'bg-kg-or-surface', border: 'border-kg-or-border', dot: 'bg-kg-or', var: 'var(--kg-or-ink)' },
};

export function gebiedKlassen(gebied: string | undefined): KleurKlassen {
  return GEBIED_KLASSEN[(gebied as GebiedCode) ?? 'OP'] ?? GEBIED_KLASSEN.OP;
}

export const SEIZOEN_KLASSEN: Record<GesprekKleur, KleurKlassen> = {
  Herfst: {
    ink: 'text-seizoen-herfst',
    surface: 'bg-seizoen-herfst-surface',
    border: 'border-seizoen-herfst-border',
    dot: 'bg-seizoen-herfst',
    var: 'var(--seizoen-herfst-ink)',
  },
  Winter: {
    ink: 'text-seizoen-winter',
    surface: 'bg-seizoen-winter-surface',
    border: 'border-seizoen-winter-border',
    dot: 'bg-seizoen-winter',
    var: 'var(--seizoen-winter-ink)',
  },
  Lente: {
    ink: 'text-seizoen-lente',
    surface: 'bg-seizoen-lente-surface',
    border: 'border-seizoen-lente-border',
    dot: 'bg-seizoen-lente',
    var: 'var(--seizoen-lente-ink)',
  },
  Zomer: {
    ink: 'text-seizoen-zomer',
    surface: 'bg-seizoen-zomer-surface',
    border: 'border-seizoen-zomer-border',
    dot: 'bg-seizoen-zomer',
    var: 'var(--seizoen-zomer-ink)',
  },
  Doorlopend: {
    ink: 'text-seizoen-doorlopend',
    surface: 'bg-seizoen-doorlopend-surface',
    border: 'border-seizoen-doorlopend-border',
    dot: 'bg-seizoen-doorlopend',
    var: 'var(--seizoen-doorlopend-ink)',
  },
};

export function seizoenKlassen(kleur: string | undefined): KleurKlassen {
  return SEIZOEN_KLASSEN[(kleur as GesprekKleur) ?? 'Doorlopend'] ?? SEIZOEN_KLASSEN.Doorlopend;
}

export interface StatusStijl extends KleurKlassen {
  label: string;
  icoon: LucideIcon;
}

export const STATUS_STIJL: Record<Status, StatusStijl> = {
  gepland: {
    label: 'Gepland',
    icoon: CircleDot,
    ink: 'text-status-neutral',
    surface: 'bg-status-neutral-surface',
    border: 'border-line-subtle',
    dot: 'bg-status-neutral',
    var: 'var(--status-neutral)',
  },
  bezig: {
    label: 'Bezig',
    icoon: CircleDashed,
    ink: 'text-status-info',
    surface: 'bg-status-info-surface',
    border: 'border-status-info-border',
    dot: 'bg-status-info',
    var: 'var(--status-info)',
  },
  gereed: {
    label: 'Gereed',
    icoon: Check,
    ink: 'text-status-success',
    surface: 'bg-status-success-surface',
    border: 'border-status-success-border',
    dot: 'bg-status-success',
    var: 'var(--status-success)',
  },
  risico: {
    label: 'Risico',
    icoon: TriangleAlert,
    ink: 'text-status-warning',
    surface: 'bg-status-warning-surface',
    border: 'border-status-warning-border',
    dot: 'bg-status-warning',
    var: 'var(--status-warning)',
  },
};

/** Lucide-icoon per gespreksicoon. */
export const GESPREK_ICONEN: Record<GesprekIcoon, LucideIcon> = {
  blad: Leaf,
  sneeuw: Snowflake,
  bloem: Flower2,
  zon: Sun,
  herhaal: Repeat,
  vlag: Flag,
  cirkel: Circle,
  ster: Star,
};

export function gesprekIcoon(icoon: string | undefined): LucideIcon {
  return GESPREK_ICONEN[(icoon as GesprekIcoon) ?? 'cirkel'] ?? Circle;
}

export const NIVEAU_ICONEN: Record<Niveau, LucideIcon> = {
  bestuur: Building2,
  cluster: Layers,
  school: School,
};

export const NIVEAU_LABELS: Record<Niveau, string> = { bestuur: 'Bestuur', cluster: 'Cluster', school: 'School' };

/** Iconen die in seed-data met "lucide:Naam" genoemd worden (menu, tegels, bouwstenen). */
export const ICOON_OP_NAAM: Record<string, LucideIcon> = {
  House,
  Gauge,
  MessagesSquare,
  Library,
  Calendar,
  CircleCheckBig,
  Download,
  Building2,
  CircleHelp,
  Mail,
  Users,
  GitBranch,
  ShieldCheck,
};

/** Icoon bij "lucide:Gauge" of "Gauge"; onbekend → Circle. */
export function icoonOpNaam(naam: string): LucideIcon {
  return ICOON_OP_NAAM[naam.replace(/^lucide:/, '')] ?? Circle;
}
