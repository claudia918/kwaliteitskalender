/**
 * Scherm: Kalender-editor (inventaris §1.13).
 * Matrix (standaard × maand) of lijst per maand, met het detailvenster via /kalender?item=<uid>.
 * Onderdelen staan in ./kalender/.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarSearch, LayoutGrid, Library, List, Move, Plus, X } from 'lucide-react';
import {
  Button,
  ButtonLink,
  Dialog,
  EmptyState,
  IconButton,
  InfoBalk,
  KwaliteitsgebiedTag,
  PageHeader,
  STATUS_STIJL,
  SegmentedControl,
  StatusBadge,
  cx,
} from '../componenten';
import { clusterNaamVan, schoolIdsVoorNiveau, vindSchool } from '../domein/berekeningen';
import { aantal, effectieveNaam } from '../domein/hulp';
import { STATUS_VOLGORDE } from '../domein/seed';
import type { Maand } from '../domein/types';
import { useScope, useStore } from '../store';
import { DetailVenster } from './kalender/DetailVenster';
import {
  PERIODE_MAANDEN,
  gesprekkenPerMaand,
  maandVanDatum,
  maandVoluit,
  matrixGroepen,
  periodeVan,
  schoolPerUid,
  verschuifMaand,
  zoekItem,
  type ItemPlek,
  type Periode,
} from './kalender/hulp';
import { Matrix } from './kalender/Matrix';
import { Lijst } from './kalender/Lijst';

type Weergave = 'matrix' | 'lijst';

/** Keuzes blijven bewaard zolang de app open is (niet in opslag). */
const onthouden: { weergave?: Weergave; periode?: Periode } = {};

function beginWeergave(): Weergave {
  if (onthouden.weergave) return onthouden.weergave;
  return typeof window !== 'undefined' && window.innerWidth < 768 ? 'lijst' : 'matrix';
}

/** Heel jaar alleen als twaalf ruime kolommen passen; anders de helft met de huidige maand. */
function beginPeriode(huidig: Maand): Periode {
  if (onthouden.periode) return onthouden.periode;
  const breed = typeof window !== 'undefined' ? window.innerWidth : 1440;
  return breed >= 1660 ? 'heel' : periodeVan(huidig);
}

