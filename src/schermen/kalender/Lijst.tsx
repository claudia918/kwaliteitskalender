/**
 * Lijstweergave van de kalender: per maand (alleen maanden met activiteiten) een kaart.
 * Klik op een rij opent het detailvenster (op clusterniveau alleen-lezen).
 */
import { ArrowLeftRight, CalendarDays, CalendarClock, ChevronRight, Paperclip, School, UserRound } from 'lucide-react';
import { GebiedDot, GesprekIcoonView, SeizoenBadge, StatusBadge, VerplichtBadge, cx, seizoenKlassen } from '../../componenten';
import { activiteitVan, aantal, effectieveNaam, formatDatumKort, vandaagISO, vindGesprek } from '../../domein/hulp';
import type { Gesprek, KalenderItem, Maand } from '../../domein/types';
import { itemsPerMaand, maandTitel, standaardVan } from './hulp';

export interface LijstProps {
  items: KalenderItem[];
  cyclus: Gesprek[];
  gesprekken: Record<Maand, Gesprek[]>;
  huidigeMaand: Maand;
  onOpen: (uid: string) => void;
  schoolNaamVan?: (uid: string) => string;
}

export function Lijst({ items, cyclus, gesprekken, huidigeMaand, onOpen, schoolNaamVan }: LijstProps) {
  const vandaag = vandaagISO();
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
              className={cx('flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5', k ? cx(k.surface, k.border) : 'border-line-subtle bg-surface-subtle')}
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
            </header>
            <ul className="divide-y divide-line-subtle">
              {lijst.map((item) => {
                const a = activiteitVan(item);
                const verstreken = !!item.deadline && item.deadline < vandaag && item.status !== 'gereed';
                return (
                  <li key={item.uid}>
                    <button
                      type="button"
                      onClick={() => onOpen(item.uid)}
                      className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast hover:bg-surface-hover"
                    >
                      <GebiedDot gebied={a?.gebied ?? 'OP'} className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-ink-strong">{effectieveNaam(item)}</span>
                          {a?.verplicht && <VerplichtBadge />}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                          <span className="font-semibold">{standaardVan(item)}</span>
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
                            <span className="inline-flex items-center gap-1 font-medium text-status-warning" title={item.afwijking.reden}>
                              <ArrowLeftRight className="h-3 w-3" aria-hidden />
                              afwijking
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <SeizoenBadge gesprek={vindGesprek(cyclus, item.gesprek)} />
                        <StatusBadge status={item.status} />
                      </span>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-subtle group-hover:text-ink-strong sm:block" aria-hidden />
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
