/**
 * Hoe de rondleiding zich aanbiedt en waar je hem terugvindt:
 * - Introductie (na demo of eigen bestuur): in het midden, met de boog van de acht stappen.
 * - Rustig aanbod in de hoek (na het openen van een kalenderbestand van een collega, of na een update):
 *   je kunt meteen werken; de rondleiding staat klaar als je wilt.
 * - Verder gaan na onderbreken (nieuw bezoek).
 * - Keuzevenster met alle rondleidingen (menu Hulp, helpknop, zoekvenster).
 * - De gele band bovenaan zolang je oefent.
 */
import { useId } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Check, GraduationCap, PlayCircle, X } from 'lucide-react';
import { LvMonogram, Swoosh, cx } from '../../componenten';
import { useRondleiding } from './RondleidingProvider';
import { EERSTE_RONDLEIDING, SCHERM_RONDLEIDINGEN, tourVoorPad, vindTour } from './tours';
import { Venster } from './Venster';

const geelKnop =
  'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-yellow px-4 text-sm font-semibold text-ink-on-brand hover:bg-brand-yellow-600';
const stilKnop =
  'inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-surface-hover hover:text-ink-strong';

export function RondleidingAanbod() {
  const r = useRondleiding();
  if (r.oefenen || !r.aanbod) return null;
  if (r.aanbod === 'intro') return <Introductie />;
  return <HoekAanbod />;
}

