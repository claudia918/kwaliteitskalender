/**
 * Scherm: Bibliotheek (inventaris §1.12). Zoeken, filteren op gesprek en kwaliteitsgebied,
 * toevoegen aan de kalender en een eigen activiteit maken. Onderdelen in ./bibliotheek/.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, SearchX } from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  FilterChip,
  InfoBalk,
  PageHeader,
  SearchField,
  cx,
  gebiedKlassen,
  gesprekIcoon,
  useToast,
} from '../componenten';
import { filterActiviteiten, schoolIdsVoorNiveau } from '../domein/berekeningen';
import { effectieveNaam, vindGesprek } from '../domein/hulp';
import { GEBIEDEN, GEBIED_CODES, GESPREK_FILTER_OPTIES } from '../domein/seed';
import type { GebiedCode, KalenderItem } from '../domein/types';
import { useScope, useStore } from '../store';
import { ActiviteitKaart } from './bibliotheek/ActiviteitKaart';
import { EigenActiviteitDialoog } from './bibliotheek/EigenActiviteitDialoog';

/** Filters blijven bewaard zolang de app open is. */
const onthouden = { zoek: '', gesprek: 'Alle', gebied: 'Alle', verplicht: false, nietOpKalender: false };

export default function Bibliotheek() {
  const { state, niveau, clusterId, addActiviteit } = useStore();
  const { library, scope, editScope, editable, scopeLabel, isBestuur } = useScope();
  const toast = useToast();
  const cyclus = state.organisatie.gesprekscyclus;

  const [zoek, zetZoek] = useState(onthouden.zoek);
  const [gesprek, zetGesprek] = useState(onthouden.gesprek);
  const [gebied, zetGebied] = useState(onthouden.gebied);
  const [verplicht, zetVerplicht] = useState(onthouden.verplicht);
  const [nietOpKalender, zetNietOpKalender] = useState(onthouden.nietOpKalender);
  const [dialoog, setDialoog] = useState(false);

  const setZoek = (v: string) => zetZoek((onthouden.zoek = v));
  const setGesprek = (v: string) => zetGesprek((onthouden.gesprek = v));
  const setGebied = (v: string) => zetGebied((onthouden.gebied = v));
  const setVerplicht = (v: boolean) => zetVerplicht((onthouden.verplicht = v));
  const setNietOpKalender = (v: boolean) => zetNietOpKalender((onthouden.nietOpKalender = v));

  // Bewerkbaar niveau: uid per activiteit die al op de kalender staat.
  const uidOpKalender = useMemo(() => {
    const m = new Map<string, string>();
    if (editable) for (const i of scope.items) if (!m.has(i.activiteitId)) m.set(i.activiteitId, i.uid);
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

  const extraFilter = (lijst: typeof library) =>
    lijst.filter((a) => (!verplicht || a.verplicht) && (!nietOpKalender || !uidOpKalender.has(a.id)));
  const resultaten = extraFilter(filterActiviteiten(library, { zoek, gesprek, gebied: gebiedFilter }));
  const telGesprek = (g: string) => extraFilter(filterActiviteiten(library, { zoek, gesprek: g, gebied: gebiedFilter })).length;
  const telGebied = (g: string) => extraFilter(filterActiviteiten(library, { zoek, gesprek, gebied: g })).length;

  const filtersActief = !!zoek || gesprek !== 'Alle' || gebiedFilter !== 'Alle' || verplicht || nietOpKalender;
  const wisFilters = () => {
    setZoek('');
    setGesprek('Alle');
    setGebied('Alle');
    setVerplicht(false);
    setNietOpKalender(false);
  };

  const eigenItems: KalenderItem[] = editable ? scope.items.filter((i) => i.custom) : [];
  const aantalOpKalender = library.filter((a) => uidOpKalender.has(a.id)).length;

  function toevoegen(id: string, naam: string) {
    if (!editScope) return;
    if (addActiviteit(editScope, id)) toast(`${naam} toegevoegd aan de kalender`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bibliotheek"
        title="Activiteiten"
        subtitle={`${library.length} activiteiten · ${isBestuur ? 'bestuursniveau' : 'schoolniveau'}${
          editable ? ` · ${aantalOpKalender} op de kalender van ${scopeLabel}` : ''
        }`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setDialoog(true)} disabled={!editable} title={editable ? undefined : 'Kies een school of bestuur'}>
            Eigen activiteit
          </Button>
        }
      />

      {!editable && (
        <InfoBalk tone="niveau">
          Op clusterniveau is de bibliotheek alleen-lezen. Kies een school of bestuur om activiteiten toe te voegen.
        </InfoBalk>
      )}

      <Card padding="md">
        <div className="space-y-3">
          <SearchField value={zoek} onChange={setZoek} placeholder="Zoek op naam, code of standaard…" />
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line-subtle pt-3">
            <Checkbox checked={verplicht} onChange={setVerplicht} label="Alleen verplichte activiteiten" />
            {editable && <Checkbox checked={nietOpKalender} onChange={setNietOpKalender} label="Alleen wat nog niet op de kalender staat" />}
          </div>
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
          icon={SearchX}
          title="Niets gevonden"
          body="Pas je zoekopdracht of filters aan."
          action={
            filtersActief ? (
              <Button variant="secondary" onClick={wisFilters}>
                Filters wissen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {resultaten.map((a) => (
            <ActiviteitKaart
              key={a.id}
              activiteit={a}
              gesprek={vindGesprek(cyclus, a.gesprek)}
              opKalenderUid={editable ? (uidOpKalender.get(a.id) ?? null) : undefined}
              dekking={niveau === 'cluster' ? { aantal: dekking.get(a.id) ?? 0, van: clusterScholen.length } : undefined}
              onToevoegen={editable ? () => toevoegen(a.id, a.naam) : undefined}
            />
          ))}
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
