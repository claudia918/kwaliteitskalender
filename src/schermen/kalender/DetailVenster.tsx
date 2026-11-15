/**
 * Detailvenster van een kalenderitem (route /kalender?item=<uid>).
 *
 * Twee lagen: eerst wat bijna altijd nodig is (status, maand, deadline, eigenaar, notitie), daaronder
 * uitklapbaar "Meer" (ander gesprek met reden, eigen naam, bewijs, gegevens van de activiteit,
 * historie), met een samenvatting van wat erin staat.
 *
 * Anders dan het origineel werkt alles via "Opslaan": ook de status en de bewijsstukken.
 * "Annuleren" draait dus alles terug (inventaris §9). Sluiten met niet-opgeslagen wijzigingen
 * vraagt eerst wat je wilt. Verwijderen gaat direct als de kalender "Ongedaan maken" aanbiedt
 * (prop onVerwijderd); anders vraagt het venster eerst een bevestiging.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarClock,
  ChevronRight,
  Info,
  Copy,
  FileText,
  History,
  Link2,
  Paperclip,
  Plus,
  Repeat,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react';
import {
  Badge,
  Begrip,
  Button,
  Dialog,
  Input,
  InfoBalk,
  SeizoenBadge,
  Select,
  StandaardBadge,
  StatusBadge,
  Textarea,
  Veld,
  VerplichtBadge,
  VasteStandaardBadge,
  KwaliteitsgebiedTag,
  STATUS_STIJL,
  cx,
  useToast,
} from '../../componenten';
import { activiteitVan, effectieveNaam, formatDatumKort, gesprekOpties, vandaagISO, vindGesprek } from '../../domein/hulp';
import { BEWIJS_HINT, PRIVACY_REGEL } from '../../domein/inhoud';
import { MAANDEN, STANDAARD_OP_CODE, STATUS_VOLGORDE } from '../../domein/seed';
import type { Bewijs, EditScope, KalenderItem, Maand, Status } from '../../domein/types';
import { useStore } from '../../store';
import { isBruikbareLink, maandTitel, recenteHistorie } from './hulp';

interface Concept {
  eigenNaam: string;
  status: Status;
  eigenaar: string;
  deadline: string;
  maand: Maand;
  gesprek: string;
  reden: string;
  notitie: string;
  bewijs: Bewijs[];
}

function conceptVan(item: KalenderItem, gesprekIds: string[]): Concept {
  return {
    eigenNaam: item.eigenNaam ?? '',
    status: item.status,
    eigenaar: item.eigenaar ?? '',
    deadline: item.deadline ?? '',
    maand: item.maand,
    // een gesprek dat een collega verwijderde, valt terug op Doorlopend (zoals vindGesprek)
    gesprek: gesprekIds.includes(item.gesprek) ? item.gesprek : 'Doorlopend',
    reden: item.afwijking?.reden ?? '',
    notitie: item.notitie ?? '',
    bewijs: item.bewijs ?? [],
  };
}

function gelijk(a: Concept, b: Concept): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

let tijdelijkTeller = 0;

export interface DetailVensterProps {
  item: KalenderItem;
  /** Bewerkbare kalender; null = alleen-lezen (clusterniveau). */
  editScope: EditScope | null;
  /** Naam van de kalender waar het item op staat (school of bestuur). */
  kalenderNaam: string;
  /** Alleen-lezen: knop om naar de school van dit item te gaan. */
  onOpenSchool?: () => void;
  onClose: () => void;
  /** Na opslaan, met de versie van voor het opslaan (voor ongedaan maken). Zonder: een toast. */
  onOpgeslagen?: (vorige: KalenderItem) => void;
  /** Na verwijderen (voor ongedaan maken). Met deze prop vraagt het venster geen bevestiging meer. */
  onVerwijderd?: (vorige: KalenderItem) => void;
}

export function DetailVenster(props: DetailVensterProps) {
  return props.editScope ? <BewerkVenster {...props} editScope={props.editScope} /> : <LeesVenster {...props} />;
}

/* ------------------------------------------------------------------ */
/* Kop met de vaste gegevens van de activiteit                          */
/* ------------------------------------------------------------------ */

