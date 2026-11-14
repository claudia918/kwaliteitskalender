/**
 * Kaart van één bibliotheekactiviteit (inventaris §1.12, `BS`), aangevuld met periode,
 * frequentie en verantwoordelijke rol (stonden in de data van het origineel, maar werden niet getoond).
 */
import { Link } from 'react-router-dom';
import { CalendarRange, Check, ChevronRight, Plus, Repeat, UserRound } from 'lucide-react';
import { Badge, Button, SeizoenBadge, VasteStandaardBadge, VerplichtBadge, cx, gebiedKlassen } from '../../componenten';
import { STANDAARD_OP_CODE } from '../../domein/seed';
import type { Activiteit, Gesprek } from '../../domein/types';

export interface ActiviteitKaartProps {
  activiteit: Activiteit;
  /** Gesprek bij de standaardkoppeling (naam uit de cyclus) */
  gesprek: Pick<Gesprek, 'naam' | 'kleur' | 'icoon'>;
  /** Bewerkbaar niveau: uid van het item als de activiteit al op de kalender staat */
  opKalenderUid?: string | null;
  /** Clusterniveau: op hoeveel scholen staat hij */
  dekking?: { aantal: number; van: number };
  onToevoegen?: () => void;
}

export function ActiviteitKaart({ activiteit: a, gesprek, opKalenderUid, dekking, onToevoegen }: ActiviteitKaartProps) {
  const k = gebiedKlassen(a.gebied);
  const std = STANDAARD_OP_CODE[a.standaard];
  return (
    <article
      className={cx(
        'flex flex-col rounded-lg border bg-surface-card shadow-xs transition-shadow duration-fast hover:shadow-sm',
        'border-line-subtle',
      )}
      aria-labelledby={`act-${a.id}`}
    >
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="tnum text-2xs font-semibold tracking-label text-ink-subtle">{a.id}</p>
            <h3 id={`act-${a.id}`} className="mt-0.5 text-[15px] font-semibold leading-snug text-ink-strong">
              {a.naam}
            </h3>
          </div>
          <div className="shrink-0">
            {opKalenderUid ? (
              <Link
                to={`/kalender?item=${encodeURIComponent(opKalenderUid)}`}
                className="group inline-flex items-center gap-1 rounded-pill"
                title="Bekijk op de kalender"
              >
                <Badge tone="success" icon={Check}>
                  Op kalender
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
          <span
            className="inline-flex h-5 items-center gap-1 rounded-sm border border-line-subtle bg-surface-card px-1.5"
            title={std ? `${std.code}: ${std.naam}` : a.standaard}
          >
            <span aria-hidden className={cx('h-2 w-2 rounded-xs', k.dot)} />
            <span className={cx('text-2xs font-bold tracking-label', k.ink)}>{a.standaard}</span>
          </span>
          <SeizoenBadge gesprek={gesprek} />
          {std?.kern && <VasteStandaardBadge />}
          {a.verplicht && <VerplichtBadge />}
        </div>
      </div>
      <dl className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-3 border-t border-line-subtle bg-surface-subtle px-4 py-2 text-2xs">
        <Meta icon={CalendarRange} label="Periode" waarde={a.periode || 'variabel'} />
        <Meta icon={Repeat} label="Frequentie" waarde={a.frequentie || 'onbekend'} />
        <Meta icon={UserRound} label="Verantwoordelijke" waarde={a.verantwoordelijke || 'niet vastgelegd'} />
      </dl>
    </article>
  );
}

function Meta({ icon: Icon, label, waarde }: { icon: typeof Repeat; label: string; waarde: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 font-semibold uppercase tracking-wide text-ink-subtle">
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 truncate text-xs font-medium text-ink-body" title={waarde}>
        {waarde}
      </dd>
    </div>
  );
}
