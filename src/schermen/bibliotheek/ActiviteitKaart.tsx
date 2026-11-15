/**
 * Kaart van één bibliotheekactiviteit. In één blik: staat hij al op de kalender (en in welke
 * maand), is hij verplicht, en ontbreekt hij nog. Periode, frequentie en rol staan klein onderaan.
 */
import { Link } from 'react-router-dom';
import { CalendarRange, Check, ChevronRight, Plus, Repeat, UserRound } from 'lucide-react';
import { Badge, Button, SeizoenBadge, VerplichtBadge, cx } from '../../componenten';
import type { Activiteit, Gesprek, KalenderItem } from '../../domein/types';
import { maandVoluit } from '../kalender/hulp';

export interface ActiviteitKaartProps {
  activiteit: Activiteit;
  /** Gesprek bij de standaardkoppeling (naam uit de cyclus) */
  gesprek: Pick<Gesprek, 'naam' | 'kleur' | 'icoon'>;
  /** Bewerkbaar niveau: het item als de activiteit al op de kalender staat */
  opKalender?: KalenderItem | null;
  /** Clusterniveau: op hoeveel scholen staat hij */
  dekking?: { aantal: number; van: number };
  onToevoegen?: () => void;
  /** Laat de kaart even oplichten (net toegevoegd) */
  gemarkeerd?: boolean;
}

export function ActiviteitKaart({ activiteit: a, gesprek, opKalender, dekking, onToevoegen, gemarkeerd }: ActiviteitKaartProps) {
  const ontbreekt = a.verplicht && onToevoegen && !opKalender;
  return (
    <article
      className={cx(
        'relative flex flex-col overflow-hidden rounded-lg border shadow-xs transition-[box-shadow,background-color] duration-base hover:shadow-sm',
        opKalender ? 'border-line-subtle bg-surface-subtle' : 'border-line-subtle bg-surface-card',
        gemarkeerd && 'bg-brand-yellow-soft',
      )}
      aria-labelledby={`act-${a.id}`}
      data-activiteit={a.id}
    >
      {ontbreekt && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-status-warning" />}
      <div className="flex flex-1 flex-col gap-2 px-4 pb-3 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={`act-${a.id}`} className={cx('text-[15px] font-semibold leading-snug', opKalender ? 'text-ink-body' : 'text-ink-strong')}>
              {a.naam}
            </h3>
            <p className="tnum mt-0.5 text-2xs font-semibold tracking-label text-ink-subtle">{a.id}</p>
          </div>
          <div className="shrink-0">
            {opKalender ? (
              <Link
                to={`/kalender?item=${encodeURIComponent(opKalender.uid)}`}
                className="group inline-flex items-center gap-1 rounded-sm"
                title="Bekijk op de kalender"
              >
                <Badge tone="success" icon={Check}>
                  Op kalender, {maandVoluit(opKalender.maand)}
                </Badge>
                <ChevronRight className="h-3.5 w-3.5 text-ink-subtle group-hover:text-ink-strong" aria-hidden />
              </Link>
            ) : dekking ? (
              dekking.aantal > 0 ? (
                <Badge tone={dekking.aantal === dekking.van ? 'success' : 'neutral'} icon={Check}>
                  {dekking.aantal} van {dekking.van} scholen
                </Badge>
              ) : (
                <Badge tone="neutral" variant="outline">
                  Op geen school
                </Badge>
              )
            ) : onToevoegen ? (
              <Button size="sm" variant="secondary" icon={Plus} onClick={onToevoegen} aria-label={`${a.naam} toevoegen aan de kalender`}>
                Toevoegen
              </Button>
            ) : null}
          </div>
        </div>
        {a.omschrijving && <p className="line-clamp-2 text-sm text-ink-muted">{a.omschrijving}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <SeizoenBadge gesprek={gesprek} />
          {a.verplicht && <VerplichtBadge />}
          {ontbreekt && <span className="text-2xs font-semibold text-status-warning">nog niet gepland</span>}
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line-subtle px-4 py-2 text-xs text-ink-muted">
        <Meta icon={CalendarRange} label="Aanbevolen periode" waarde={a.periode || 'variabel'} />
        <Meta icon={Repeat} label="Frequentie" waarde={a.frequentie || 'onbekend'} />
        <Meta icon={UserRound} label="Verantwoordelijke" waarde={a.verantwoordelijke || 'niet vastgelegd'} />
      </dl>
    </article>
  );
}

function Meta({ icon: Icon, label, waarde }: { icon: typeof Repeat; label: string; waarde: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1" title={`${label}: ${waarde}`}>
      <dt className="shrink-0">
        <Icon className="h-3 w-3 text-ink-subtle" aria-hidden />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="truncate">{waarde}</dd>
    </div>
  );
}
