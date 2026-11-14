/**
 * Matrix van de kalender-editor: rijen = standaarden (gegroepeerd per kwaliteitsgebied),
 * kolommen = maanden. Kop en eerste kolom zijn sticky.
 *
 * Verplaatsen (alleen binnen dezelfde rij, zoals het origineel):
 * - klik een chip (selecteren), klik daarna een maand in dezelfde rij;
 * - of, met de chip geselecteerd, pijltje links/rechts; Esc deselecteert;
 * - of sleep de chip met de muis naar een maand in dezelfde rij (nieuw).
 * Tweede klik (of Enter) op de geselecteerde chip opent het detailvenster.
 */
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { GesprekIcoonView, STATUS_STIJL, VasteStandaardBadge, cx, gebiedKlassen, seizoenKlassen } from '../../componenten';
import { activiteitVan, effectieveNaam } from '../../domein/hulp';
import type { Gesprek, KalenderItem, Maand } from '../../domein/types';
import { bundel, maandTitel, type MatrixGroep, type MatrixRij } from './hulp';

export interface MatrixProps {
  groepen: MatrixGroep[];
  maanden: Maand[];
  gesprekken: Record<Maand, Gesprek[]>;
  huidigeMaand: Maand;
  /** false op clusterniveau: geen selectie, slepen of detailvenster vanuit de matrix */
  editable: boolean;
  geselecteerd: string | null;
  onSelecteer: (uid: string | null) => void;
  onOpen: (uid: string) => void;
  onVerplaats: (uid: string, maand: Maand) => void;
  /** Pijltjestoets op de geselecteerde chip: één maand verder (-1/+1) */
  onStap: (uid: string, stap: -1 | 1) => void;
  /** Clusterniveau: schoolnaam per item-uid (voor tooltips) */
  schoolNaamVan?: (uid: string) => string;
  /** Uid die na een verplaatsing weer focus moet krijgen */
  focusUid: string | null;
  onFocusGedaan: () => void;
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
    if (e.key === 'Escape') {
      if (p.geselecteerd) {
        e.preventDefault();
        p.onSelecteer(null);
      }
      return;
    }
    if (p.geselecteerd === item.uid && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      p.onStap(item.uid, e.key === 'ArrowLeft' ? -1 : 1);
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

  return (
    <div className="overflow-hidden rounded-lg border border-line-subtle bg-surface-card shadow-xs [--kk-rijkop:120px] md:[--kk-rijkop:200px] xl:[--kk-rijkop:224px]">
      <div className="max-h-[max(420px,calc(100vh-260px))] overflow-auto overscroll-contain" data-matrix-scroller>
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
                <span className="eyebrow">Standaard</span>
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
                        <span className="rounded-pill bg-niveau px-1.5 py-px text-[9px] font-bold uppercase leading-tight tracking-label text-white">
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
                        <span className={cx('text-2xs font-bold uppercase tracking-wide', gk ? gk.ink : 'text-ink-muted')}>
                          {groep.titel}
                        </span>
                      </span>
                    </th>
                  </tr>
                  {groep.rijen.map((rij) => (
                    <tr key={rij.code} className="group/rij">
                      <th
                        scope="row"
                        className={cx(
                          'sticky left-0 z-10 border-b border-r border-line bg-surface-card px-3 py-2 align-top font-normal md:px-4',
                          actief?.rij === rij.code && 'bg-niveau-surface',
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden className={cx('h-2 w-2 shrink-0 rounded-full', rij.gebied ? gebiedKlassen(rij.gebied).dot : 'bg-gray-400')} />
                          <span className="text-sm font-bold text-ink-strong">{rij.code}</span>
                          {rij.kern && <VasteStandaardBadge compact />}
                          <span className="tnum ml-auto text-2xs text-ink-subtle" title={`${rij.aantal} activiteiten`}>
                            {rij.aantal || ''}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs font-medium leading-snug text-ink-muted" title={rij.naam}>
                          {rij.naam}
                        </span>
                      </th>
                      {p.maanden.map((m) => {
                        const doel = p.editable && isDoel(rij, m);
                        const sleutel = `${rij.code}|${m}`;
                        const items = rij.cellen[m];
                        return (
                          <td
                            key={m}
                            data-cel={sleutel}
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
                            title={doel ? `Verplaats naar ${maandTitel(m).toLowerCase()}` : undefined}
                            className={cx(
                              'h-14 border-b border-r border-line-subtle p-1 align-top transition-colors duration-fast',
                              doel && 'cursor-pointer bg-niveau-surface outline-dashed outline-2 -outline-offset-4 outline-niveau-border hover:outline-niveau',
                              boven === sleutel && 'outline-niveau',
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
                                      onClick={() => chipKlik(item)}
                                      onKeyDown={(e) => chipToets(e, item)}
                                      onDragStart={(e) => dragStart(e, item, rij)}
                                      onDragEnd={dragEinde}
                                    />
                                  ))
                                : bundel(items).map((b) => (
                                    <ClusterChip key={b.sleutel} naam={b.naam} items={b.items} schoolNaamVan={p.schoolNaamVan} />
                                  ))}
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

function StatusIcoon({ status }: { status: KalenderItem['status'] }) {
  const s = STATUS_STIJL[status] ?? STATUS_STIJL.gepland;
  const Icoon = s.icoon;
  return (
    <span title={s.label} className={cx('mt-px shrink-0', s.ink)}>
      <Icoon className="h-3 w-3" aria-hidden style={{ strokeWidth: 2.6 }} />
    </span>
  );
}

interface MatrixChipProps {
  item: KalenderItem;
  geselecteerd: boolean;
  sleept: boolean;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
}

/** Chip in de matrix: wit vlak, links een balk in de kleur van het kwaliteitsgebied. */
function MatrixChip({ item, geselecteerd, sleept, onClick, onKeyDown, onDragStart, onDragEnd }: MatrixChipProps) {
  const a = activiteitVan(item);
  const k = gebiedKlassen(a?.gebied);
  const naam = effectieveNaam(item);
  const status = STATUS_STIJL[item.status]?.label ?? item.status;
  const uitleg = geselecteerd
    ? 'Geselecteerd. Pijltje links of rechts verplaatst, Enter opent de details, Escape deselecteert.'
    : 'Enter om te selecteren en te verplaatsen.';
  return (
    <button
      type="button"
      data-uid={item.uid}
      draggable
      aria-pressed={geselecteerd}
      aria-label={`${naam}. ${status}${a?.verplicht ? ', verplicht' : ''}${item.afwijking ? ', afwijking' : ''}. ${uitleg}`}
      title={`${naam}\n${status}${item.eigenaar ? ` · ${item.eigenaar}` : ''}${item.afwijking ? `\nAfwijking: ${item.afwijking.reden}` : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={onKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cx(
        'relative flex w-full cursor-grab items-start gap-1 overflow-hidden rounded-sm border bg-surface-card py-1 pl-2.5 pr-1 text-left transition-[box-shadow,border-color,opacity] duration-fast active:cursor-grabbing',
        geselecteerd
          ? 'z-[2] border-transparent shadow-md ring-2 ring-niveau'
          : 'z-[1] border-line-subtle shadow-xs hover:border-line hover:shadow-sm',
        sleept && 'opacity-50',
      )}
    >
      <span aria-hidden className={cx('absolute inset-y-0 left-0 w-[3px]', k.dot)} />
      <span className="line-clamp-3 min-w-0 flex-1 break-words hyphens-auto text-[11.5px] font-medium leading-tight text-ink-body">{naam}</span>
      <span className="flex shrink-0 flex-col items-center gap-0.5">
        <StatusIcoon status={item.status} />
        {a?.verplicht && (
          <span
            title="Verplicht"
            className="grid h-3 w-3 place-items-center rounded-full bg-status-warning text-[8px] font-bold leading-none text-white"
          >
            !
          </span>
        )}
        {item.afwijking && (
          <span title={`Afwijking: ${item.afwijking.reden}`} className="text-status-warning">
            <ArrowLeftRight className="h-3 w-3" aria-hidden />
          </span>
        )}
      </span>
    </button>
  );
}

/** Clusterweergave: één chip per activiteit met de status per school (alleen-lezen). */
function ClusterChip({ naam, items, schoolNaamVan }: { naam: string; items: KalenderItem[]; schoolNaamVan?: (uid: string) => string }) {
  const a = activiteitVan(items[0]);
  const k = gebiedKlassen(a?.gebied);
  const regels = items.map((i) => `${schoolNaamVan?.(i.uid) ?? 'School'}: ${STATUS_STIJL[i.status]?.label ?? i.status}`);
  return (
    <div
      className="relative flex w-full items-start gap-1 overflow-hidden rounded-sm border border-line-subtle bg-surface-card py-1 pl-2.5 pr-1 shadow-xs"
      title={`${naam}\n${regels.join('\n')}`}
    >
      <span aria-hidden className={cx('absolute inset-y-0 left-0 w-[3px]', k.dot)} />
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
