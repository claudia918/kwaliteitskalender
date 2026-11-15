/**
 * Formulieren: Veld (label + hint + fout), Input, Textarea, Select, SearchField, Checkbox,
 * FilterChip en SegmentedControl.
 */
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Search, X, type LucideIcon } from 'lucide-react';
import { cx } from './cx';

/* ------------------------------------------------------------------ */

export interface VeldProps {
  label: ReactNode;
  /** Rood sterretje achter het label */
  verplicht?: boolean;
  /** Uitleg onder het veld (klein, subtiel) */
  hint?: ReactNode;
  fout?: ReactNode;
  className?: string;
  /** Render-prop krijgt het id dat het invoerveld moet krijgen. */
  children: (id: string) => ReactNode;
}

/**
 * Label + invoer + hint. Voorbeeld:
 *   <Veld label="Naam" verplicht hint={PRIVACY_REGEL}>{(id) => <Input id={id} ... />}</Veld>
 */
export function Veld({ label, verplicht, hint, fout, className, children }: VeldProps) {
  const id = useId();
  return (
    <div className={cx('flex min-w-0 flex-col', className)}>
      <label htmlFor={id} className="mb-1 text-xs font-semibold text-ink-muted">
        {label}
        {verplicht && <span className="ml-0.5 text-status-danger"> *</span>}
      </label>
      {children(id)}
      {fout ? (
        <p className="mt-1 text-xs text-status-danger">{fout}</p>
      ) : hint ? (
        <p className="mt-1 text-2xs leading-snug text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

type Maat = { veldMaat?: 'sm' | 'md' };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Maat>(function Input(
  { className, veldMaat = 'md', ...rest },
  ref,
) {
  return <input ref={ref} className={cx('kk-veld', veldMaat === 'sm' && 'kk-veld-sm', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cx('kk-veld', className)} {...rest} />;
});

export interface SelectOptie {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'>, Maat {
  options: (SelectOptie | string)[];
  /** Lege eerste optie met deze tekst */
  placeholder?: string;
}

/** Native select in huisstijl (chevron, gele focus). onChange is de gewone React-change. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, veldMaat = 'md', ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cx('kk-veld', veldMaat === 'sm' && 'kk-veld-sm', className)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
});

/* ------------------------------------------------------------------ */

export interface SearchFieldProps {
  value: string;
  onChange: (waarde: string) => void;
  placeholder?: string;
  /** Toegankelijke naam (standaard de placeholder) */
  label?: string;
  className?: string;
  autoFocus?: boolean;
}

/** Zoekveld met vergrootglas en wisknop. */
export function SearchField({ value, onChange, placeholder = 'Zoeken…', label, className, autoFocus }: SearchFieldProps) {
  return (
    <div
      className={cx(
        'flex h-10 min-w-0 items-center gap-2 rounded-md border border-line bg-surface-card px-3 transition-[border-color,box-shadow] duration-fast',
        'focus-within:border-brand-yellow focus-within:shadow-[var(--focus-ring)] hover:border-line-strong',
        className,
      )}
    >
      <Search className="h-4 w-4 text-ink-subtle" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-ink-strong outline-none placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden"
        style={{ boxShadow: 'none' }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Zoekopdracht wissen"
          className="rounded-sm p-0.5 text-ink-subtle hover:text-ink-strong"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export interface CheckboxProps {
  checked: boolean;
  onChange: (waarde: boolean) => void;
  label: ReactNode;
  beschrijving?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Checkbox met label en optionele beschrijving eronder. */
export function Checkbox({ checked, onChange, label, beschrijving, disabled, className }: CheckboxProps) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5', disabled && 'cursor-not-allowed opacity-50', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-strong">{label}</span>
        {beschrijving && <span className="block text-xs text-ink-muted">{beschrijving}</span>}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */

export interface FilterChipProps {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  /** Kleur van een stip voor de tekst, bv. gebiedKlassen('OP').dot */
  dotClassName?: string;
  icon?: LucideIcon;
  count?: number;
  className?: string;
}

/** Filterknop, rechthoekig. Aan: zwart met witte tekst; uit: wit met haarlijn. Telling als gewone tekst. */
export function FilterChip({ children, active, onClick, dotClassName, icon: Icon, count, className }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 text-xs font-semibold transition-colors duration-fast',
        active
          ? 'border-brand-magenta bg-brand-magenta text-white'
          : 'border-line bg-surface-card text-ink-body hover:border-gray-900',
        className,
      )}
    >
      {dotClassName && <span aria-hidden className={cx('h-2 w-2 rounded-full', dotClassName, active && 'ring-2 ring-white')} />}
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
      {count !== undefined && (
        <span
          className={cx(
            'tnum text-xs font-medium',
            active ? 'text-white' : 'text-ink-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */

export interface SegmentOptie<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  /** Tekst verbergen op smalle schermen (alleen icoon) */
  compact?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (waarde: T) => void;
  options: SegmentOptie<T>[];
  /** Vervallen onderscheid: beide tonen de actieve keuze als vette tekst met een zwarte streep eronder. */
  accent?: 'niveau' | 'neutraal';
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

/** Keuze tussen een paar weergaven: tekst met een onderstreping onder de actieve keuze, geen bak. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'sm',
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx('inline-flex items-center gap-1', className)}
    >
      {options.map((o) => {
        const actief = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={actief}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs border-b-2 font-semibold transition-colors duration-fast',
              size === 'sm' ? 'h-8 px-2 text-xs' : 'h-9 px-2.5 text-sm',
              actief
                ? 'border-brand-magenta text-ink-strong'
                : 'border-transparent font-medium text-ink-muted hover:border-line hover:text-ink-strong',
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden />}
            <span className={cx(o.compact && 'hidden sm:inline')}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
