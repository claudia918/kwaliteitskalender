/**
 * Gedeelde opmaak van de printweergaven (matrix A3 en gespreksdossier A4).
 * Alleen kleuren uit de tokens (var(--...)); maten in pt omdat het om papier gaat.
 * Staat in een <style> die alleen gerenderd wordt als de printweergave er is.
 */
export const PRINT_CSS = `
@media print { .bg-surface-page { background: var(--surface-card) !important; } }
.kk-print { color: var(--text-strong); font-family: var(--font-sans); font-size: 9pt; line-height: 1.35;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.kk-print h1 { font-size: 17pt; font-weight: 700; margin: 2pt 0 0; letter-spacing: -0.01em; }
.kk-print h2 { font-size: 11pt; font-weight: 700; margin: 12pt 0 5pt; break-after: avoid; }
.kk-print h3 { font-size: 9pt; font-weight: 700; margin: 0 0 3pt; }
.kk-print .kk-kop { border-bottom: 3pt solid var(--lv-yellow); padding-bottom: 6pt; margin-bottom: 10pt; }
.kk-print .kk-eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 7pt; font-weight: 600; color: var(--text-muted); margin: 0; }
.kk-print .kk-sub { color: var(--text-muted); margin: 3pt 0 0; }
.kk-print .kk-klein { font-size: 7pt; color: var(--text-subtle); }
.kk-print table { width: 100%; border-collapse: collapse; }
.kk-print th, .kk-print td { border: 0.75pt solid var(--border-default); padding: 2pt 4pt; vertical-align: top; text-align: left; }
.kk-print th { background: var(--surface-sunken); font-weight: 700; }
.kk-print ul { margin: 0; padding-left: 12pt; list-style: disc; }
.kk-print li { margin-bottom: 1.5pt; }
.kk-print .kk-voet { margin-top: 12pt; border-top: 0.75pt solid var(--border-subtle); padding-top: 4pt; font-size: 7pt; color: var(--text-subtle); }
.kk-print .kk-dot { display: inline-block; width: 5pt; height: 5pt; border-radius: 50%; margin-right: 2.5pt; vertical-align: 0.5pt; }
.kk-print .kk-signaal { background: var(--status-warning-surface); border: 0.75pt solid var(--status-warning-border); border-radius: 4pt; padding: 6pt 8pt; margin-top: 12pt; break-inside: avoid; }
.kk-print .kk-signaal h2 { margin-top: 0; }
.kk-print .kk-tellers td { text-align: center; border-color: var(--border-subtle); padding: 4pt; width: 16.66%; }
.kk-print .kk-tellers .kk-label { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-subtle); font-weight: 600; }
.kk-print .kk-tellers .kk-waarde { font-size: 13pt; font-weight: 700; font-variant-numeric: tabular-nums; }
.kk-print .kk-matrix { table-layout: fixed; }
.kk-print .kk-matrix td { font-size: 7pt; line-height: 1.25; overflow-wrap: break-word; hyphens: auto; }
.kk-print .kk-matrix th.kk-maand { text-align: center; }
.kk-print .kk-matrix th.kk-std { width: 11%; }
.kk-print .kk-matrix td.kk-std { font-size: 8pt; overflow-wrap: normal; }
.kk-print .kk-matrix tr.kk-gebied td { background: var(--surface-subtle); font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.kk-print .kk-matrix .kk-act { display: flex; align-items: baseline; margin-bottom: 2pt; }
.kk-print .kk-matrix .kk-act .kk-dot { flex-shrink: 0; vertical-align: 0; transform: translateY(-0.5pt); }
.kk-print .kk-matrix .kk-act > span:last-child { min-width: 0; overflow-wrap: anywhere; }
.kk-print .kk-legenda { display: flex; flex-wrap: wrap; gap: 10pt; margin: 4pt 0 0; font-size: 7pt; color: var(--text-muted); }
`;

export const STATUS_PRINT_KLEUR: Record<string, string> = {
  gereed: 'var(--status-success)',
  bezig: 'var(--status-info)',
  risico: 'var(--status-warning)',
  gepland: 'var(--status-neutral)',
};
