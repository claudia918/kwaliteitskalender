/**
 * Openingsscherm bij "alleen in het kalenderbestand": de browser bevat geen kalender, dus eerst wordt
 * het kalenderbestand ingelezen. Lukt dat vanzelf (de browser heeft nog toestemming), dan zie je dit
 * scherm maar even. Anders kies je hier: het bestand openen, een ander bestand kiezen, opnieuw
 * beginnen of de kalender weer in de browser bewaren.
 */
import { FolderOpen, Lock, RefreshCw } from 'lucide-react';
import { AppLogo, Button, InfoBalk, LvLogo } from '../componenten';
import { useSync } from '../sync/SyncProvider';

export function BestandOpenen({ onNieuw }: { onNieuw: () => void }) {
  const sync = useSync();
  const naam = sync.bestandsnaam;
  const bezig = sync.status === 'verbinden' || (sync.status === 'gekoppeld' && !sync.fout);

  const nieuw = async () => {
    await sync.ontkoppel();
    onNieuw();
  };
  const inBrowser = async () => {
    await sync.ontkoppel();
    await sync.zetAlleenInBestand(false);
    onNieuw();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <section className="kk-hoek-vlak border border-line-subtle bg-surface-card p-6 sm:p-10">
        <AppLogo groot compact={false} />
        <h1 className="mt-8 text-h1 text-ink-strong">Open je kalenderbestand</h1>
        <p className="mt-3 text-base text-ink-body">
          Deze kalender staat alleen in het kalenderbestand van je organisatie, niet in deze browser.
          {naam ? (
            <>
              {' '}
              Het bestand heet <strong className="text-ink-strong">{naam}</strong>.
            </>
          ) : null}
        </p>

        {sync.fout && (
          <InfoBalk tone="warning" className="mt-5">
            {sync.fout}
          </InfoBalk>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {bezig ? (
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-strong" role="status">
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
              Kalenderbestand openen…
            </p>
          ) : sync.status === 'toestemming-nodig' ? (
            <>
              <Button variant="primary" size="lg" icon={FolderOpen} onClick={() => void sync.herstelToestemming()}>
                Open {naam ?? 'het kalenderbestand'}
              </Button>
              <Button size="lg" onClick={() => void sync.koppelBestaand()}>
                Ander bestand kiezen
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" icon={FolderOpen} onClick={() => void sync.koppelBestaand()}>
              Kalenderbestand kiezen
            </Button>
          )}
        </div>
        {sync.status === 'toestemming-nodig' && (
          <p className="mt-3 text-sm text-ink-muted">
            De browser vraagt na het openen opnieuw om toestemming voor het bestand. Kies dan voor toestaan.
          </p>
        )}

        <div className="mt-8 space-y-2 border-t border-line-subtle pt-6 text-sm">
          <p className="font-semibold text-ink-strong">Iets anders doen</p>
          <p>
            <button type="button" className="kk-link font-semibold" onClick={() => void nieuw()}>
              Een nieuwe kalender beginnen of de demo bekijken
            </button>
          </p>
          <p>
            <button type="button" className="kk-link font-semibold" onClick={() => void inBrowser()}>
              De kalender weer in deze browser bewaren
            </button>
          </p>
        </div>

        <p className="mt-6 flex items-start gap-1.5 text-xs text-ink-muted">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Er gaat niets via internet. De browser leest en schrijft alleen dit ene bestand op je eigen schijf.</span>
        </p>
      </section>
      <div className="mt-6 flex justify-center">
        <LvLogo className="h-9 opacity-80" />
      </div>
    </div>
  );
}
