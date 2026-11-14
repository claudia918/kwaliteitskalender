/**
 * Scherm: Kalender (inventaris §1.13).
 * Matrix (standaard × maand) of lijst per maand, met het detailvenster via /kalender?item=<uid>.
 *
 * De drie dingen die je hier doet, kunnen allemaal zonder ander scherm of uitleg:
 * - toevoegen: plusknop in een cel of rij, of "Activiteit toevoegen" (keuzepaneel met zoeken);
 * - verschuiven: slepen aan de greep, of selecteren en een gemarkeerde maand kiezen (actiebalk);
 * - bijhouden: statusknop op de chip of in de lijst; filter "Toon" en de voortgangsbalk bovenaan.
 * Na verplaatsen, status, toevoegen, opslaan en verwijderen verschijnt "Ongedaan maken".
 * Onderdelen staan in ./kalender/.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarSearch, LayoutGrid, List, Plus } from 'lucide-react';
import { Button, Dialog, EmptyState, InfoBalk, PageHeader, STATUS_STIJL, SegmentedControl } from '../componenten';
import { clusterNaamVan, schoolIdsVoorNiveau, vindSchool } from '../domein/berekeningen';
import { effectieveNaam, maandUitPeriode } from '../domein/hulp';
import type { Activiteit, KalenderItem, Maand, Status } from '../domein/types';
import { useKomendGesprek, useScope, useStore } from '../store';
import { EigenActiviteitDialoog } from './bibliotheek/EigenActiviteitDialoog';
import { Actiebalk } from './kalender/Actiebalk';
import { DetailVenster } from './kalender/DetailVenster';
import {
  PERIODE_MAANDEN,
  gesprekkenPerMaand,
  maandVanDatum,
  maandVoluit,
  matrixGroepen,
  ontbrekendeVerplichte,
  pastBijFilter,
  periodeVan,
  schoolPerUid,
  verschuifMaand,
  zoekItem,
  type ItemPlek,
  type Periode,
} from './kalender/hulp';
import { LegeStart } from './kalender/LegeStart';
import { Lijst } from './kalender/Lijst';
import { Matrix } from './kalender/Matrix';
import { Dock, OngedaanMelding, useOngedaan } from './kalender/Ongedaan';
import { Legenda, Overzicht } from './kalender/Overzicht';
import { ToevoegPaneel, type ToevoegBegin } from './kalender/ToevoegPaneel';
import { useVoorkeur, type Weergave } from './kalender/voorkeuren';

/** Heel jaar alleen als twaalf ruime kolommen passen; anders de helft met de huidige maand. */
function beginPeriode(huidig: Maand): Periode {
  const breed = typeof window !== 'undefined' ? window.innerWidth : 1440;
  return breed >= 1660 ? 'heel' : periodeVan(huidig);
}

