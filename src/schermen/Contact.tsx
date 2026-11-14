/**
 * Scherm: Contact. PLACEHOLDER van het fundament.
 * Specificatie: analyse/inventaris.md (zie docs/ARCHITECTUUR.md, "Schermen").
 * Vervang de inhoud; houd de default export en de bestandsnaam aan.
 */
import { Mail } from 'lucide-react';
import { EmptyState, PageHeader } from '../componenten';

export default function Contact() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Hulp" title="Contact" />
      <EmptyState icon={Mail} title="Nog in aanbouw" body="De contactgegevens van Project Leren Verbeteren." watermark />
    </div>
  );
}
