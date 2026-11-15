/**
 * Scherm: Compliance, dekking van de standaarden (inventaris §1.14).
 * "Afgedekt" = minstens één activiteit met die standaard op de kalender, ongeacht status.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, CircleCheck, CircleCheckBig, CircleX, GitBranch, KeyRound, ShieldCheck, School } from 'lucide-react';
import {
  Badge,
  Begrip,
  Card,
  KpiTile,
  PageHeader,
  SectionHeader,
  SeizoenBadge,
  cx,
  gebiedKlassen,
} from '../componenten';
import {
  GEBIEDEN,
  STANDAARDEN_SCHOOL,
  VASTE_STANDAARDEN,
  activiteitVan,
  afwijkingen,
  dekkingPerStandaard,
  effectieveNaam,
  itemsVanSchool,
  scholenInCluster,
  vindGesprek,
  type GebiedCode,
  type Gesprek,
  type KalenderItem,
  type StandaardDekking,
} from '../domein';
import { useScope, useStore } from '../store';

function perGebied(dekking: StandaardDekking[]) {
  const groepen: { gebied: GebiedCode; rijen: StandaardDekking[] }[] = [];
  for (const d of dekking) {
    let g = groepen.find((x) => x.gebied === d.standaard.gebied);
    if (!g) groepen.push((g = { gebied: d.standaard.gebied, rijen: [] }));
    g.rijen.push(d);
  }
  return groepen;
}

function VasteTegel({ d }: { d: StandaardDekking }) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col rounded-lg border p-3.5',
        d.afgedekt ? 'border-status-success-border bg-status-success-surface' : 'border-status-warning-border bg-status-warning-surface',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="tnum font-bold text-ink-strong">{d.standaard.code}</span>
        {d.afgedekt ? (
          <CircleCheck className="h-5 w-5 text-status-success" aria-label="Afgedekt" />
        ) : (
          <CircleX className="h-5 w-5 text-status-warning" aria-label="Niet afgedekt" />
        )}
      </div>
      <p className="mt-1 flex-1 text-xs leading-snug text-ink-body">{d.standaard.naam}</p>
      <p className="tnum mt-2 text-2xs text-ink-muted">
        {d.afgedekt ? `${d.aantal} ${d.aantal === 1 ? 'activiteit' : 'activiteiten'} · ${d.gereed} gereed` : 'Nog geen activiteit op de kalender'}
      </p>
    </div>
  );
}

interface AfwijkingGroep {
  label?: string;
  items: KalenderItem[];
  /** Items staan in de huidige scope: link naar de kalender. */
  link: boolean;
}

function AfwijkingRegel({ item, cyclus, link }: { item: KalenderItem; cyclus: Gesprek[]; link: boolean }) {
  const a = activiteitVan(item);
  const standaardGesprek = a ? vindGesprek(cyclus, a.gesprek) : undefined;
  const nu = vindGesprek(cyclus, item.gesprek);
  const naam = effectieveNaam(item);
  return (
    <li className="flex items-start gap-3 py-2.5">
      <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-strong">
          {link ? (
            <Link to={`/kalender?item=${encodeURIComponent(item.uid)}`} className="hover:text-niveau-strong hover:underline">
              {naam}
            </Link>
          ) : (
            naam
          )}
          {a?.standaard && <span className="tnum ml-1.5 text-xs font-normal text-ink-subtle">{a.standaard}</span>}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
          {standaardGesprek && (
            <>
              <SeizoenBadge gesprek={standaardGesprek} />
              <span aria-hidden>→</span>
              <span className="sr-only">verplaatst naar</span>
            </>
          )}
          <SeizoenBadge gesprek={nu} />
        </div>
        {item.afwijking?.reden && <p className="mt-1 text-xs text-ink-muted">Reden: {item.afwijking.reden}</p>}
      </div>
    </li>
  );
}

