/**
 * Dashboard (inventaris §1.10): komend gesprek, voortgang, KPI's, aandachtspunten en per niveau
 * de checklist (school) of de voortgang per school en de heatmap (bestuur en cluster).
 * De AI-samenvatting van het origineel vervalt.
 */
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CircleCheckBig,
  KeyRound,
  Layers,
  ListChecks,
  School as SchoolIcoon,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  IconTile,
  InfoBalk,
  KpiTile,
  PageHeader,
  ProgressBar,
  StatusBadge,
  STATUS_STIJL,
  cx,
  gesprekIcoon,
  seizoenKlassen,
  type IconTileTone,
} from '../componenten';
import {
  aandachtspunten,
  afwijkingen,
  gemiddeldGereed,
  itemsVoorGesprek,
  itemsVanSchool,
  ontbrekendeVasteStandaarden,
  overzichtPerSchool,
  schoolIdsVoorNiveau,
  voortgang,
  type AandachtspuntSoort,
  type SchoolOverzicht,
} from '../domein/berekeningen';
import { activiteitVan, aantal, effectieveNaam, formatDatumLang, standaardenVoor } from '../domein/hulp';
import type { KalenderItem, Status } from '../domein/types';
import { useKomendGesprek, useScope, useStore } from '../store';
import { Heatmap } from './dashboard/Heatmap';
import { VERSTREKEN_UITLEG, dagenTekst } from './dashboard/komend';