export default function Kalender() {
  const store = useStore();
  const { state, niveau, setNiveau, setSchoolId } = store;
  const { scope, editScope, editable, scopeLabel } = useScope();
  const [params, setParams] = useSearchParams();
  const itemParam = params.get('item');

  const huidigeMaand = useMemo(() => maandVanDatum(new Date()), []);
  const [weergave, zetWeergave] = useState<Weergave>(beginWeergave);
  const [periode, zetPeriode] = useState<Periode>(() => beginPeriode(huidigeMaand));
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);
  const [focusUid, setFocusUid] = useState<string | null>(null);
  const [melding, setMelding] = useState('');

  const setWeergave = (w: Weergave) => {
    onthouden.weergave = w;
    zetWeergave(w);
  };
  const setPeriode = (p: Periode) => {
    onthouden.periode = p;
    zetPeriode(p);
  };

  const cyclus = state.organisatie.gesprekscyclus;
  const gesprekken = useMemo(() => gesprekkenPerMaand(cyclus), [cyclus]);
  const groepen = useMemo(() => matrixGroepen(scope.standaarden, scope.items), [scope.standaarden, scope.items]);

  // Clusterniveau: van welke school is een item?
  const schoolVanUid = useMemo(
    () => (niveau === 'cluster' ? schoolPerUid(state, schoolIdsVoorNiveau(state.organisatie, 'cluster', store.clusterId)) : null),
    [niveau, state, store.clusterId],
  );
  const schoolNaamVan = useCallback(
    (uid: string) => {
      const id = schoolVanUid?.get(uid);
      return (id && vindSchool(state.organisatie, id)?.naam) || 'School';
    },
    [schoolVanUid, state.organisatie],
  );

  const geselecteerdItem = geselecteerd ? (scope.items.find((i) => i.uid === geselecteerd) ?? null) : null;

  // Selectie vervalt als het item verdwijnt (verwijderd, ander niveau of andere school).
  useEffect(() => {
    if (geselecteerd && !geselecteerdItem) setGeselecteerd(null);
  }, [geselecteerd, geselecteerdItem]);

  // Esc deselecteert ook als de focus niet op de chip staat.
  useEffect(() => {
    if (!geselecteerd || itemParam) return;
    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGeselecteerd(null);
    };
    document.addEventListener('keydown', opToets);
    return () => document.removeEventListener('keydown', opToets);
  }, [geselecteerd, itemParam]);

  /* ---------------- detailvenster via de route ---------------- */

  const open = useCallback(
    (uid: string) => {
      const p = new URLSearchParams(params);
      p.set('item', uid);
      setParams(p, { replace: true });
    },
    [params, setParams],
  );
  const sluit = useCallback(() => {
    const p = new URLSearchParams(params);
    p.delete('item');
    setParams(p, { replace: true });
  }, [params, setParams]);

  const detailItem = itemParam ? (scope.items.find((i) => i.uid === itemParam) ?? null) : null;
  const elders = itemParam && !detailItem ? zoekItem(state, itemParam) : null;

  function naarPlek(plek: ItemPlek) {
    if (plek.kind === 'bestuur') setNiveau('bestuur');
    else {
      setSchoolId(plek.schoolId);
      setNiveau('school');
    }
  }

  function plekNaam(plek: ItemPlek): string {
    return plek.kind === 'bestuur'
      ? state.organisatie.bestuurNaam || 'het bestuur'
      : (vindSchool(state.organisatie, plek.schoolId)?.naam ?? 'een school');
  }

  /* ---------------- verplaatsen ---------------- */

  function verplaats(uid: string, maand: Maand) {
    if (!editScope) return;
    const item = scope.items.find((i) => i.uid === uid);
    if (!item || item.maand === maand) return;
    store.moveItem(editScope, uid, maand);
    if (!PERIODE_MAANDEN[periode].includes(maand)) setPeriode(periodeVan(maand));
    setGeselecteerd(uid);
    setFocusUid(uid);
    setMelding(`${effectieveNaam(item)} verplaatst naar ${maandVoluit(maand)}.`);
  }

  function stap(uid: string, richting: -1 | 1) {
    const item = scope.items.find((i) => i.uid === uid);
    if (!item) return;
    const doel = verschuifMaand(item.maand, richting);
    if (!doel) {
      setMelding(richting < 0 ? 'Dit is al de eerste maand van het schooljaar.' : 'Dit is al de laatste maand van het schooljaar.');
      return;
    }
    verplaats(uid, doel);
  }

  /* ---------------- weergave ---------------- */

  const gebieden = useMemo(() => [...new Set(scope.standaarden.map((s) => s.gebied))], [scope.standaarden]);
  const leeg = scope.items.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Kalender"
        title="Kalender-editor"
        subtitle={`${scopeLabel} · ${aantal(scope.items.length, 'activiteit', 'activiteiten')} · schooljaar ${state.schooljaar}`}
        actions={
          <>
            {editable && (
              <ButtonLink to="/bibliotheek" variant="secondary" size="sm" icon={Plus}>
                Activiteit toevoegen
              </ButtonLink>
            )}
            <SegmentedControl<Weergave>
              label="Weergave"
              value={weergave}
              onChange={setWeergave}
              options={[
                { value: 'matrix', label: 'Matrix', icon: LayoutGrid },
                { value: 'lijst', label: 'Lijst', icon: List },
              ]}
            />
          </>
        }
      />

      {!editable && (
        <InfoBalk tone="niveau">Clusterweergave is alleen-lezen (samengevoegde scholen). Kies een school om te bewerken.</InfoBalk>
      )}

      {leeg ? (
        <EmptyState
          icon={CalendarSearch}
          title="Nog geen activiteiten gepland"
          body={
            editable
              ? 'Voeg activiteiten toe vanuit de bibliotheek om je kalender te vullen.'
              : 'De scholen in dit cluster hebben nog geen activiteiten gepland.'
          }
          action={
            editable ? (
              <ButtonLink to="/bibliotheek" variant="primary" icon={Library}>
                Naar bibliotheek
              </ButtonLink>
            ) : undefined
          }
          watermark
        />
      ) : weergave === 'matrix' ? (
        <div className="space-y-3">
          <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-stretch">
            {/* De selectiebalk ligt over de legenda, zodat de matrix niet verspringt bij selecteren. */}
            <div className="relative min-w-0 flex-1">
              <Legenda gebieden={gebieden} editable={editable} verborgen={!!(geselecteerdItem && editable)} />
              {geselecteerdItem && editable && (
                <div
                  className="absolute inset-0 flex items-center gap-3 overflow-hidden rounded-md border border-niveau-border bg-niveau-surface px-3 py-2"
                  data-selectiebalk
                >
                  <Move className="h-4 w-4 shrink-0 text-niveau-strong" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold text-niveau-strong">{effectieveNaam(geselecteerdItem)}</span>
                      <StatusBadge status={geselecteerdItem.status} />
                    </p>
                    <p className="mt-0.5 text-xs text-ink-body">
                      Klik een maand in dezelfde rij, sleep de activiteit, of gebruik ← → om te verplaatsen.
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => open(geselecteerdItem.uid)}>
                    <span className="sm:hidden">Details</span>
                    <span className="hidden sm:inline">Details bewerken</span>
                  </Button>
                  <IconButton icon={X} label="Selectie opheffen" size="sm" onClick={() => setGeselecteerd(null)} />
                </div>
              )}
            </div>
            <SegmentedControl<Periode>
              label="Maanden"
              className="self-start lg:self-center"
              value={periode}
              onChange={setPeriode}
              options={[
                { value: 'eerste', label: 'Aug t/m jan' },
                { value: 'tweede', label: 'Feb t/m jul' },
                { value: 'heel', label: 'Heel jaar' },
              ]}
            />
          </div>
          <Matrix
            groepen={groepen}
            maanden={PERIODE_MAANDEN[periode]}
            gesprekken={gesprekken}
            huidigeMaand={huidigeMaand}
            editable={editable}
            geselecteerd={editable ? geselecteerd : null}
            onSelecteer={setGeselecteerd}
            onOpen={open}
            onVerplaats={verplaats}
            onStap={stap}
            schoolNaamVan={schoolVanUid ? schoolNaamVan : undefined}
            focusUid={focusUid}
            onFocusGedaan={() => setFocusUid(null)}
          />
          {periode !== 'heel' && (
            <p className="text-xs text-ink-subtle">
              Je ziet {periode === 'eerste' ? 'augustus tot en met januari' : 'februari tot en met juli'}. Kies{' '}
              <button type="button" className="font-semibold text-niveau-strong underline-offset-2 hover:underline" onClick={() => setPeriode('heel')}>
                Heel jaar
              </button>{' '}
              om alle twaalf maanden naast elkaar te zien.
            </p>
          )}
        </div>
      ) : (
        <Lijst
          items={scope.items}
          cyclus={cyclus}
          gesprekken={gesprekken}
          huidigeMaand={huidigeMaand}
          onOpen={open}
          schoolNaamVan={schoolVanUid ? schoolNaamVan : undefined}
        />
      )}

      <p className="sr-only" aria-live="polite">
        {melding}
      </p>

      {/* Detailvenster */}
      {detailItem && (
        <DetailVenster
          item={detailItem}
          editScope={editScope}
          kalenderNaam={schoolVanUid ? schoolNaamVan(detailItem.uid) : scopeLabel}
          onOpenSchool={
            schoolVanUid?.get(detailItem.uid)
              ? () => naarPlek({ kind: 'school', schoolId: schoolVanUid.get(detailItem.uid)! })
              : undefined
          }
          onClose={sluit}
        />
      )}
      {itemParam && !detailItem && (
        <Dialog
          open
          onClose={sluit}
          width="sm"
          title={elders ? 'Activiteit staat op een andere kalender' : 'Activiteit niet gevonden'}
          footer={
            <>
              <Button variant={elders ? 'secondary' : 'primary'} onClick={sluit}>
                {elders ? 'Hier blijven' : 'Sluiten'}
              </Button>
              {elders && <Button variant="primary" onClick={() => naarPlek(elders.plek)}>Naar {plekNaam(elders.plek)}</Button>}
            </>
          }
        >
          <p className="text-sm text-ink-body">
            {elders ? (
              <>
                <strong className="text-ink-strong">{effectieveNaam(elders.item)}</strong> staat op de kalender van{' '}
                {plekNaam(elders.plek)}, niet op die van {scopeLabel}
                {niveau === 'cluster' && elders.plek.kind === 'school'
                  ? ` (cluster ${clusterNaamVan(state.organisatie, vindSchool(state.organisatie, elders.plek.schoolId)) ?? 'onbekend'})`
                  : ''}
                .
              </>
            ) : (
              <>
                Deze activiteit staat niet (meer) op de kalender. Misschien heeft een collega haar verwijderd, of is de link
                verouderd.
              </>
            )}
          </p>
        </Dialog>
      )}
    </div>
  );
}

