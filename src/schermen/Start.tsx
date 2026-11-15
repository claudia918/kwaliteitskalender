/**
 * Start: het ene startscherm voor alle niveaus (vervangt Start en Dashboard).
 * Bovenaan de volgende stap in één zin met één knop, daaronder de werklijst (deze maand of voor het
 * komende gesprek) waarin je met één klik de status zet. Cijfers en heatmap staan eronder, inklapbaar.
 * Een lege kalender leidt de gebruiker met "Aan de slag" naar de eerste activiteiten.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Circle, FolderSync, Layers, X } from 'lucide-react';
import {
  Begrip,
  Button,
  ButtonLink,
  IconButton,
  InfoBalk,
  ProgressBar,
  cx,
  gesprekIcoon,
  seizoenKlassen,
  useToast,
} from '../componenten';
import {
  heeftActiviteiten,
  itemsVoorGesprek,
  ontbrekendeVasteStandaarden,
  overzichtPerSchool,
  schoolIdsVoorNiveau,
  voortgang,
  type KomendGesprek,
} from '../domein/berekeningen';
import { aantal, effectieveNaam, formatDatumLang, formatTijdstip, standaardenVoor } from '../domein/hulp';
import { gewijzigdSinds, stapTekst, volgendeStap, type VolgendeStap } from '../domein/thuis';
import { useBezoek, useKomendGesprek, useScope, useStore, useVoorkeur } from '../store';
import { useSync } from '../sync/SyncProvider';
import { VERSTREKEN_UITLEG, dagenTekst } from './dashboard/komend';
import { Overzicht } from './start/Overzicht';
import { Werklijst } from './start/Werklijst';

function weekNummer(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dag);
  const jan1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - jan1.getTime()) / 86_400_000 + 1) / 7);
}

export default function Start() {
  const { state, niveau, clusterId, setNiveau, setSchoolId } = useStore();
  const { scope, scopeLabel, editable } = useScope();
  const komend = useKomendGesprek();
  const navigate = useNavigate();
  const [overzichtOpen, setOverzichtOpen] = useVoorkeur<boolean>('start.overzicht', true);

  const schoolIds = useMemo(
    () => (niveau === 'school' ? [] : schoolIdsVoorNiveau(state.organisatie, niveau, clusterId)),
    [state.organisatie, niveau, clusterId],
  );
  const overzicht = useMemo(() => overzichtPerSchool(state, schoolIds), [state, schoolIds]);

  const kiesSchool = (id: string) => {
    setSchoolId(id);
    setNiveau('school');
    navigate('/');
    window.scrollTo(0, 0);
  };

  const stap = useMemo(() => {
    const schoolStandaarden = standaardenVoor(false);
    return volgendeStap({
      niveau,
      items: scope.items,
      standaarden: scope.standaarden,
      komend,
      aantalScholen: state.organisatie.scholen.length,
      scholenZonderVaste:
        niveau === 'school'
          ? undefined
          : overzicht
              .filter((o) => o.ontbrekendeKern > 0)
              .map((o) => ({
                schoolId: o.schoolId,
                schoolNaam: o.school?.naam ?? 'School',
                codes: ontbrekendeVasteStandaarden(state.schoolKalenders[o.schoolId] ?? [], schoolStandaarden).map((s) => s.code),
              })),
      elders: heeftActiviteiten(state),
    });
  }, [niveau, scope, komend, state, overzicht]);

  const vandaag = new Date();
  const datum = vandaag.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  const leeg = stap.soort === 'kalender-leeg' || stap.soort === 'scholen-toevoegen' || (niveau === 'cluster' && scope.items.length === 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line-subtle pb-5">
        <div className="min-w-0">
          <p className="tnum text-sm text-ink-muted first-letter:uppercase">
            {datum} · week {weekNummer(vandaag)}
          </p>
          <h1 className="mt-1 text-h1 text-ink-strong">{scopeLabel}</h1>
          <p className="mt-1.5 text-base text-ink-muted">
            {niveau === 'bestuur' ? (
              <>
                De <Begrip term="bestuurskalender" /> en {aantal(state.organisatie.scholen.length, 'school', 'scholen')}
              </>
            ) : niveau === 'cluster' ? (
              <>
                <Begrip term="cluster">Cluster</Begrip> van {aantal(schoolIds.length, 'school', 'scholen')}, alleen lezen
              </>
            ) : (
              <>
                {aantal(scope.items.length, 'activiteit', 'activiteiten')} op de <Begrip term="schoolkalender">kalender</Begrip>
              </>
            )}
            {` · schooljaar ${state.schooljaar}`}
          </p>
        </div>
      </header>

      <SindsVorigBezoek />

      {niveau === 'cluster' && (
        <InfoBalk tone="niveau" icon={Layers}>
          Je bekijkt de scholen van dit cluster samen, alleen om te lezen. Kies bovenin een school om iets bij te werken.
        </InfoBalk>
      )}

      <VolgendeStapKaart stap={stap} komend={komend} bewerkbaar={editable} onKiesSchool={kiesSchool} />

      {/* Lege kalender: eerst de stappen; daarna gaat het werk voor en staat Aan de slag eronder. */}
      {leeg && <AanDeSlag />}

      {!leeg && <Werklijst komend={komend} />}

      {!leeg && <AanDeSlag />}

      {!leeg && (
        <section aria-labelledby="overzicht-kop" className="space-y-4">
          <button
            type="button"
            data-rondleiding="hoe-staat-het"
            onClick={() => setOverzichtOpen(!overzichtOpen)}
            aria-expanded={overzichtOpen}
            aria-controls="overzicht-inhoud"
            className="group flex w-full items-center gap-3 border-b border-line-subtle pb-2 text-left"
          >
            <span className="min-w-0 flex-1">
              <span id="overzicht-kop" className="block text-h3 text-ink-strong">
                Hoe staat het ervoor
              </span>
              <span className="block text-sm text-ink-muted">
                {overzichtOpen
                  ? 'Voortgang, aandachtspunten' + (niveau === 'school' ? '.' : ' en de stand per school.')
                  : `${voortgang(scope.items).pct}% gereed. Klik om de cijfers te tonen.`}
              </span>
            </span>
            <ChevronDown
              className={cx('h-5 w-5 shrink-0 text-ink-muted transition-transform duration-fast group-hover:text-ink-strong', overzichtOpen && 'rotate-180')}
              aria-hidden
            />
          </button>
          {overzichtOpen && (
            <div id="overzicht-inhoud">
              <Overzicht overzicht={overzicht} onKiesSchool={kiesSchool} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Volgende stap en komend gesprek                                      */
/* ------------------------------------------------------------------ */

function VolgendeStapKaart({
  stap,
  komend,
  bewerkbaar,
  onKiesSchool,
}: {
  stap: VolgendeStap;
  komend: KomendGesprek | null;
  bewerkbaar: boolean;
  onKiesSchool: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { pasSjabloonToe, state } = useStore();
  const toast = useToast();
  const { zin, knop } = stapTekst(stap, bewerkbaar);

  const open = (uid: string) => navigate(`/kalender?item=${encodeURIComponent(uid)}`);
  let actie: () => void;
  let tweede: { label: string; to: string } | null = null;
  switch (stap.soort) {
    case 'scholen-toevoegen':
      actie = () => navigate('/organisatie');
      break;
    case 'kalender-leeg':
      actie = () => {
        pasSjabloonToe();
        toast('Aanbevolen activiteiten toegevoegd');
      };
      tweede = { label: 'Zelf kiezen in de bibliotheek', to: '/bibliotheek' };
      break;
    case 'verstreken':
    case 'risico':
      actie = () => open(stap.items[0].uid);
      tweede = { label: 'Naar de kalender', to: '/kalender' };
      break;
    case 'vaste-standaard':
      actie = () => navigate(`/bibliotheek?zoek=${encodeURIComponent(stap.codes[0])}`);
      tweede = { label: 'Bekijk de dekking', to: '/compliance' };
      break;
    case 'school-vaste-standaard':
      actie = () => onKiesSchool(stap.schoolId);
      tweede = { label: 'Bekijk de dekking', to: '/compliance' };
      break;
    case 'gesprek-open':
      actie = () => open(stap.eerste.uid);
      tweede = { label: 'Alles voor dit gesprek', to: '/gesprekken' };
      break;
    case 'gesprek-klaar':
      actie = () => navigate('/export');
      tweede = { label: 'Naar de gesprekken', to: '/gesprekken' };
      break;
    case 'gesprek-leeg':
      actie = () => navigate('/bibliotheek');
      tweede = { label: 'Naar de gesprekken', to: '/gesprekken' };
      break;
    case 'geen-cyclus':
      actie = () => navigate('/organisatie');
      break;
  }

  return (
    <section
      aria-labelledby="volgende-stap"
      className="grid overflow-hidden rounded-md border border-line-subtle bg-surface-card lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div data-rondleiding="volgende-stap" className="relative p-5 sm:p-6">
        <p id="volgende-stap" className="eyebrow">
          Volgende stap
        </p>
        <p className="mt-2 max-w-2xl text-h3 font-semibold leading-snug text-ink-strong">{zin}</p>
        {stap.soort === 'kalender-leeg' && (
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Dat zijn de verplichte activiteiten uit het <Begrip term="startsjabloon" />
            {state.organisatie.scholen.length > 1 ? ', voor elke school en voor het bestuur' : ''}.
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button variant="primary" iconRight={ArrowRight} onClick={actie}>
            {knop}
          </Button>
          {tweede && (
            <Link to={tweede.to} className="text-sm font-semibold kk-link">
              {tweede.label}
            </Link>
          )}
        </div>
      </div>
      <KomendGesprekPaneel komend={komend} />
    </section>
  );
}

function KomendGesprekPaneel({ komend }: { komend: KomendGesprek | null }) {
  const { scope, scopeLabel } = useScope();
  if (!komend) {
    return (
      <aside className="border-t border-line-subtle p-5 lg:border-l lg:border-t-0">
        <p className="eyebrow">Komend gesprek</p>
        <p className="mt-2 text-sm text-ink-muted">Er is nog geen gesprekscyclus ingesteld.</p>
      </aside>
    );
  }
  const g = komend.gesprek;
  const k = seizoenKlassen(g.kleur);
  const Icoon = gesprekIcoon(g.icoon);
  const v = voortgang(itemsVoorGesprek(scope.items, g.id));
  return (
    <aside
      aria-label="Komend gesprek"
      className="flex flex-col justify-between gap-4 border-t border-line-subtle p-5 lg:border-l lg:border-t-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            Komend <Begrip term="seizoensgesprek">gesprek</Begrip>
          </p>
          <p className="mt-1 flex items-center gap-2 text-h3 text-ink-strong">
            <Icoon className={cx('h-5 w-5 shrink-0', k.ink)} aria-hidden />
            {g.naam}
          </p>
          {g.thema && <p className="text-sm text-ink-body">{g.thema}</p>}
        </div>
        <div className="shrink-0 text-right">
          {komend.verstreken ? (
            <p className="text-sm font-semibold text-status-warning">Voorbij</p>
          ) : (
            <>
              <p className="tnum text-h1 font-bold leading-none text-ink-strong">{komend.dagenTot}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{komend.dagenTot === 1 ? 'dag' : 'dagen'}</p>
            </>
          )}
        </div>
      </div>
      {komend.verstreken ? (
        <p className="text-xs text-ink-body">
          {VERSTREKEN_UITLEG} ({dagenTekst(komend)})
        </p>
      ) : (
        <div>
          <ProgressBar
            value={v.pct}
            color={k.var}
            size="sm"
            showValue
            label={
              <>
                {v.totaal === 0 ? 'Nog niets gekoppeld' : `${v.gereed} van ${v.totaal} gereed`}
                <span className="sr-only"> voor {scopeLabel}</span>
              </>
            }
          />
          <p className="tnum mt-2 text-xs text-ink-muted">Deadline {formatDatumLang(komend.datum)}</p>
        </div>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Aan de slag (eigen kalender)                                         */
/* ------------------------------------------------------------------ */

function AanDeSlag() {
  const { state, verbergOnboarding } = useStore();
  const sync = useSync();
  if (state.modus !== 'eigen' || state.onboardingVerborgen) return null;
  const org = state.organisatie;
  const alleItems = [...state.bestuurItems, ...Object.values(state.schoolKalenders).flat()];

  const stappen: { klaar: boolean; titel: string; tekst: string; knop?: { label: string; to?: string; actie?: () => void } }[] = [
    {
      klaar: org.bestuurNaam.trim().length > 0 && org.scholen.length > 0,
      titel: 'Bestuur en scholen vastleggen',
      tekst: org.scholen.length > 0 ? `${org.bestuurNaam || 'Bestuur'}, ${aantal(org.scholen.length, 'school', 'scholen')}.` : 'Voeg minstens één school toe.',
      knop: { label: 'Scholen toevoegen', to: '/organisatie' },
    },
    {
      klaar: heeftActiviteiten(state),
      titel: 'Activiteiten op de kalender zetten',
      tekst: 'Gebruik de knop hierboven, of kies zelf uit de bibliotheek.',
      knop: { label: 'Naar de bibliotheek', to: '/bibliotheek' },
    },
    {
      klaar: alleItems.some((i) => i.status !== 'gepland'),
      titel: 'Je eerste activiteit bijwerken',
      tekst: 'Zet bij "Deze maand" een activiteit op bezig of gereed. Zo houd je de voortgang bij.',
    },
    {
      klaar: sync.status === 'gekoppeld',
      titel: 'Samenwerken met collega’s (als je dat wilt)',
      tekst: 'Koppel één kalenderbestand in een gedeelde map, dan werken jullie in dezelfde kalender.',
      knop: { label: 'Kalenderbestand koppelen', to: '/gegevens' },
    },
  ];
  const klaar = stappen.filter((s) => s.klaar).length;
  if (klaar === stappen.length) return null;
  const volgende = stappen.findIndex((s) => !s.klaar);

  return (
    <section
      data-rondleiding="aan-de-slag"
      className="rounded-md border border-line-subtle bg-surface-card p-5"
      aria-labelledby="aan-de-slag"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">
            Aan de slag · {klaar} van {stappen.length}
          </p>
          <h2 id="aan-de-slag" className="mt-1 text-h3 text-ink-strong">
            Zet je kwaliteitskalender op
          </h2>
        </div>
        <IconButton icon={X} label="Aan de slag verbergen" size="sm" onClick={verbergOnboarding} />
      </div>
      <ol className="mt-4 divide-y divide-line-subtle border-t border-line-subtle">
        {stappen.map((s, i) => (
          <li key={s.titel} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
            {s.klaar ? (
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-status-success text-white">
                <Check className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Klaar:</span>
              </span>
            ) : (
              <Circle className={cx('mt-0.5 h-5 w-5 shrink-0', i === volgende ? 'text-ink-strong' : 'text-gray-400')} aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              <span className={cx('block text-sm', s.klaar ? 'text-ink-muted line-through' : 'font-semibold text-ink-strong')}>{s.titel}</span>
              {!s.klaar && <span className="mt-0.5 block text-xs text-ink-muted">{s.tekst}</span>}
            </span>
            {!s.klaar && s.knop && (
              <span className="w-full pl-8 sm:w-auto sm:pl-0">
                {s.knop.actie ? (
                  <Button size="sm" variant={i === volgende ? 'niveau' : 'secondary'} onClick={s.knop.actie}>
                    {s.knop.label}
                  </Button>
                ) : (
                  <ButtonLink
                    size="sm"
                    variant={i === volgende && s.knop.to !== '/bibliotheek' ? 'niveau' : 'secondary'}
                    to={s.knop.to!}
                    icon={s.knop.to === '/gegevens' ? FolderSync : undefined}
                  >
                    {s.knop.label}
                  </ButtonLink>
                )}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sinds je vorige bezoek (alleen met een gekoppeld kalenderbestand)    */
/* ------------------------------------------------------------------ */

function SindsVorigBezoek() {
  const { vorig, begin } = useBezoek();
  const { scope } = useScope();
  const sync = useSync();
  const [weg, setWeg] = useState(false);
  const [open, setOpen] = useState(false);
  const lijst = useMemo(() => (vorig ? gewijzigdSinds(scope.items, vorig, begin) : []), [scope.items, vorig, begin]);
  if (weg || !vorig || sync.status !== 'gekoppeld' || lijst.length === 0) return null;
  return (
    <div data-rondleiding="sinds-vorig-bezoek" className="rounded-md border border-line-subtle bg-surface-card px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-ink-body">
          <strong className="text-ink-strong">Sinds je vorige bezoek</strong> ({formatTijdstip(vorig)}) zijn{' '}
          {aantal(lijst.length, 'activiteit', 'activiteiten')} gewijzigd in het gedeelde{' '}
          <Begrip term="kalenderbestand" />.{' '}
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="font-semibold kk-link">
            {open ? 'Verbergen' : 'Laten zien'}
          </button>
        </p>
        <IconButton icon={X} label="Gezien" size="sm" onClick={() => setWeg(true)} />
      </div>
      {open && (
        <ul className="mt-2 space-y-1 pl-1">
          {lijst.slice(0, 10).map((i) => (
            <li key={i.uid}>
              <Link to={`/kalender?item=${encodeURIComponent(i.uid)}`} className="text-ink-strong hover:underline">
                {effectieveNaam(i)}
              </Link>{' '}
              <span className="text-xs text-ink-muted">· {i.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
