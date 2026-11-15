/**
 * Bij "alleen in het kalenderbestand" is het bestand de enige opslag. Is er geen bestand gekoppeld
 * (of geen toestemming meer), dan staat de kalender alleen in het werkgeheugen van dit tabblad.
 * Deze balk zegt dat zonder omweg en biedt meteen de uitweg.
 */
import { TriangleAlert } from 'lucide-react';
import { Button } from '../componenten';
import { useStore } from '../store';
import { useSync } from '../sync/SyncProvider';
import { useBestandKeuze } from './BestandKeuze';

export function BestandWaarschuwing() {
  const sync = useSync();
  const { state } = useStore();
  const [vraag, keuzeDialoog] = useBestandKeuze();
  if (!sync.alleenInBestand || !state.setupVoltooid || state.modus !== 'eigen' || sync.status === 'gekoppeld' || sync.status === 'verbinden')
    return null;
  const opnieuw = sync.status === 'toestemming-nodig';
  return (
    <div role="alert" className="no-print border-b border-status-warning-border bg-status-warning-surface">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm text-ink-strong md:px-6">
        <TriangleAlert className="h-4 w-4 shrink-0 text-status-warning" aria-hidden />
        <p className="min-w-0 flex-1">
          <strong>Je wijzigingen worden nu niet bewaard.</strong>{' '}
          {opnieuw
            ? `De browser heeft geen toegang meer tot ${sync.bestandsnaam ?? 'het kalenderbestand'}.`
            : 'Er is geen kalenderbestand gekoppeld, en de kalender wordt niet in deze browser bewaard.'}{' '}
          Sluit dit tabblad niet voordat dit is opgelost.
        </p>
        <div className="flex flex-wrap gap-2">
          {opnieuw ? (
            <Button size="sm" variant="primary" onClick={() => void sync.herstelToestemming()}>
              Opnieuw verbinden
            </Button>
          ) : (
            <>
              <Button size="sm" variant="primary" onClick={() => void sync.maakGedeeldBestand()}>
                Kalenderbestand maken
              </Button>
              <Button size="sm" onClick={() => void sync.koppelBestaand(vraag)}>
                Bestaand bestand koppelen
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => void sync.zetAlleenInBestand(false)}>
            In deze browser bewaren
          </Button>
        </div>
      </div>
      {keuzeDialoog}
    </div>
  );
}
