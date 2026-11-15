/**
 * Afsluiting van de eerste rondleiding: terug in je eigen kalender, en die kalender als jaarlint.
 * Je schooljaar op één regel (blokje per activiteit, de gesprekken, de lijn over je drukste maanden),
 * wat je net oefende, en dat je eigen kalender er niets van gemerkt heeft. Af te drukken als poster.
 */
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Printer } from 'lucide-react';
import { LvMonogram, cx } from '../../componenten';
import { aantal } from '../../domein/hulp';
import { LINT, STATUS_NAAM, duurTekst, maakJaarlint, type Jaarlint } from '../../domein/jaarlint';
import { GEBIEDEN } from '../../domein/seed';
import { maandVan, maandVoluit } from '../../domein/thuis';
import type { GebiedCode, Status } from '../../domein/types';
import { useKomendGesprek, useScope, useStore } from '../../store';
import { useRondleiding, type Afsluiting as AfsluitingData } from './RondleidingProvider';
import { Venster } from './Venster';

const KORT = ['aug', 'sep', 'okt', 'nov', 'dec', 'jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul'];

const gebiedKleur = (g: GebiedCode) => `var(--kg-${g.toLowerCase()}-ink)`;

/**
 * Eén blokje: de kleur is het kwaliteitsgebied, de vulling is de status.
 * Gepland is open, bezig is half gevuld, gereed is dicht, risico is open met een uitroepteken.
 */
function Blokje({ x, y, gebied, status, titel }: { x: number; y: number; gebied: GebiedCode; status: Status; titel?: string }) {
  const kleur = gebiedKleur(gebied);
  const b = LINT.blok;
  return (
    <g>
      {titel && <title>{titel}</title>}
      {status === 'gereed' ? (
        <rect x={x} y={y} width={b} height={b} rx="1.5" fill={kleur} />
      ) : (
        <rect x={x + 0.9} y={y + 0.9} width={b - 1.8} height={b - 1.8} rx="1" fill="var(--surface-card)" stroke={kleur} strokeWidth="1.8" />
      )}
      {status === 'bezig' && <path d={`M${x} ${y + b} L${x + b} ${y + b} L${x} ${y} Z`} fill={kleur} />}
      {status === 'risico' && (
        <text x={x + b / 2} y={y + b - 3} textAnchor="middle" fontSize="11" fontWeight="700" fill={kleur}>
          !
        </text>
      )}
    </g>
  );
}

/** Een los blokje in lopende tekst (legenda en maandlijst): dezelfde tekening als in het jaarlint. */
function LosBlokje({ gebied, status, className }: { gebied: GebiedCode; status: Status; className?: string }) {
  return (
    <svg viewBox={`0 0 ${LINT.blok} ${LINT.blok}`} className={cx('inline-block shrink-0', className)} aria-hidden>
      <Blokje x={0} y={0} gebied={gebied} status={status} />
    </svg>
  );
}

/** Het jaarlint als SVG. `geanimeerd`: de maanden verschijnen een voor een en de lijn tekent zich. */
export function JaarlintSvg({ lint, geanimeerd, titel }: { lint: Jaarlint; geanimeerd?: boolean; titel: string }) {
  const inkt = 'var(--lv-black)';
  return (
    <svg viewBox={`0 ${lint.boven} ${LINT.breedte} ${LINT.hoogte - lint.boven}`} className="h-auto w-full" role="img" aria-label={titel}>
      {/* basislijn */}
      <line x1={LINT.links - 10} x2={LINT.breedte - LINT.links + 10} y1={LINT.basis + 4} y2={LINT.basis + 4} stroke={inkt} strokeWidth="1.5" />
      {lint.maanden.map((m, k) => (
        <g key={m.maand} className={geanimeerd ? 'kk-verschijn' : undefined} style={geanimeerd ? { animationDelay: `${120 + k * 55}ms` } : undefined}>
          {m.blokken.map((b, n) => (
            <Blokje
              key={n}
              x={b.x}
              y={b.y}
              gebied={b.gebied}
              status={b.status}
              titel={`${b.naam} (${[b.standaard, STATUS_NAAM[b.status].toLowerCase()].filter(Boolean).join(', ')})`}
            />
          ))}
          {m.meer > 0 && (
            <text x={m.x} y={m.top - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={inkt}>
              +{m.meer}
            </text>
          )}
          <text x={m.x} y={LINT.basis + 26} textAnchor="middle" fontSize="15" fontWeight={m.nu ? 700 : 500} fill={inkt}>
            {KORT[k]}
            {m.nu ? ' (nu)' : ''}
          </text>
          <text x={m.x} y={LINT.basis + 44} textAnchor="middle" fontSize="11.5" fill={inkt}>
            {m.aantal ? `${m.gereed} van ${m.aantal}` : 'geen'}
          </text>
          {m.gesprekken.map((g, j) => (
            <g key={g.id}>
              <line x1={m.x} x2={m.x} y1={m.top - 35 - j * 22} y2={LINT.basis + 4} stroke={inkt} strokeWidth="1" strokeDasharray="2 4" opacity="0.55" />
              <rect x={m.x - 36} y={m.top - 56 - j * 22} width="72" height="21" rx="3" fill={inkt} />
              <text x={m.x} y={m.top - 41.5 - j * 22} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--text-on-dark)">
                {g.naam.length > 9 ? `${g.naam.slice(0, 8)}…` : g.naam}
              </text>
            </g>
          ))}
        </g>
      ))}
      {/* de lijn door het jaar */}
      <path d={lint.lijn} fill="none" stroke={inkt} strokeWidth="3" strokeLinecap="round" pathLength={1} className={geanimeerd ? 'kk-teken' : undefined} />
      {lint.nu && (
        <g className={geanimeerd ? 'kk-verschijn' : undefined} style={geanimeerd ? { animationDelay: '2100ms' } : undefined}>
          <circle cx={lint.nu.x} cy={lint.nu.y} r="7" fill={inkt} />
          <circle cx={lint.nu.x} cy={lint.nu.y} r="3" fill="var(--lv-yellow)" />
        </g>
      )}
    </svg>
  );
}

