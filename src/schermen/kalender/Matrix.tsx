/**
 * Matrix van de kalender: rijen = standaarden (gegroepeerd per kwaliteitsgebied), kolommen = maanden.
 * Kop en eerste kolom zijn sticky.
 *
 * Wat je op het scherm ziet, legt de bediening uit:
 * - een chip heeft links een statusknop (klik: status kiezen) en rechts een greep (slepen);
 * - klik op de naam selecteert; de actiebalk onderaan toont dan wat kan, en de maanden in dezelfde
 *   rij lichten op als doel (klik of sleep erheen);
 * - een lege cel toont bij hover een plusknop; elke rij heeft een plusknop bij de standaard.
 * Toetsen op een geselecteerde chip: pijl links/rechts verplaatst, 1-4 zet de status, Enter opent
 * details, Delete verwijdert (met ongedaan maken), Esc deselecteert.
 */
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { GripVertical, KeyRound, Plus } from 'lucide-react';
import { GesprekIcoonView, STATUS_STIJL, cx, gebiedKlassen, seizoenKlassen } from '../../componenten';
import { activiteitVan, effectieveNaam, formatDatumKort } from '../../domein/hulp';
import { STATUS_VOLGORDE } from '../../domein/seed';
import type { Gesprek, KalenderItem, Maand, Status } from '../../domein/types';
import { bundel, maandTitel, maandVoluit, type MatrixGroep, type MatrixRij } from './hulp';
import { StatusKeuze } from './StatusKeuze';
import type { ToevoegBegin } from './ToevoegPaneel';

export interface MatrixProps {
  groepen: MatrixGroep[];
  maanden: Maand[];
  gesprekken: Record<Maand, Gesprek[]>;
  huidigeMaand: Maand;
  /** false op clusterniveau: alleen-lezen */
  editable: boolean;
  geselecteerd: string | null;
  onSelecteer: (uid: string | null) => void;
  onOpen: (uid: string) => void;
  onVerplaats: (uid: string, maand: Maand) => void;
  /** Pijltjestoets op de geselecteerde chip: één maand verder (-1/+1) */
  onStap: (uid: string, stap: -1 | 1) => void;
  onStatus: (uid: string, status: Status) => void;
  onVerwijder: (uid: string) => void;
  onToevoegen: (begin: ToevoegBegin) => void;
  /** Filter "Toon alleen": false = chip verbergen */
  zichtbaar: (item: KalenderItem) => boolean;
  /** Clusterniveau: schoolnaam per item-uid (voor tooltips) */
  schoolNaamVan?: (uid: string) => string;
  /** Uid die (na verplaatsen of toevoegen) focus moet krijgen */
  focusUid: string | null;
  onFocusGedaan: () => void;
  /** Uid die even oplicht (net toegevoegd of verplaatst) */
  markeerUid: string | null;
}

const KOLOM_BREEDTE = { heel: 96, half: 120 };

