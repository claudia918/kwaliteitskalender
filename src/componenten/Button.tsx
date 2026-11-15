import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-zacht' | 'niveau';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  // geel merkaccent met zwarte tekst; één keer per scherm
  primary: 'bg-brand-yellow text-ink-on-brand border-transparent hover:bg-brand-yellow-600',
  // zwart omlijnd op wit
  secondary: 'bg-surface-card text-ink-strong border-gray-900 hover:bg-surface-hover',
  ghost: 'bg-transparent text-ink-strong border-transparent hover:bg-surface-sunken',
  danger: 'bg-status-danger text-white border-transparent hover:brightness-95',
  'danger-zacht':
    'bg-surface-card text-status-danger border-status-danger hover:bg-status-danger hover:text-white hover:border-transparent',
  // Historische naam: was de niveaukleur, is nu zwart (de niveaukleur zit alleen in de schil).
  niveau: 'bg-gray-900 text-white border-transparent hover:bg-gray-700',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-sm',  // radius: 3px
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-base gap-2 rounded-md',
};

const ICOON: Record<ButtonSize, string> = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-[18px] w-[18px]' };

/** Klassen van een knop, bv. voor een <a> of <label>. */
export function knopKlassen(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string): string {
  return cx(
    'inline-flex select-none items-center justify-center whitespace-nowrap border font-semibold leading-none',
    'transition-[background-color,border-color,color,transform] duration-fast ease-out active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45',
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

interface Gedeeld {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Lucide-icoon links van de tekst */
  icon?: LucideIcon;
  /** Lucide-icoon rechts van de tekst */
  iconRight?: LucideIcon;
  children?: ReactNode;
}

export type ButtonProps = Gedeeld & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Knop. Varianten: primary (geel met zwarte tekst), secondary (wit, zwart omlijnd), ghost (alleen tekst),
 * danger (rood), danger-zacht (rood omlijnd, vol rood bij hover), niveau (zwart; de naam is historisch).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRechts, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={knopKlassen(variant, size, className)} {...rest}>
      {Icon && <Icon className={ICOON[size]} aria-hidden />}
      {children}
      {IconRechts && <IconRechts className={ICOON[size]} aria-hidden />}
    </button>
  );
});

/** Link (react-router) in knopvorm. */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRechts,
  className,
  children,
  ...rest
}: Gedeeld & LinkProps) {
  return (
    <Link className={knopKlassen(variant, size, className)} {...rest}>
      {Icon && <Icon className={ICOON[size]} aria-hidden />}
      {children}
      {IconRechts && <IconRechts className={ICOON[size]} aria-hidden />}
    </Link>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Verplicht: toegankelijke naam (ook tooltip). */
  label: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'secondary';
}

/** Vierkante knop met alleen een icoon (sluiten, verwijderen, help). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'md', variant = 'ghost', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-md border text-ink-muted transition-colors duration-fast',
        'hover:bg-surface-sunken hover:text-ink-strong disabled:pointer-events-none disabled:opacity-45',
        variant === 'ghost' ? 'border-transparent' : 'border-line bg-surface-card',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} aria-hidden />
    </button>
  );
});