/** Uitleg bij het jaarlint: wat de kleur, de vulling, de getallen, de lijn en de labels betekenen. */
function Legenda({ lint, className }: { lint: Jaarlint; className?: string }) {
  const voorbeeld = lint.gebieden[0] ?? 'OP';
  return (
    <dl className={cx('grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]', className)}>
      <dt className="font-semibold">Kleur: kwaliteitsgebied</dt>
      <dd className="flex flex-wrap gap-x-4 gap-y-1">
        {lint.gebieden.map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <LosBlokje gebied={g} status="gereed" className="h-[0.9em] w-[0.9em]" />
            {g} · {GEBIEDEN[g].naam}
          </span>
        ))}
      </dd>
      <dt className="font-semibold">Vulling: status</dt>
      <dd className="flex flex-wrap gap-x-4 gap-y-1">
        {(['gepland', 'bezig', 'gereed', 'risico'] as Status[]).map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <LosBlokje gebied={voorbeeld} status={st} className="h-[0.9em] w-[0.9em]" />
            {STATUS_NAAM[st]}
          </span>
        ))}
      </dd>
      <dt className="font-semibold">Zo lees je het</dt>
      <dd>
        Elk blokje is één activiteit, in de maand waarin ze gepland staat. Onder elke maand staat hoeveel activiteiten gereed zijn. De zwarte lijn
        volgt de drukte: hoe hoger de lijn, hoe meer activiteiten in die maand. Een zwart label is een seizoensgesprek, met de deadline op de eerste
        dag van die maand.
      </dd>
    </dl>
  );
}

function tellerZin(t: AfsluitingData['teller']): string {
  const delen = [
    t.gereed && `${t.gereed} keer gereed gemeld`,
    t.verschoven && `${t.verschoven} keer verschoven`,
    t.ongedaan && `${t.ongedaan} keer ongedaan gemaakt`,
    t.toegevoegd && `${t.toegevoegd} keer toegevoegd`,
    t.gezocht && `${t.gezocht} keer gezocht`,
  ].filter(Boolean) as string[];
  if (!delen.length) return 'Je keek mee zonder iets te veranderen.';
  return delen.length === 1 ? `${delen[0]}.` : `${delen.slice(0, -1).join(', ')} en ${delen[delen.length - 1]}.`;
}

export function AfsluitingVenster() {
  const r = useRondleiding();
  if (!r.afsluiting || r.oefenen) return null;
  return <Inhoud data={r.afsluiting} onSluit={r.sluitAfsluiting} />;
}

