/**
 * Scherm: Dekking standaarden. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { CircleCheckBig } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Compliance() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Compliance" title="Dekking standaarden" />
      <EmptyState
        icon={CircleCheckBig}
        title="Nog in aanbouw"
        body="Welke standaarden zijn afgedekt, de vijf vaste standaarden en de afwijkingen."
        watermark
      />
    </div>
  );
}
