/**
 * Scherm: Welkom. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { House } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Start() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Start" title="Welkom" />
      <EmptyState
        icon={House}
        title="Nog in aanbouw"
        body="De startpagina voor het bestuur met de Aan-de-slag-stappen en snelkoppelingen."
        watermark
      />
    </div>
  );
}
