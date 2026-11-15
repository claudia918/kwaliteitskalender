/**
 * Lijstweergave van de kalender: per maand een kaart. Elke rij heeft links een statusknop (status
 * zetten zonder het detailvenster) en opent met een klik op de naam het detailvenster. Bij elke
 * maand staat een knop om daar iets toe te voegen. Op clusterniveau alleen-lezen.
 */
import { ArrowLeftRight, CalendarClock, CalendarDays, ChevronRight, Paperclip, Plus, School, UserRound } from 'lucide-react';
import { GesprekIcoonView, SeizoenBadge, StatusBadge, cx, seizoenKlassen } from '../../componenten';
import { activiteitVan, aantal, effectieveNaam, formatDatumKort, vandaagISO, vindGesprek } from '../../domein/hulp';
import type { Gesprek, KalenderItem, Maand, Status } from '../../domein/types';
import { itemsPerMaand, maandTitel, maandVoluit, standaardVan } from './hulp';
import { chipTitel } from './Matrix';
import { StatusKeuze } from './StatusKeuze';
import type { ToevoegBegin } from './ToevoegPaneel';

export interface LijstProps {
  items: KalenderItem[];
  cyclus: Gesprek[];
  gesprekken: Record<Maand, Gesprek[]>;
  huidigeMaand: Maand;
  onOpen: (uid: string) => void;
  /** Bewerkbaar: status zetten en toevoegen */
  onStatus?: (uid: string, s: Status) => void;
  onToevoegen?: (begin: ToevoegBegin) => void;
  schoolNaamVan?: (uid: string) => string;
  markeerUid?: string | null;
}

export function Lijst({ items, cyclus, gesprekken, huidigeMaand, onOpen, onStatus, onToevoegen, schoolNaamVan, markeerUid }: LijstProps) {
  const vandaag = vandaagISO();
  const eersteUid = itemsPerMaand(items)[0]?.items[0]?.uid; // anker voor de rondleiding
  return (
    <div className="space-y-4">
      {itemsPerMaand(items).map(({ maand, items: lijst }) => {
        const g = gesprekken[maand] ?? [];
        const k = g.length ? seizoenKlassen(g[0].kleur) : null;
        return (
          <section
            key={maand}
            aria-labelledby={`maand-${maand}`}
            className="overflow-hidden rounded-lg border border-line-subtle bg-surface-card shadow-xs"
          >
            <header
              className={cx(
                'flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2',
                k ? cx(k.surface, k.border) : 'border-line-subtle bg-surface-subtle',
              )}
            >
              <CalendarDays className={cx('h-4 w-4', k ? k.ink : 'text-ink-subtle')} aria-hidden />
              <h2 id={`maand-${maand}`} className={cx('text-sm font-bold', k ? k.ink : 'text-ink-strong')}>
                {maandTitel(maand)}
              </h2>
              {maand === huidigeMaand && (
                <span className="rounded-pill bg-niveau px-1.5 py-px text-[9px] font-bold uppercase leading-tight tracking-label text-white">
                  nu
                </span>
              )}
              {g.map((gs) => (
                <span key={gs.id} className={cx('inline-flex items-center gap-1 text-xs font-semibold', seizoenKlassen(gs.kleur).ink)}>
                  <GesprekIcoonView icoon={gs.icoon} kleur={gs.kleur} className="h-3.5 w-3.5" />
                  Gesprek {gs.naam}
                </span>
              ))}
              <span className="tnum ml-auto text-xs text-ink-muted">{aantal(lijst.length, 'activiteit', 'activiteiten')}</span>
              {onToevoegen && (
                <button
                  type="button"
                  onClick={() => onToevoegen({ maand })}
                  aria-label={`Activiteit toevoegen in ${maandVoluit(maand)}`}
                  title={`Activiteit toevoegen in ${maandVoluit(maand)}`}
                  className="-mr-2 grid h-7 w-7 place-items-center rounded-sm text-ink-muted hover:bg-surface-card hover:text-niveau-strong"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              )}
            </header>
            <ul className="divide-y divide-line-subtle">
              {lijst.map((item) => {
                const a = activiteitVan(item);
                const verstreken = !!item.deadline && item.deadline < vandaag && item.status !== 'gereed';
                const naam = effectieveNaam(item);
                return (
                  <li
                    key={item.uid}
                    data-lijstitem={item.uid}
                    data-rondleiding={item.uid === eersteUid ? 'eerste-rij' : undefined}
                    className={cx(
                      'group flex items-center gap-2 pl-3 pr-2 transition-colors duration-base hover:bg-surface-hover sm:pl-4',
                      markeerUid === item.uid && 'bg-brand-yellow-soft',
                    )}
                  >
                    {onStatus ? (
                      <StatusKeuze status={item.status} onKies={(s) => onStatus(item.uid, s)} naam={naam} groot />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onOpen(item.uid)}
                      title={chipTitel(item)}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left outline-none focus-visible:underline"
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className={cx('block text-sm font-semibold', item.status === 'gereed' ? 'text-ink-muted' : 'text-ink-strong')}
                        >
                          {naam}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                          <span className="font-semibold">{standaardVan(item)}</span>
                          {a?.verplicht && <span className="font-medium text-status-warning">verplicht</span>}
                          {schoolNaamVan && (
                            <span className="inline-flex items-center gap-1">
                              <School className="h-3 w-3" aria-hidden />
                              {schoolNaamVan(item.uid)}
                            </span>
                          )}
                          {item.eigenaar && (
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3 w-3" aria-hidden />
                              {item.eigenaar}
                            </span>
                          )}
                          {item.deadline && (
                            <span className={cx('tnum inline-flex items-center gap-1', verstreken && 'font-semibold text-status-danger')}>
                              <CalendarClock className="h-3 w-3" aria-hidden />
                              {verstreken ? 'verstreken ' : 'deadline '}
                              {formatDatumKort(item.deadline)}
                            </span>
                          )}
                          {!!item.bewijs?.length && (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip className="h-3 w-3" aria-hidden />
                              {item.bewijs.length}
                            </span>
                          )}
                          {item.afwijking && (
                            <span className="inline-flex items-center gap-1" title={item.afwijking.reden}>
                              <ArrowLeftRight className="h-3 w-3" aria-hidden />
                              ander gesprek
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="hidden shrink-0 sm:block">
                        <SeizoenBadge gesprek={vindGesprek(cyclus, item.gesprek)} />
                      </span>
                      {!onStatus && <StatusBadge status={item.status} />}
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle group-hover:text-ink-strong" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
