/**
 * Stijlgids (/#/stijlgids, niet in het menu): alle gedeelde componenten op één pagina.
 * Bedoeld om vormgeving te controleren en als voorbeeld voor schermen.
 */
import { useState } from 'react';
import { CalendarClock, GitBranch, LayoutGrid, List, ListChecks, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import {
  ActivityChip,
  AfwijkingBadge,
  Badge,
  Begrip,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  FilterChip,
  GebiedDot,
  IconButton,
  IconTile,
  InfoBalk,
  Input,
  KpiTile,
  KwaliteitsgebiedTag,
  PageHeader,
  ProgressBar,
  SearchField,
  SectionHeader,
  SegmentedControl,
  SeizoenBadge,
  Select,
  StandaardBadge,
  StatusBadge,
  Textarea,
  VasteStandaardBadge,
  Veld,
  VerplichtBadge,
  gebiedKlassen,
  seizoenKlassen,
  useBevestig,
  useToast,
} from '../componenten';
import { PRIVACY_REGEL } from '../domein/inhoud';
import { gesprekOpties } from '../domein/hulp';
import { GEBIED_CODES, STANDAARD_GESPREKSCYCLUS, STATUS_VOLGORDE } from '../domein/seed';

export default function Stijlgids() {
  const toast = useToast();
  const bevestig = useBevestig();
  const [zoek, setZoek] = useState('');
  const [gebied, setGebied] = useState('Alle');
  const [weergave, setWeergave] = useState<'matrix' | 'lijst'>('matrix');
  const [dialoog, setDialoog] = useState(false);
  const [vink, setVink] = useState(true);
  const [gekozen, setGekozen] = useState<string | null>('b');
  const gesprekken = gesprekOpties(STANDAARD_GESPREKSCYCLUS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Componenten"
        subtitle="Alle bouwstenen uit src/componenten, in de huisstijl van Leren verbeteren."
        actions={
          <>
            <Button icon={ListChecks}>Secundair</Button>
            <Button variant="primary" icon={Plus}>
              Primair
            </Button>
          </>
        }
      />

      <Card title="Huisstijl in het kort" subtitle="Papier, geen dashboard">
        <ul className="grid gap-x-8 gap-y-2 text-sm text-ink-body md:grid-cols-2">
          <li>Twee kleuren: geel en zwart, op warm wit en warmgrijs. Eén lettertype: Poppins.</li>
          <li>Geel is schaars: de primaire knop, de focusring en één swoosh per scherm (de voettekst).</li>
          <li>Magenta is de steunkleur (zoals op de website): links, de actieve keuze, voortgangsbalken en één uitgelicht vlak per scherm.</li>
          <li>Vormkenmerk (zoals op de website): knoppen, kaarten en dialogen zijn recht, met alleen de hoek rechtsonder afgerond.</li>
          <li>Vlakken zijn wit met een 1px haarlijn en een kleine radius. Geen schaduw, behalve voor wat zweeft.</li>
          <li>Geen getinte vlakken, gekleurde linkerranden of iconen in tegeltjes als versiering.</li>
          <li>Labels in gewone tekst (sentence case). Kleine hoofdletters alleen voor groepskoppen in menu en tabel.</li>
          <li>Links zwart en onderstreept. De niveaukleur zit alleen in de weergaveknop en de lijn boven de topbar.</li>
          <li>Gebied, seizoen en status houden hun kleur, maar klein: stip, code of icoon met tekst.</li>
          <li>Twee grijstinten voor tekst: donker (tekst) en middelgrijs (bijregels).</li>
        </ul>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-line-subtle pt-4 text-sm">
          <span className="eyebrow">Label boven een blok</span>
          <span className="kk-groepskop">Groepskop</span>
          <a href="#/stijlgids" className="kk-link">
            Link
          </a>
          <span className="text-ink-muted">Bijregel</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Activiteiten" value={67} icon={ListChecks} />
        <KpiTile label="Gereed" value="21%" icon={CalendarClock} />
        <KpiTile label="Ontbrekende vaste std." value={2} icon={ShieldAlert} tone="warning" />
        <KpiTile label="Afwijkingen" value={0} icon={GitBranch} hint="van de standaardkoppeling" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Knoppen" subtitle="primary (geel), secondary (zwart omlijnd), ghost, niveau (zwart), danger, danger-zacht">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Naar gesprekken</Button>
            <Button>Open kalender</Button>
            <Button variant="ghost">Annuleren</Button>
            <Button variant="niveau">Zwart</Button>
            <Button variant="danger">Verwijderen</Button>
            <Button variant="danger-zacht" icon={Trash2}>
              Verwijderen
            </Button>
            <Button size="sm" icon={Plus}>
              Klein
            </Button>
            <Button disabled>Uitgeschakeld</Button>
            <IconButton icon={Trash2} label="Verwijderen" />
          </div>
        </Card>

        <Card title="Badges">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_VOLGORDE.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
            <StatusBadge status="gereed" size="md" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {gesprekken.map((g) => (
              <SeizoenBadge key={g.id} gesprek={g} />
            ))}
            <SeizoenBadge gesprek={gesprekken[1]} size="md" />
            <SeizoenBadge gesprek={gesprekken[2]} showLabel={false} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StandaardBadge code="OP3" />
            <VasteStandaardBadge />
            <VasteStandaardBadge compact />
            <VerplichtBadge />
            <AfwijkingBadge reden="Afgestemd op de MTO-cyclus" />
            <Badge tone="brand">Demo-data</Badge>
            <Badge tone="niveau">Lokaal</Badge>
            <Badge tone="success" dot>
              Afgedekt
            </Badge>
            <Badge tone="warning">Leeg</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {GEBIED_CODES.map((g) => (
              <KwaliteitsgebiedTag key={g} gebied={g} />
            ))}
          </div>
          <div className="mt-2">
            <KwaliteitsgebiedTag gebied="VS" showName />
          </div>
        </Card>

        <Card title="Voortgang">
          <div className="space-y-4">
            <ProgressBar
              value={43}
              label="Voorbereiding Lyceum Noord · 3/7 gereed"
              showValue
              color={seizoenKlassen('Winter').var}
            />
            <ProgressBar value={21} />
            <ProgressBar value={75} size="sm" />
          </div>
        </Card>

        <Card title="Filters en invoer">
          <div className="space-y-4">
            <SearchField value={zoek} onChange={setZoek} placeholder="Zoek op naam, code of standaard…" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1">Gebied</span>
              <FilterChip active={gebied === 'Alle'} onClick={() => setGebied('Alle')}>
                Alle
              </FilterChip>
              {GEBIED_CODES.map((g) => (
                <FilterChip key={g} active={gebied === g} onClick={() => setGebied(g)} dotClassName={gebiedKlassen(g).dot}>
                  {g}
                </FilterChip>
              ))}
            </div>
            <SegmentedControl
              value={weergave}
              onChange={setWeergave}
              label="Weergave"
              options={[
                { value: 'matrix', label: 'Matrix', icon: LayoutGrid },
                { value: 'lijst', label: 'Lijst', icon: List },
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Veld label="Eigenaar" hint={PRIVACY_REGEL}>
                {(id) => <Input id={id} placeholder="Naam of rol" />}
              </Veld>
              <Veld label="Gekoppeld gesprek">
                {(id) => <Select id={id} options={gesprekken.map((g) => ({ value: g.id, label: g.naam }))} />}
              </Veld>
            </div>
            <Veld label="Notitie" hint={PRIVACY_REGEL}>
              {(id) => <Textarea id={id} />}
            </Veld>
            <Checkbox
              checked={vink}
              onChange={setVink}
              label="Compliance-overzicht meenemen"
              beschrijving="Dekking per standaard + vaste standaarden"
            />
          </div>
        </Card>

        <Card title="Activiteiten in de matrix" subtitle="Klik om te selecteren">
          <div className="grid max-w-md grid-cols-2 gap-2 rounded-md bg-surface-subtle p-3">
            {[
              {
                id: 'a',
                gebied: 'OP',
                code: 'OP0',
                naam: 'Afname genormeerde toetsen Taal (1)',
                status: 'gereed' as const,
                verplicht: true,
              },
              { id: 'b', gebied: 'OP', code: 'OP3', naam: 'Lesbezoeken ronde 1', status: 'bezig' as const },
              {
                id: 'c',
                gebied: 'VS',
                code: 'VS2',
                naam: 'Tevredenheidsonderzoek leerlingen',
                status: 'gepland' as const,
                afwijking: 'Afgestemd op de MTO-cyclus',
              },
              { id: 'd', gebied: 'SKA', code: 'SKA3', naam: 'Scholen op de Kaart actualiseren', status: 'risico' as const },
            ].map((c) => (
              <ActivityChip key={c.id} {...c} selected={gekozen === c.id} onClick={() => setGekozen(c.id)} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-muted">
            {GEBIED_CODES.map((g) => (
              <span key={g} className="inline-flex items-center gap-1">
                <GebiedDot gebied={g} /> {g}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Begrip" subtitle="Vakterm met uitleg bij hover, focus en tik (domein/begrippen.ts)">
          <p className="text-sm text-ink-body">
            Elke school dekt de <Begrip term="vaste-standaard">vaste standaarden</Begrip> af en bereidt elk{' '}
            <Begrip term="seizoensgesprek" /> voor met een <Begrip term="gespreksdossier" />.
          </p>
        </Card>
        <Card title="Meldingen">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => toast('Lesbezoeken ronde 1 toegevoegd aan de kalender')}>
              Toast succes
            </Button>
            <Button size="sm" onClick={() => toast('3 wijzigingen van collega’s verwerkt', 'info')}>
              Toast info
            </Button>
            <Button size="sm" onClick={() => toast('Activiteit verwijderd', 'danger')}>
              Toast verwijderd
            </Button>
            <Button
              size="sm"
              onClick={() =>
                toast('Toets staat nu in oktober', 'success', { actie: { label: 'Ongedaan maken', onClick: () => toast('Teruggezet', 'info') } })
              }
            >
              Toast met ongedaan maken
            </Button>
            <Button size="sm" onClick={() => setDialoog(true)}>
              Dialoog
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                const ja = await bevestig({
                  titel: 'Cluster verwijderen?',
                  tekst: 'Cluster "Noord" verwijderen?',
                  bevestigLabel: 'Verwijderen',
                  gevaarlijk: true,
                });
                toast(ja ? 'Bevestigd' : 'Geannuleerd', 'info');
              }}
            >
              Bevestigen
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            <InfoBalk>
              Op clusterniveau is de bibliotheek alleen-lezen. Kies een school of bestuur om activiteiten toe te voegen.
            </InfoBalk>
            <InfoBalk tone="warning">Vaste standaard OP3 (Pedagogisch-didactisch handelen) nog niet afgedekt</InfoBalk>
          </div>
          <p className="mt-4 text-xs text-ink-muted">IconTile: alleen het icoon, geen tegel</p>
          <div className="mt-1.5 flex items-center gap-3">
            <IconTile icon={ListChecks} />
            <IconTile icon={ListChecks} tone="brand" />
            <IconTile icon={ListChecks} tone="success" />
            <IconTile icon={ListChecks} tone="info" />
            <IconTile icon={ListChecks} tone="danger" />
          </div>
        </Card>
      </div>

      <section>
        <SectionHeader title="Lege toestand" subtitle="EmptyState, met en zonder watermerk" />
        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState
            icon={ListChecks}
            title="Nog geen activiteiten gepland"
            body="Voeg activiteiten toe vanuit de bibliotheek om je kalender te vullen."
            action={<Button variant="primary">Naar bibliotheek</Button>}
            watermark
          />
          <Card>
            <EmptyState
              compact
              icon={ListChecks}
              title="Alles op koers"
              body="Geen openstaande aandachtspunten voor dit niveau."
            />
          </Card>
        </div>
      </section>

      <Dialog
        open={dialoog}
        onClose={() => setDialoog(false)}
        title="Lesbezoeken ronde 1"
        subtitle="OP3-02 · okt"
        footer={
          <>
            <Button variant="danger-zacht" className="mr-auto" icon={Trash2}>
              Verwijderen
            </Button>
            <Button variant="ghost" onClick={() => setDialoog(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={() => setDialoog(false)}>
              Opslaan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <KwaliteitsgebiedTag gebied="OP" />
            <StandaardBadge code="OP3" />
            <SeizoenBadge gesprek={gesprekken[0]} />
          </div>
          <Veld label="Eigen naam (optioneel)" hint="Pas de naam aan naar je eigen terminologie.">
            {(id) => <Input id={id} placeholder="Lesbezoeken ronde 1" />}
          </Veld>
          <Veld label="Notitie" hint={PRIVACY_REGEL}>
            {(id) => <Textarea id={id} />}
          </Veld>
        </div>
      </Dialog>
    </div>
  );
}
