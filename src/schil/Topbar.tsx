import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, CircleHelp, FolderSync, GraduationCap, HardDrive, LogOut, Menu, PlayCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import { AppLogo, Badge, Button, ButtonLink, Dialog, IconButton, cx } from '../componenten';
import { helpVoorPad } from '../domein/inhoud';
import { formatTijdstip } from '../domein/hulp';
import { useStore } from '../store';
import { useSync } from '../sync/SyncProvider';
import { WeergaveKiezer } from './WeergaveKiezer';
import { useOefenen, useRondleiding } from './rondleiding/RondleidingProvider';
import { EERSTE_RONDLEIDING, tourVoorPad, vindTour } from './rondleiding/tours';
import { SNELTOETS, ZoekKnop } from './Zoekvenster';

/** "Opgeslagen" verschijnt 1,6 s na elke wijziging. */
function OpgeslagenIndicator() {
  const { laatstOpgeslagen, opslagWerkt } = useStore();
  const [zichtbaar, setZichtbaar] = useState(false);
  useEffect(() => {
    if (!laatstOpgeslagen) return;
    setZichtbaar(true);
    const t = window.setTimeout(() => setZichtbaar(false), 1600);
    return () => window.clearTimeout(t);
  }, [laatstOpgeslagen]);
  if (!opslagWerkt) {
    return (
      <span
        className="hidden items-center gap-1 text-xs font-semibold text-status-danger md:inline-flex"
        title="De browser weigert op te slaan (privévenster of opslag vol). Maak een back-up via Dossier en export."
      >
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
        Niet opgeslagen
      </span>
    );
  }
  return (
    <span
      aria-live="polite"
      className={cx(
        'hidden items-center gap-1 text-xs font-semibold text-status-success transition-opacity duration-base md:inline-flex',
        zichtbaar ? 'opacity-100' : 'opacity-0',
      )}
    >
      <Check className="h-3.5 w-3.5" aria-hidden style={{ strokeWidth: 2.5 }} />
      Opgeslagen
    </span>
  );
}

