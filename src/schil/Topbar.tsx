import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, CircleHelp, FolderSync, HardDrive, LogOut, Menu, RefreshCw, TriangleAlert } from 'lucide-react';
import { AppLogo, Badge, Button, Dialog, IconButton, NiveauSwitcher, cx } from '../componenten';
import { helpVoorPad } from '../domein/inhoud';
import { formatTijdstip } from '../domein/hulp';
import { useStore } from '../store';
import { useSync } from '../sync/SyncProvider';

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
        title="De browser weigert op te slaan (privévenster of opslag vol). Maak een back-up via Export."
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
    toon = sync.fout ? 'text-status-warning' : 'text-niveau-strong';
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

function DemoVerlatenKnop() {
  const { beginLeeg } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" icon={LogOut} onClick={() => setOpen(true)} className="hidden sm:inline-flex">
        Demo verlaten
      </Button>
      <IconButton icon={LogOut} label="Demo verlaten" onClick={() => setOpen(true)} className="sm:hidden" />
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
          <strong>Organisatie, Gegevens</strong>.
        </p>
      </Dialog>
    </>
  );
}

function HelpKnop() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const help = helpVoorPad(pathname);
  return (
    <>
      <IconButton icon={CircleHelp} label="Uitleg bij dit scherm" onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={() => setOpen(false)} width="sm" title={`Uitleg: ${help.titel}`}>
        <p className="text-sm leading-relaxed text-ink-body">{help.tekst}</p>
      </Dialog>
    </>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { state, niveau, setNiveau } = useStore();
  const isDemo = state.modus === 'demo';
  return (
    <header className="no-print sticky top-0 z-40 border-t-[3px] border-niveau bg-surface-card">
      <div className="flex h-14 items-center gap-2 border-b border-line-subtle px-3 sm:gap-3 sm:px-4">
        <IconButton icon={Menu} label="Menu openen" onClick={onMenu} className="md:hidden" />
        <AppLogo />
        <span className="hidden md:inline-flex">
          {isDemo ? (
            <Badge tone="brand" size="sm">
              Demo-data
            </Badge>
          ) : (
            <Badge tone="niveau" size="sm" title="Alle gegevens blijven op je eigen computer">
              Lokaal
            </Badge>
          )}
        </span>

        <div className="flex flex-1 justify-center">
          <NiveauSwitcher value={niveau} onChange={setNiveau} toonCluster={state.organisatie.clusters.length > 0} />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <OpgeslagenIndicator />
          <SyncStatus compact />
          <span className="tnum hidden whitespace-nowrap text-sm text-ink-muted xl:inline">Schooljaar {state.schooljaar}</span>
          <HelpKnop />
          {isDemo && <DemoVerlatenKnop />}
        </div>
      </div>
    </header>
  );
}
