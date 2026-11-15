/**
 * Scherm: Contact (inventaris §1.18, zonder formulier). Alleen de contactgegevens met mailto- en
 * tel-links; de app verstuurt zelf niets. De website staat als tekst (geen externe links).
 */
import type { ReactNode } from 'react';
import { CircleHelp, Globe, Mail, Phone, ShieldCheck, type LucideIcon } from 'lucide-react';
import { ButtonLink, Card, IconTile, InfoBalk, LvLogo, PageHeader } from '../componenten';
import { CONTACT, PRIVACY_REGEL } from '../domein';

function Gegeven({ icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <IconTile icon={icon} tone="niveau" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
        <div className="mt-0.5 break-words text-base font-semibold text-ink-strong">{children}</div>
      </div>
    </div>
  );
}

export default function Contact() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact"
        subtitle="Vragen, ideeën of ergens tegenaan gelopen? We horen het graag."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <p className="eyebrow">Kwaliteitskalender VO</p>
              <h2 className="mt-1 text-h3 text-ink-strong">{CONTACT.organisatie}</h2>
            </div>
            <LvLogo className="h-10 w-auto" />
          </div>
          <div className="divide-y divide-line-subtle">
            <Gegeven icon={Mail} label="E-mail">
              <a href={CONTACT.mailto} className="kk-link">
                {CONTACT.email}
              </a>
            </Gegeven>
            <Gegeven icon={Phone} label="Telefoon">
              <a href={CONTACT.tel} className="tnum kk-link">
                {CONTACT.telefoon}
              </a>
            </Gegeven>
            <Gegeven icon={Globe} label="Website">
              <span className="select-all">{CONTACT.website}</span>
              <span className="block text-xs font-normal text-ink-muted">Typ het adres zelf in je browser.</span>
            </Gegeven>
          </div>
        </Card>

        <div className="space-y-4">
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <IconTile icon={ShieldCheck} tone="brand" size="sm" />
              <h2 className="text-h4 text-ink-strong">De app verstuurt zelf niets</h2>
            </div>
            <p className="mt-3 text-sm text-ink-body">
              De Kwaliteitskalender heeft geen formulier en geen internetverbinding. Klik je op het e-mailadres, dan opent je
              eigen mailprogramma; je bericht gaat dus via je eigen mail of telefoon, niet via de kalender.
            </p>
            <InfoBalk tone="warning" className="mt-4">
              Stuur geen kalenderbestand of back-up mee. {PRIVACY_REGEL}
            </InfoBalk>
          </Card>
          <Card padding="lg">
            <h2 className="text-h4 text-ink-strong">Zo helpen we je het snelst</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-body">
              <li>Op welk scherm zat je en wat wilde je doen?</li>
              <li>Wat gebeurde er, en wat had je verwacht?</li>
              <li>Welke browser gebruik je (bijvoorbeeld Edge of Chrome)?</li>
            </ul>
            <ButtonLink to="/faq" size="sm" variant="secondary" icon={CircleHelp} className="mt-4">
              Eerst de veelgestelde vragen bekijken
            </ButtonLink>
          </Card>
        </div>
      </div>
    </div>
  );
}
