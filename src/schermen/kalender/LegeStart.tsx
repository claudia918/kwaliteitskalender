/**
 * Start van een lege kalender: geen leeg raster, maar twee duidelijke keuzes.
 */
import { ListChecks, MousePointerClick, Plus } from 'lucide-react';
import { Button, IconTile } from '../../componenten';

export interface LegeStartProps {
  kalenderNaam: string;
  aantalVerplicht: number;
  aantalBibliotheek: number;
  onVerplicht: () => void;
  onKiezen: () => void;
  onEigen: () => void;
}

export function LegeStart({ kalenderNaam, aantalVerplicht, aantalBibliotheek, onVerplicht, onKiezen, onEigen }: LegeStartProps) {
  return (
    <section
      aria-labelledby="lege-start-kop"
      data-rondleiding="lege-start"
      className="rounded-xl border border-line-subtle bg-surface-card px-5 py-8 shadow-xs sm:px-10 sm:py-10"
    >
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Nieuwe kalender</p>
        <h2 id="lege-start-kop" className="mt-1 text-h2 text-ink-strong">
          De kalender van {kalenderNaam} is nog leeg
        </h2>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Kies hoe je wilt beginnen. Alles wat je toevoegt kun je daarna verschuiven, aanpassen of weer weghalen.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {aantalVerplicht > 0 && (
            <div className="flex flex-col rounded-lg border border-line bg-surface-card p-5">
              <IconTile icon={ListChecks} tone="brand" />
              <h3 className="mt-3 text-h4 text-ink-strong">Begin met de verplichte activiteiten</h3>
              <p className="mt-1 flex-1 text-sm text-ink-muted">
                {aantalVerplicht === 1 ? 'De verplichte activiteit' : `De ${aantalVerplicht} verplichte activiteiten`} uit de
                bibliotheek, elk in de aanbevolen maand. Een stevige basis die je daarna aanvult.
              </p>
              <Button variant="primary" className="mt-4 self-start" icon={Plus} onClick={onVerplicht} data-rondleiding="verplichte-toevoegen">
                Zet ze op de kalender
              </Button>
            </div>
          )}
          <div className="flex flex-col rounded-lg border border-line bg-surface-card p-5">
            <IconTile icon={MousePointerClick} tone="niveau" />
            <h3 className="mt-3 text-h4 text-ink-strong">Kies zelf wat je plant</h3>
            <p className="mt-1 flex-1 text-sm text-ink-muted">
              Zoek in de {aantalBibliotheek} activiteiten uit de bibliotheek en kies per activiteit de maand. Of maak een eigen
              activiteit.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="secondary" icon={Plus} onClick={onKiezen}>
                Activiteiten kiezen
              </Button>
              <Button variant="ghost" onClick={onEigen}>
                Eigen activiteit
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
