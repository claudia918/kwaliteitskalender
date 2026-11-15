/**
 * Scherm "Gegevens & delen" (/gegevens): waar staan je gegevens, samenwerken via een gedeeld
 * kalenderbestand, handmatig openen/opslaan/samenvoegen, en de privacyregel.
 */
import type { ReactNode } from 'react';
import {
  CircleCheckBig,
  Download,
  FilePlus2,
  FileUp,
  FolderOpen,
  FolderSync,
  GitMerge,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Unlink,
  type LucideIcon,
} from 'lucide-react';
import { Begrip, Button, ButtonLink, Card, IconTile, InfoBalk, PageHeader, cx } from '../componenten';
import { formatTijdstip } from '../domein/hulp';
import { BESTAND_EXTENSIE } from '../domein/state';
import { useStore } from '../store';
import { kiesBestandHandmatig } from '../sync/bestandstoegang';
import { useSync } from '../sync/SyncProvider';
import { useBestandKeuze } from './BestandKeuze';

function Stap({ nummer, titel, children }: { nummer: number; titel: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-niveau-surface text-sm font-bold text-niveau-strong">
        {nummer}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="font-semibold text-ink-strong">{titel}</p>
        <div className="mt-0.5 text-sm text-ink-muted">{children}</div>
      </div>
    </li>
  );
}

function Handeling({ icon, titel, tekst, knop }: { icon: LucideIcon; titel: string; tekst: string; knop: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line-subtle p-4 sm:flex-row sm:items-center">
      <IconTile icon={icon} tone="neutral" size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-strong">{titel}</p>
        <p className="text-sm text-ink-muted">{tekst}</p>
      </div>
      <div className="shrink-0">{knop}</div>
    </div>
  );
}

