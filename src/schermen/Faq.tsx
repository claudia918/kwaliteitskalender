/**
 * Scherm: Veelgestelde vragen (inventaris §1.17), met de teksten voor de lokale versie
 * (`FAQ` uit domein/inhoud.ts). Met een zoekveld; rechts een korte samenvatting over privacy.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, FolderSync, Mail, SearchX, ShieldCheck } from 'lucide-react';
import { ButtonLink, Card, EmptyState, IconTile, PageHeader, SearchField } from '../componenten';
import { FAQ } from '../domein';

function normaliseer(t: string) {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export default function Faq() {
  const [zoek, setZoek] = useState('');
  const q = normaliseer(zoek.trim());
  const categorieen = useMemo(
    () =>
      FAQ.map((c) => ({
        ...c,
        vragen: q ? c.vragen.filter((v) => normaliseer(`${v.v} ${v.a}`).includes(q)) : c.vragen,
      })).filter((c) => c.vragen.length > 0),
    [q],
  );
  const aantal = categorieen.reduce((n, c) => n + c.vragen.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hulp"
        title="Veelgestelde vragen"
        subtitle={
          <>
            Staat je vraag er niet bij?{' '}
            <Link to="/contact" className="font-semibold text-niveau-strong hover:underline">
              Neem contact met ons op
            </Link>
            .
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <SearchField value={zoek} onChange={setZoek} placeholder="Zoek in de vragen…" label="Zoek in de veelgestelde vragen" />
          {q && (
            <p className="text-sm text-ink-muted" aria-live="polite">
              {aantal === 0 ? 'Geen vragen gevonden.' : `${aantal} ${aantal === 1 ? 'vraag' : 'vragen'} gevonden.`}
            </p>
          )}
          {categorieen.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Geen antwoord gevonden"
              body="Probeer een ander woord, of stel je vraag per mail of telefoon."
              action={
                <ButtonLink to="/contact" size="sm" variant="secondary" icon={Mail}>
                  Naar contact
                </ButtonLink>
              }
            />
          ) : (
            categorieen.map((c) => (
              <Card key={c.titel} padding="lg">
                <h2 className="text-h3 text-ink-strong">{c.titel}</h2>
                <div className="mt-2 divide-y divide-line-subtle">
                  {c.vragen.map((v) => (
                    <details key={v.v} className="group py-1" open={!!q}>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-2 text-sm font-medium text-ink-strong hover:text-niveau-strong [&::-webkit-details-marker]:hidden">
                        {v.v}
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-ink-subtle transition-transform duration-fast group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <p className="pb-2 pr-7 text-sm leading-relaxed text-ink-body">{v.a}</p>
                    </details>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Card padding="lg" className="border-brand-yellow">
            <div className="flex items-center gap-3">
              <IconTile icon={ShieldCheck} tone="brand" size="sm" />
              <h2 className="text-h4 text-ink-strong">Privacy in het kort</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-ink-body">
              <li>Je gegevens staan alleen in deze browser en, als je dat koppelt, in een kalenderbestand op je eigen schijf.</li>
              <li>De Kwaliteitskalender gebruikt geen internet en stuurt niets naar ons of anderen.</li>
              <li>Vermeld geen leerling- of andere persoonsgegevens.</li>
            </ul>
          </Card>
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <IconTile icon={FolderSync} tone="niveau" size="sm" />
              <h2 className="text-h4 text-ink-strong">Samenwerken</h2>
            </div>
            <p className="mt-3 text-sm text-ink-body">
              Collega’s werken samen in één kalenderbestand in een gedeelde map. Koppelen doe je bij Gegevens &amp; delen.
            </p>
            <ButtonLink to="/gegevens" size="sm" variant="secondary" className="mt-4">
              Naar Gegevens &amp; delen
            </ButtonLink>
          </Card>
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <IconTile icon={Mail} tone="neutral" size="sm" />
              <div>
                <h2 className="text-h4 text-ink-strong">Andere vraag of suggestie?</h2>
                <p className="text-xs text-ink-muted">We horen graag wat er beter kan.</p>
              </div>
            </div>
            <ButtonLink to="/contact" size="sm" variant="ghost" className="mt-3">
              Naar contact
            </ButtonLink>
          </Card>
        </aside>
      </div>
    </div>
  );
}
