import type { Config } from 'tailwindcss';

/**
 * Tailwind is alleen een notatie voor de design tokens in src/stijl/tokens.css.
 * Het standaardpalet van Tailwind is bewust UITGESCHAKELD (theme.colors vervangen):
 * alleen tokenkleuren zijn beschikbaar. Opacity-modifiers (bv. bg-niveau/40)
 * werken niet met deze var()-kleuren; gebruik de -surface/-border-tokens.
 */
const v = (naam: string) => `var(--${naam})`;
const trio = (prefix: string) => ({
  DEFAULT: v(`${prefix}-ink`),
  ink: v(`${prefix}-ink`),
  surface: v(`${prefix}-surface`),
  border: v(`${prefix}-border`),
});

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#FFFFFF',
      brand: {
        yellow: v('lv-yellow'),
        'yellow-600': v('lv-yellow-600'),
        'yellow-700': v('lv-yellow-700'),
        'yellow-soft': v('lv-yellow-soft'),
        black: v('lv-black'),
        magenta: v('lv-magenta'),
        'magenta-strong': v('lv-magenta-strong'),
        'magenta-soft': v('lv-magenta-soft'),
        coral: v('lv-coral'),
      },
      gray: Object.fromEntries(
        ['25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((k) => [k, v(`gray-${k}`)]),
      ),
      surface: {
        page: v('surface-page'),
        card: v('surface-card'),
        sunken: v('surface-sunken'),
        hover: v('surface-hover'),
        subtle: v('surface-subtle'),
        inverse: v('surface-inverse'),
      },
      ink: {
        strong: v('text-strong'),
        body: v('text-body'),
        muted: v('text-muted'),
        subtle: v('text-subtle'),
        'on-dark': v('text-on-dark'),
        'on-brand': v('text-on-brand'),
      },
      line: {
        subtle: v('border-subtle'),
        DEFAULT: v('border-default'),
        strong: v('border-strong'),
      },
      niveau: {
        DEFAULT: v('niveau'),
        strong: v('niveau-strong'),
        surface: v('niveau-surface'),
        border: v('niveau-border'),
        bestuur: v('niveau-bestuur'),
        cluster: v('niveau-cluster'),
        school: v('niveau-school'),
      },
      status: {
        danger: v('status-danger'),
        'danger-surface': v('status-danger-surface'),
        'danger-border': v('status-danger-border'),
        warning: v('status-warning'),
        'warning-surface': v('status-warning-surface'),
        'warning-border': v('status-warning-border'),
        success: v('status-success'),
        'success-surface': v('status-success-surface'),
        'success-border': v('status-success-border'),
        info: v('status-info'),
        'info-surface': v('status-info-surface'),
        'info-border': v('status-info-border'),
        neutral: v('status-neutral'),
        'neutral-surface': v('status-neutral-surface'),
      },
      kg: {
        bka: trio('kg-bka'),
        ska: trio('kg-ska'),
        op: trio('kg-op'),
        vs: trio('kg-vs'),
        or: trio('kg-or'),
      },
      seizoen: {
        herfst: trio('seizoen-herfst'),
        winter: trio('seizoen-winter'),
        lente: trio('seizoen-lente'),
        zomer: trio('seizoen-zomer'),
        doorlopend: trio('seizoen-doorlopend'),
      },
    },
    fontFamily: {
      sans: [v('font-sans')],
    },
    fontSize: {
      display: [v('text-display'), { lineHeight: v('leading-tight'), letterSpacing: v('tracking-tight') }],
      h1: [v('text-h1'), { lineHeight: v('leading-tight'), letterSpacing: v('tracking-tight'), fontWeight: '700' }],
      h2: [v('text-h2'), { lineHeight: v('leading-snug'), letterSpacing: v('tracking-tight'), fontWeight: '600' }],
      h3: [v('text-h3'), { lineHeight: v('leading-snug'), fontWeight: '600' }],
      h4: [v('text-h4'), { lineHeight: v('leading-snug'), fontWeight: '600' }],
      base: [v('text-base'), { lineHeight: v('leading-normal') }],
      sm: [v('text-sm'), { lineHeight: v('leading-normal') }],
      xs: [v('text-xs'), { lineHeight: '1.25' }],
      '2xs': [v('text-2xs'), { lineHeight: '1.1' }],
    },
    borderRadius: {
      none: '0',
      xs: v('radius-xs'),
      sm: v('radius-sm'),
      DEFAULT: v('radius-md'),
      md: v('radius-md'),
      lg: v('radius-lg'),
      xl: v('radius-xl'),
      pill: v('radius-pill'),
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      xs: v('shadow-xs'),
      sm: v('shadow-sm'),
      DEFAULT: v('shadow-sm'),
      md: v('shadow-md'),
      lg: v('shadow-lg'),
      pop: v('shadow-pop'),
    },
    extend: {
      letterSpacing: {
        tight: v('tracking-tight'),
        label: v('tracking-label'),
        wide: v('tracking-wide'),
      },
      transitionDuration: {
        fast: v('dur-fast'),
        base: v('dur-base'),
        slow: v('dur-slow'),
      },
      transitionTimingFunction: {
        out: v('ease-out'),
        inout: v('ease-inout'),
      },
      spacing: {
        topbar: v('topbar-h'),
        subheader: v('subheader-h'),
        sidebar: v('sidebar-w'),
      },
      maxWidth: {
        content: v('content-max'),
      },
      ringColor: {
        DEFAULT: v('niveau'),
      },
      keyframes: {
        'kk-fade': { from: { opacity: '0' }, to: { opacity: '1' } },
        'kk-rise': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'kk-slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
      },
      animation: {
        fade: 'kk-fade var(--dur-base) var(--ease-out)',
        rise: 'kk-rise var(--dur-slow) var(--ease-out)',
        'slide-in': 'kk-slide-in var(--dur-slow) var(--ease-out)',
      },
    },
  },
  plugins: [],
} satisfies Config;