function StatusBlok() {
  const sync = useSync();
  const { state } = useStore();
  const gekoppeld = sync.status === 'gekoppeld';

  let icoon: LucideIcon = HardDrive;
  let toon: 'neutral' | 'niveau' | 'warning' = 'neutral';
  let titel = 'Alleen op dit apparaat';
  let tekst = 'Je kalender staat in deze browser op deze computer. Collega’s zien je wijzigingen niet.';
  if (gekoppeld) {
    icoon = FolderSync;
    toon = 'niveau';
    titel = `Gekoppeld aan ${sync.bestandsnaam ?? 'een gedeeld bestand'}`;
    tekst = sync.laatsteSync ? `Laatst gesynchroniseerd om ${formatTijdstip(sync.laatsteSync)}.` : 'Gekoppeld.';
  } else if (sync.status === 'toestemming-nodig') {
    icoon = TriangleAlert;
    toon = 'warning';
    titel = `Toestemming nodig voor ${sync.bestandsnaam ?? 'het gedeelde bestand'}`;
    tekst = 'Na het opnieuw openen vraagt de browser of de Kwaliteitskalender het bestand weer mag bijwerken.';
  } else if (sync.status === 'fout') {
    icoon = TriangleAlert;
    toon = 'warning';
    titel = 'Het gekoppelde bestand is niet gevonden';
    tekst = 'Is het verplaatst of hernoemd? Koppel het bestand opnieuw.';
  } else if (sync.status === 'verbinden') {
    icoon = RefreshCw;
    titel = 'Verbinden met het gedeelde bestand…';
    tekst = '';
  } else if (sync.laatsteSync && sync.bestandsnaam) {
    tekst = `Laatst opgeslagen of samengevoegd met ${sync.bestandsnaam} om ${formatTijdstip(sync.laatsteSync)}.`;
  }

  return (
    <div
      className={cx(
        'flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center',
        toon === 'niveau'
          ? 'border-niveau-border bg-niveau-surface'
          : toon === 'warning'
            ? 'border-status-warning-border bg-status-warning-surface'
            : 'border-line-subtle bg-surface-subtle',
      )}
    >
      <IconTile
        icon={icoon}
        tone={toon === 'niveau' ? 'niveau' : toon === 'warning' ? 'warning' : 'neutral'}
        className={cx(toon !== 'neutral' && 'bg-surface-card')}
      />
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="font-semibold text-ink-strong">{titel}</p>
        {tekst && <p className="text-sm text-ink-muted">{tekst}</p>}
        {sync.fout && <p className="mt-1 text-sm text-status-warning">{sync.fout}</p>}
        {state.modus === 'demo' && (
          <p className="mt-1 text-sm text-ink-muted">
            Je werkt nu in de demo. Een gedeeld bestand maak je met je eigen kalender.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {gekoppeld && (
          <>
            <Button size="sm" icon={RefreshCw} onClick={() => void sync.synchroniseerNu()} disabled={sync.bezig}>
              Nu synchroniseren
            </Button>
            <Button size="sm" variant="ghost" icon={Unlink} onClick={() => void sync.ontkoppel()}>
              Ontkoppelen
            </Button>
          </>
        )}
        {sync.status === 'toestemming-nodig' && (
          <>
            <Button size="sm" variant="primary" icon={RefreshCw} onClick={() => void sync.herstelToestemming()}>
              Opnieuw verbinden
            </Button>
            <Button size="sm" variant="ghost" icon={Unlink} onClick={() => void sync.ontkoppel()}>
              Ontkoppelen
            </Button>
          </>
        )}
        {sync.status === 'fout' && (
          <Button size="sm" variant="ghost" icon={Unlink} onClick={() => void sync.ontkoppel()}>
            Ontkoppelen
          </Button>
        )}
      </div>
    </div>
  );
}

export default function GegevensDelen() {
  const sync = useSync();
  const { state } = useStore();
  const [vraag, keuzeDialoog] = useBestandKeuze();
  const isDemo = state.modus === 'demo';
  const gekoppeld = sync.status === 'gekoppeld' || sync.status === 'toestemming-nodig';

  const openHandmatig = async () => {
    const f = await kiesBestandHandmatig();
    if (f) await sync.openBestand(f, vraag);
  };
  const samenvoegenHandmatig = async () => {
    const f = await kiesBestandHandmatig();
    if (f) await sync.samenvoegenMetBestand(f);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Beheer"
        title="Gegevens & delen"
        subtitle="Werk met collega’s in één gedeeld kalenderbestand en zie waar je gegevens staan. Er gaat niets via internet."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Card rondleiding="gegevens-waar" title="Waar staan je gegevens?">
            <StatusBlok />
            <ul className="mt-5 space-y-3 text-sm text-ink-body">
              <li className="flex gap-2.5">
                <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden />
                <span>
                  <strong className="text-ink-strong">In deze browser</strong>, op deze computer. Elke wijziging wordt meteen
                  bewaard. Wis je je browsergegevens, dan is de kalender hier weg.
                </span>
              </li>
              <li className="flex gap-2.5">
                <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden />
                <span>
                  <strong className="text-ink-strong">In het gedeelde kalenderbestand</strong>, als je dat koppelt. Dat bestand
                  staat waar jij het neerzet, bijvoorbeeld in een SharePoint-, OneDrive- of netwerkmap van je organisatie.
                </span>
              </li>
              <li className="flex gap-2.5">
                <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden />
                <span>
                  <strong className="text-ink-strong">Nergens anders.</strong> Er is geen server en geen account. Project Leren
                  Verbeteren kan je gegevens niet inzien.
                </span>
              </li>
            </ul>
          </Card>

          <Card rondleiding="gegevens-samenwerken"
            title="Samenwerken met collega’s"
            subtitle={
              <>
                Eén <Begrip term="kalenderbestand" /> in een gedeelde map; iedereen werkt erin.
              </>
            }
          >
            {!sync.ondersteund && (
              <InfoBalk tone="warning" icon={TriangleAlert} className="mb-5">
                Deze browser kan een bestand niet blijvend koppelen. Gebruik Microsoft Edge of Google Chrome om automatisch samen
                te werken, of werk met de knoppen onder <strong>Zonder koppeling</strong>.
              </InfoBalk>
            )}
            <ol className="space-y-4">
              <Stap nummer={1} titel="Maak een gedeeld kalenderbestand">
                Kies een map waar je collega’s ook bij kunnen, zoals een gesynchroniseerde SharePoint- of OneDrive-map of een
                netwerkschijf. Het bestand eindigt op{' '}
                <code className="rounded-xs bg-surface-sunken px-1 text-xs">{BESTAND_EXTENSIE}</code>.
              </Stap>
              <Stap nummer={2} titel="Laat collega’s hetzelfde bestand koppelen">
                Zij openen de Kwaliteitskalender, kiezen <strong>Gegevens &amp; delen</strong> en dan{' '}
                <strong>Bestaand bestand koppelen</strong>.
              </Stap>
              <Stap nummer={3} titel="Werk gewoon door">
                Na elke wijziging, bij terugkeer naar dit venster en elke 30 seconden wordt het bestand samengevoegd. Per
                activiteit wint de nieuwste wijziging; een verwijderde activiteit komt niet terug. Wijzigden jij en een collega
                tegelijk hetzelfde, dan krijg je een melding.
              </Stap>
            </ol>
            {sync.ondersteund && !gekoppeld && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
                <Button
                  variant="primary"
                  icon={FilePlus2}
                  onClick={() => void sync.maakGedeeldBestand()}
                  disabled={isDemo || !state.setupVoltooid}
                >
                  Nieuw gedeeld bestand maken
                </Button>
                <Button variant="secondary" icon={FolderOpen} onClick={() => void sync.koppelBestaand(vraag)}>
                  Bestaand bestand koppelen
                </Button>
              </div>
            )}
          </Card>

          <Card
            title="Zonder koppeling"
            subtitle={
              sync.ondersteund ? 'Voor een losse kopie of een conflictkopie van OneDrive.' : 'Zo werk je samen in deze browser.'
            }
          >
            <div className="space-y-3">
              <Handeling
                icon={FileUp}
                titel="Bestand openen"
                tekst="Open een kalenderbestand of back-up. Heb je hier al gegevens, dan kies je tussen samenvoegen en overnemen."
                knop={
                  <Button size="sm" icon={FolderOpen} onClick={() => void openHandmatig()}>
                    Bestand openen
                  </Button>
                }
              />
              <Handeling
                icon={Download}
                titel="Opslaan als bestand"
                tekst="Download de kalender als kalenderbestand, bijvoorbeeld om in de gedeelde map te zetten."
                knop={
                  <Button size="sm" icon={Download} onClick={sync.opslaanAlsBestand} disabled={!state.setupVoltooid}>
                    Opslaan als bestand
                  </Button>
                }
              />
              <Handeling
                icon={GitMerge}
                titel="Samenvoegen met bestand"
                tekst="Haal de wijzigingen van een collega binnen. De nieuwste versie per activiteit blijft bewaard."
                knop={
                  <Button size="sm" icon={GitMerge} onClick={() => void samenvoegenHandmatig()} disabled={!state.setupVoltooid}>
                    Samenvoegen met bestand
                  </Button>
                }
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card rondleiding="gegevens-privacy" padding="lg" className="border-brand-yellow">
            <div className="flex items-start gap-3">
              <IconTile icon={ShieldCheck} tone="brand" />
              <div className="min-w-0">
                <p className="eyebrow">Privacy</p>
                <h2 className="mt-1 text-h3 text-ink-strong">Vermeld geen leerling- of persoonsgegevens.</h2>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-ink-body">
              <p>
                De kalender gaat over activiteiten, planningen en statussen, niet over individuele leerlingen of medewerkers.
                Gebruik bij eigenaar liever een rol (bijvoorbeeld <em>teamleider onderbouw</em>) dan een naam, en verwijs bij
                bewijs naar een document in je eigen beveiligde omgeving.
              </p>
              <p>
                <strong className="text-ink-strong">In het kalenderbestand staat:</strong> de naam van je bestuur, scholen en
                clusters, de activiteiten met planning en status, en wat jullie zelf invullen bij eigenaar, notitie, bewijs en
                afwijking. Geen accounts, e-mailadressen of apparaatnamen.
              </p>
              <p>Wie het bestand kan openen, kan de kalender lezen en wijzigen. Dat regel je met de rechten op de map.</p>
            </div>
          </Card>

          <Card title="Technische waarborg">
            <p className="text-sm text-ink-body">
              De Kwaliteitskalender is één bestand zonder externe onderdelen. Een beveiligingsregel in dat bestand (Content
              Security Policy) blokkeert elk netwerkverkeer. Zelfs een fout in de app kan dus geen gegevens versturen.
            </p>
          </Card>

          <Card title="Back-up">
            <p className="text-sm text-ink-body">
              Maak af en toe een back-up, zeker als je geen gedeeld bestand gebruikt. Een back-up uit de vorige online versie kun
              je ook importeren.
            </p>
            <ButtonLink to="/export" size="sm" icon={Download} className="mt-4">
              Naar Dossier en export
            </ButtonLink>
          </Card>
        </div>
      </div>
      {keuzeDialoog}
    </div>
  );
}
