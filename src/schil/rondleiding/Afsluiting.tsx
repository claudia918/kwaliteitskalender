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
import { LINT, duurTekst, maakJaarlint, type Jaarlint } from '../../domein/jaarlint';
import { maandVan, maandVoluit } from '../../domein/thuis';
import type { KalenderItem } from '../../domein/types';
import { useKomendGesprek, useScope, useStore } from '../../store';
import { useRondleiding, type Afsluiting as AfsluitingData } from './RondleidingProvider';
import { Venster } from './Venster';

const KORT = ['aug', 'sep', 'okt', 'nov', 'dec', 'jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul'];

/** Het jaarlint als SVG. `geanimeerd`: de maanden verschijnen een voor een en de lijn tekent zich. */
export function JaarlintSvg({ lint, geanimeerd, titel }: { lint: Jaarlint; geanimeerd?: boolean; titel: string }) {
  const inkt = 'var(--lv-black)';
  return (
    <svg viewBox={`0 ${lint.boven} ${LINT.breedte} ${LINT.hoogte - lint.boven}`} className="h-auto w-full" role="img" aria-label={titel}>
      {/* basislijn */}
      <line x1={LINT.links - 10} x2={LINT.breedte - LINT.links + 10} y1={LINT.basis + 4} y2={LINT.basis + 4} stroke={inkt} strokeWidth="1.5" />
      {lint.maanden.map((m, k) => (
        <g key={m.maand} className={geanimeerd ? 'kk-verschijn' : undefined} style={geanimeerd ? { animationDelay: `${120 + k * 55}ms` } : undefined}>
          {m.blokken.map((b, n) =>
            b.gereed ? (
              <rect key={n} x={b.x} y={b.y} width={LINT.blok} height={LINT.blok} rx="2" fill={inkt} />
            ) : (
              <rect key={n} x={b.x + 0.75} y={b.y + 0.75} width={LINT.blok - 1.5} height={LINT.blok - 1.5} rx="2" fill="none" stroke={inkt} strokeWidth="1.5" />
            ),
          )}
          {m.meer > 0 && (
            <text x={m.x} y={m.top - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={inkt}>
              +{m.meer}
            </text>
          )}
          <text x={m.x} y={LINT.basis + 26} textAnchor="middle" fontSize="15" fontWeight={m.nu ? 700 : 500} fill={inkt}>
            {KORT[k]}
          </text>
          {m.gesprekken.map((g, j) => (
            <g key={g.id}>
              <line x1={m.x} x2={m.x} y1={m.top - 35 - j * 22} y2={LINT.basis + 4} stroke={inkt} strokeWidth="1" strokeDasharray="2 4" opacity="0.55" />
              <rect x={m.x - 36} y={m.top - 56 - j * 22} width="72" height="21" rx="10.5" fill={inkt} />
              <text x={m.x} y={m.top - 41.5 - j * 22} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--lv-yellow)">
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
          <text x={lint.nu.x} y={LINT.basis + 46} textAnchor="middle" fontSize="12" fontWeight="700" fill={inkt}>
            nu
          </text>
        </g>
      )}
    </svg>
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
      <div className="bg-brand-yellow px-5 pb-4 pt-5 text-ink-on-brand sm:px-8 sm:pt-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-black">
            <LvMonogram className="h-6 w-6" />
          </span>
          <p className="text-xs font-bold uppercase tracking-wide">Rondleiding klaar · terug in je eigen kalender</p>
        </div>
        <h2 id={titelId} className="mt-4 text-h1 font-bold sm:text-display">
          Dit is jouw schooljaar.
        </h2>
        <p className="mt-1 max-w-2xl text-sm sm:text-base">
          {beschrijving}
          {komend && !komend.verstreken && ` Het volgende gesprek is ${komend.gesprek.naam}, over ${aantal(komend.dagenTot, 'dag', 'dagen')}.`}
        </p>
        {/* Op een smal scherm schuift het jaar zijwaarts in plaats van onleesbaar klein te worden. */}
        <div className="-mx-5 mt-3 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="region" tabIndex={0} aria-label="Jaarlint, schuif zijwaarts">
          <div className="min-w-[720px] sm:min-w-0">
            <JaarlintSvg lint={lint} geanimeerd titel={`Jaarlint. ${beschrijving}`} />
          </div>
        </div>
        <p className="mt-1 text-xs">
          Elk blokje is een activiteit, dicht is gereed. De lijn loopt over je stapels: hoe hoger, hoe drukker die maand.
        </p>
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
      {createPortal(<Poster items={scope.items} lint={lint} naam={scopeLabel} schooljaar={state.schooljaar} />, document.body)}
    </Venster>
  );
}

/** Printversie (A3 liggend, zoals de andere prints): het jaarlint op een gele band. */
function Poster({ lint, naam, schooljaar, items }: { lint: Jaarlint; naam: string; schooljaar: string; items: KalenderItem[] }) {
  return (
    <div className="kk-poster" aria-hidden>
      <div className={cx('rounded-xl bg-brand-yellow p-10 text-ink-on-brand')} style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-lg bg-brand-black">
            <LvMonogram className="h-9 w-9" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">Kwaliteitskalender VO</p>
            <p className="text-sm">Schooljaar {schooljaar}</p>
          </div>
        </div>
        <h1 className="mt-8 text-[44pt] font-bold leading-tight">Ons kwaliteitsjaar</h1>
        <p className="mt-1 text-[16pt]">
          {naam}: {aantal(items.length, 'activiteit', 'activiteiten')}, {lint.gereed} gereed
        </p>
        <div className="mt-8">
          <JaarlintSvg lint={lint} titel="Jaarlint" />
        </div>
        <p className="mt-4 text-[11pt]">Elk blokje is een activiteit, dicht is gereed. De zwarte labels zijn de seizoensgesprekken.</p>
      </div>
    </div>
  );
}
