/**
 * Werklijst op Start: "Deze maand" of "Voor het komende gesprek". Elke regel zet je met één klik op
 * bezig of gereed, zonder venster. De volgorde hangt niet af van de status, zodat een regel niet
 * verspringt als je hem afvinkt (nog eens klikken zet hem terug op gepland).
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, CircleCheck, CircleDashed } from 'lucide-react';
import { EmptyState, SegmentedControl, StatusBadge, STATUS_STIJL, cx, useToast } from '../../componenten';
import { itemsVoorGesprek, type KomendGesprek } from '../../domein/berekeningen';
import { activiteitVan, effectieveNaam, formatDatumKort, vindGesprek } from '../../domein/hulp';
import { itemsInMaand, maandVan, maandVoluit, werklijstVolgorde } from '../../domein/thuis';
import type { EditScope, KalenderItem, Status } from '../../domein/types';
import { useScope, useStore, useVoorkeur } from '../../store';

const MAX = 8;

export function Werklijst({ komend }: { komend: KomendGesprek | null }) {
  const { state, niveau, setItemStatus } = useStore();
  const { scope, editScope } = useScope();
  // Cluster: bij elke regel de school, want dezelfde activiteit staat bij meerdere scholen.
  const schoolVan = useMemo(() => {
    const m = new Map<string, string>();
    if (niveau !== 'cluster') return m;
    for (const s of state.organisatie.scholen) for (const i of state.schoolKalenders[s.id] ?? []) m.set(i.uid, s.naam);
    return m;
  }, [state, niveau]);
  const toast = useToast();
  const maand = maandVan();
  const maandNaam = maandVoluit(maand);

  const dezeMaand = useMemo(() => itemsInMaand(scope.items, maand), [scope.items, maand]);
  const voorGesprek = useMemo(
    () => (komend ? werklijstVolgorde(itemsVoorGesprek(scope.items, komend.gesprek.id)) : []),
    [scope.items, komend],
  );

  const [tabVoorkeur, setTab] = useVoorkeur<'maand' | 'gesprek'>('start.werklijst', 'maand');
  // Niets deze maand maar wel voor het gesprek: dan het gesprek tonen.
  const tab = !komend ? 'maand' : tabVoorkeur === 'maand' && dezeMaand.length === 0 && voorGesprek.length > 0 ? 'gesprek' : tabVoorkeur;
  const [alles, setAlles] = useState(false);
  const lijst = tab === 'maand' ? dezeMaand : voorGesprek;
  const getoond = alles ? lijst : lijst.slice(0, MAX);
  const gereed = lijst.filter((i) => i.status === 'gereed').length;

  const zet = (item: KalenderItem, status: Status) => {
    if (!editScope) return;
    const nieuw = item.status === status ? 'gepland' : status;
    setItemStatus(editScope, item.uid, nieuw);
    toast(`${effectieveNaam(item)}: ${STATUS_STIJL[nieuw].label.toLowerCase()}`, nieuw === 'gereed' ? 'success' : 'info');
  };

  const opties = [
    { value: 'maand' as const, label: `Deze maand (${dezeMaand.length})` },
    ...(komend ? [{ value: 'gesprek' as const, label: `Voor ${komend.gesprek.naam} (${voorGesprek.length})` }] : []),
  ];

  return (
    <section
      data-rondleiding="deze-maand"
      aria-labelledby="werklijst-kop"
      className="rounded-lg border border-line-subtle bg-surface-card shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line-subtle px-5 py-4">
        <div className="min-w-0">
          <h2 id="werklijst-kop" className="text-h3 text-ink-strong">
            {tab === 'maand' ? `Deze maand: ${maandNaam}` : `Voor het gesprek ${komend?.gesprek.naam ?? ''}`}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {lijst.length === 0
              ? 'Niets gepland.'
              : editScope
                ? `${gereed} van ${lijst.length} gereed. Zet een activiteit met één klik op bezig of gereed.`
                : `${gereed} van ${lijst.length} gereed. Kies een school om bij te werken.`}
          </p>
        </div>
        {opties.length > 1 && (
          <SegmentedControl
            label="Welke activiteiten"
            value={tab}
            onChange={(v) => {
              setTab(v);
              setAlles(false);
            }}
            options={opties}
          />
        )}
      </div>

      {lijst.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarCheck}
          title={tab === 'maand' ? `Niets gepland in ${maandNaam}` : 'Nog niets gekoppeld aan dit gesprek'}
          body={
            tab === 'maand' && voorGesprek.length > 0
              ? `Kijk bij "Voor ${komend?.gesprek.naam}" wat er voor het komende gesprek klaar moet zijn.`
              : 'Zet activiteiten op de kalender vanuit de bibliotheek.'
          }
          action={
            <Link to="/bibliotheek" className="text-sm font-semibold text-niveau-strong hover:underline">
              Naar de bibliotheek
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line-subtle px-5">
          {getoond.map((item) => (
            <Regel key={item.uid} item={item} editScope={editScope} onZet={zet} cyclusNaam={vindGesprek(state.organisatie.gesprekscyclus, item.gesprek).naam} toonGesprek={tab === 'maand'} school={schoolVan.get(item.uid)} />
          ))}
        </ul>
      )}

      {lijst.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle px-5 py-3 text-sm">
          {lijst.length > MAX ? (
            <button type="button" onClick={() => setAlles(!alles)} className="font-semibold text-niveau-strong hover:underline">
              {alles ? 'Minder tonen' : `Alle ${lijst.length} tonen`}
            </button>
          ) : (
            <span />
          )}
          <Link to={tab === 'maand' ? '/kalender' : '/gesprekken'} className="inline-flex items-center gap-1 font-semibold text-niveau-strong hover:underline">
            {tab === 'maand' ? 'Open de kalender' : 'Bekijk het hele gesprek'} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}

function Regel({
  item,
  editScope,
  onZet,
  cyclusNaam,
  toonGesprek,
  school,
}: {
  school?: string;
  item: KalenderItem;
  editScope: EditScope | null;
  onZet: (item: KalenderItem, s: Status) => void;
  cyclusNaam: string;
  toonGesprek: boolean;
}) {
  const naam = effectieveNaam(item);
  const act = activiteitVan(item);
  const klaar = item.status === 'gereed';
  const meta = [
    school,
    act?.standaard,
    toonGesprek ? cyclusNaam : null,
    item.deadline ? `deadline ${formatDatumKort(item.deadline)}` : null,
    item.eigenaar || null,
  ].filter(Boolean);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3" data-uid={item.uid}>
      <span aria-hidden className={cx('mt-0.5 h-2.5 w-2.5 shrink-0 self-start rounded-full sm:self-center', STATUS_STIJL[item.status].dot)} />
      <div className="min-w-0 flex-1 basis-56">
        <Link
          to={`/kalender?item=${encodeURIComponent(item.uid)}`}
          className={cx('text-sm font-medium hover:underline', klaar ? 'text-ink-muted line-through decoration-ink-subtle' : 'text-ink-strong')}
          title="Openen in de kalender"
        >
          {naam}
        </Link>
        {act?.verplicht && (
          <span className="ml-1 text-xs font-semibold text-status-warning" title="Verplicht">
            *<span className="sr-only"> verplicht</span>
          </span>
        )}
        {item.status === 'risico' && <StatusBadge status="risico" className="ml-2 align-middle" />}
        {meta.length > 0 && <p className="mt-0.5 truncate text-xs text-ink-muted">{meta.join(' · ')}</p>}
      </div>
      {editScope ? (
        <div role="group" aria-label={`Status van ${naam}`} className="ml-5 flex shrink-0 gap-1.5 sm:ml-0">
          <StatusKnop actief={item.status === 'bezig'} status="bezig" icoon={CircleDashed} onClick={() => onZet(item, 'bezig')} naam={naam} />
          <StatusKnop actief={klaar} status="gereed" icoon={CircleCheck} onClick={() => onZet(item, 'gereed')} naam={naam} />
        </div>
      ) : (
        <StatusBadge status={item.status} />
      )}
    </li>
  );
}

function StatusKnop({
  actief,
  status,
  icoon: Icoon,
  onClick,
  naam,
}: {
  actief: boolean;
  status: Status;
  icoon: typeof CircleCheck;
  onClick: () => void;
  naam: string;
}) {
  const st = STATUS_STIJL[status];
  return (
    <button
      type="button"
      aria-pressed={actief}
      onClick={onClick}
      title={actief ? `${naam} terugzetten op gepland` : `${naam} op ${st.label.toLowerCase()} zetten`}
      className={cx(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors duration-fast',
        actief ? cx(st.surface, st.ink, st.border) : 'border-line-subtle bg-surface-card text-ink-muted hover:border-line hover:text-ink-strong',
      )}
    >
      <Icoon className="h-3.5 w-3.5" aria-hidden />
      {st.label}
    </button>
  );
}
