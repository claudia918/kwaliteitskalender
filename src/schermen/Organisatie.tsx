/**
 * Organisatie (inventaris §1.16, op elk niveau; de instellingen gelden voor het hele bestuur): bestuur, clusters, scholen, gesprekscyclus,
 * startsjabloon en gegevens, met een ingang naar "Gegevens & delen". "Toegang & leden" en de
 * gevarenzone uit de cloudversie vervallen.
 */
import { useState } from 'react';
import {
  ArrowRight,
  Database,
  Eraser,
  FileJson,
  Layers,
  Plus,
  School as SchoolIcoon,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Begrip,
  Button,
  ButtonLink,
  Card,
  IconButton,
  IconTile,
  Input,
  PageHeader,
  Select,
  Veld,
  useBevestig,
  useToast,
} from '../componenten';
import { scholenInCluster } from '../domein/berekeningen';
import { aantal } from '../domein/hulp';
import { PRIVACY_REGEL } from '../domein/inhoud';
import { SCHOOLTYPE_SUGGESTIES, VERPLICHTE_SCHOOLACTIVITEITEN } from '../domein/seed';
import { useStore } from '../store';
import { useSync } from '../sync/SyncProvider';
import { BewerkVeld } from './organisatie/BewerkVeld';
import { Gesprekscyclus } from './organisatie/Gesprekscyclus';

