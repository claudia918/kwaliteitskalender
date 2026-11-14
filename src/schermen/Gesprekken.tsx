/**
 * Scherm: Gesprekscyclus. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { MessagesSquare } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Gesprekken() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Gesprekken" title="Gesprekscyclus" />
      <EmptyState
        icon={MessagesSquare}
        title="Nog in aanbouw"
        body="De voorbereiding per gesprek, met status per school op bestuurs- en clusterniveau."
        watermark
      />
    </div>
  );
}
