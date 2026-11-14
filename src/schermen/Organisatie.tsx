/**
 * Scherm: Organisatie. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { Building2 } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Organisatie() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Beheer" title="Organisatie" />
      <EmptyState
        icon={Building2}
        title="Nog in aanbouw"
        body="Bestuur, scholen, clusters, gesprekscyclus, startsjabloon en gegevens."
        watermark
      />
    </div>
  );
}
