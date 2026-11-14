import { Link } from 'react-router-dom';
import { Globe, Mail, Phone } from 'lucide-react';
import { LvLogo, Swoosh } from '../componenten';
import { CONTACT, FOOTER_TEKST } from '../domein/inhoud';

/** Voettekst met logo, contactgegevens en hulplinks. De website staat er als tekst (geen netwerk). */
export function Footer() {
  return (
    <footer className="no-print mt-12">
      <Swoosh className="h-6 opacity-80" />
      <div className="border-t border-line-subtle bg-surface-card">
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
