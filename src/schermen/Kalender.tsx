/**
 * Scherm: Kalender-editor. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { Calendar } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Kalender() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Kalender" title="Kalender-editor" />
      <EmptyState
        icon={Calendar}
        title="Nog in aanbouw"
        body="De matrix van standaarden en maanden, de lijstweergave en het detailvenster."
        watermark
      />
    </div>
  );
}