function ActiviteitKop({ item, kort }: { item: KalenderItem; kort?: boolean }) {
  const { state } = useStore();
  const a = activiteitVan(item);
  const std = a ? STANDAARD_OP_CODE[a.standaard] : undefined;
  const standaardGesprek = a ? vindGesprek(state.organisatie.gesprekscyclus, a.gesprek) : null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {a && <KwaliteitsgebiedTag gebied={a.gebied} size="sm" className="mr-1" />}
        {a && <StandaardBadge code={a.standaard} title={std?.naam} />}
        {std?.kern && <VasteStandaardBadge />}
        {standaardGesprek && <SeizoenBadge gesprek={standaardGesprek} />}
        {a?.verplicht && <VerplichtBadge />}
        {item.custom && (
          <Badge tone="niveau" size="sm">
            Eigen activiteit
          </Badge>
        )}
        {!kort && (
          <span className="tnum text-2xs text-ink-subtle">
            {item.activiteitId} · {a?.periode || 'geen periode'}
          </span>
        )}
      </div>
      {a?.omschrijving && <p className={cx('text-sm text-ink-body', kort && 'line-clamp-2')} title={kort ? a.omschrijving : undefined}>{a.omschrijving}</p>}
      {!kort && <OverActiviteitRegels item={item} />}
    </div>
  );
}

function OverActiviteitRegels({ item }: { item: KalenderItem }) {
  const a = activiteitVan(item);
  if (!a || !(a.frequentie || a.verantwoordelijke)) return null;
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
      {a.frequentie && (
        <div className="flex items-center gap-1.5">
          <Repeat className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
          <dt className="sr-only">Frequentie</dt>
          <dd>{a.frequentie}</dd>
        </div>
      )}
      {a.verantwoordelijke && (
        <div className="flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
          <dt>Verantwoordelijke rol:</dt>
          <dd className="font-medium text-ink-body">{a.verantwoordelijke}</dd>
        </div>
      )}
    </dl>
  );
}

/** Tweede laag van het detailvenster: de vaste gegevens uit de bibliotheek. */
function OverActiviteit({ item }: { item: KalenderItem }) {
  const a = activiteitVan(item);
  return (
    <section>
      <Sectiekop icon={Info}>Over deze activiteit</Sectiekop>
      <p className="tnum mb-1 text-xs text-ink-muted">
        {item.activiteitId} · aanbevolen periode {a?.periode || 'niet vastgelegd'}
      </p>
      <OverActiviteitRegels item={item} />
    </section>
  );
}

function Sectiekop({ icon: Icon, children }: { icon: typeof History; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {children}
    </h3>
  );
}

