/**
 * Scherm: Activiteiten. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { Library } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Bibliotheek() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Bibliotheek" title="Activiteiten" />
      <EmptyState
        icon={Library}
        title="Nog in aanbouw"
        body="Alle activiteiten, filteren op gesprek en kwaliteitsgebied, en eigen activiteiten toevoegen."
        watermark
      />
    </div>
  );
}