export default function Organisatie() {
  const { niveau } = useStore();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Beheer"
        title="Organisatie"
        subtitle={
          <>
            Leg vast wie erbij hoort en wanneer de <Begrip term="seizoensgesprek">gesprekken</Begrip> zijn.
            {niveau !== 'bestuur' && ' Deze instellingen gelden voor het hele bestuur.'}
          </>
        }
        actions={
          <ButtonLink to="/gegevens" icon={Share2}>
            Gegevens & delen
          </ButtonLink>
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <BestuurKaart />
          <ScholenKaart />
          <ClustersKaart />
          <Gesprekscyclus />
        </div>
        <aside className="space-y-4">
          <DelenKaart />
          <SjabloonKaart />
          <GegevensKaart />
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BestuurKaart() {
  const { state, setBestuurNaam, setSchooljaar } = useStore();
  const toast = useToast();
  return (
    <Card title="Bestuur" subtitle="Wijzigingen worden bewaard zodra je het veld verlaat.">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Veld label="Naam bestuur" hint={PRIVACY_REGEL}>
          {(id) => (
            <BewerkVeld
              id={id}
              value={state.organisatie.bestuurNaam}
              verplicht
              placeholder="bv. Stichting Onderwijs Regio X"
              onCommit={(naam) => {
                setBestuurNaam(naam);
                toast('Naam bestuur bewaard');
              }}
            />
          )}
        </Veld>
        <Veld label="Schooljaar" hint="Bepaalt de datums van de gesprekken.">
          {(id) => (
            <BewerkVeld
              id={id}
              value={state.schooljaar}
              verplicht
              placeholder="2026/2027"
              onCommit={(jaar) => {
                setSchooljaar(jaar);
                toast('Schooljaar bewaard');
              }}
            />
          )}
        </Veld>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function ClustersKaart() {
  const { state, addCluster, updateCluster, removeCluster } = useStore();
  const bevestig = useBevestig();
  const toast = useToast();
  const [nieuw, setNieuw] = useState('');
  const clusters = state.organisatie.clusters;

  const voegToe = () => {
    const naam = nieuw.trim();
    if (!naam) return;
    addCluster(naam);
    setNieuw('');
    toast(`${naam} toegevoegd`);
  };

  return (
    <Card
      id="clusters"
      title="Clusters"
      subtitle={
        <>
          Optioneel: groepeer scholen, bijvoorbeeld per regio. Zonder <Begrip term="cluster">clusters</Begrip> zie je die keuze niet.
        </>
      }
      action={<Badge size="sm">{aantal(clusters.length, 'cluster', 'clusters')}</Badge>}
    >
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          voegToe();
        }}
      >
        <Veld label="Nieuw cluster" className="flex-1">
          {(id) => <Input id={id} value={nieuw} onChange={(e) => setNieuw(e.target.value)} placeholder="bv. Cluster Noord" />}
        </Veld>
        <Button type="submit" icon={Plus} disabled={!nieuw.trim()}>
          Toevoegen
        </Button>
      </form>
      {clusters.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-line px-4 py-5 text-center text-sm text-ink-muted">
          Nog geen clusters.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line-subtle rounded-md border border-line-subtle">
          {clusters.map((c) => {
            const n = scholenInCluster(state.organisatie, c.id).length;
            return (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                <Layers className="hidden h-4 w-4 shrink-0 text-ink-subtle sm:block" aria-hidden />
                <BewerkVeld
                  aria-label="Naam van het cluster"
                  value={c.naam}
                  verplicht
                  veldMaat="sm"
                  className="min-w-0 flex-1"
                  onCommit={(naam) => updateCluster(c.id, { naam })}
                />
                <span className="hidden w-20 shrink-0 text-right text-xs text-ink-muted sm:inline">{aantal(n, 'school', 'scholen')}</span>
                <IconButton
                  icon={Trash2}
                  label={`${c.naam} verwijderen`}
                  size="sm"
                  onClick={async () => {
                    if (
                      await bevestig({
                        titel: `Cluster "${c.naam}" verwijderen?`,
                        tekst: n > 0 ? `${aantal(n, 'school komt', 'scholen komen')} zonder cluster te staan. De scholen en hun kalenders blijven bestaan.` : undefined,
                        bevestigLabel: 'Verwijderen',
                        gevaarlijk: true,
                      })
                    ) {
                      removeCluster(c.id);
                      toast('Cluster verwijderd', 'danger');
                    }
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function ScholenKaart() {
  const { state, addSchool, updateSchool, removeSchool } = useStore();
  const bevestig = useBevestig();
  const toast = useToast();
  const [naam, setNaam] = useState('');
  const [type, setType] = useState('');
  const scholen = state.organisatie.scholen;
  const clusterOpties = [{ value: '', label: 'Geen cluster' }, ...state.organisatie.clusters.map((c) => ({ value: c.id, label: c.naam }))];

  const voegToe = () => {
    if (!naam.trim()) return;
    addSchool({ naam: naam.trim(), type: type.trim() });
    toast(`${naam.trim()} toegevoegd`);
    setNaam('');
    setType('');
  };

  return (
    <Card
      id="scholen"
      title="Scholen"
      subtitle={aantal(scholen.length, 'school', 'scholen')}
    >
      <form
        className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          voegToe();
        }}
      >
        <Veld label="Schoolnaam">
          {(id) => <Input id={id} value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="bv. Lyceum Noord" />}
        </Veld>
        <Veld label="Type">
          {(id) => <Input id={id} value={type} list="org-schooltypes" onChange={(e) => setType(e.target.value)} placeholder="havo/vwo" />}
        </Veld>
        <Button type="submit" icon={Plus} disabled={!naam.trim()}>
          Toevoegen
        </Button>
      </form>
      <datalist id="org-schooltypes">
        {SCHOOLTYPE_SUGGESTIES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {scholen.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-line px-4 py-5 text-center text-sm text-ink-muted">Nog geen scholen.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line-subtle rounded-md border border-line-subtle">
          {scholen.map((s) => (
            <li key={s.id} className="flex items-start gap-2 px-3 py-2.5 sm:items-center sm:py-2">
              <SchoolIcoon className="hidden h-4 w-4 shrink-0 text-ink-subtle sm:block" aria-hidden />
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,6rem)_minmax(0,1fr)] gap-2 sm:grid-cols-[1fr_8.5rem_10rem]">
                <BewerkVeld
                  aria-label={`Naam van ${s.naam}`}
                  value={s.naam}
                  verplicht
                  veldMaat="sm"
                  className="col-span-2 sm:col-span-1"
                  onCommit={(nieuw) => updateSchool(s.id, { naam: nieuw })}
                />
                <BewerkVeld
                  aria-label={`Type van ${s.naam}`}
                  value={s.type}
                  list="org-schooltypes"
                  veldMaat="sm"
                  placeholder="vo"
                  onCommit={(nieuw) => updateSchool(s.id, { type: nieuw || 'vo' })}
                />
                <Select
                  aria-label={`Cluster van ${s.naam}`}
                  veldMaat="sm"
                  value={state.organisatie.clusters.some((c) => c.id === s.cluster) ? s.cluster : ''}
                  options={clusterOpties}
                  onChange={(e) => updateSchool(s.id, { cluster: e.target.value })}
                />
              </div>
              <IconButton
                icon={Trash2}
                label={`${s.naam} verwijderen`}
                size="sm"
                onClick={async () => {
                  const n = state.schoolKalenders[s.id]?.length ?? 0;
                  if (
                    await bevestig({
                      titel: `School "${s.naam}" en haar kalender verwijderen?`,
                      tekst: `De kalender van deze school (${aantal(n, 'activiteit', 'activiteiten')}) wordt ook verwijderd. Dit kan niet ongedaan worden gemaakt.`,
                      bevestigLabel: 'Verwijderen',
                      gevaarlijk: true,
                    })
                  ) {
                    removeSchool(s.id);
                    toast(`${s.naam} verwijderd`, 'danger');
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function DelenKaart() {
  const sync = useSync();
  const gekoppeld = sync.status === 'gekoppeld';
  return (
    <Card padding="md" className="border-niveau-border">
      <div className="flex items-start gap-3">
        <IconTile icon={Share2} tone="niveau" />
        <div className="min-w-0">
          <h3 className="text-h4 text-ink-strong">Gegevens & delen</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Werk samen met collega's via één kalenderbestand in een gedeelde map, en zie waar je gegevens staan.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-2 text-xs">
        <FileJson className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
        {gekoppeld && sync.bestandsnaam ? (
          <span className="min-w-0 truncate text-ink-body">
            Gekoppeld aan <span className="font-semibold text-ink-strong">{sync.bestandsnaam}</span>
          </span>
        ) : sync.status === 'toestemming-nodig' ? (
          <span className="text-status-warning">Het gedeelde bestand vraagt opnieuw om toestemming.</span>
        ) : (
          <span className="text-ink-muted">Nog geen gedeeld kalenderbestand gekoppeld.</span>
        )}
      </div>
      <ButtonLink to="/gegevens" variant="niveau" size="sm" iconRight={ArrowRight} className="mt-4 w-full">
        Naar Gegevens & delen
      </ButtonLink>
    </Card>
  );
}

function SjabloonKaart() {
  const { state, pasSjabloonToe } = useStore();
  const bevestig = useBevestig();
  const toast = useToast();
  const n = VERPLICHTE_SCHOOLACTIVITEITEN.length;
  return (
    <Card
      title="Aanbevolen activiteiten"
      subtitle={
        <>
          Vul alle kalenders met het <Begrip term="startsjabloon" />
        </>
      }
    >
      <p className="text-sm text-ink-body">
        Plaatst {n} aanbevolen activiteiten op elke school en de bestuursactiviteiten op de bestuurskalender, zonder bestaande te
        overschrijven.
      </p>
      <Button
        variant="primary"
        icon={Sparkles}
        className="mt-4"
        onClick={async () => {
          if (
            await bevestig({
              titel: 'Aanbevolen activiteiten toevoegen aan alle scholen?',
              tekst: `Elke school (${aantal(state.organisatie.scholen.length, 'school', 'scholen')}) krijgt de ${n} aanbevolen activiteiten die ze nog niet heeft; de bestuurskalender krijgt de ontbrekende bestuursactiviteiten. Bestaande activiteiten blijven ongewijzigd.`,
              bevestigLabel: 'Toepassen',
            })
          ) {
            pasSjabloonToe();
            toast('Aanbevolen activiteiten toegevoegd');
          }
        }}
      >
        Toepassen
      </Button>
    </Card>
  );
}

function GegevensKaart() {
  const { loadDemo, beginLeeg } = useStore();
  const sync = useSync();
  const bevestig = useBevestig();
  const toast = useToast();
  const koppelZin =
    sync.status === 'gekoppeld' ? ' De koppeling met het gedeelde kalenderbestand wordt verbroken; het bestand zelf blijft ongewijzigd.' : '';
  return (
    <Card title="Demo of opnieuw beginnen" subtitle="Voorbeeldgegevens laden of alles leegmaken">
      <p className="text-xs text-ink-muted">Tip: maak eerst een back-up via Export als je je huidige kalender wilt bewaren.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Button
          icon={Database}
          onClick={async () => {
            if (
              await bevestig({
                titel: 'Demodata laden?',
                tekst: `Dit vervangt je huidige gegevens in deze browser.${koppelZin}`,
                bevestigLabel: 'Demodata laden',
              })
            ) {
              loadDemo();
              toast('Demodata geladen', 'info');
            }
          }}
        >
          Demodata laden
        </Button>
        <Button
          variant="danger-zacht"
          icon={Eraser}
          onClick={async () => {
            if (
              await bevestig({
                titel: 'Alles leegmaken en opnieuw beginnen?',
                tekst: `Dit kan niet ongedaan worden gemaakt.${koppelZin}`,
                bevestigLabel: 'Alles leegmaken',
                gevaarlijk: true,
              })
            ) {
              beginLeeg();
            }
          }}
        >
          Alles leegmaken
        </Button>
      </div>
    </Card>
  );
}