function HistorieLijst({ item }: { item: KalenderItem }) {
  const regels = recenteHistorie(item);
  return (
    <section>
      <Sectiekop icon={History}>Historie</Sectiekop>
      {regels.length === 0 ? (
        <p className="text-xs text-ink-subtle">Nog geen statuswijzigingen.</p>
      ) : (
        <ol className="space-y-1">
          {regels.map((h, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <StatusBadge status={h.status} />
              <span className="tnum text-ink-muted">{formatDatumKort(h.datum)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function KopieerKnop({ tekst }: { tekst: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="shrink-0 rounded-sm p-1 text-ink-subtle hover:bg-surface-hover hover:text-ink-strong"
      aria-label="Link kopiëren"
      title="Link kopiëren"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(tekst);
          toast('Gekopieerd naar klembord', 'info');
        } catch {
          toast('Kopiëren lukte niet. Selecteer de link en kopieer hem zelf.', 'warning');
        }
      }}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** Eén bewijsstuk: label en (als tekst, nooit als klikbare link) de verwijzing. */
function BewijsRegel({ b, onVerwijder, nieuw }: { b: Bewijs; onVerwijder?: () => void; nieuw?: boolean }) {
  return (
    <li className="flex items-start gap-2 rounded-md border border-line-subtle bg-surface-card px-2.5 py-2">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink-strong">
          <span className="break-words">{b.label}</span>
          {nieuw && (
            <Badge tone="info" size="sm">
              nog niet opgeslagen
            </Badge>
          )}
        </p>
        {b.url && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
            <Link2 className="h-3 w-3 shrink-0" aria-hidden />
            <span className="min-w-0 select-all truncate" title={b.url}>
              {b.url}
            </span>
            <KopieerKnop tekst={b.url} />
          </p>
        )}
      </div>
      {onVerwijder && (
        <button
          type="button"
          onClick={onVerwijder}
          aria-label={`Bewijsstuk ${b.label} verwijderen`}
          className="shrink-0 rounded-sm p-1 text-ink-subtle hover:bg-status-danger-surface hover:text-status-danger"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Bewerken                                                             */
/* ------------------------------------------------------------------ */

function BewerkVenster({ item, editScope, kalenderNaam, onClose, onOpgeslagen, onVerwijderd }: DetailVensterProps & { editScope: EditScope }) {
  const store = useStore();
  const toast = useToast();
  const cyclus = store.state.organisatie.gesprekscyclus;
  const opties = useMemo(() => gesprekOpties(cyclus), [cyclus]);
  const gesprekIds = useMemo(() => opties.map((g) => g.id), [opties]);
  const a = activiteitVan(item);
  const bibliotheekNaam = a?.naam ?? item.activiteitId;
  const standaardGesprek = a?.gesprek;

  const [begin, setBegin] = useState(() => conceptVan(item, gesprekIds));
  const [c, setC] = useState(begin);
  const [bewijsLabel, setBewijsLabel] = useState('');
  const [bewijsUrl, setBewijsUrl] = useState('');
  const [bewijsFout, setBewijsFout] = useState('');
  const [verwijderVraag, setVerwijderVraag] = useState(false);
  const [sluitVraag, setSluitVraag] = useState(false);
  // Tweede laag open als er al iets in staat dat aandacht vraagt (een ander gesprek).
  const [meerOpen, setMeerOpen] = useState(() => !!item.afwijking);

  // Ander item geopend: concept opnieuw vullen.
  useEffect(() => {
    const b = conceptVan(item, gesprekIds);
    setBegin(b);
    setC(b);
    setVerwijderVraag(false);
    setSluitVraag(false);
    setMeerOpen(!!item.afwijking);
    // alleen bij een ander item; wijzigingen van collega's overschrijven je concept niet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.uid]);

  const zet = <K extends keyof Concept>(k: K, v: Concept[K]) => {
    setC((oud) => ({ ...oud, [k]: v }));
    setSluitVraag(false);
  };

  const afwijkend = c.gesprek !== standaardGesprek;
  const redenFout = afwijkend && c.reden.trim().length < 2;
  const gewijzigd = !gelijk(c, begin);
  const deadlineVerstreken = !!c.deadline && c.deadline < vandaagISO() && c.status !== 'gereed';

  function probeerSluiten() {
    if (gewijzigd) setSluitVraag(true);
    else onClose();
  }

  function koppelBewijs() {
    const label = bewijsLabel.trim();
    if (!label) {
      setBewijsFout('Geef het document of verslag een naam.');
      return;
    }
    if (!isBruikbareLink(bewijsUrl)) {
      setBewijsFout('Dit lijkt geen link of bestandslocatie. Laat het veld leeg of plak de link uit je eigen omgeving.');
      return;
    }
    zet('bewijs', [...c.bewijs, { id: `nieuw-${++tijdelijkTeller}`, label, url: bewijsUrl.trim() || undefined }]);
    setBewijsLabel('');
    setBewijsUrl('');
    setBewijsFout('');
  }

  function opslaan() {
    if (redenFout) return;
    const vorige = item;
    if (c.status !== begin.status) store.setItemStatus(editScope, item.uid, c.status);
    const eigenNaam = c.eigenNaam.trim() === bibliotheekNaam ? '' : c.eigenNaam;
    store.slaItemOp(editScope, item.uid, {
      gesprek: c.gesprek,
      reden: afwijkend ? c.reden : '',
      notitie: c.notitie,
      eigenNaam,
      eigenaar: c.eigenaar,
      deadline: c.deadline,
      maand: c.maand,
    });
    const blijft = new Set(c.bewijs.map((b) => b.id));
    for (const b of begin.bewijs) if (!blijft.has(b.id)) store.removeBewijs(editScope, item.uid, b.id);
    for (const b of c.bewijs) if (b.id.startsWith('nieuw-')) store.addBewijs(editScope, item.uid, { label: b.label, url: b.url });
    if (onOpgeslagen) onOpgeslagen(vorige);
    else toast('Wijzigingen opgeslagen');
    onClose();
  }

  function verwijder() {
    const vorige = item;
    onClose();
    store.removeItem(editScope, item.uid);
    if (onVerwijderd) onVerwijderd(vorige);
    else toast('Activiteit verwijderd', 'danger');
  }

  const naamHint =
    c.eigenNaam.trim() && c.eigenNaam.trim() !== bibliotheekNaam
      ? `Bibliotheeknaam: ${bibliotheekNaam}. De koppeling met ${a?.standaard ?? 'de standaard'} blijft behouden.`
      : 'Gebruik je eigen woorden. De koppeling met de bibliotheek en de standaard blijft ongewijzigd.';

  // Samenvatting van de tweede laag, zodat je ziet wat erin staat zonder hem te openen.
  const meerSamenvatting = [
    afwijkend ? `gesprek ${vindGesprek(cyclus, c.gesprek).naam}` : null,
    c.eigenNaam.trim() && c.eigenNaam.trim() !== bibliotheekNaam ? 'eigen naam' : null,
    c.bewijs.length ? (c.bewijs.length === 1 ? '1 bewijsstuk' : `${c.bewijs.length} bewijsstukken`) : null,
    item.historie?.length ? 'historie' : null,
  ].filter(Boolean);

  const footer = sluitVraag ? (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <p className="mr-auto text-sm font-medium text-ink-strong">Je wijzigingen zijn nog niet opgeslagen.</p>
      <Button variant="ghost" onClick={onClose}>
        Niet opslaan
      </Button>
      <Button variant="secondary" onClick={() => setSluitVraag(false)}>
        Terug
      </Button>
      <Button variant="primary" onClick={opslaan} disabled={redenFout} autoFocus>
        Opslaan
      </Button>
    </div>
  ) : verwijderVraag ? (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <p className="mr-auto flex items-center gap-2 text-sm font-medium text-status-danger">
        <TriangleAlert className="h-4 w-4" aria-hidden />
        Deze activiteit van de kalender verwijderen?
      </p>
      <Button variant="secondary" onClick={() => setVerwijderVraag(false)}>
        Nee, behouden
      </Button>
      <Button variant="danger" icon={Trash2} onClick={verwijder} autoFocus>
        Ja, verwijderen
      </Button>
    </div>
  ) : (
    <>
      <Button
        variant="danger-zacht"
        icon={Trash2}
        className="mr-auto"
        // Met ongedaan maken is een extra vraag overbodig.
        onClick={() => (onVerwijderd ? verwijder() : setVerwijderVraag(true))}
      >
        Verwijderen
      </Button>
      {gewijzigd && <span className="hidden text-xs text-ink-subtle sm:inline">Niet opgeslagen</span>}
      <Button variant="ghost" onClick={onClose}>
        Annuleren
      </Button>
      <Button variant="primary" onClick={opslaan} disabled={redenFout} title={redenFout ? 'Vul eerst een reden in voor het andere gesprek' : undefined}>
        Opslaan
      </Button>
    </>
  );

  return (
    <Dialog
      open
      onClose={probeerSluiten}
      blokkeerAchtergrond={gewijzigd}
      width="lg"
      title={effectieveNaam({ ...item, eigenNaam: c.eigenNaam })}
      subtitle={`Kalender van ${kalenderNaam}`}
      footer={footer}
    >
      <form
        className="space-y-5"
        data-rondleiding="detailvenster"
        onSubmit={(e) => {
          e.preventDefault();
          opslaan();
        }}
      >
        <ActiviteitKop item={item} kort />

        {/* Laag 1: wat bijna altijd nodig is */}
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-ink-muted">Status</legend>
          <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATUS_VOLGORDE.map((s) => {
              const st = STATUS_STIJL[s];
              const Icoon = st.icoon;
              const actief = c.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={actief}
                  onClick={() => zet('status', s)}
                  className={cx(
                    'inline-flex h-10 items-center justify-center gap-1.5 rounded-md border text-sm font-semibold transition-colors duration-fast',
                    actief
                      ? cx(st.surface, st.ink, st.border, 'shadow-xs')
                      : 'border-line bg-surface-card text-ink-body hover:border-line-strong hover:bg-surface-hover',
                  )}
                >
                  <Icoon className="h-4 w-4" aria-hidden style={{ strokeWidth: 2.2 }} />
                  {st.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_1.3fr]">
          <Veld label="Maand">
            {(id) => (
              <Select
                id={id}
                value={c.maand}
                onChange={(e) => zet('maand', e.target.value as Maand)}
                options={MAANDEN.map((m) => ({ value: m, label: maandTitel(m) }))}
              />
            )}
          </Veld>
          <Veld
            label="Deadline"
            fout={deadlineVerstreken ? 'Verstreken en nog niet gereed.' : undefined}
          >
            {(id) => <Input id={id} type="date" value={c.deadline} onChange={(e) => zet('deadline', e.target.value)} />}
          </Veld>
          <Veld label="Eigenaar" hint={`${PRIVACY_REGEL} Bij voorkeur een rol.`}>
            {(id) => (
              <Input
                id={id}
                value={c.eigenaar}
                placeholder={a?.verantwoordelijke ? `bv. ${a.verantwoordelijke}` : 'Naam of rol'}
                onChange={(e) => zet('eigenaar', e.target.value)}
              />
            )}
          </Veld>
        </div>

        <Veld label="Notitie" hint={PRIVACY_REGEL}>
          {(id) => <Textarea id={id} value={c.notitie} rows={2} onChange={(e) => zet('notitie', e.target.value)} />}
        </Veld>

        {/* Laag 2: rustig eronder, uitklapbaar */}
        <div className="rounded-lg border border-line-subtle">
          <button
            type="button"
            aria-expanded={meerOpen}
            aria-controls="detail-meer"
            onClick={() => setMeerOpen((o) => !o)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-surface-hover"
          >
            <ChevronRight className={cx('h-4 w-4 shrink-0 text-ink-muted transition-transform duration-fast', meerOpen && 'rotate-90')} aria-hidden />
            <span className="text-sm font-semibold text-ink-strong">Meer</span>
            <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">
              {meerSamenvatting.length ? meerSamenvatting.join(' · ') : 'gesprek, eigen naam, bewijs, historie'}
            </span>
          </button>
          {meerOpen && (
            <div id="detail-meer" className="space-y-5 border-t border-line-subtle px-3 pb-4 pt-4">
              <Veld label="Gekoppeld gesprek">
                {(id) => (
                  <Select
                    id={id}
                    value={c.gesprek}
                    onChange={(e) => zet('gesprek', e.target.value)}
                    options={opties.map((g) => ({
                      value: g.id,
                      label: g.id === standaardGesprek ? `${g.naam} (standaard)` : g.naam,
                    }))}
                  />
                )}
              </Veld>

              {afwijkend && (
                <div className="-mt-2 rounded-md border border-dashed border-status-warning-border bg-status-warning-surface p-3">
                  <p className="mb-2 text-xs text-ink-body">
                    Dit is een <Begrip term="afwijking" /> van de <Begrip term="standaardkoppeling" />. Leg kort uit waarom.
                  </p>
                  <Veld
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <ArrowLeftRight className="h-3.5 w-3.5 text-status-warning" aria-hidden />
                        Reden voor afwijking
                      </span>
                    }
                    verplicht
                    hint={`Het standaardgesprek is ${vindGesprek(cyclus, standaardGesprek ?? 'Doorlopend').naam}. ${PRIVACY_REGEL}`}
                    fout={redenFout && c.reden.length > 0 ? 'Gebruik minstens 2 tekens.' : undefined}
                  >
                    {(id) => (
                      <Input
                        id={id}
                        value={c.reden}
                        placeholder="Korte toelichting (zichtbaar voor bestuur)"
                        onChange={(e) => zet('reden', e.target.value)}
                        aria-invalid={redenFout}
                      />
                    )}
                  </Veld>
                </div>
              )}

              <Veld label="Eigen naam (optioneel)" hint={naamHint}>
                {(id) => (
                  <Input id={id} value={c.eigenNaam} placeholder={bibliotheekNaam} onChange={(e) => zet('eigenNaam', e.target.value)} />
                )}
              </Veld>

              <section>
                <Sectiekop icon={Paperclip}><Begrip term="bewijs">Bewijs</Begrip> ({c.bewijs.length})</Sectiekop>
                {c.bewijs.length > 0 && (
                  <ul className="mb-2 space-y-1.5">
                    {c.bewijs.map((b) => (
                      <BewijsRegel
                        key={b.id}
                        b={b}
                        nieuw={b.id.startsWith('nieuw-')}
                        onVerwijder={() =>
                          zet(
                            'bewijs',
                            c.bewijs.filter((x) => x.id !== b.id),
                          )
                        }
                      />
                    ))}
                  </ul>
                )}
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    veldMaat="sm"
                    aria-label="Naam document of verslag"
                    placeholder="Naam document of verslag"
                    value={bewijsLabel}
                    onChange={(e) => {
                      setBewijsLabel(e.target.value);
                      setBewijsFout('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        koppelBewijs();
                      }
                    }}
                  />
                  <Input
                    veldMaat="sm"
                    aria-label="Link (optioneel)"
                    placeholder="Link (optioneel)"
                    value={bewijsUrl}
                    onChange={(e) => {
                      setBewijsUrl(e.target.value);
                      setBewijsFout('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        koppelBewijs();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={koppelBewijs}>
                    Koppel
                  </Button>
                </div>
                <p className={cx('mt-1 text-2xs leading-snug', bewijsFout ? 'text-xs text-status-danger' : 'text-ink-subtle')}>
                  {bewijsFout || `${BEWIJS_HINT} De link wordt alleen bewaard, nooit geopend.`}
                </p>
              </section>

              <OverActiviteit item={item} />
              <HistorieLijst item={item} />
            </div>
          )}
        </div>
        {/* Enter in een veld slaat op */}
        <button type="submit" hidden tabIndex={-1} aria-hidden />
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Alleen-lezen (clusterniveau)                                         */
/* ------------------------------------------------------------------ */

function Gegeven({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink-strong">{children}</dd>
    </div>
  );
}

function LeesVenster({ item, kalenderNaam, onOpenSchool, onClose }: DetailVensterProps) {
  const { state } = useStore();
  const cyclus = state.organisatie.gesprekscyclus;
  const leeg = <span className="text-ink-subtle">Niet ingevuld</span>;
  return (
    <Dialog
      open
      onClose={onClose}
      width="lg"
      title={effectieveNaam(item)}
      subtitle={`Kalender van ${kalenderNaam}`}
      footer={
        <>
          {onOpenSchool && (
            <Button variant="secondary" className="mr-auto" onClick={onOpenSchool}>
              Bewerken in {kalenderNaam}
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>Sluiten</Button>
        </>
      }
    >
      <div className="space-y-5">
        <InfoBalk tone="niveau">Clusterweergave is alleen-lezen. Kies de school om deze activiteit te bewerken.</InfoBalk>
        <ActiviteitKop item={item} />
        <dl className="grid gap-4 sm:grid-cols-2">
          <Gegeven label="Status">
            <StatusBadge status={item.status} size="md" />
          </Gegeven>
          <Gegeven label="Maand">{maandTitel(item.maand)}</Gegeven>
          <Gegeven label="Gekoppeld gesprek">
            <SeizoenBadge gesprek={vindGesprek(cyclus, item.gesprek)} />
          </Gegeven>
          <Gegeven label="Eigenaar">{item.eigenaar || leeg}</Gegeven>
          <Gegeven label="Deadline">
            {item.deadline ? (
              <span className="tnum inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
                {formatDatumKort(item.deadline)}
              </span>
            ) : (
              leeg
            )}
          </Gegeven>
          {item.afwijking && <Gegeven label="Reden voor afwijking">{item.afwijking.reden}</Gegeven>}
        </dl>
        {item.notitie && (
          <Gegeven label="Notitie">
            <span className="whitespace-pre-wrap">{item.notitie}</span>
          </Gegeven>
        )}
        <section>
          <Sectiekop icon={Paperclip}><Begrip term="bewijs">Bewijs</Begrip> ({item.bewijs?.length ?? 0})</Sectiekop>
          {item.bewijs?.length ? (
            <ul className="space-y-1.5">
              {item.bewijs.map((b) => (
                <BewijsRegel key={b.id} b={b} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-subtle">Nog geen bewijsstukken gekoppeld.</p>
          )}
        </section>
        <HistorieLijst item={item} />
      </div>
    </Dialog>
  );
}