function Inhoud({ data, onSluit }: { data: AfsluitingData; onSluit: () => void }) {
  const { state } = useStore();
  const { scope, scopeLabel } = useScope();
  const komend = useKomendGesprek();
  const titelId = useId();
  const lint = maakJaarlint(scope.items, state.organisatie.gesprekscyclus, maandVan());
  const [poster, setPoster] = useState(false);

  useEffect(() => {
    if (!poster) return;
    document.documentElement.classList.add('kk-poster-print');
    const klaar = () => {
      document.documentElement.classList.remove('kk-poster-print');
      setPoster(false);
    };
    window.addEventListener('afterprint', klaar);
    const t = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', klaar);
      document.documentElement.classList.remove('kk-poster-print');
    };
  }, [poster]);

  const beschrijving = `${scopeLabel}, schooljaar ${state.schooljaar}: ${aantal(lint.totaal, 'activiteit', 'activiteiten')}, ${lint.gereed} gereed${
    lint.drukste ? `, de drukste maand is ${maandVoluit(lint.drukste)}` : ''
  }.`;

  return (
    <Venster labelId={titelId} onSluit={onSluit} breedte="max-w-[980px]">
      <div className="bg-brand-yellow px-5 py-5 text-ink-on-brand sm:px-8 sm:py-6">
        <p className="text-sm font-semibold">Rondleiding klaar. Je bent terug in je eigen kalender.</p>
        <h2 id={titelId} className="mt-2 text-h1 font-bold sm:text-display">
          Dit is jouw schooljaar.
        </h2>
        <p className="mt-1 max-w-2xl text-sm sm:text-base">
          {beschrijving}
          {komend && !komend.verstreken && ` Het volgende gesprek is ${komend.gesprek.naam}, over ${aantal(komend.dagenTot, 'dag', 'dagen')}.`}
        </p>
      </div>
      <div className="border-b border-line-subtle px-5 pb-5 pt-4 sm:px-8">
        {/* Op een smal scherm schuift het jaar zijwaarts in plaats van onleesbaar klein te worden. */}
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="region" tabIndex={0} aria-label="Jaarlint, schuif zijwaarts">
          <div className="min-w-[720px] sm:min-w-0">
            <JaarlintSvg lint={lint} geanimeerd titel={`Jaarlint. ${beschrijving}`} />
          </div>
        </div>
        <Legenda lint={lint} className="mt-4 text-xs text-ink-body" />
        <p className="mt-2 text-xs text-ink-muted">Wijs een blokje aan om te zien welke activiteit het is. Op de poster staan alle activiteiten per maand uitgeschreven.</p>
      </div>
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-8 md:flex-row md:items-center">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-ink-strong">
            Geoefend in {duurTekst(data.duurMs)}: {tellerZin(data.teller)}
          </p>
          <p className="mt-0.5 text-ink-muted">Gevolgen voor je eigen kalender: geen. Die is precies zoals je hem achterliet.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPoster(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-ink-strong hover:bg-surface-hover"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print als poster
          </button>
          <button
            type="button"
            data-autofocus
            onClick={onSluit}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-surface-inverse px-4 text-sm font-semibold text-ink-on-dark hover:bg-gray-800"
          >
            Aan de slag
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      {createPortal(<Poster lint={lint} naam={scopeLabel} schooljaar={state.schooljaar} />, document.body)}
    </Venster>
  );
}

/** Meer regels per maand passen niet op één vel A3. */
const MAX_REGELS = 18;

/**
 * Printversie (A3 liggend, zoals de andere prints): bovenaan het jaarlint met uitleg, daaronder
 * per maand alle activiteiten bij naam, met hetzelfde blokje ervoor.
 */
function Poster({ lint, naam, schooljaar }: { lint: Jaarlint; naam: string; schooljaar: string }) {
  return (
    <div className="kk-poster text-ink-strong" aria-hidden style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      <div className="flex items-end justify-between gap-8 border-b-[3pt] border-brand-yellow pb-4">
        <div>
          <h1 className="text-[34pt] font-bold leading-tight">Ons kwaliteitsjaar</h1>
          <p className="text-[14pt]">
            {naam} · schooljaar {schooljaar} · {aantal(lint.totaal, 'activiteit', 'activiteiten')}, {lint.gereed} gereed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-md bg-brand-black">
            <LvMonogram className="h-8 w-8" />
          </span>
          <p className="text-[10pt] font-semibold leading-snug">
            Kwaliteitskalender VO
            <br />
            Leren verbeteren
          </p>
        </div>
      </div>
      <div className="mt-3">
        <JaarlintSvg lint={lint} titel="Jaarlint" />
      </div>
      <Legenda lint={lint} className="mt-3 text-[9.5pt]" />
      <div className="mt-4 grid grid-cols-12 gap-x-[7pt] border-t border-brand-black pt-3">
        {lint.maanden.map((m) => (
          <div key={m.maand} className="min-w-0">
            <p className="text-[11pt] font-bold capitalize">{maandVoluit(m.maand)}</p>
            <p className="text-[8pt]">{m.aantal ? `${m.gereed} van ${m.aantal} gereed` : 'Geen activiteiten'}</p>
            {m.gesprekken.map((g) => (
              <p key={g.id} className="mt-1 bg-brand-black px-1 py-0.5 text-[8pt] font-semibold text-ink-on-dark">
                Gesprek {g.naam}
              </p>
            ))}
            <ul className="mt-1.5 space-y-[3pt]">
              {m.lijst.slice(0, MAX_REGELS).map((r, n) => (
                <li key={n} className="flex gap-[3pt] text-[8pt] leading-[1.25]">
                  <LosBlokje gebied={r.gebied} status={r.status} className="mt-[1pt] h-[8pt] w-[8pt]" />
                  <span className="min-w-0 break-words" lang="nl" style={{ hyphens: 'auto' }}>
                    {r.standaard && <span className="font-semibold">{r.standaard} </span>}
                    {r.naam}
                  </span>
                </li>
              ))}
              {m.lijst.length > MAX_REGELS && <li className="text-[8pt] font-semibold">en nog {m.lijst.length - MAX_REGELS}</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
