/**
 * Scherm: Gesprekken (inventaris §1.11). Per gesprek van de cyclus: wat er nodig is
 * (input, output, standaarden) en hoe de voorbereiding ervoor staat.
 * School: de eigen voorbereiding. Bestuur en cluster: status per school; bestuur ook de eigen kalender.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CircleMinus, MessagesSquare } from 'lucide-react';
import {
  Begrip,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  STATUS_STIJL,
  StatusBadge,
  VerplichtBadge,
  cx,
  gesprekIcoon,
  seizoenKlassen,
} from '../componenten';
import {
  GESPREKKEN_INHOUD,
  STANDAARD_OP_CODE,
  STATUS_VOLGORDE,
  activiteitVan,
  aantal,
  cyclusOpVolgorde,
  deadlineVanGesprek,
  effectieveNaam,
  formatDatumLang,
  itemsVanSchool,
  itemsVoorGesprek,
  schoolIdsVoorNiveau,
  sorteerOpNaam,
  startjaar,
  statusVoorStandaardInGesprek,
  vindSchool,
  voortgang,
  type CelStatus,
  type Gesprek,
  type KalenderItem,
} from '../domein';
import { useKomendGesprek, useScope, useStore } from '../store';

function Lijstje({ titel, items }: { titel: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="eyebrow">{titel}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-sm text-ink-body">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gray-400" aria-hidden />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linkerkaart: wat hoort bij dit gesprek. */
function GesprekInfo({ gesprek, toonBestuursinput, schooljaar }: { gesprek: Gesprek; toonBestuursinput: boolean; schooljaar: string }) {
  const k = seizoenKlassen(gesprek.kleur);
  const Icoon = gesprekIcoon(gesprek.icoon);
  const inhoud = GESPREKKEN_INHOUD.find((g) => g.key === gesprek.id);
  const deadline = deadlineVanGesprek(gesprek, startjaar(schooljaar, new Date().getFullYear()));
  return (
    <Card className={cx('lg:col-span-1', k.border)} padding="lg" rondleiding="gesprek-info">
      <div className="flex items-start gap-3">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-md border', k.surface, k.border)}>
          <Icoon className={cx('h-5 w-5', k.ink)} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-h3 text-ink-strong">{gesprek.naam}</h2>
          <p className="text-xs text-ink-muted">
            {inhoud?.periode ?? gesprek.maand}
            {gesprek.thema ? ` · ${gesprek.thema}` : ''}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Deadline voorbereiding: <span className="font-semibold text-ink-strong">{formatDatumLang(deadline)}</span>
      </p>
      {inhoud ? (
        <div className="mt-5 space-y-4">
          <Lijstje titel="Vereiste schoolinput" items={inhoud.schoolinput} />
          {toonBestuursinput && <Lijstje titel="Bestuursinput" items={inhoud.bestuursinput} />}
          <Lijstje titel="Output" items={inhoud.output} />
          {inhoud.standaarden.length > 0 && (
            <div>
              <p className="eyebrow">
                <Begrip term="standaard">Standaarden</Begrip>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {inhoud.standaarden.map((code) => {
                  const s = STANDAARD_OP_CODE[code];
                  return (
                    <span
                      key={code}
                      title={s ? `${s.naam}${s.kern ? ' (vaste standaard)' : ''}` : undefined}
                      className={cx(
                        'tnum inline-flex h-6 items-center rounded-pill border px-2 text-2xs font-bold tracking-label',
                        s?.kern
                          ? 'border-brand-yellow bg-brand-yellow-soft text-brand-yellow-700'
                          : 'border-line-subtle bg-surface-sunken text-ink-muted',
                      )}
                    >
                      {code}
                    </span>
                  );
                })}
              </div>
              {inhoud.standaarden.some((c) => STANDAARD_OP_CODE[c]?.kern) && (
                <p className="mt-1.5 text-2xs text-ink-subtle">
                  Geel = <Begrip term="vaste-standaard" />
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-ink-muted">
          Eigen gesprek (maand {gesprek.maand}). Koppel activiteiten via de bibliotheek of kalender.
        </p>
      )}
    </Card>
  );
}

/** Voorbereiding van één kalender (school of bestuur) voor dit gesprek. */
function Voorbereiding({ titel, items, gesprekId }: { titel: string; items: KalenderItem[]; gesprekId: string }) {
  const lijst = sorteerOpNaam(itemsVoorGesprek(items, gesprekId));
  const v = voortgang(lijst);
  return (
    <Card padding="lg" rondleiding="gesprek-voorbereiding">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-h3 text-ink-strong">{titel}</h2>
        {lijst.length > 0 && (
          <span className="tnum text-sm text-ink-muted">
            {v.gereed}/{v.totaal} gereed · {v.pct}%
          </span>
        )}
      </div>
      {lijst.length === 0 ? (
        <EmptyState
          compact
          icon={MessagesSquare}
          title="Geen gekoppelde activiteiten"
          body="Kies in de bibliotheek wat je voor dit gesprek wilt laten zien, of verplaats een activiteit in de kalender."
          action={
            <ButtonLink to="/bibliotheek" size="sm" variant="secondary">
              Naar de bibliotheek
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ProgressBar value={v.pct} className="mt-3" />
          <ul className="mt-4 divide-y divide-line-subtle border-t border-line-subtle">
            {lijst.map((i) => {
              const a = activiteitVan(i);
              return (
                <li key={i.uid}>
                  <Link
                    to={`/kalender?item=${encodeURIComponent(i.uid)}`}
                    className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink-strong">
                        <span className="min-w-0">{effectieveNaam(i)}</span>
                        {a?.verplicht && <VerplichtBadge />}
                      </p>
                      <p className="tnum mt-0.5 text-2xs text-ink-subtle">
                        {i.activiteitId}
                        {a?.standaard ? ` · ${a.standaard}` : ''}
                        {i.eigenaar ? ` · ${i.eigenaar}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={i.status} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle group-hover:text-ink-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

const CEL_LABEL: Record<CelStatus, string> = {
  leeg: 'Niet gekoppeld',
  gereed: 'Gereed',
  bezig: 'Bezig',
  gepland: 'Gepland',
  risico: 'Risico',
};

function CelIcoon({ status, className }: { status: CelStatus; className?: string }) {
  if (status === 'leeg') return <CircleMinus className={cx('h-4 w-4 text-gray-300', className)} aria-hidden />;
  const s = STATUS_STIJL[status];
  const Icoon = s.icoon;
  return <Icoon className={cx('h-4 w-4', s.ink, className)} aria-hidden style={{ strokeWidth: 2.2 }} />;
}

/** Bestuur en cluster: per school de status van elke standaard van dit gesprek. */
function StatusPerSchool({ gesprek, schoolIds }: { gesprek: Gesprek; schoolIds: string[] }) {
  const { state } = useStore();
  const standaarden = GESPREKKEN_INHOUD.find((g) => g.key === gesprek.id)?.standaarden ?? [];
  return (
    <Card padding="lg" rondleiding="gesprek-scholen">
      <h2 className="text-h3 text-ink-strong">Status per school</h2>
      <p className="mt-0.5 text-sm text-ink-muted">
        {standaarden.length > 0
          ? 'Per standaard van dit gesprek: hoe ver de activiteiten van elke school zijn.'
          : 'Voortgang van de activiteiten die aan dit gesprek gekoppeld zijn.'}
      </p>
      {schoolIds.length === 0 ? (
        <EmptyState compact icon={MessagesSquare} title="Nog geen scholen" body="Voeg scholen toe bij Organisatie." />
      ) : (
        <div className="-mx-1 mt-4 overflow-x-auto px-1">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-subtle text-left">
                <th scope="col" className="pb-2 pr-3 text-xs font-semibold text-ink-muted">
                  School
                </th>
                {standaarden.map((c) => (
                  <th key={c} scope="col" className="tnum px-2 pb-2 text-center text-xs font-semibold text-ink-muted">
                    <span title={STANDAARD_OP_CODE[c]?.naam}>{c}</span>
                  </th>
                ))}
                <th scope="col" className="pb-2 pl-3 text-right text-xs font-semibold text-ink-muted">
                  Voortgang
                </th>
              </tr>
            </thead>
            <tbody>
              {schoolIds.map((id) => {
                const items = itemsVanSchool(state, id);
                const v = voortgang(itemsVoorGesprek(items, gesprek.id));
                const naam = vindSchool(state.organisatie, id)?.naam ?? 'School';
                return (
                  <tr key={id} className="border-b border-line-subtle last:border-b-0">
                    <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink-strong">
                      {naam}
                    </th>
                    {standaarden.map((c) => {
                      const st = statusVoorStandaardInGesprek(items, gesprek.id, c);
                      return (
                        <td key={c} className="px-2 text-center">
                          <span className="inline-flex" role="img" aria-label={`${c}: ${CEL_LABEL[st]}`} title={`${c}: ${CEL_LABEL[st]}`}>
                            <CelIcoon status={st} />
                          </span>
                        </td>
                      );
                    })}
                    <td className="pl-3">
                      <div className="flex items-center justify-end gap-2">
                        <ProgressBar value={v.pct} size="sm" className="w-20" />
                        <span className="tnum w-16 text-right text-xs text-ink-muted" title={`${v.gereed} van ${v.totaal} gereed`}>
                          {v.totaal === 0 ? 'geen' : `${v.pct}%`}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {standaarden.length > 0 && schoolIds.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-2xs text-ink-muted">
          {[...STATUS_VOLGORDE, 'leeg' as const].map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <CelIcoon status={s} className="h-3.5 w-3.5" />
              {CEL_LABEL[s]}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Gesprekken() {
  const { state, niveau, clusterId } = useStore();
  const { scope, scopeLabel } = useScope();
  const komend = useKomendGesprek();
  const cyclus = useMemo(() => cyclusOpVolgorde(state), [state]);
  const [keuze, setKeuze] = useState<string>(() => komend?.gesprek.id ?? cyclus[0]?.id ?? '');
  const gesprek = cyclus.find((g) => g.id === keuze) ?? cyclus[0];

  if (!gesprek) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Voorbereiden" title="Seizoensgesprekken" subtitle={scopeLabel} />
        <EmptyState
          watermark
          icon={MessagesSquare}
          title="Geen gesprekken ingesteld"
          body="Leg vast wanneer de gesprekken tussen bestuur en school zijn. Daarna zie je hier per gesprek wat er klaar moet zijn."
          action={
            <ButtonLink to="/organisatie" variant="primary" size="sm">
              Gesprekken instellen
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const nietSchool = niveau !== 'school';
  const schoolIds = schoolIdsVoorNiveau(state.organisatie, niveau, clusterId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voorbereiden"
        title="Seizoensgesprekken"
        subtitle={
          <>
            Per <Begrip term="seizoensgesprek">gesprek</Begrip>: wat er klaar moet zijn en hoe ver {scopeLabel} is.
            {komend && !komend.verstreken && ` Eerstvolgend: ${komend.gesprek.naam}, over ${aantal(komend.dagenTot, 'dag', 'dagen')}.`}
          </>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Gesprek" data-rondleiding="gesprek-keuze">
        {cyclus.map((g) => {
          const k = seizoenKlassen(g.kleur);
          const Icoon = gesprekIcoon(g.icoon);
          const actief = g.id === gesprek.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={actief}
              onClick={() => setKeuze(g.id)}
              className={cx(
                'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors duration-fast',
                actief
                  ? cx(k.surface, k.border, k.ink, 'shadow-xs')
                  : 'border-line-subtle bg-surface-card text-ink-muted hover:bg-surface-hover hover:text-ink-body',
              )}
            >
              <Icoon className="h-4 w-4" aria-hidden />
              {g.naam}
              {komend?.gesprek.id === g.id && !komend.verstreken && (
                <span className="rounded-pill bg-surface-card px-1.5 py-0.5 text-2xs font-semibold text-ink-muted">komend</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3" role="tabpanel" aria-label={gesprek.naam}>
        <GesprekInfo gesprek={gesprek} toonBestuursinput={nietSchool} schooljaar={state.schooljaar} />
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {nietSchool ? (
            <>
              <StatusPerSchool gesprek={gesprek} schoolIds={schoolIds} />
              {niveau === 'bestuur' && (
                <Voorbereiding titel="Voorbereiding bestuur" items={scope.items} gesprekId={gesprek.id} />
              )}
            </>
          ) : (
            <Voorbereiding titel="Jouw voorbereiding" items={scope.items} gesprekId={gesprek.id} />
          )}
        </div>
      </div>
    </div>
  );
}