function Introductie() {
  const r = useRondleiding();
  const titelId = useId();
  return (
    <Venster labelId={titelId} onSluit={r.sluitAanbod} breedte="max-w-[600px]">
      {/* Wit en rustig: het geel zit in het monogram, de swoosh en de knop. */}
      <div className="px-6 pt-6 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-sm bg-brand-black">
            <LvMonogram className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-ink-muted">Rondleiding · {EERSTE_RONDLEIDING.duur}</p>
        </div>
        <h2 id={titelId} className="mt-4 text-h1 font-bold text-ink-strong">
          Zullen we even oefenen?
        </h2>
        <p className="mt-2 text-base text-ink-body">
          Je doet de belangrijkste dingen één keer zelf, op een oefenkalender. Wat je daar doet, verdwijnt weer. Je eigen
          kalender blijft precies zoals hij is.
        </p>
      </div>
      <Swoosh className="mt-3 h-6" />
      <div className="px-6 pb-5 pt-2 sm:px-8">
        <ol className="grid gap-x-6 gap-y-1.5 text-sm text-ink-body sm:grid-cols-2" aria-label="De stappen">
          {EERSTE_RONDLEIDING.stappen.map((s, k) => (
            <li key={s.id} className="flex items-center gap-2.5">
              <span className="tnum w-4 shrink-0 text-right text-xs font-semibold text-ink-muted">
                {k + 1}
              </span>
              {s.titel}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-muted sm:mr-auto">Later kan ook: via het vraagteken bovenin.</p>
          <button type="button" className={stilKnop} onClick={r.sluitAanbod}>
            Niet nu
          </button>
          <button type="button" data-autofocus className={geelKnop} onClick={() => r.start(EERSTE_RONDLEIDING.id)}>
            <PlayCircle className="h-4 w-4" aria-hidden />
            Begin met oefenen
          </button>
        </div>
      </div>
    </Venster>
  );
}

function HoekAanbod() {
  const r = useRondleiding();
  const titelId = useId();
  const hervat = r.aanbod === 'hervat';
  const l = r.voortgang.lopend;
  const tour = l ? vindTour(l.tour) : undefined;
  return (
    <section
      role="region"
      aria-labelledby={titelId}
      data-rondleiding-laag
      data-rondleiding-aanbod
      className="no-print fixed bottom-4 right-4 z-[950] w-[min(360px,calc(100vw-32px))] animate-rise overflow-hidden rounded-xl border border-line-subtle bg-surface-card shadow-pop"
    >
      <div className="flex items-start gap-3 p-4">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-ink-strong" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id={titelId} className="text-sm font-semibold text-ink-strong">
            {hervat ? 'Verder met de rondleiding?' : 'Nieuw in de Kwaliteitskalender?'}
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {hervat && l && tour
              ? `Je was bij stap ${l.stap + 1} van ${tour.stappen.length}: ${tour.stappen[l.stap]?.titel ?? ''}.`
              : `Oefen ${EERSTE_RONDLEIDING.duur} op een oefenkalender. De gedeelde kalender blijft onaangeroerd.`}
          </p>
        </div>
        <button
          type="button"
          onClick={r.sluitAanbod}
          aria-label="Niet nu"
          className="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-md text-ink-subtle hover:bg-surface-hover hover:text-ink-strong"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex justify-end gap-2 border-t border-line-subtle px-4 py-2.5">
        <button type="button" className={cx(stilKnop, 'h-8 text-xs')} onClick={r.sluitAanbod}>
          Niet nu
        </button>
        <button
          type="button"
          className={cx(geelKnop, 'h-8 text-xs')}
          onClick={() => (hervat ? r.hervat() : r.start(EERSTE_RONDLEIDING.id))}
        >
          {hervat ? 'Verder' : 'Rondleiding starten'}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </section>
  );
}

/** Alle rondleidingen op een rij (menu Hulp > Rondleiding, helpknop, zoekvenster). */
export function RondleidingKeuze() {
  const r = useRondleiding();
  const titelId = useId();
  const { pathname } = useLocation();
  if (!r.keuzeOpen) return null;
  const hier = tourVoorPad(pathname);
  const l = r.voortgang.lopend;
  const lopendeTour = l ? vindTour(l.tour) : undefined;
  const regel = (id: string, titel: string, sub: string, gedaan: boolean, actie: () => void, nadruk = false) => (
    <li key={id}>
      <button
        type="button"
        onClick={actie}
        className={cx(
          'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-surface-hover',
          nadruk && 'bg-brand-yellow-soft hover:bg-brand-yellow-soft',
        )}
      >
        <span className={cx('grid h-7 w-5 shrink-0 place-items-center', gedaan ? 'text-status-success' : 'text-ink-muted')}>
          {gedaan ? <Check className="h-4 w-4" aria-label="gedaan" /> : <PlayCircle className="h-4 w-4" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink-strong">{titel}</span>
          <span className="block text-xs text-ink-muted">{sub}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
      </button>
    </li>
  );
  return (
    <Venster labelId={titelId} onSluit={r.sluitKeuze} breedte="max-w-[520px]">
      <div className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 py-4">
        <div>
          <h2 id={titelId} className="text-h3 text-ink-strong">
            Rondleidingen
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">Altijd op een oefenkalender. Je eigen gegevens blijven onaangeroerd.</p>
        </div>
        <button
          type="button"
          onClick={r.sluitKeuze}
          aria-label="Sluiten"
          className="-mr-1 rounded-md p-1 text-ink-muted hover:bg-surface-hover hover:text-ink-strong"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto p-2">
        {l && lopendeTour && !r.oefenen &&
          regel('verder', `Verder met ${lopendeTour.id === 'eerste' ? 'de rondleiding' : lopendeTour.titel}`, `Stap ${l.stap + 1} van ${lopendeTour.stappen.length}`, false, r.hervat, true)}
        {hier &&
          regel(hier.id, `Laat zien hoe dit scherm werkt`, `${hier.titel} · ${hier.duur}`, r.voortgang.schermen.includes(hier.pad!), () => r.start(hier.id), !l)}
        {regel(
          EERSTE_RONDLEIDING.id,
          r.voortgang.eersteAf ? 'De rondleiding opnieuw' : 'De rondleiding',
          `Van wat bekijk ik tot delen · ${EERSTE_RONDLEIDING.duur}`,
          r.voortgang.eersteAf,
          () => r.start(EERSTE_RONDLEIDING.id),
        )}
        <li aria-hidden className="px-3 pb-1 pt-3">
          <p className="kk-groepskop">Per scherm</p>
        </li>
        {SCHERM_RONDLEIDINGEN.filter((t) => t !== hier).map((t) =>
          regel(t.id, t.titel, t.duur, r.voortgang.schermen.includes(t.pad!), () => r.start(t.id)),
        )}
      </ul>
    </Venster>
  );
}

/** Gele band bovenaan zolang je oefent. */
export function OefenBand() {
  const r = useRondleiding();
  if (!r.oefenen) return null;
  return (
    <div className="no-print relative z-[1060] flex min-h-8 items-center gap-3 bg-brand-yellow px-4 py-1 text-xs text-ink-on-brand" role="note">
      <LvMonogram className="h-3.5 w-5 shrink-0" kleur="var(--lv-black)" />
      <p className="min-w-0 flex-1">
        <strong className="font-bold">Oefenkalender.</strong>{' '}
        <span className="hidden sm:inline">Wat je hier doet, verdwijnt na de rondleiding. Je eigen kalender blijft zoals hij was.</span>
        <span className="sm:hidden">Je eigen kalender blijft zoals hij was.</span>
      </p>
      <button type="button" onClick={r.onderbreek} className="shrink-0 rounded-sm px-2 py-0.5 font-semibold underline hover:bg-brand-yellow-600">
        Stoppen met oefenen
      </button>
    </div>
  );
}