function Legenda({ gebieden, editable, verborgen }: { gebieden: string[]; editable: boolean; verborgen?: boolean }) {
  return (
    <div
      aria-hidden={verborgen || undefined}
      className={cx(
        'flex min-h-[64px] min-w-0 flex-wrap content-center items-center gap-x-4 gap-y-1.5 rounded-md border border-line-subtle bg-surface-card px-3 py-2',
        verborgen && 'invisible',
      )}
    >
      <span className="eyebrow">Legenda</span>
      <span className="flex flex-wrap items-center gap-3">
        {gebieden.map((g) => (
          <KwaliteitsgebiedTag key={g} gebied={g} size="sm" />
        ))}
      </span>
      <span aria-hidden className="hidden h-4 w-px bg-line-subtle sm:block" />
      <span className="flex flex-wrap items-center gap-3">
        {STATUS_VOLGORDE.map((s) => {
          const st = STATUS_STIJL[s];
          const Icoon = st.icoon;
          return (
            <span key={s} className={cx('inline-flex items-center gap-1 text-2xs font-semibold', st.ink)}>
              <Icoon className="h-3 w-3" aria-hidden style={{ strokeWidth: 2.6 }} />
              {st.label}
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-ink-muted">
          <span className="grid h-3 w-3 place-items-center rounded-full bg-status-warning text-[8px] font-bold leading-none text-white">!</span>
          Verplicht
        </span>
      </span>
      {editable && <span className="basis-full text-2xs text-ink-subtle">Klik een activiteit om te verplaatsen, nog een keer voor details.</span>}
    </div>
  );
}