export default function Dashboard() {
  const { state, niveau, clusterId, setNiveau, setSchoolId } = useStore();
  const { scope, scopeLabel, editable } = useScope();
  const navigate = useNavigate();
  const isSchool = niveau === 'school';

  const totaal = voortgang(scope.items);
  const schoolIds = useMemo(
    () => (isSchool ? [] : schoolIdsVoorNiveau(state.organisatie, niveau, clusterId)),
    [state.organisatie, niveau, clusterId, isSchool],
  );
  const overzicht = useMemo(() => overzichtPerSchool(state, schoolIds), [state, schoolIds]);

  const kiesSchool = (id: string) => {
    setSchoolId(id);
    setNiveau('school');
    navigate('/dashboard');
  };

  const ontbrekend = isSchool
    ? ontbrekendeVasteStandaarden(scope.items, scope.standaarden).length
    : overzicht.reduce((s, o) => s + o.ontbrekendeKern, 0);
  const aantalAfwijkingen = isSchool ? afwijkingen(scope.items).length : overzicht.reduce((s, o) => s + o.afwijkingen, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={scopeLabel}
        subtitle={`Schooljaar ${state.schooljaar} · ${aantal(scope.items.length, 'activiteit', 'activiteiten')} op de ${
          niveau === 'bestuur' ? 'bestuurskalender' : niveau === 'cluster' ? 'kalenders van dit cluster' : 'kalender'
        }`}
      />

      {niveau === 'cluster' && (
        <InfoBalk tone="niveau" icon={Layers}>
          Clusterweergave is alleen-lezen (samengevoegde scholen). Kies een school om te bewerken.
        </InfoBalk>
      )}
      {editable && scope.items.length === 0 && (
        <InfoBalk tone="info">
          Er staan nog geen activiteiten op deze kalender.{' '}
          <Link to="/bibliotheek" className="font-semibold text-status-info underline">
            Voeg activiteiten toe vanuit de bibliotheek
          </Link>
          .
        </InfoBalk>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <KomendKaart items={scope.items} scopeLabel={scopeLabel} />
        <VoortgangKaart
          v={totaal}
          bron={niveau === 'bestuur' ? 'Bestuurskalender' : niveau === 'cluster' ? 'Alle scholen in dit cluster' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isSchool ? (
          <>
            <KpiTile label="Activiteiten" value={totaal.totaal} icon={ListChecks} />
            <KpiTile label="Gereed" value={`${totaal.pct}%`} icon={CalendarCheck} />
          </>
        ) : (
          <>
            <KpiTile label={niveau === 'cluster' ? 'Scholen in cluster' : 'Scholen'} value={schoolIds.length} icon={SchoolIcoon} />
            <KpiTile label="Gemiddeld gereed" value={`${gemiddeldGereed(overzicht)}%`} icon={CalendarCheck} hint="Over alle scholen" />
          </>
        )}
        <KpiTile
          label="Ontbrekende vaste std."
          value={ontbrekend}
          icon={ShieldAlert}
          tone={ontbrekend > 0 ? 'warning' : 'neutral'}
          hint={isSchool ? undefined : 'Opgeteld over de scholen'}
        />
        <KpiTile
          label="Afwijkingen"
          value={aantalAfwijkingen}
          icon={ArrowLeftRight}
          hint={isSchool ? undefined : 'Opgeteld over de scholen'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Aandachtspunten items={scope.items} overzicht={overzicht} niveau={niveau} onKiesSchool={kiesSchool} />
        {isSchool ? (
          <Checklist items={scope.items} />
        ) : (
          <VoortgangPerSchool overzicht={overzicht} onKiesSchool={kiesSchool} />
        )}
      </div>

      {!isSchool && overzicht.length > 0 && <Heatmap state={state} overzicht={overzicht} onKiesSchool={kiesSchool} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function KomendKaart({ items, scopeLabel }: { items: KalenderItem[]; scopeLabel: string }) {
  const komend = useKomendGesprek();
  const { niveau } = useStore();

  if (!komend) {
    return (
      <Card className="lg:col-span-2">
        <p className="eyebrow">Komend gesprek</p>
        <p className="mt-2 text-sm text-ink-muted">Er is nog geen gesprekscyclus ingesteld.</p>
        {niveau === 'bestuur' ? (
          <Link to="/organisatie" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-niveau-strong hover:underline">
            Cyclus instellen <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : (
          <p className="mt-1 text-xs text-ink-subtle">Het bestuur stelt de cyclus in onder Organisatie.</p>
        )}
      </Card>
    );
  }

  const g = komend.gesprek;
  const k = seizoenKlassen(g.kleur);
  const Icoon = gesprekIcoon(g.icoon);
  const v = voortgang(itemsVoorGesprek(items, g.id));

  return (
    <section className={cx('min-w-0 rounded-lg border p-5 shadow-xs lg:col-span-2', k.surface, k.border)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-md border bg-surface-card', k.border)}>
            <Icoon className={cx('h-6 w-6', k.ink)} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={cx('eyebrow', k.ink)}>Komend gesprek</p>
            <h2 className="text-h2 text-ink-strong">{g.naam}</h2>
            {g.thema && <p className="mt-0.5 text-sm text-ink-body">{g.thema}</p>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {komend.verstreken ? (
            <p className="text-sm font-semibold text-status-warning">Deadline voorbij</p>
          ) : (
            <>
              <p className={cx('tnum text-display font-bold leading-none', k.ink)}>{komend.dagenTot}</p>
              <p className="mt-1 text-xs text-ink-muted">{komend.dagenTot === 1 ? 'dag' : 'dagen'} tot deadline</p>
            </>
          )}
          <p className="tnum mt-0.5 text-xs text-ink-subtle">{formatDatumLang(komend.datum)}</p>
        </div>
      </div>

      {komend.verstreken && (
        <p className="mt-3 text-sm text-ink-body">
          {VERSTREKEN_UITLEG} ({dagenTekst(komend)})
        </p>
      )}

      <div className="mt-5 rounded-md bg-surface-card p-3">
        <ProgressBar
          value={v.pct}
          color={k.var}
          showValue
          label={
            <>
              Voorbereiding {scopeLabel} · {v.gereed}/{v.totaal} gereed
            </>
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink to="/gesprekken" variant="primary" size="sm" icon={ArrowRight}>
          Naar gesprekken
        </ButtonLink>
        <ButtonLink to="/kalender" variant="secondary" size="sm">
          Open kalender
        </ButtonLink>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function VoortgangKaart({ v, bron }: { v: ReturnType<typeof voortgang>; bron?: string }) {
  const tellers: { status: Status; waarde: number }[] = [
    { status: 'gereed', waarde: v.gereed },
    { status: 'bezig', waarde: v.bezig },
    { status: 'gepland', waarde: v.gepland },
    { status: 'risico', waarde: v.risico },
  ];
  return (
    <Card>
      <p className="eyebrow">Voortgang totaal</p>
      {bron && <p className="mt-0.5 text-xs text-ink-subtle">{bron}</p>}
      <p className="mt-2 flex items-baseline gap-2">
        <span className="tnum text-display font-bold leading-none text-niveau-strong">{v.pct}%</span>
        <span className="text-sm text-ink-muted">gereed</span>
      </p>
      <ProgressBar value={v.pct} className="mt-4" />
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {tellers.map((t) => (
          <div key={t.status} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-ink-body">
              <span aria-hidden className={cx('h-2 w-2 rounded-full', STATUS_STIJL[t.status].dot)} />
              {STATUS_STIJL[t.status].label}
            </dt>
            <dd className="tnum font-semibold text-ink-strong">{t.waarde}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

interface Punt {
  sleutel: string;
  icon: LucideIcon;
  toon: IconTileTone;
  tekst: string;
  to?: string;
  onClick?: () => void;
  actie: string;
}

const PUNT_STIJL: Record<AandachtspuntSoort, { icon: LucideIcon; toon: IconTileTone; to: string; actie: string }> = {
  'vaste-standaard': { icon: KeyRound, toon: 'brand', to: '/compliance', actie: 'Bekijk dekking' },
  verstreken: { icon: CalendarClock, toon: 'danger', to: '/kalender', actie: 'Open kalender' },
  risico: { icon: TriangleAlert, toon: 'warning', to: '/kalender', actie: 'Open kalender' },
  afwijking: { icon: ArrowLeftRight, toon: 'info', to: '/compliance', actie: 'Bekijk afwijkingen' },
};

function Aandachtspunten({
  items,
  overzicht,
  niveau,
  onKiesSchool,
}: {
  items: KalenderItem[];
  overzicht: SchoolOverzicht[];
  niveau: string;
  onKiesSchool: (id: string) => void;
}) {
  const { state } = useStore();
  const { scope } = useScope();
  const punten: Punt[] = aandachtspunten(items, scope.standaarden)
    // Op clusterniveau staan ontbrekende vaste standaarden hieronder per school (net als de KPI).
    .filter((p) => !(niveau === 'cluster' && p.soort === 'vaste-standaard'))
    .map((p, i) => ({ sleutel: `${p.soort}-${i}`, tekst: p.tekst, ...PUNT_STIJL[p.soort], to: PUNT_STIJL[p.soort].to }));

  if (niveau !== 'school') {
    const schoolStandaarden = standaardenVoor(false);
    for (const o of overzicht) {
      if (o.ontbrekendeKern === 0) continue;
      const codes = ontbrekendeVasteStandaarden(itemsVanSchool(state, o.schoolId), schoolStandaarden).map((s) => s.code);
      punten.push({
        sleutel: `school-${o.schoolId}`,
        icon: KeyRound,
        toon: 'brand',
        tekst: `${o.school?.naam ?? 'School'}: vaste ${codes.length === 1 ? 'standaard' : 'standaarden'} ${codes.join(', ')} nog niet afgedekt`,
        onClick: () => onKiesSchool(o.schoolId),
        actie: 'Open school',
      });
    }
  }

  return (
    <Card title="Aandachtspunten" subtitle="Wat vraagt aandacht voor het komend gesprek">
      {punten.length === 0 ? (
        <EmptyState
          compact
          icon={CircleCheckBig}
          title="Alles op koers"
          body="Geen openstaande aandachtspunten voor dit niveau."
        />
      ) : (
        <ul className="-my-2 divide-y divide-line-subtle">
          {punten.map((p) => {
            const inhoud = (
              <>
                <IconTile icon={p.icon} tone={p.toon} size="sm" />
                <span className="min-w-0 flex-1 text-sm text-ink-strong">{p.tekst}</span>
                <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-niveau-strong group-hover:underline sm:inline-flex">
                  {p.actie} <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle sm:hidden" aria-hidden />
              </>
            );
            const klassen = 'group flex w-full items-center gap-3 py-2.5 text-left';
            return (
              <li key={p.sleutel}>
                {p.onClick ? (
                  <button type="button" onClick={p.onClick} className={klassen}>
                    {inhoud}
                  </button>
                ) : (
                  <Link to={p.to!} className={klassen}>
                    {inhoud}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

const OPEN_EERST: Record<Status, number> = { risico: 0, bezig: 1, gepland: 2, gereed: 3 };

function Checklist({ items }: { items: KalenderItem[] }) {
  const komend = useKomendGesprek();
  if (!komend) {
    return (
      <Card title="Checklist" subtitle="Vereiste activiteiten voor dit gesprek">
        <EmptyState compact icon={ListChecks} title="Geen gesprekscyclus" body="Er is nog geen gesprekscyclus ingesteld." />
      </Card>
    );
  }
  const lijst = itemsVoorGesprek(items, komend.gesprek.id)
    .map((item, volgorde) => ({ item, volgorde, verplicht: !!activiteitVan(item)?.verplicht }))
    .sort(
      (a, b) =>
        OPEN_EERST[a.item.status] - OPEN_EERST[b.item.status] ||
        Number(b.verplicht) - Number(a.verplicht) ||
        a.volgorde - b.volgorde,
    );
  const getoond = lijst.slice(0, 8);
  const gereed = lijst.filter((x) => x.item.status === 'gereed').length;

  return (
    <Card
      title={`Checklist ${komend.gesprek.naam}`}
      subtitle="Vereiste activiteiten voor dit gesprek"
      action={
        lijst.length > 0 ? (
          <Badge tone={gereed === lijst.length ? 'success' : 'neutral'} size="sm">
            {gereed}/{lijst.length} gereed
          </Badge>
        ) : undefined
      }
    >
      {lijst.length === 0 ? (
        <EmptyState compact icon={ListChecks} title="Geen activiteiten" body="Nog niets gekoppeld aan dit gesprek." />
      ) : (
        <>
          <ul className="-my-2 divide-y divide-line-subtle">
            {getoond.map(({ item, verplicht }) => (
              <li key={item.uid}>
                <Link
                  to={`/kalender?item=${encodeURIComponent(item.uid)}`}
                  className="group flex items-center gap-3 py-2.5"
                  title="Open in de kalender"
                >
                  <span className="min-w-0 flex-1 text-sm text-ink-strong group-hover:underline">
                    {effectieveNaam(item)}
                    {verplicht && (
                      <span className="ml-1 font-semibold text-status-warning" title="Verplicht">
                        *<span className="sr-only"> verplicht</span>
                      </span>
                    )}
                  </span>
                  <StatusBadge status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-3 text-xs text-ink-muted">
            <span>
              <span className="font-semibold text-status-warning">*</span> verplicht
              {lijst.length > getoond.length && ` · ${lijst.length - getoond.length} meer`}
            </span>
            <Link to="/gesprekken" className="inline-flex items-center gap-1 font-semibold text-niveau-strong hover:underline">
              Alle activiteiten van dit gesprek <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function VoortgangPerSchool({ overzicht, onKiesSchool }: { overzicht: SchoolOverzicht[]; onKiesSchool: (id: string) => void }) {
  return (
    <Card
      title="Voortgang per school"
      subtitle="Percentage gereed van alle activiteiten"
      action={
        <Link to="/gesprekken" className="text-sm font-semibold text-niveau-strong hover:underline">
          Details
        </Link>
      }
    >
      {overzicht.length === 0 ? (
        <EmptyState
          compact
          icon={SchoolIcoon}
          title="Nog geen scholen"
          body="Voeg scholen toe onder Organisatie."
          action={
            <ButtonLink to="/organisatie" size="sm">
              Naar organisatie
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-1">
          {overzicht.map((o) => (
            <li key={o.schoolId}>
              <button
                type="button"
                onClick={() => onKiesSchool(o.schoolId)}
                className="group grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-sm px-1 py-1.5 text-left hover:bg-surface-hover sm:grid-cols-[minmax(0,11rem)_1fr_auto]"
                title="Open het dashboard van deze school"
              >
                <span className="truncate text-sm text-ink-strong group-hover:underline">{o.school?.naam ?? 'Onbekende school'}</span>
                <ProgressBar value={o.voortgang.pct} size="sm" />
                <span className="flex items-center justify-end gap-2">
                  {o.ontbrekendeKern > 0 && (
                    <Badge tone="warning" size="sm" icon={KeyRound} title="Ontbrekende vaste standaarden">
                      {o.ontbrekendeKern}
                    </Badge>
                  )}
                  <span className="tnum w-10 text-right text-sm font-semibold text-ink-strong">{o.voortgang.pct}%</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