export default function Compliance() {
  const { state, niveau, clusterId } = useStore();
  const { scope, scopeLabel } = useScope();
  const org = state.organisatie;
  const cyclus = org.gesprekscyclus;

  const dekking = useMemo(() => dekkingPerStandaard(scope.items, scope.standaarden), [scope]);
  const afgedekt = dekking.filter((d) => d.afgedekt).length;
  const vaste = dekking.filter((d) => d.standaard.kern);
  const vasteAfgedekt = vaste.filter((d) => d.afgedekt).length;
  const afw = afwijkingen(scope.items);
  const nietSchool = niveau !== 'school';

  const scholen = niveau === 'cluster' ? scholenInCluster(org, clusterId) : org.scholen;
  const perSchool = useMemo(
    () =>
      scholen.map((s) => {
        const items = itemsVanSchool(state, s.id);
        const d = dekkingPerStandaard(items, STANDAARDEN_SCHOOL).filter((x) => x.standaard.kern);
        return { school: s, vast: new Map(d.map((x) => [x.standaard.code, x.afgedekt])), aantal: d.filter((x) => x.afgedekt).length };
      }),
    [scholen, state],
  );
  const scholenCompleet = perSchool.filter((p) => p.aantal === VASTE_STANDAARDEN.length).length;

  // Afwijkingen: op school- en bestuursniveau de eigen kalender; op cluster per school; het bestuur
  // ziet daarnaast ook de afwijkingen van de scholen.
  const groepen: AfwijkingGroep[] = [];
  if (niveau === 'school') groepen.push({ items: afw, link: true });
  if (niveau === 'bestuur' && afw.length) groepen.push({ label: 'Bestuurskalender', items: afw, link: true });
  if (nietSchool) {
    for (const s of scholen) {
      const lijst = afwijkingen(itemsVanSchool(state, s.id));
      if (lijst.length) groepen.push({ label: s.naam, items: lijst, link: niveau === 'cluster' });
    }
  }
  const aantalGetoond = groepen.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Controleren"
        title="Dekking standaarden"
        subtitle={
          <>
            Heeft elke <Begrip term="standaard" /> van het inspectiekader een activiteit op de kalender van {scopeLabel}? En waar
            wijkt een school af?
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          label="Standaarden afgedekt"
          value={`${afgedekt}/${dekking.length}`}
          icon={ShieldCheck}
          tone={afgedekt === dekking.length && dekking.length > 0 ? 'success' : 'neutral'}
        />
        {niveau === 'bestuur' ? (
          <KpiTile
            label="Scholen op orde"
            value={`${scholenCompleet}/${perSchool.length}`}
            icon={KeyRound}
            tone={perSchool.length === 0 ? 'neutral' : scholenCompleet < perSchool.length ? 'warning' : 'success'}
            hint="Met alle 5 vaste standaarden afgedekt"
          />
        ) : (
          <KpiTile
            label="Vaste standaarden"
            value={`${vasteAfgedekt}/${vaste.length}`}
            icon={KeyRound}
            tone={vasteAfgedekt < vaste.length ? 'warning' : 'success'}
          />
        )}
        <KpiTile label="Activiteiten" value={scope.items.length} icon={CircleCheckBig} />
        <KpiTile
          label="Afwijkingen"
          value={aantalGetoond}
          icon={GitBranch}
          tone={aantalGetoond ? 'warning' : 'neutral'}
          hint={niveau === 'bestuur' ? 'Bestuur en scholen samen' : undefined}
        />
      </div>

      {vaste.length > 0 && (
        <Card rondleiding="dekking-vast" padding="lg">
          <SectionHeader
            title="Vaste standaarden"
            subtitle={
              <>
                Deze {VASTE_STANDAARDEN.length} <Begrip term="vaste-standaard">vaste standaarden</Begrip> beoordeelt de inspectie bij elk
                onderzoek. Dek ze altijd af.
              </>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {vaste.map((d) => (
              <VasteTegel key={d.standaard.code} d={d} />
            ))}
          </div>
        </Card>
      )}

      <Card rondleiding="dekking-alle" padding="lg">
        <SectionHeader
          title="Alle standaarden"
          subtitle={
            <>
              <Begrip term="dekking">Dekking</Begrip> per <Begrip term="kwaliteitsgebied" />
            </>
          }
        />
        <div className="space-y-5">
          {perGebied(dekking).map(({ gebied, rijen }) => {
            const k = gebiedKlassen(gebied);
            return (
              <section key={gebied} aria-label={`${gebied} ${GEBIEDEN[gebied]?.naam ?? ''}`}>
                <h3 className="mb-1.5 flex items-center gap-2 text-2xs font-bold uppercase tracking-label">
                  <span className={cx('h-2.5 w-2.5 rounded-xs', k.dot)} aria-hidden />
                  <span className={k.ink}>{gebied}</span>
                  <span className="text-ink-muted">{GEBIEDEN[gebied]?.naam}</span>
                </h3>
                <ul className="divide-y divide-line-subtle border-y border-line-subtle">
                  {rijen.map((d) => (
                    <li
                      key={d.standaard.code}
                      className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-2 text-sm sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
                    >
                      <span className="tnum font-semibold text-ink-strong">{d.standaard.code}</span>
                      <span className="min-w-0 text-ink-body">
                        {d.standaard.naam}
                        {d.standaard.kern && (
                          <Badge tone="brand" size="sm" className="ml-2 align-middle" title="Vaste standaard">
                            vast
                          </Badge>
                        )}
                      </span>
                      <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-auto sm:justify-end">
                        <span className="tnum text-xs text-ink-subtle sm:w-36 sm:text-right">
                          {d.aantal} {d.aantal === 1 ? 'activiteit' : 'activiteiten'} · {d.gereed} gereed
                        </span>
                        {d.afgedekt ? (
                          <Badge tone="success" size="sm" icon={CircleCheck} className="w-[5.5rem] justify-center">
                            Afgedekt
                          </Badge>
                        ) : (
                          <Badge
                            tone={d.standaard.kern ? 'warning' : 'neutral'}
                            size="sm"
                            icon={CircleX}
                            className="w-[5.5rem] justify-center"
                          >
                            Leeg
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Card>

      {nietSchool && (
        <Card padding="lg">
          <SectionHeader
            title="Vaste standaarden per school"
            subtitle="Welke school een vaste standaard nog niet heeft afgedekt"
          />
          {perSchool.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <School className="h-4 w-4" aria-hidden /> Nog geen scholen.
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[460px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line-subtle">
                    <th scope="col" className="pb-2 pr-3 text-left text-xs font-semibold text-ink-muted">
                      School
                    </th>
                    {VASTE_STANDAARDEN.map((c) => (
                      <th key={c} scope="col" className="tnum px-2 pb-2 text-center text-xs font-semibold text-ink-muted">
                        {c}
                      </th>
                    ))}
                    <th scope="col" className="pb-2 pl-3 text-right text-xs font-semibold text-ink-muted">
                      Afgedekt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {perSchool.map(({ school, vast, aantal }) => (
                    <tr key={school.id} className="border-b border-line-subtle last:border-b-0">
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink-strong">
                        {school.naam}
                      </th>
                      {VASTE_STANDAARDEN.map((c) => (
                        <td key={c} className="px-2 text-center">
                          {vast.get(c) ? (
                            <CircleCheck className="inline h-4 w-4 text-status-success" aria-label={`${c} afgedekt`} />
                          ) : (
                            <CircleX className="inline h-4 w-4 text-status-warning" aria-label={`${c} niet afgedekt`} />
                          )}
                        </td>
                      ))}
                      <td
                        className={cx(
                          'tnum pl-3 text-right text-sm font-semibold',
                          aantal === VASTE_STANDAARDEN.length ? 'text-status-success' : 'text-status-warning',
                        )}
                      >
                        {aantal}/{VASTE_STANDAARDEN.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {aantalGetoond > 0 && (
        <Card rondleiding="dekking-afwijkingen" padding="lg">
          <SectionHeader
            title="Afwijkingen"
            subtitle={
              <>
                Een activiteit staat bij een ander gesprek dan de <Begrip term="standaardkoppeling" /> voorstelt. Dat mag, met een reden.
              </>
            }
          />
          <div className="space-y-4">
            {groepen.map((g) => (
              <div key={g.label ?? 'eigen'}>
                {g.label && (
                  <h3 className="eyebrow mb-1">
                    {g.label} <span className="tnum font-normal normal-case">({g.items.length})</span>
                  </h3>
                )}
                <ul className="divide-y divide-line-subtle">
                  {g.items.map((i) => (
                    <AfwijkingRegel key={i.uid} item={i} cyclus={cyclus} link={g.link} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
