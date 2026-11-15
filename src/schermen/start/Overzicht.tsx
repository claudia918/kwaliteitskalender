/**
 * "Hoe staat het ervoor": voortgang, kerncijfers, aandachtspunten en (bestuur en cluster) de
 * voortgang per school en de heatmap. Was het Dashboard; staat nu op Start onder wat je moet doen.
 */
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  CircleCheckBig,
  KeyRound,
  School as SchoolIcoon,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Begrip,
  ButtonLink,
  Card,
  EmptyState,
  IconTile,
  ProgressBar,
  STATUS_STIJL,
  cx,
  type IconTileTone,
} from '../../componenten';
import {
  aandachtspunten,
  afwijkingen,
  gemiddeldGereed,
  itemsVanSchool,
  ontbrekendeVasteStandaarden,
  voortgang,
  type AandachtspuntSoort,
  type SchoolOverzicht,
} from '../../domein/berekeningen';
import { standaardenVoor } from '../../domein/hulp';
import type { KalenderItem, Niveau, Status } from '../../domein/types';
import { useScope, useStore } from '../../store';
import { Heatmap } from '../dashboard/Heatmap';

export function Overzicht({
  overzicht,
  onKiesSchool,
}: {
  overzicht: SchoolOverzicht[];
  onKiesSchool: (id: string) => void;
}) {
  const { state, niveau } = useStore();
  const { scope } = useScope();
  const isSchool = niveau === 'school';
  const v = voortgang(scope.items);
  const ontbrekend = isSchool
    ? ontbrekendeVasteStandaarden(scope.items, scope.standaarden).length
    : overzicht.reduce((s, o) => s + o.ontbrekendeKern, 0);
  const aantalAfwijkingen = isSchool ? afwijkingen(scope.items).length : overzicht.reduce((s, o) => s + o.afwijkingen, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Cijfers
          v={v}
          bron={niveau === 'bestuur' ? 'Bestuurskalender' : niveau === 'cluster' ? 'Alle scholen in dit cluster samen' : 'Hele schooljaar'}
          extra={[
            ...(isSchool
              ? []
              : [{ label: 'Gemiddeld gereed per school', waarde: `${gemiddeldGereed(overzicht)}%` }]),
            {
              label: (
                <>
                  Ontbrekende <Begrip term="vaste-standaard">vaste standaarden</Begrip>
                </>
              ),
              waarde: String(ontbrekend),
              let: ontbrekend > 0,
            },
            {
              label: (
                <>
                  <Begrip term="afwijking">Afwijkingen</Begrip> van het sjabloon
                </>
              ),
              waarde: String(aantalAfwijkingen),
            },
          ]}
        />
        <div className="lg:col-span-2">
          <Aandachtspunten items={scope.items} overzicht={overzicht} niveau={niveau} onKiesSchool={onKiesSchool} />
        </div>
      </div>
      {!isSchool && <VoortgangPerSchool overzicht={overzicht} onKiesSchool={onKiesSchool} />}
      {!isSchool && overzicht.length > 0 && <Heatmap state={state} overzicht={overzicht} onKiesSchool={onKiesSchool} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Cijfers({
  v,
  bron,
  extra,
}: {
  v: ReturnType<typeof voortgang>;
  bron: string;
  extra: { label: React.ReactNode; waarde: string; let?: boolean }[];
}) {
  const tellers: { status: Status; waarde: number }[] = [
    { status: 'gereed', waarde: v.gereed },
    { status: 'bezig', waarde: v.bezig },
    { status: 'gepland', waarde: v.gepland },
    { status: 'risico', waarde: v.risico },
  ];
  return (
    <Card>
      <h3 className="text-h4 text-ink-strong">Voortgang</h3>
      <p className="mt-0.5 text-sm text-ink-muted">{bron}</p>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="tnum text-display font-bold leading-none text-ink-strong">{v.pct}%</span>
        <span className="text-sm text-ink-muted">
          gereed · {v.gereed} van {v.totaal}
        </span>
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
      <dl className="mt-4 space-y-2 border-t border-line-subtle pt-3 text-sm">
        {extra.map((e, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <dt className="text-ink-body">{e.label}</dt>
            <dd className={cx('tnum font-semibold', e.let ? 'text-status-warning' : 'text-ink-strong')}>{e.waarde}</dd>
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
  niveau: Niveau;
  onKiesSchool: (id: string) => void;
}) {
  const { state } = useStore();
  const { scope } = useScope();
  const punten: Punt[] = aandachtspunten(items, scope.standaarden)
    // Op clusterniveau staan ontbrekende vaste standaarden hieronder per school (net als de telling).
    .filter((p) => !(niveau === 'cluster' && p.soort === 'vaste-standaard'))
    .map((p, i) => ({ sleutel: `${p.soort}-${i}`, tekst: p.tekst, ...PUNT_STIJL[p.soort] }));

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
    <Card title="Aandachtspunten" subtitle="Wat nog aandacht vraagt, los van het komende gesprek" className="h-full">
      {punten.length === 0 ? (
        <EmptyState compact icon={CircleCheckBig} title="Alles op koers" body="Er zijn geen open aandachtspunten." />
      ) : (
        <ul className="-my-2 divide-y divide-line-subtle">
          {punten.map((p) => {
            const inhoud = (
              <>
                <IconTile icon={p.icon} tone={p.toon} size="sm" />
                <span className="min-w-0 flex-1 text-sm text-ink-strong">{p.tekst}</span>
                <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-ink-strong underline decoration-line-strong underline-offset-[3px] group-hover:decoration-current sm:inline-flex">
                  {p.actie} <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted sm:hidden" aria-hidden />
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

function VoortgangPerSchool({ overzicht, onKiesSchool }: { overzicht: SchoolOverzicht[]; onKiesSchool: (id: string) => void }) {
  return (
    <Card
      title="Voortgang per school"
      subtitle="Percentage gereed van alle activiteiten. Klik op een school om haar te openen."
      action={
        <Link to="/gesprekken" className="text-sm font-semibold kk-link">
          Per gesprek
        </Link>
      }
    >
      {overzicht.length === 0 ? (
        <EmptyState
          compact
          icon={SchoolIcoon}
          title="Nog geen scholen"
          body="Voeg scholen toe bij Organisatie."
          action={
            <ButtonLink to="/organisatie" size="sm">
              Scholen toevoegen
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-x-8 gap-y-1 lg:grid-cols-2">
          {overzicht.map((o) => (
            <li key={o.schoolId}>
              <button
                type="button"
                onClick={() => onKiesSchool(o.schoolId)}
                className="group grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-sm px-1 py-1.5 text-left hover:bg-surface-hover sm:grid-cols-[minmax(0,11rem)_1fr_auto]"
                title="Open deze school"
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
