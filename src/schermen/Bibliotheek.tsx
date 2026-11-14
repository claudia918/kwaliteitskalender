/**
 * Scherm: Bibliotheek (inventaris §1.12). Een catalogus die helpt kiezen: bovenaan hoe de kalender
 * ervoor staat (wat staat erop, welke verplichte ontbreken, ook voor het komende gesprek) met
 * "Voeg alle ontbrekende verplichte toe"; daaronder zoeken, filteren en de activiteiten per standaard.
 * Toevoegen kan ook rechtstreeks in de kalender; dit is de plek om te bladeren. Onderdelen in ./bibliotheek/.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, CircleCheck, KeyRound, ListPlus, Plus, SearchX } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  InfoBalk,
  PageHeader,
  ProgressBar,
  SearchField,
  cx,
  gebiedKlassen,
  gesprekIcoon,
} from '../componenten';
import { filterActiviteiten, schoolIdsVoorNiveau } from '../domein/berekeningen';
import { aantal, effectieveNaam, formatDatumLang, maandUitPeriode, vindGesprek } from '../domein/hulp';
import { GEBIEDEN, GEBIED_CODES, GESPREK_FILTER_OPTIES, STANDAARD_OP_CODE } from '../domein/seed';
import type { Activiteit, GebiedCode, KalenderItem } from '../domein/types';
import { useKomendGesprek, useScope, useStore } from '../store';
import { ActiviteitKaart } from './bibliotheek/ActiviteitKaart';
import { EigenActiviteitDialoog } from './bibliotheek/EigenActiviteitDialoog';
import { maandVoluit, ontbrekendeVerplichte } from './kalender/hulp';
import { Dock, OngedaanMelding, useOngedaan } from './kalender/Ongedaan';

type Toon = 'alles' | 'niet-op-kalender' | 'verplicht' | 'ontbreekt';

/** Filters blijven bewaard zolang de app open is. */
const onthouden: { zoek: string; gesprek: string; gebied: string; toon: Toon } = { zoek: '', gesprek: 'Alle', gebied: 'Alle', toon: 'alles' };