export default function Kalender() {
  const store = useStore();
  const { state, niveau, setNiveau, setSchoolId } = store;
  const { scope, editScope, editable, scopeLabel, library } = useScope();
  const komend = useKomendGesprek();
  const [params, setParams] = useSearchParams();
  const itemParam = params.get('item');

  const huidigeMaand = useMemo(() => maandVanDatum(new Date()), []);
  const [weergave, setWeergave] = useVoorkeur('weergave', () =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'lijst' : 'matrix',
  );
  const [periode, setPeriode] = useVoorkeur('periode', () => beginPeriode(huidigeMaand));
  const [filter, setFilter] = useVoorkeur('filter', () => 'alles');
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);
  const [focusUid, setFocusUid] = useState<string | null>(null);
  const [markeerUid, setMarkeerUid] = useState<string | null>(null);
  const [melding, setMelding] = useState('');
  const [paneel, setPaneel] = useState<{ open: boolean; begin: ToevoegBegin }>({ open: false, begin: {} });
  const [eigen, setEigen] = useState<{ open: boolean; begin: ToevoegBegin }>({ open: false, begin: {} });
  const ongedaan = useOngedaan();

  const cyclus = state.organisatie.gesprekscyclus;
  const gesprekken = useMemo(() => gesprekkenPerMaand(cyclus), [cyclus]);
  const groepen = useMemo(() => matrixGroepen(scope.standaarden, scope.items), [scope.standaarden, scope.items]);
  const gesprekId = komend?.gesprek.id ?? null;
  const zichtbaar = useCallback((i: KalenderItem) => pastBijFilter(i, filter, gesprekId), [filter, gesprekId]);

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

  const vind = useCallback((uid: string) => scope.items.find((i) => i.uid === uid) ?? null, [scope.items]);
  const geselecteerdItem = geselecteerd ? vind(geselecteerd) : null;

  // Selectie vervalt als het item verdwijnt of door het filter onzichtbaar wordt.
  useEffect(() => {
    if (geselecteerd && (!geselecteerdItem || !zichtbaar(geselecteerdItem))) setGeselecteerd(null);
  }, [geselecteerd, geselecteerdItem, zichtbaar]);

  // Esc deselecteert ook als de focus niet op de chip staat.
  useEffect(() => {
    if (!geselecteerd || itemParam) return;
    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGeselecteerd(null);
    };
    document.addEventListener('keydown', opToets);
    return () => document.removeEventListener('keydown', opToets);
  }, [geselecteerd, itemParam]);

  // Een net toegevoegde of verplaatste activiteit licht even op (en komt in beeld).
  const gemarkeerd = markeerUid ? vind(markeerUid) : null;
  const inBeeldGebracht = useRef<string | null>(null);
  useEffect(() => {
    if (!gemarkeerd || inBeeldGebracht.current === gemarkeerd.uid + gemarkeerd.maand) return;
    inBeeldGebracht.current = gemarkeerd.uid + gemarkeerd.maand;
    if (!PERIODE_MAANDEN[periode].includes(gemarkeerd.maand)) setPeriode(periodeVan(gemarkeerd.maand));
  }, [gemarkeerd, periode, setPeriode]);
  useEffect(() => {
    if (!markeerUid) return;
    const t = window.setTimeout(() => setMarkeerUid(null), 1800);
    return () => window.clearTimeout(t);
  }, [markeerUid]);

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

  const detailItem = itemParam ? vind(itemParam) : null;
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

  /* ---------------- handelingen (met ongedaan maken) ---------------- */

  /** Zorg dat een maand in beeld is en dat het filter een item niet verbergt. */
  function inBeeld(maand: Maand, item?: Pick<KalenderItem, 'status' | 'gesprek'>) {
    if (!PERIODE_MAANDEN[periode].includes(maand)) setPeriode(periodeVan(maand));
    if (item && !pastBijFilter(item as KalenderItem, filter, gesprekId)) setFilter('alles');
  }

  function herstel(vorige: KalenderItem, tekst: string) {
    if (!editScope) return;
    store.herstelItem(editScope, vorige);
    inBeeld(vorige.maand, vorige);
    setMarkeerUid(vorige.uid);
    setMelding(tekst);
  }

  function verplaats(uid: string, maand: Maand) {
    if (!editScope) return;
    const item = vind(uid);
    if (!item || item.maand === maand) return;
    store.moveItem(editScope, uid, maand);
    inBeeld(maand);
    setGeselecteerd(uid);
    setFocusUid(uid);
    setMarkeerUid(uid);
    const naam = effectieveNaam(item);
    setMelding(`${naam} verplaatst naar ${maandVoluit(maand)}.`);
    ongedaan.toon(`${naam} staat nu in ${maandVoluit(maand)}`, () => herstel(item, `${naam} terug naar ${maandVoluit(item.maand)}.`));
  }

  function stap(uid: string, richting: -1 | 1) {
    const item = vind(uid);
    if (!item) return;
    const doel = verschuifMaand(item.maand, richting);
    if (!doel) {
      setMelding(richting < 0 ? 'Dit is al de eerste maand van het schooljaar.' : 'Dit is al de laatste maand van het schooljaar.');
      return;
    }
    verplaats(uid, doel);
  }

  function zetStatus(uid: string, status: Status) {
    if (!editScope) return;
    const item = vind(uid);
    if (!item || item.status === status) return;
    store.setItemStatus(editScope, uid, status);
    const naam = effectieveNaam(item);
    const label = STATUS_STIJL[status].label.toLowerCase();
    setMelding(`${naam}: ${label}.`);
    ongedaan.toon(`${naam}: ${label}`, () => herstel(item, `Status van ${naam} teruggezet.`));
  }

  function verwijderd(item: KalenderItem) {
    const naam = effectieveNaam(item);
    setGeselecteerd(null);
    setMelding(`${naam} verwijderd.`);
    ongedaan.toon(`${naam} verwijderd`, () => herstel(item, `${naam} teruggezet.`));
  }

  function verwijder(uid: string) {
    if (!editScope) return;
    const item = vind(uid);
    if (!item) return;
    store.removeItem(editScope, uid);
    verwijderd(item);
  }

  function opgeslagen(vorige: KalenderItem) {
    setMarkeerUid(vorige.uid);
    ongedaan.toon('Wijzigingen opgeslagen', () => herstel(vorige, 'Wijzigingen teruggedraaid.'));
  }

  function toevoegen(a: Activiteit, maand: Maand | null): string | null {
    if (!editScope) return null;
    const uid = store.addActiviteit(editScope, a.id);
    if (!uid) return null;
    const doel = maand ?? maandUitPeriode(a.periode);
    if (doel !== maandUitPeriode(a.periode)) store.moveItem(editScope, uid, doel);
    inBeeld(doel, { status: 'gepland', gesprek: a.gesprek });
    setMarkeerUid(uid);
    setMelding(`${a.naam} toegevoegd in ${maandVoluit(doel)}.`);
    ongedaan.toon(`${a.naam} staat in ${maandVoluit(doel)}`, () => {
      store.removeItem(editScope, uid);
      setMelding(`${a.naam} weer weggehaald.`);
    });
    return uid;
  }

  function voegVerplichteToe() {
    if (!editScope) return;
    const lijst = ontbrekendeVerplichte(library, scope.items);
    const uids = lijst.map((a) => store.addActiviteit(editScope, a.id)).filter((u): u is string => !!u);
    if (!uids.length) return;
    const tekst = uids.length === 1 ? '1 verplichte activiteit toegevoegd' : `${uids.length} verplichte activiteiten toegevoegd`;
    setMelding(`${tekst}.`);
    ongedaan.toon(tekst, () => {
      for (const u of uids) store.removeItem(editScope, u);
      setMelding('Weer weggehaald.');
    });
  }

  function eigenToegevoegd(uid: string, naam: string) {
    if (!editScope) return;
    setMarkeerUid(uid);
    setFilter('alles');
    ongedaan.toon(`${naam} toegevoegd`, () => store.removeItem(editScope, uid));
  }

  const openPaneel = (begin: ToevoegBegin = {}) => {
    setGeselecteerd(null);
    setPaneel({ open: true, begin });
  };
  const openEigen = (begin: ToevoegBegin = {}) => {
    setPaneel((p) => ({ ...p, open: false }));
    setEigen({ open: true, begin });
  };

  /* ---------------- weergave ---------------- */

  const leeg = scope.items.length === 0;
  const zichtbareItems = useMemo(() => scope.items.filter(zichtbaar), [scope.items, zichtbaar]);
  const dockZichtbaar = !!ongedaan.melding || (!!geselecteerdItem && editable && weergave === 'matrix');

  return (
    <div className={dockZichtbaar ? 'space-y-5 pb-28' : 'space-y-5'}>
      <PageHeader
        eyebrow="Kalender"
        title="Kalender-editor"
        subtitle={`${scopeLabel} · schooljaar ${state.schooljaar}`}
        actions={
          <>
            {editable && !leeg && (
              <Button variant="primary" size="md" icon={Plus} onClick={() => openPaneel()} data-rondleiding="toevoegen">
                Activiteit toevoegen
              </Button>
            )}
            {!leeg && (
              <span data-rondleiding="weergave">
                <SegmentedControl<Weergave>
                  label="Weergave"
                  value={weergave}
                  onChange={(w) => {
                    setWeergave(w);
                    setGeselecteerd(null);
                  }}
                  options={[
                    { value: 'matrix', label: 'Matrix', icon: LayoutGrid },
                    { value: 'lijst', label: 'Lijst', icon: List },
                  ]}
                />
              </span>
            )}
          </>
        }
      />

      {!editable && (
        <InfoBalk tone="niveau">Clusterweergave is alleen-lezen (samengevoegde scholen). Kies een school om te bewerken.</InfoBalk>
      )}

      {leeg ? (
        editable ? (
          <LegeStart
            kalenderNaam={scopeLabel}
            aantalVerplicht={ontbrekendeVerplichte(library, []).length}
            aantalBibliotheek={library.length}
            onVerplicht={voegVerplichteToe}
            onKiezen={() => openPaneel()}
            onEigen={() => openEigen()}
          />
        ) : (
          <EmptyState
            icon={CalendarSearch}
            title="Nog geen activiteiten gepland"
            body="De scholen in dit cluster hebben nog geen activiteiten gepland."
            watermark
          />
        )
      ) : (
        <div className="space-y-3">
          <Overzicht
            items={scope.items}
            filter={filter}
            onFilter={setFilter}
            komend={komend}
            rechts={
              <>
                {weergave === 'matrix' && (
                  <span data-rondleiding="periode">
                    <SegmentedControl<Periode>
                      label="Maanden"
                      value={periode}
                      onChange={setPeriode}
                      options={[
                        { value: 'eerste', label: 'Aug t/m jan' },
                        { value: 'tweede', label: 'Feb t/m jul' },
                        { value: 'heel', label: 'Heel jaar' },
                      ]}
                    />
                  </span>
                )}
                <Legenda editable={editable} />
              </>
            }
          />
          {weergave === 'matrix' ? (
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
              onStatus={zetStatus}
              onVerwijder={verwijder}
              onToevoegen={openPaneel}
              zichtbaar={zichtbaar}
              schoolNaamVan={schoolVanUid ? schoolNaamVan : undefined}
              focusUid={focusUid}
              onFocusGedaan={() => setFocusUid(null)}
              markeerUid={markeerUid}
            />
          ) : zichtbareItems.length ? (
            <Lijst
              items={zichtbareItems}
              cyclus={cyclus}
              gesprekken={gesprekken}
              huidigeMaand={huidigeMaand}
              onOpen={open}
              onStatus={editable ? zetStatus : undefined}
              onToevoegen={editable ? openPaneel : undefined}
              schoolNaamVan={schoolVanUid ? schoolNaamVan : undefined}
              markeerUid={markeerUid}
            />
          ) : (
            <EmptyState icon={CalendarSearch} title="Niets te tonen met dit filter" body="Kies Alles om weer alle activiteiten te zien." compact />
          )}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {melding}
      </p>

      <Dock>
        <OngedaanMelding {...ongedaan} />
        {geselecteerdItem && editable && weergave === 'matrix' && !itemParam && (
          <Actiebalk
            item={geselecteerdItem}
            onStatus={(s) => zetStatus(geselecteerdItem.uid, s)}
            onStap={(r) => stap(geselecteerdItem.uid, r)}
            onDetails={() => open(geselecteerdItem.uid)}
            onVerwijder={() => verwijder(geselecteerdItem.uid)}
            onSluit={() => setGeselecteerd(null)}
          />
        )}
      </Dock>

      {editScope && (
        <>
          <ToevoegPaneel
            open={paneel.open}
            begin={paneel.begin}
            onClose={() => setPaneel((p) => ({ ...p, open: false }))}
            bibliotheek={library}
            items={scope.items}
            standaarden={scope.standaarden}
            kalenderNaam={scopeLabel}
            onToevoegen={toevoegen}
            onTerugdraaien={(uid) => {
              store.removeItem(editScope, uid);
              ongedaan.sluit();
            }}
            onEigen={openEigen}
          />
          <EigenActiviteitDialoog
            open={eigen.open}
            onClose={() => setEigen((e) => ({ ...e, open: false }))}
            editScope={editScope}
            standaarden={scope.standaarden}
            scopeLabel={scopeLabel}
            beginStandaard={eigen.begin.standaard}
            beginMaand={eigen.begin.maand}
            onToegevoegd={eigenToegevoegd}
          />
        </>
      )}

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
          onOpgeslagen={opgeslagen}
          onVerwijderd={verwijderd}
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
