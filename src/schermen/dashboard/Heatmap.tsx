/** Heatmap scholen x gesprekken (bestuur en cluster), inventaris §1.10. */
import { TriangleAlert } from 'lucide-react';
import { Begrip, Card, GesprekIcoonView, cx } from '../../componenten';
import { heatmapCel, itemsVanSchool, type HeatmapToon, type SchoolOverzicht } from '../../domein/berekeningen';
import { gesorteerdeCyclus } from '../../domein/hulp';
import type { State } from '../../domein/types';

const TOON: Record<HeatmapToon, string> = {
  leeg: 'bg-surface-sunken text-ink-subtle border-line-subtle',
  laag: 'bg-surface-card text-ink-body border-line',
  half: 'bg-status-info-surface text-status-info border-status-info-border',
  gereed: 'bg-status-success-surface text-status-success border-status-success-border',
  risico: 'bg-status-warning-surface text-status-warning border-status-warning-border',
};

const LEGENDA: { toon: HeatmapToon; label: string }[] = [
  { toon: 'gereed', label: 'Alles gereed' },
  { toon: 'half', label: '50% of meer' },
  { toon: 'laag', label: 'Minder dan 50%' },
  { toon: 'risico', label: 'Met risico' },
  { toon: 'leeg', label: 'Niets gekoppeld' },
];

export function Heatmap({
  state,
  overzicht,
  onKiesSchool,
}: {
  state: State;
  overzicht: SchoolOverzicht[];
  onKiesSchool: (schoolId: string) => void;
}) {
  const cyclus = gesorteerdeCyclus(state.organisatie.gesprekscyclus);
  return (
    <Card
      title="Per school en gesprek"
      subtitle={
        <>
          Percentage gereed in een <Begrip term="heatmap" />. Klik op een school om haar te openen.
        </>
      }
      padding="none"
    >
      {cyclus.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">Er is nog geen gesprekscyclus ingesteld.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-subtle">
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-ink-muted">
                  School
                </th>
                {cyclus.map((g) => (
                  <th key={g.id} scope="col" className="px-2 py-3 text-center text-xs font-semibold text-ink-strong">
                    <span className="inline-flex items-center gap-1.5">
                      <GesprekIcoonView icoon={g.icoon} kleur={g.kleur} className="h-3.5 w-3.5" />
                      {g.naam}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overzicht.map((o) => {
                const items = itemsVanSchool(state, o.schoolId);
                return (
                  <tr key={o.schoolId} className="border-b border-line-subtle last:border-0">
                    <th scope="row" className="px-5 py-2 text-left font-normal">
                      <button
                        type="button"
                        onClick={() => onKiesSchool(o.schoolId)}
                        className="text-left text-ink-strong hover:underline"
                        title="Open deze school"
                      >
                        {o.school?.naam ?? 'Onbekende school'}
                      </button>
                    </th>
                    {cyclus.map((g) => {
                      const cel = heatmapCel(items, g.id);
                      return (
                        <td key={g.id} className="px-2 py-2 text-center">
                          <span
                            title={cel.titel}
                            className={cx(
                              'tnum inline-flex h-7 min-w-[64px] items-center justify-center gap-1 rounded-sm border px-2 text-xs font-semibold',
                              TOON[cel.toon],
                            )}
                          >
                            {cel.tekst}
                            {cel.toon === 'risico' && <TriangleAlert className="h-3 w-3" aria-label="risico" />}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line-subtle px-5 py-3 text-xs text-ink-muted" aria-label="Legenda">
        {LEGENDA.map((l) => (
          <li key={l.toon} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cx('h-3 w-3 rounded-xs border', TOON[l.toon])} />
            {l.label}
          </li>
        ))}
      </ul>
    </Card>
  );
}
