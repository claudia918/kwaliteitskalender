/**
 * Startpagina voor het bestuur (inventaris §1.9): komend gesprek, de Aan-de-slag-kaart (alleen eigen
 * kalender) en zeven navigatietegels.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Circle, Sparkles, X } from 'lucide-react';
import { IconButton, IconTile, InfoBalk, PageHeader, SeizoenBadge, cx, icoonOpNaam, useToast } from '../componenten';
import { heeftActiviteiten } from '../domein/berekeningen';
import { formatDatumLang } from '../domein/hulp';
import { BESTUUR_START_TEGELS } from '../domein/inhoud';
import { useKomendGesprek, useStore } from '../store';
import { VERSTREKEN_UITLEG, dagenTekst } from './dashboard/komend';

export default function Start() {
  const { state } = useStore();
  const komend = useKomendGesprek();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Start"
        title={state.organisatie.bestuurNaam || 'Welkom'}
        subtitle={
          komend ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span>Komend gesprek:</span>
              <SeizoenBadge gesprek={komend.gesprek} />
              <span>
                deadline {formatDatumLang(komend.datum)} ({dagenTekst(komend)})
              </span>
            </span>
          ) : (
            'Er is nog geen gesprekscyclus ingesteld.'
          )
        }
      />
      {komend?.verstreken && <InfoBalk tone="warning">{VERSTREKEN_UITLEG}</InfoBalk>}

      <AanDeSlag />

      <nav aria-label="Snelkoppelingen" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BESTUUR_START_TEGELS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group flex min-w-0 items-start gap-3 rounded-lg border border-line-subtle bg-surface-card p-5 shadow-xs transition-[box-shadow,border-color] duration-fast hover:border-line hover:shadow-md"
          >
            <IconTile icon={icoonOpNaam(t.icon)} tone="niveau" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-base font-semibold text-ink-strong">
                {t.label}
                <ArrowRight
                  aria-hidden
                  className="h-4 w-4 text-ink-subtle opacity-0 transition-opacity duration-fast group-hover:opacity-100"
                />
              </span>
              <span className="mt-1 block text-sm text-ink-muted">{t.tekst}</span>
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Onboarding-checklist (`_S` in het origineel). */
function AanDeSlag() {
  const { state, niveau, pasSjabloonToe, verbergOnboarding } = useStore();
  const toast = useToast();
  if (state.modus !== 'eigen' || state.onboardingVerborgen || niveau !== 'bestuur') return null;
  const org = state.organisatie;

  const stappen = [
    { klaar: org.bestuurNaam.trim().length > 0, label: 'Bestuur ingesteld', to: '/organisatie' },
    { klaar: org.scholen.length > 0, label: `Scholen toegevoegd (${org.scholen.length})`, to: '/organisatie' },
    {
      klaar: heeftActiviteiten(state),
      label: 'Eerste activiteiten gepland',
      to: '/bibliotheek',
      actie: () => {
        pasSjabloonToe();
        toast('Aanbevolen activiteiten toegevoegd');
      },
      actieLabel: 'Vul met aanbevolen',
    },
  ];
  const klaar = stappen.filter((s) => s.klaar).length;
  if (klaar === stappen.length) return null;

  return (
    <section className="rounded-lg border border-niveau-border bg-niveau-surface p-5" aria-labelledby="aan-de-slag">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-niveau-strong">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Aan de slag · {klaar}/{stappen.length}
          </p>
          <h2 id="aan-de-slag" className="mt-1 text-h3 text-ink-strong">
            Zet je kwaliteitskalender op
          </h2>
        </div>
        <IconButton icon={X} label="Verbergen" size="sm" onClick={verbergOnboarding} />
      </div>
      <ul className="mt-4 divide-y divide-niveau-border rounded-md border border-niveau-border bg-surface-card">
        {stappen.map((s) => (
          <li key={s.to + s.label} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            {s.klaar ? (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-status-success text-white">
                <Check className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Klaar:</span>
              </span>
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
            )}
            <span
              className={cx('min-w-0 flex-1 text-sm', s.klaar ? 'text-ink-muted line-through' : 'font-medium text-ink-strong')}
            >
              {s.label}
            </span>
            {!s.klaar && (
              <span className="flex w-full items-center gap-4 pl-8 sm:w-auto sm:pl-0">
                {s.actie && (
                  <button type="button" onClick={s.actie} className="text-xs font-semibold text-niveau-strong hover:underline">
                    {s.actieLabel}
                  </button>
                )}
                <Link
                  to={s.to}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-niveau-strong hover:underline"
                >
                  Openen <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
