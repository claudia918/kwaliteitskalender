/**
 * Scherm: Veelgestelde vragen. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { CircleHelp } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Faq() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Hulp" title="Veelgestelde vragen" />
      <EmptyState icon={CircleHelp} title="Nog in aanbouw" body="Antwoorden op de meest gestelde vragen." watermark />
    </div>
  );
}
