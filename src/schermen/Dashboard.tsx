/**
 * Scherm: Dashboard. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { Gauge } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dashboard" title="Dashboard" />
      <EmptyState
        icon={Gauge}
        title="Nog in aanbouw"
        body="Komend gesprek, voortgang, aandachtspunten en (voor bestuur en cluster) de heatmap."
        watermark
      />
    </div>
  );
}
