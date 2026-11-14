/**
 * Begrippen: de vaktermen uit de kalender in gewone taal (bron: domein/begrippen.ts).
 * `?begrip=<sleutel>` (vanuit het zoekvenster) springt naar dat begrip en licht het even op.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, PageHeader, SearchField, cx } from '../componenten';
import { BEGRIPPEN_LIJST } from '../domein/begrippen';
import { normaliseer } from '../domein/zoeken';
import { ALLE_MENU_ITEMS } from '../schil/navigatie';

export default function Begrippen() {
  const [params] = useSearchParams();
  const gekozen = params.get('begrip');
  const [zoek, setZoek] = useState('');
  const lijst = useMemo(() => {
    const v = normaliseer(zoek);
    return v
      ? BEGRIPPEN_LIJST.filter((b) => normaliseer(`${b.term} ${b.uitleg} ${(b.ookGenoemd ?? []).join(' ')}`).includes(v))
      : BEGRIPPEN_LIJST;
  }, [zoek]);

  useEffect(() => {
    if (!gekozen) return;
    const el = document.getElementById(`begrip-${gekozen}`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus({ preventScroll: true });
  }, [gekozen]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Hulp" title="Begrippen" subtitle="De vaktermen uit de kalender, in gewone taal." />
      <div className="max-w-3xl space-y-4">
        <SearchField value={zoek} onChange={setZoek} placeholder="Zoek een begrip…" label="Zoek een begrip" />
        <Card padding="none">
          {lijst.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">Geen begrip gevonden. Probeer een ander woord.</p>
          ) : (
            <dl className="divide-y divide-line-subtle">
              {lijst.map((b) => {
                const scherm = b.pad ? ALLE_MENU_ITEMS.find((m) => m.to === b.pad) : undefined;
                return (
                  <div
                    key={b.sleutel}
                    id={`begrip-${b.sleutel}`}
                    tabIndex={-1}
                    className={cx(
                      'grid gap-1 px-5 py-4 outline-none sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6',
                      gekozen === b.sleutel && 'bg-niveau-surface',
                    )}
                  >
                    <dt className="text-sm font-semibold text-ink-strong first-letter:uppercase">{b.term}</dt>
                    <dd className="text-sm leading-relaxed text-ink-body">
                      {b.uitleg}
                      {scherm && (
                        <Link
                          to={scherm.to}
                          className="ml-2 inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-niveau-strong hover:underline"
                        >
                          {scherm.label} <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </Card>
        <p className="text-sm text-ink-muted">
          In de app herken je een begrip aan de <span className="underline decoration-ink-subtle decoration-dotted underline-offset-[3px]">stippellijn</span>
          . Wijs het aan of tik erop voor de uitleg.
        </p>
      </div>
    </div>
  );
}
