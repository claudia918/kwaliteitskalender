import { Link } from 'react-router-dom';
import { Globe, Mail, Phone } from 'lucide-react';
import { LvLogo } from '../componenten';
import { CONTACT, FOOTER_TEKST } from '../domein/inhoud';

/** Voettekst met logo, contactgegevens en hulplinks. De website staat er als tekst (geen netwerk). */
export function Footer() {
  return (
    <footer className="no-print mt-12">
      {/* De swoosh is de bovenrand van het witte vlak: het wit vult de ruimte onder de lijn. */}
      <svg aria-hidden viewBox="0 0 600 40" preserveAspectRatio="none" className="block h-8 w-full">
        <path d="M0 38 H360 C400 38 420 30 440 18 C460 6 480 2 520 2 H600 V40 H0 Z" fill="var(--surface-card)" />
        <path
          d="M0 38 H360 C400 38 420 30 440 18 C460 6 480 2 520 2 H600"
          fill="none"
          stroke="var(--lv-yellow)"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="bg-surface-card">
        <div className="mx-auto grid max-w-content gap-6 px-4 py-6 text-sm md:grid-cols-[1fr_auto_auto] md:items-center md:gap-10 md:px-6">
          <div className="flex items-center gap-4">
            <LvLogo className="h-11 w-auto shrink-0" />
            <p className="max-w-xs text-ink-muted">{FOOTER_TEKST}</p>
          </div>
          <address className="space-y-1 not-italic text-ink-muted">
            <a className="flex items-center gap-2 hover:text-ink-strong" href={CONTACT.mailto}>
              <Mail className="h-4 w-4 text-ink-subtle" aria-hidden />
              {CONTACT.email}
            </a>
            <a className="flex items-center gap-2 hover:text-ink-strong" href={CONTACT.tel}>
              <Phone className="h-4 w-4 text-ink-subtle" aria-hidden />
              {CONTACT.telefoon}
            </a>
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-ink-subtle" aria-hidden />
              {CONTACT.website}
            </span>
          </address>
          <nav aria-label="Hulp" className="flex flex-col gap-1 md:items-end">
            <Link to="/faq" className="text-ink-body hover:text-ink-strong">
              Veelgestelde vragen
            </Link>
            <Link to="/contact" className="text-ink-body hover:text-ink-strong">
              Contact
            </Link>
            <Link to="/gegevens" className="text-ink-body hover:text-ink-strong">
              Gegevens &amp; delen
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
