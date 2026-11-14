/**
 * Scherm: Exporteren. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { Download } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Export() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Export" title="Exporteren" />
      <EmptyState icon={Download} title="Nog in aanbouw" body="Gespreksdossier, Excel, PDF en de JSON-back-up." watermark />
    </div>
  );
}