/** Status van het gedeelde bestand; klik opent Gegevens & delen. */
export function SyncStatus({ compact }: { compact?: boolean }) {
  const sync = useSync();
  const navigate = useNavigate();
  const [, setNu] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setNu((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  let icoon = HardDrive;
  let titel = 'Alleen op dit apparaat';
  let sub: string | null = null;
  let toon = 'text-ink-muted';
  let actie = () => navigate('/gegevens');

  if (sync.status === 'gekoppeld') {
    icoon = sync.bezig ? RefreshCw : FolderSync;
    titel = sync.bestandsnaam ?? 'Gedeeld bestand';
    sub = sync.fout
      ? 'Synchroniseren mislukt'
      : sync.laatsteSync
        ? `Gesynchroniseerd ${formatTijdstip(sync.laatsteSync)}`
        : 'Gekoppeld';
    toon = sync.fout ? 'text-status-warning' : 'text-ink-strong';
  } else if (sync.status === 'verbinden') {
    icoon = RefreshCw;
    titel = 'Verbinden…';
  } else if (sync.status === 'toestemming-nodig') {
    icoon = TriangleAlert;
    titel = 'Opnieuw verbinden';
    sub = sync.bestandsnaam;
    toon = 'text-status-warning';
    actie = () => void sync.herstelToestemming();
  } else if (sync.status === 'fout') {
    icoon = TriangleAlert;
    titel = 'Bestand niet gevonden';
    sub = sync.bestandsnaam;
    toon = 'text-status-warning';
  }
  const Icoon = icoon;
  const uitleg =
    sync.status === 'geen'
      ? 'Je gegevens staan alleen in deze browser. Klik om een gedeeld bestand te koppelen.'
      : (sync.fout ?? `${titel}${sub ? `, ${sub}` : ''}`);

  return (
    <button
      type="button"
      onClick={actie}
      title={uitleg}
      data-rondleiding="delen"
      className={cx(
        'inline-flex h-9 min-w-0 max-w-[15rem] items-center gap-2 rounded-md border border-transparent px-2 text-left transition-colors duration-fast hover:border-line-subtle hover:bg-surface-hover',
        toon,
      )}
    >
      <Icoon className={cx('h-4 w-4 shrink-0', sync.bezig && 'animate-spin')} aria-hidden />
      <span className={cx('min-w-0 flex-col leading-tight', compact ? 'hidden lg:flex' : 'flex')}>
        <span className="truncate text-xs font-semibold">{titel}</span>
        {sub && <span className="truncate text-2xs font-medium text-ink-subtle">{sub}</span>}
      </span>
    </button>
  );
}

export function DemoVerlatenKnop({ volledig }: { volledig?: boolean } = {}) {
  const { beginLeeg } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      {volledig ? (
        <Button variant="secondary" size="sm" icon={LogOut} onClick={() => setOpen(true)} className="w-full">
          Demo verlaten
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="sm" icon={LogOut} onClick={() => setOpen(true)} className="hidden lg:inline-flex">
            Demo verlaten
          </Button>
          <IconButton icon={LogOut} label="Demo verlaten" onClick={() => setOpen(true)} className="lg:hidden" />
        </>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        width="sm"
        title="Demo verlaten?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setOpen(false);
                beginLeeg();
              }}
            >
              Opnieuw beginnen
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-body">
          Je verlaat de demo en begint opnieuw met een leeg eigen bestuur. De demodata kun je later altijd opnieuw laden via{' '}
          <strong>Organisatie</strong>.
        </p>
      </Dialog>
    </>
  );
}

export function HelpKnop() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const r = useRondleiding();
  const help = helpVoorPad(pathname);
  const tour = tourVoorPad(pathname);
  const l = r.voortgang.lopend;
  const lopendeTour = l ? vindTour(l.tour) : undefined;
  const start = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <>
      <IconButton icon={CircleHelp} label="Hulp bij dit scherm" onClick={() => setOpen(true)} data-rondleiding="hulp" />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        width="sm"
        title={`Hulp: ${help.titel}`}
        footer={
          <>
            <ButtonLink to="/begrippen" variant="ghost" size="sm" className="mr-auto" onClick={() => setOpen(false)}>
              Alle begrippen
            </ButtonLink>
            <ButtonLink to="/faq" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Veelgestelde vragen
            </ButtonLink>
          </>
        }
      >
        <div className="mb-4 grid gap-2">
          {l && lopendeTour && !r.oefenen && (
            <Button variant="primary" icon={PlayCircle} onClick={start(r.hervat)} className="justify-start">
              Verder met de rondleiding (stap {l.stap + 1} van {lopendeTour.stappen.length})
            </Button>
          )}
          {tour && (
            <Button variant={l && !r.oefenen ? 'secondary' : 'primary'} icon={GraduationCap} onClick={start(() => r.start(tour.id))} className="justify-start">
              Laat zien hoe dit scherm werkt
            </Button>
          )}
          <Button variant="secondary" icon={PlayCircle} onClick={start(() => r.start(EERSTE_RONDLEIDING.id))} className="justify-start">
            {r.voortgang.eersteAf ? 'De rondleiding opnieuw' : 'De rondleiding'} ({EERSTE_RONDLEIDING.duur})
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-ink-body">{help.tekst}</p>
        <p className="mt-4 text-xs text-ink-muted">
          Iets zoeken? Druk op <kbd className="font-semibold text-ink-body">{SNELTOETS}</kbd> of gebruik de zoekknop bovenin.
          Woorden met een stippellijn kun je aanwijzen of aantikken voor uitleg.{' '}
          <button type="button" className="font-semibold kk-link" onClick={start(r.openKeuze)}>
            Alle rondleidingen
          </button>
        </p>
      </Dialog>
    </>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { state } = useStore();
  const oefenen = useOefenen();
  // Op de oefenkalender geen demo-knoppen: de gele band zegt al dat je oefent.
  const isDemo = state.modus === 'demo' && !oefenen;
  return (
    <header className="no-print sticky top-0 z-40 border-t-[3px] border-niveau bg-surface-card">
      <div className="flex h-14 items-center gap-2 border-b border-line-subtle pl-2 pr-3 sm:gap-3 md:pl-0 md:pr-4">
        <IconButton icon={Menu} label="Menu openen" onClick={onMenu} className="shrink-0 md:hidden" data-rondleiding="menu-knop" />
        <div className="hidden shrink-0 items-center gap-2 md:flex md:w-sidebar md:px-4">
          <Link to="/" aria-label="Kwaliteitskalender, naar start" className="rounded-md">
            <AppLogo />
          </Link>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <WeergaveKiezer />
          {isDemo && (
            <span className="hidden sm:inline-flex">
              <Badge tone="brand" size="sm" title="Je werkt in de demo met voorbeeldgegevens">
                Demo
              </Badge>
            </span>
          )}
          {!isDemo && !oefenen && (
            <span className="hidden xl:inline-flex">
              <Badge tone="neutral" size="sm" title="Alle gegevens blijven op je eigen computer">
                Lokaal
              </Badge>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ZoekKnop />
          <OpgeslagenIndicator />
          <span className="hidden md:inline-flex">
            <SyncStatus compact />
          </span>
          <HelpKnop />
          {isDemo && (
            <span className="hidden md:inline-flex">
              <DemoVerlatenKnop />
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
