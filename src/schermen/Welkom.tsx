/**
 * Welkomstscherm (zolang de setup niet voltooid is), inventaris §1.7.
 * Drie ingangen: eigen bestuur (wizard), demo, of een gedeeld kalenderbestand van een collega.
 */
import { ArrowRight, FolderOpen, GraduationCap, Lock, PlayCircle } from 'lucide-react';
import { AppLogo, Button, IconTile, LvLogo, Swoosh, icoonOpNaam } from '../componenten';
import { WELKOM_BOUWSTENEN, WELKOM_VOETNOOT } from '../domein/inhoud';
import { useStore } from '../store';
import { useSync } from '../sync/SyncProvider';
import { kiesBestandHandmatig } from '../sync/bestandstoegang';
import { rondleidingNa } from '../schil/rondleiding/RondleidingProvider';

export interface WelkomProps {
  /** Naar de wizard ("Begin met mijn eigen bestuur") */
  onStartWizard: () => void;
}

export default function Welkom({ onStartWizard }: WelkomProps) {
  const { loadDemo } = useStore();
  const sync = useSync();

  const openGedeeld = async () => {
    rondleidingNa('bestand');
    if (sync.ondersteund) {
      await sync.koppelBestaand();
    } else {
      const f = await kiesBestandHandmatig();
      if (f) await sync.openBestand(f);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-10">
      <section className="kk-hoek-vlak border border-line-subtle bg-surface-card p-6 sm:p-10">
        <AppLogo groot compact={false} />

        <h1 className="mt-8 text-h1 text-ink-strong sm:text-display">Welkom bij de Kwaliteitskalender VO</h1>
        <p className="mt-3 max-w-2xl text-base text-ink-body">
          Stel als bestuur in een paar stappen je eigen kwaliteitskalender samen, gekoppeld aan het inspectiekader en de
          seizoensgesprekken. Eerst even kennismaken met de bouwstenen:
        </p>

        <Swoosh className="mt-6 h-6" />
        {/* Bouwstenen als lijst met haarlijnen, geen losse kaartjes. */}
        <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
          {WELKOM_BOUWSTENEN.map((b) => (
            <li key={b.titel} className="flex items-start gap-3 border-b border-line-subtle py-4">
              <IconTile icon={icoonOpNaam(b.icon)} tone="niveau" size="sm" className="mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink-strong">{b.titel}</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{b.tekst}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button variant="primary" size="lg" iconRight={ArrowRight} onClick={onStartWizard}>
            Begin met mijn eigen bestuur
          </Button>
          <Button
            variant="secondary"
            size="lg"
            icon={PlayCircle}
            onClick={() => {
              rondleidingNa('demo');
              loadDemo();
            }}
          >
            Verken eerst de demo
          </Button>
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <span>
            Daarna kun je vier minuten oefenen: een rondleiding op een oefenkalender, waarin je alles één keer zelf doet.
          </span>
        </p>

        <div className="mt-8 flex flex-col gap-3 border-t border-line-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-strong">Werkt een collega al met een gedeelde kalender?</p>
            <p className="text-sm text-ink-muted">
              Open het kalenderbestand (.kwaliteitskalender.json) uit de gedeelde map van je organisatie.
            </p>
          </div>
          <Button variant="secondary" icon={FolderOpen} onClick={() => void openGedeeld()} className="shrink-0">
            Gedeeld kalenderbestand openen
          </Button>
        </div>

        <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-xs text-ink-muted">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{WELKOM_VOETNOOT}</span>
        </p>
      </section>
      <div className="mt-6 flex justify-center">
        <LvLogo className="h-9 opacity-80" />
      </div>
    </div>
  );
}