export function Matrix(p: MatrixProps) {
  const tabel = useRef<HTMLTableElement>(null);
  const [sleep, setSleep] = useState<{ uid: string; rij: string; van: Maand } | null>(null);
  const [boven, setBoven] = useState<string | null>(null);

  const geselecteerdItem = p.geselecteerd ? zoekInGroepen(p.groepen, p.geselecteerd) : null;
  const actief = sleep ?? (geselecteerdItem ? { uid: geselecteerdItem.item.uid, rij: geselecteerdItem.rij, van: geselecteerdItem.item.maand } : null);

  // focus terug op de chip na verplaatsen (de chip staat dan in een andere cel)
  useEffect(() => {
    if (!p.focusUid) return;
    const el = tabel.current?.querySelector<HTMLElement>(`[data-uid="${CSS.escape(p.focusUid)}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    p.onFocusGedaan();
  });

  const breedte = p.maanden.length > 6 ? KOLOM_BREEDTE.heel : KOLOM_BREEDTE.half;
  const aantalKolommen = p.maanden.length + 1;

  function chipToets(e: KeyboardEvent, item: KalenderItem) {
    const gekozen = p.geselecteerd === item.uid;
    if (e.key === 'Escape') {
      if (p.geselecteerd) {
        e.preventDefault();
        p.onSelecteer(null);
      }
      return;
    }
    if (!gekozen) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      p.onStap(item.uid, e.key === 'ArrowLeft' ? -1 : 1);
    } else if (/^[1-4]$/.test(e.key)) {
      e.preventDefault();
      p.onStatus(item.uid, STATUS_VOLGORDE[Number(e.key) - 1]);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      p.onVerwijder(item.uid);
    }
  }

  function chipKlik(item: KalenderItem) {
    if (!p.editable) return;
    if (p.geselecteerd === item.uid) p.onOpen(item.uid);
    else p.onSelecteer(item.uid);
  }

  function isDoel(rij: MatrixRij, maand: Maand) {
    return !!actief && actief.rij === rij.code && actief.van !== maand;
  }

  function dragStart(e: DragEvent, item: KalenderItem, rij: MatrixRij) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.uid);
    setSleep({ uid: item.uid, rij: rij.code, van: item.maand });
  }

  function dragEinde() {
    setSleep(null);
    setBoven(null);
  }

  // Anker voor de rondleiding: de eerste rij met een zichtbare activiteit.
  const eersteRij = p.groepen
    .flatMap((g) => g.rijen)
    .find((r) => p.maanden.some((m) => r.cellen[m].some(p.zichtbaar)))?.code;

  return (
    <div
      className="overflow-hidden rounded-lg border border-line-subtle bg-surface-card shadow-xs [--kk-rijkop:132px] md:[--kk-rijkop:200px] xl:[--kk-rijkop:224px]"
      data-rondleiding="matrix"
    >
      <div className="max-h-[max(420px,calc(100vh-250px))] overflow-auto overscroll-contain" data-matrix-scroller>
        <table
          ref={tabel}
          className="w-full table-fixed border-separate border-spacing-0 text-left"
          style={{ minWidth: `calc(var(--kk-rijkop) + ${p.maanden.length} * ${breedte}px)` }}
          aria-label="Kalendermatrix: standaarden per maand"
        >
          <colgroup>
            <col style={{ width: 'var(--kk-rijkop)' }} />
            {p.maanden.map((m) => (
              <col key={m} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 border-b border-r border-line bg-surface-subtle px-3 py-2 align-bottom md:px-4"
              >
                <span className="kk-groepskop">Standaard</span>
              </th>
              {p.maanden.map((m) => {
                const g = p.gesprekken[m] ?? [];
                const k = g.length ? seizoenKlassen(g[0].kleur) : null;
                const nu = m === p.huidigeMaand;
                return (
                  <th
                    key={m}
                    scope="col"
                    className={cx(
                      'sticky top-0 z-20 border-b border-r border-line-subtle px-1.5 py-2 text-center align-top',
                      k ? k.surface : 'bg-surface-subtle',
                    )}
                    style={k ? { boxShadow: `inset 0 -2px 0 ${k.var}` } : undefined}
                  >
                    <span className={cx('flex items-center justify-center gap-1 text-xs font-bold', k ? k.ink : 'text-ink-body')}>
                      {maandTitel(m).slice(0, 3)}
                      {nu && (
                        <span className="rounded-xs bg-gray-900 px-1 py-px text-[10px] font-semibold leading-tight text-white">
                          nu
                        </span>
                      )}
                    </span>
                    {g.map((gs) => (
                      <span
                        key={gs.id}
                        className={cx('mt-0.5 flex items-center justify-center gap-1 truncate text-2xs font-semibold', seizoenKlassen(gs.kleur).ink)}
                        title={`Gesprek ${gs.naam}${gs.thema ? `: ${gs.thema}` : ''}`}
                      >
                        <GesprekIcoonView icoon={gs.icoon} kleur={gs.kleur} className="h-3 w-3 shrink-0" />
                        <span className="truncate">{gs.naam}</span>
                      </span>
                    ))}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {p.groepen.map((groep) => {
              const gk = groep.gebied ? gebiedKlassen(groep.gebied) : null;
              return (
                <GroepRijen key={groep.titel}>
                  <tr>
                    <th colSpan={aantalKolommen} scope="colgroup" className="border-b border-line-subtle bg-surface-sunken p-0">
                      <span className="sticky left-0 flex w-max items-center gap-2 px-3 py-1.5 md:px-4">
                        <span aria-hidden className={cx('h-2.5 w-2.5 rounded-xs', gk ? gk.dot : 'bg-gray-400')} />
                        <span className={cx('text-xs font-bold', gk ? gk.ink : 'text-ink-muted')}>
                          {groep.titel}
                        </span>
                      </span>
                    </th>
                  </tr>
                  {groep.rijen.map((rij) => (
                    <tr key={rij.code} className="group/rij" data-rondleiding={rij.code === eersteRij ? 'eerste-rij' : undefined}>
                      <th
                        scope="row"
                        className={cx(
                          'sticky left-0 z-10 border-b border-r border-line bg-surface-card px-3 py-2 align-top font-normal md:px-4',
                          actief?.rij === rij.code && 'bg-surface-sunken',
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-ink-strong">{rij.code}</span>
                          {rij.kern && (
                            <span title="Vaste standaard: komt in elk gesprek terug" className="text-ink-subtle">
                              <KeyRound className="h-3 w-3" aria-label="vaste standaard" />
                            </span>
                          )}
                          {p.editable && rij.gebied && (
                            <button
                              type="button"
                              data-rondleiding="toevoegen-rij"
                              onClick={() => p.onToevoegen({ standaard: rij.code })}
                              aria-label={`Activiteit toevoegen bij ${rij.code}`}
                              title={`Activiteit toevoegen bij ${rij.code}`}
                              className="ml-auto grid h-6 w-6 place-items-center rounded-sm text-ink-subtle opacity-0 transition-opacity duration-fast hover:bg-surface-sunken hover:text-ink-strong focus-visible:opacity-100 group-hover/rij:opacity-100"
                            >
                              <Plus className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs font-medium leading-snug text-ink-muted" title={rij.naam}>
                          {rij.naam}
                        </span>
                      </th>
                      {p.maanden.map((m) => {
                        const doel = p.editable && isDoel(rij, m);
                        const sleutel = `${rij.code}|${m}`;
                        const items = rij.cellen[m].filter(p.zichtbaar);
                        const kanToevoegen = p.editable && !actief && !!rij.gebied && items.length === 0;
                        return (
                          <td
                            key={m}
                            data-cel={sleutel}
                            data-doel={doel || undefined}
                            onClick={doel && !sleep ? () => p.onVerplaats(actief!.uid, m) : undefined}
                            onDragOver={
                              doel && sleep
                                ? (e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (boven !== sleutel) setBoven(sleutel);
                                  }
                                : undefined
                            }
                            onDragLeave={doel && sleep ? () => setBoven((b) => (b === sleutel ? null : b)) : undefined}
                            onDrop={
                              doel && sleep
                                ? (e) => {
                                    e.preventDefault();
                                    p.onVerplaats(sleep.uid, m);
                                    dragEinde();
                                  }
                                : undefined
                            }
                            title={doel ? `Verplaats naar ${maandVoluit(m)}` : undefined}
                            className={cx(
                              'group/cel relative h-12 border-b border-r border-line-subtle p-1 align-top transition-colors duration-fast',
                              doel && 'cursor-pointer bg-brand-yellow-soft outline-dashed outline-2 -outline-offset-4 outline-gray-400 hover:outline-gray-900',
                              boven === sleutel && 'outline-gray-900',
                            )}
                          >
                            <div className="flex flex-col gap-1">
                              {p.editable
                                ? items.map((item) => (
                                    <MatrixChip
                                      key={item.uid}
                                      item={item}
                                      geselecteerd={p.geselecteerd === item.uid}
                                      sleept={sleep?.uid === item.uid}
                                      gemarkeerd={p.markeerUid === item.uid}
                                      onClick={() => chipKlik(item)}
                                      onKeyDown={(e) => chipToets(e, item)}
                                      onDragStart={(e) => dragStart(e, item, rij)}
                                      onDragEnd={dragEinde}
                                      onStatus={(s) => p.onStatus(item.uid, s)}
                                    />
                                  ))
                                : bundel(items).map((b) => (
                                    <ClusterChip key={b.sleutel} naam={b.naam} items={b.items} schoolNaamVan={p.schoolNaamVan} />
                                  ))}
                              {doel && (
                                <span
                                  aria-hidden
                                  className={cx(
                                    'pointer-events-none py-1 text-center text-2xs font-semibold text-ink-strong',
                                    boven === sleutel ? 'block' : 'hidden group-hover/cel:block',
                                  )}
                                >
                                  Hierheen
                                </span>
                              )}
                              {kanToevoegen && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  data-celplus
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    p.onToevoegen({ standaard: rij.code, maand: m });
                                  }}
                                  aria-label={`Activiteit toevoegen bij ${rij.code} in ${maandVoluit(m)}`}
                                  title={`Toevoegen bij ${rij.code} in ${maandVoluit(m)}`}
                                  className={cx(
                                    'absolute inset-1 grid place-items-center rounded-sm border border-dashed border-transparent text-ink-subtle opacity-0 transition-opacity duration-fast',
                                    'hover:border-line hover:bg-surface-hover hover:text-ink-strong group-hover/cel:opacity-100',
                                  )}
                                >
                                  <Plus className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </GroepRijen>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroepRijen({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function zoekInGroepen(groepen: MatrixGroep[], uid: string): { item: KalenderItem; rij: string } | null {
  for (const g of groepen)
    for (const r of g.rijen)
      for (const lijst of Object.values(r.cellen)) {
        const item = lijst.find((i) => i.uid === uid);
        if (item) return { item, rij: r.code };
      }
  return null;
}

/* ------------------------------------------------------------------ */
/* Chips                                                                */
/* ------------------------------------------------------------------ */

/** Tooltiptekst: alles wat niet op de chip zelf staat. */
export function chipTitel(item: KalenderItem): string {
  const a = activiteitVan(item);
  const regels = [effectieveNaam(item), STATUS_STIJL[item.status]?.label ?? item.status];
  if (a?.verplicht) regels.push('Verplicht');
  if (item.eigenaar) regels.push(`Eigenaar: ${item.eigenaar}`);
  if (item.deadline) regels.push(`Deadline: ${formatDatumKort(item.deadline)}`);
  if (item.afwijking) regels.push(`Ander gesprek: ${item.afwijking.reden}`);
  return regels.join('\n');
}

interface MatrixChipProps {
  item: KalenderItem;
  geselecteerd: boolean;
  sleept: boolean;
  gemarkeerd: boolean;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onStatus: (s: Status) => void;
}

/**
 * Chip in de matrix: statusknop, naam, greep. Het kwaliteitsgebied staat al bij de rij en hoeft
 * niet nog eens op de chip. Gereed is stiller (grijze tekst), risico licht op.
 */
function MatrixChip({ item, geselecteerd, sleept, gemarkeerd, onClick, onKeyDown, onDragStart, onDragEnd, onStatus }: MatrixChipProps) {
  const a = activiteitVan(item);
  const naam = effectieveNaam(item);
  const status = STATUS_STIJL[item.status]?.label ?? item.status;
  const uitleg = geselecteerd
    ? 'Geselecteerd. Pijl links of rechts verplaatst, 1 tot 4 zet de status, Enter opent de details, Delete verwijdert, Escape deselecteert.'
    : 'Enter om te selecteren.';
  return (
    <div
      data-chip
      data-rondleiding="chip"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => e.stopPropagation()}
      className={cx(
        'group/chip relative flex w-full items-start gap-0.5 rounded-sm border py-0.5 pl-0.5 pr-1 transition-[box-shadow,border-color,opacity,background-color] duration-base',
        item.status === 'risico' ? 'border-status-warning-border bg-status-warning-surface' : 'bg-surface-card',
        geselecteerd
          ? 'z-[2] border-transparent shadow-md ring-2 ring-gray-900'
          : cx('z-[1]', item.status === 'risico' ? '' : 'border-line-subtle hover:border-gray-900'),
        !geselecteerd && 'has-[[data-uid]:focus-visible]:ring-2 has-[[data-uid]:focus-visible]:ring-brand-yellow',
        gemarkeerd && !geselecteerd && 'bg-brand-yellow-soft',
        sleept && 'opacity-50',
      )}
    >
      <StatusKeuze status={item.status} onKies={onStatus} naam={naam} />
      <button
        type="button"
        data-uid={item.uid}
        aria-pressed={geselecteerd}
        aria-label={`${naam}. ${status}${a?.verplicht ? ', verplicht' : ''}${item.afwijking ? ', ander gesprek' : ''}. ${uitleg}`}
        title={chipTitel(item)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className={cx(
          'min-w-0 flex-1 cursor-grab py-0.5 text-left outline-none active:cursor-grabbing',
          'line-clamp-3 break-words hyphens-auto text-[11.5px] font-medium leading-tight',
          item.status === 'gereed' ? 'text-ink-muted' : 'text-ink-body',
        )}
      >
        {naam}
      </button>
      <span
        aria-hidden
        className={cx(
          'pointer-events-none absolute right-0 top-0.5 rounded-sm bg-surface-card text-ink-subtle transition-opacity duration-fast',
          geselecteerd ? 'opacity-100' : 'opacity-0 group-hover/chip:opacity-100',
        )}
      >
        <GripVertical className="h-3.5 w-3" />
      </span>
    </div>
  );
}

/** Clusterweergave: één chip per activiteit met de status per school (alleen-lezen). */
function ClusterChip({ naam, items, schoolNaamVan }: { naam: string; items: KalenderItem[]; schoolNaamVan?: (uid: string) => string }) {
  const regels = items.map((i) => `${schoolNaamVan?.(i.uid) ?? 'School'}: ${STATUS_STIJL[i.status]?.label ?? i.status}`);
  return (
    <div
      className="relative flex w-full items-start gap-1 overflow-hidden rounded-sm border border-line-subtle bg-surface-card px-1.5 py-1 shadow-xs"
      title={`${naam}\n${regels.join('\n')}`}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-3 break-words hyphens-auto text-[11.5px] font-medium leading-tight text-ink-body">{naam}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-0.5" aria-label={regels.join(', ')}>
          {items.map((i) => (
            <span key={i.uid} aria-hidden className={cx('h-1.5 w-1.5 rounded-full', STATUS_STIJL[i.status]?.dot)} />
          ))}
          {items.length > 1 && <span className="tnum ml-0.5 text-[10px] font-semibold text-ink-subtle">{items.length} scholen</span>}
        </span>
      </span>
    </div>
  );
}