export default function Bibliotheek() {
  const { state, niveau, clusterId, addActiviteit, removeItem } = useStore();
  const { library, scope, editScope, editable, scopeLabel, isBestuur } = useScope();
  const komend = useKomendGesprek();
  const ongedaan = useOngedaan();
  const cyclus = state.organisatie.gesprekscyclus;

  const [zoek, zetZoek] = useState(onthouden.zoek);
  const [gesprek, zetGesprek] = useState(onthouden.gesprek);
  const [gebied, zetGebied] = useState(onthouden.gebied);
  const [toon, zetToon] = useState<Toon>(onthouden.toon);
  const [dialoog, setDialoog] = useState(false);
  const [markeer, setMarkeer] = useState<string | null>(null);

  const setZoek = (v: string) => zetZoek((onthouden.zoek = v));
  const setGesprek = (v: string) => zetGesprek((onthouden.gesprek = v));
  const setGebied = (v: string) => zetGebied((onthouden.gebied = v));
  const setToon = (v: Toon) => zetToon((onthouden.toon = v));

  useEffect(() => {
    if (!markeer) return;
    const t = window.setTimeout(() => setMarkeer(null), 1800);
    return () => window.clearTimeout(t);
  }, [markeer]);

  // Bewerkbaar niveau: item per activiteit die al op de kalender staat.
  const opKalender = useMemo(() => {
    const m = new Map<string, KalenderItem>();
    if (editable) for (const i of scope.items) if (!m.has(i.activiteitId)) m.set(i.activiteitId, i);
    return m;
  }, [editable, scope.items]);

  // Clusterniveau: op hoeveel scholen staat elke activiteit.
  const clusterScholen = useMemo(
    () => (niveau === 'cluster' ? schoolIdsVoorNiveau(state.organisatie, 'cluster', clusterId) : []),
    [niveau, state.organisatie, clusterId],
  );
  const dekking = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of clusterScholen) {
      const gezien = new Set((state.schoolKalenders[id] ?? []).map((i) => i.activiteitId));
      for (const a of gezien) m.set(a, (m.get(a) ?? 0) + 1);
    }
    return m;
  }, [clusterScholen, state.schoolKalenders]);

  const gebieden = useMemo(() => GEBIED_CODES.filter((g) => library.some((a) => a.gebied === g)), [library]);
  // Een filterwaarde die op dit niveau niet bestaat (bv. gebied BKA op schoolniveau) telt als "Alle".
  const gebiedFilter = gebied === 'Alle' || gebieden.includes(gebied as GebiedCode) ? gebied : 'Alle';
  const toonFilter: Toon = editable || toon === 'verplicht' ? toon : 'alles';

  const pastBijToon = (a: Activiteit, t: Toon) =>
    t === 'alles' ||
    (t === 'verplicht' && a.verplicht) ||
    (t === 'niet-op-kalender' && !opKalender.has(a.id)) ||
    (t === 'ontbreekt' && a.verplicht && !opKalender.has(a.id));
  const extraFilter = (lijst: Activiteit[], t: Toon = toonFilter) => lijst.filter((a) => pastBijToon(a, t));
  const resultaten = extraFilter(filterActiviteiten(library, { zoek, gesprek, gebied: gebiedFilter }));
  const telGesprek = (g: string) => extraFilter(filterActiviteiten(library, { zoek, gesprek: g, gebied: gebiedFilter })).length;
  const telGebied = (g: string) => extraFilter(filterActiviteiten(library, { zoek, gesprek, gebied: g })).length;
  const telToon = (t: Toon) => extraFilter(filterActiviteiten(library, { zoek, gesprek, gebied: gebiedFilter }), t).length;

  const filtersActief = !!zoek || gesprek !== 'Alle' || gebiedFilter !== 'Alle' || toonFilter !== 'alles';
  const wisFilters = () => {
    setZoek('');
    setGesprek('Alle');
    setGebied('Alle');
    setToon('alles');
  };

  // Resultaten per standaard, in de volgorde van de standaardenlijst.
  const groepen = useMemo(() => {
    const volgorde = scope.standaarden.map((s) => s.code);
    const perCode = new Map<string, Activiteit[]>();
    for (const a of resultaten) perCode.set(a.standaard, [...(perCode.get(a.standaard) ?? []), a]);
    return [...perCode.entries()].sort(([x], [y]) => {
      const i = volgorde.indexOf(x);
      const j = volgorde.indexOf(y);
      return (i < 0 ? 99 : i) - (j < 0 ? 99 : j);
    });
  }, [resultaten, scope.standaarden]);

  const eigenItems: KalenderItem[] = editable ? scope.items.filter((i) => i.custom) : [];
  const aantalOpKalender = library.filter((a) => opKalender.has(a.id)).length;
  const verplicht = library.filter((a) => a.verplicht);
  const ontbrekend = editable ? ontbrekendeVerplichte(library, scope.items) : [];
  const ontbrekendGesprek = komend && editable ? ontbrekendeVerplichte(library, scope.items, komend.gesprek.id) : [];

  function toevoegen(a: Activiteit) {
    if (!editScope) return;
    const uid = addActiviteit(editScope, a.id);
    if (!uid) return;
    setMarkeer(a.id);
    const maand = maandVoluit(maandUitPeriode(a.periode));
    ongedaan.toon(`${a.naam} staat in ${maand}`, () => removeItem(editScope, uid));
  }

  function voegOntbrekendeToe() {
    if (!editScope || !ontbrekend.length) return;
    const uids = ontbrekend.map((a) => addActiviteit(editScope, a.id)).filter((u): u is string => !!u);
    ongedaan.toon(
      uids.length === 1 ? '1 verplichte activiteit toegevoegd' : `${uids.length} verplichte activiteiten toegevoegd`,
      () => uids.forEach((u) => removeItem(editScope, u)),
    );
  }

  return (
    <div className={cx('space-y-6', ongedaan.melding && 'pb-20')}>
      <PageHeader
        eyebrow="Bibliotheek"
        title="Activiteiten"
        subtitle={`${library.length} activiteiten voor het ${isBestuur ? 'bestuur' : 'schoolniveau'}${editable ? ` · kalender van ${scopeLabel}` : ''}`}
        actions={
          <Button
            variant="secondary"
            icon={Plus}
            onClick={() => setDialoog(true)}
            disabled={!editable}
            title={editable ? undefined : 'Kies een school of bestuur'}
          >
            Eigen activiteit
          </Button>
        }
      />

      {!editable && (
        <InfoBalk tone="niveau">
          Op clusterniveau is de bibliotheek alleen-lezen. Kies een school of bestuur om activiteiten toe te voegen.
        </InfoBalk>
      )}

      {editable && (
        <section aria-label="Stand van de kalender" data-rondleiding="bibliotheek-stand" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <StandTegel
            label="Op de kalender"
            waarde={`${aantalOpKalender} van ${library.length}`}
            pct={(aantalOpKalender / Math.max(1, library.length)) * 100}
            actie={
              aantalOpKalender < library.length ? (
                <button type="button" className="text-left text-xs font-semibold text-niveau-strong hover:underline" onClick={() => setToon('niet-op-kalender')}>
                  Toon wat er nog niet op staat
                </button>
              ) : undefined
            }
          />
          <StandTegel
            label="Verplicht"
            waarde={`${verplicht.length - ontbrekend.length} van ${verplicht.length}`}
            pct={((verplicht.length - ontbrekend.length) / Math.max(1, verplicht.length)) * 100}
            klaar={ontbrekend.length === 0}
            actie={
              ontbrekend.length > 0 ? (
                <button type="button" className="text-left text-xs font-semibold text-niveau-strong hover:underline" onClick={() => setToon('ontbreekt')}>
                  Toon de {ontbrekend.length} die ontbreken
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-success">
                  <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                  Alle verplichte staan erop
                </span>
              )
            }
          />
          <div className="col-span-2 flex flex-col rounded-lg border border-line-subtle bg-surface-card p-3 shadow-xs md:col-span-1 md:p-4">
            <p className="eyebrow">{komend ? `Gesprek ${komend.gesprek.naam}` : 'Komend gesprek'}</p>
            {komend ? (
              <>
                <p className="mt-1 text-sm text-ink-body">
                  {formatDatumLang(komend.datum)}
                  {!komend.verstreken && komend.dagenTot >= 0 && <span className="text-ink-muted"> · over {aantal(komend.dagenTot, 'dag', 'dagen')}</span>}
                </p>
                <p className={cx('mt-1 text-sm font-semibold', ontbrekendGesprek.length ? 'text-status-warning' : 'text-status-success')}>
                  {ontbrekendGesprek.length
                    ? `${ontbrekendGesprek.length === 1 ? '1 verplichte activiteit ontbreekt' : `${ontbrekendGesprek.length} verplichte activiteiten ontbreken`}`
                    : 'Alle verplichte activiteiten staan erop'}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">Er is geen gesprekscyclus ingesteld.</p>
            )}
            <div className="mt-auto pt-3">
              {ontbrekend.length > 0 ? (
                <Button variant="primary" size="sm" icon={ListPlus} onClick={voegOntbrekendeToe} data-rondleiding="bibliotheek-ontbreekt">
                  Voeg alle {ontbrekend.length} ontbrekende verplichte toe
                </Button>
              ) : (
                <Link to="/kalender" className="inline-flex items-center gap-1 text-xs font-semibold text-niveau-strong hover:underline">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  Naar de kalender
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      <Card padding="md">
        <div className="space-y-3">
          <SearchField value={zoek} onChange={setZoek} placeholder="Zoek op naam, code of standaard…" />
          <FilterRij label="Toon">
            <span data-rondleiding="bibliotheek-filter" className="contents">
              {(editable
                ? ([
                    ['alles', 'Alles'],
                    ['niet-op-kalender', 'Nog niet op de kalender'],
                    ['verplicht', 'Verplicht'],
                    ['ontbreekt', 'Verplicht en ontbreekt'],
                  ] as const)
                : ([
                    ['alles', 'Alles'],
                    ['verplicht', 'Verplicht'],
                  ] as const)
              ).map(([waarde, label]) => (
                <FilterChip key={waarde} active={toonFilter === waarde} onClick={() => setToon(waarde)} count={waarde === 'alles' ? undefined : telToon(waarde)}>
                  {label}
                </FilterChip>
              ))}
            </span>
          </FilterRij>
          <FilterRij label="Gesprek">
            <FilterChip active={gesprek === 'Alle'} onClick={() => setGesprek('Alle')}>
              Alle
            </FilterChip>
            {GESPREK_FILTER_OPTIES.map((g) => {
              const gs = vindGesprek(cyclus, g);
              // Het gesprek kan in de cyclus hernoemd zijn; zonder dat gesprek blijft de seizoensnaam staan.
              const label = gs.id === g ? gs.naam : g;
              return (
                <FilterChip key={g} active={gesprek === g} onClick={() => setGesprek(g)} icon={gesprekIcoon(gs.id === g ? gs.icoon : undefined)} count={telGesprek(g)}>
                  {label}
                </FilterChip>
              );
            })}
          </FilterRij>
          <FilterRij label="Gebied">
            <FilterChip active={gebiedFilter === 'Alle'} onClick={() => setGebied('Alle')}>
              Alle
            </FilterChip>
            {gebieden.map((g) => (
              <span key={g} title={GEBIEDEN[g]?.naam}>
                <FilterChip active={gebiedFilter === g} onClick={() => setGebied(g)} dotClassName={gebiedKlassen(g).dot} count={telGebied(g)}>
                  {g}
                </FilterChip>
              </span>
            ))}
          </FilterRij>
        </div>
      </Card>

      {eigenItems.length > 0 && (
        <section aria-labelledby="eigen-kop" className="rounded-lg border border-niveau-border bg-niveau-surface px-4 py-3">
          <h2 id="eigen-kop" className="text-sm font-semibold text-niveau-strong">
            Eigen activiteiten op de kalender van {scopeLabel} ({eigenItems.length})
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">Eigen activiteiten staan niet in de bibliotheek, alleen op deze kalender.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {eigenItems.map((i) => (
              <li key={i.uid}>
                <Link
                  to={`/kalender?item=${encodeURIComponent(i.uid)}`}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface-card py-1 pl-2.5 pr-2 text-xs font-semibold text-ink-strong hover:border-line-strong"
                >
                  <span aria-hidden className={cx('h-2 w-2 rounded-xs', gebiedKlassen(i.custom?.gebied).dot)} />
                  {effectieveNaam(i)}
                  <span className="font-normal text-ink-subtle">{i.custom?.standaard}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center gap-3">
        <p className="tnum text-sm font-semibold text-ink-strong" aria-live="polite">
          {resultaten.length} {resultaten.length === 1 ? 'resultaat' : 'resultaten'}
        </p>
        {filtersActief && (
          <button type="button" onClick={wisFilters} className="text-xs font-semibold text-niveau-strong hover:underline">
            Filters wissen
          </button>
        )}
      </div>

      {resultaten.length === 0 ? (
        <EmptyState
          icon={toonFilter === 'ontbreekt' && !zoek ? CircleCheck : SearchX}
          title={toonFilter === 'ontbreekt' && !zoek ? 'Er ontbreekt geen verplichte activiteit' : 'Niets gevonden'}
          body={toonFilter === 'ontbreekt' && !zoek ? 'Alle verplichte activiteiten staan op de kalender.' : 'Pas je zoekopdracht of filters aan.'}
          action={
            filtersActief ? (
              <Button variant="secondary" onClick={wisFilters}>
                Filters wissen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {groepen.map(([code, lijst]) => {
            const std = STANDAARD_OP_CODE[code];
            const k = gebiedKlassen(std?.gebied);
            const totaal = library.filter((a) => a.standaard === code);
            const erop = totaal.filter((a) => opKalender.has(a.id)).length;
            return (
              <section key={code} aria-labelledby={`std-${code}`}>
                <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line-subtle pb-2">
                  <h2 id={`std-${code}`} className="flex items-center gap-2 text-sm font-bold text-ink-strong">
                    <span aria-hidden className={cx('h-2.5 w-2.5 rounded-xs', k.dot)} />
                    <span className={k.ink}>{code}</span>
                    <span>{std?.naam ?? ''}</span>
                    {std?.kern && (
                      <span title="Vaste standaard" className="text-ink-subtle">
                        <KeyRound className="h-3.5 w-3.5" aria-label="vaste standaard" />
                      </span>
                    )}
                  </h2>
                  {editable && (
                    <span className="tnum ml-auto text-xs text-ink-muted">
                      {erop} van {totaal.length} op de kalender
                    </span>
                  )}
                </header>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {lijst.map((a) => (
                    <ActiviteitKaart
                      key={a.id}
                      activiteit={a}
                      gesprek={vindGesprek(cyclus, a.gesprek)}
                      opKalender={editable ? (opKalender.get(a.id) ?? null) : undefined}
                      dekking={niveau === 'cluster' ? { aantal: dekking.get(a.id) ?? 0, van: clusterScholen.length } : undefined}
                      onToevoegen={editable ? () => toevoegen(a) : undefined}
                      gemarkeerd={markeer === a.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editScope && (
        <EigenActiviteitDialoog
          open={dialoog}
          onClose={() => setDialoog(false)}
          editScope={editScope}
          standaarden={scope.standaarden}
          scopeLabel={scopeLabel}
        />
      )}

      <Dock>
        <OngedaanMelding {...ongedaan} />
      </Dock>
    </div>
  );
}

function StandTegel({ label, waarde, pct, klaar, actie }: { label: string; waarde: string; pct: number; klaar?: boolean; actie?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border border-line-subtle bg-surface-card p-3 shadow-xs md:p-4">
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-1 text-h4 text-ink-strong md:text-h3">{waarde}</p>
      <ProgressBar value={pct} size="sm" className="mt-2" color={klaar ? 'var(--status-success)' : undefined} />
      {actie && <div className="mt-auto pt-3">{actie}</div>}
    </div>
  );
}

function FilterRij({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="eyebrow w-16 shrink-0">{label}</span>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible">{children}</div>
    </div>
  );
}
