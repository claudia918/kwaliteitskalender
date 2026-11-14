/**
 * Zoekvenster (Ctrl/Cmd+K of de zoekknop in de topbar): vindt activiteiten op de kalenders, in de
 * bibliotheek, scholen en clusters, schermen, begrippen en veelgestelde vragen. Pijltjes kiezen,
 * Enter opent, Esc sluit. Kiezen brengt je er direct heen (en zet zo nodig de juiste weergave).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CalendarDays, CircleHelp, CornerDownLeft, Library, Search, type LucideIcon } from 'lucide-react';
import { STATUS_STIJL, cx } from '../componenten';
import { BEGRIPPEN_LIJST } from '../domein/begrippen';
import { activiteitVan, bibliotheek, effectieveNaam } from '../domein/hulp';
import { FAQ } from '../domein/inhoud';
import { maandVoluit } from '../domein/thuis';
import type { KalenderItem, Niveau } from '../domein/types';
import { zoekScore } from '../domein/zoeken';
import { useScope, useStore } from '../store';
import { ALLE_MENU_ITEMS } from './navigatie';
import { NiveauTegel, useWeergave } from './WeergaveKiezer';

/* ------------------------------------------------------------------ */
/* Context: openen vanuit de topbar en met de sneltoets                 */
/* ------------------------------------------------------------------ */

const ZoekContext = createContext<{ open: () => void } | null>(null);

export function useZoeken() {
  const c = useContext(ZoekContext);
  if (!c) throw new Error('useZoeken moet binnen ZoekProvider gebruikt worden');
  return c;
}

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const SNELTOETS = IS_MAC ? '⌘K' : 'Ctrl K';

export function ZoekProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const opToets = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      const doel = e.target as HTMLElement | null;
      const typt = !!doel?.closest('input,textarea,select,[contenteditable="true"]');
      if (e.key === '/' && !typt && !e.metaKey && !e.ctrlKey && !e.altKey && !document.querySelector('[role=dialog]')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', opToets);
    return () => document.removeEventListener('keydown', opToets);
  }, []);
  const waarde = useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <ZoekContext.Provider value={waarde}>
      {children}
      {open && <Zoekvenster onSluit={() => setOpen(false)} />}
    </ZoekContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Resultaten                                                           */
/* ------------------------------------------------------------------ */

type Groep = 'Schermen' | 'Op de kalender' | 'In de bibliotheek' | 'Scholen en clusters' | 'Begrippen' | 'Veelgestelde vragen';
const GROEP_VOLGORDE: Groep[] = ['Op de kalender', 'In de bibliotheek', 'Scholen en clusters', 'Schermen', 'Begrippen', 'Veelgestelde vragen'];
const PER_GROEP = 5;

interface Resultaat {
  sleutel: string;
  groep: Groep;
  titel: string;
  sub: string;
  score: number;
  icon?: LucideIcon;
  niveau?: Niveau;
  /** Aanvulling rechts, bv. een status. */
  rechts?: ReactNode;
  kies: () => void;
}

function Zoekvenster({ onSluit }: { onSluit: () => void }) {
  const { state, niveau, schoolId, clusterId } = useStore();
  const { editScope, isBestuur } = useScope();
  const { opties, kies: kiesWeergave } = useWeergave();
  const navigate = useNavigate();
  const [vraag, setVraag] = useState('');
  const [actief, setActief] = useState(0);
  const invoer = useRef<HTMLInputElement>(null);
  const lijst = useRef<HTMLDivElement>(null);
  const lijstId = useId();
  const org = state.organisatie;

  const ga = useCallback(
    (fn: () => void) => () => {
      onSluit();
      fn();
    },
    [onSluit],
  );

  const resultaten = useMemo<Resultaat[]>(() => {
    const v = vraag.trim();
    const uit: Resultaat[] = [];

    // Schermen (ook zonder zoekvraag: snel naar)
    ALLE_MENU_ITEMS.forEach((m, i) => {
      const score = v ? zoekScore(v, m.label, `${m.beschrijving} ${m.zoekwoorden ?? ''}`) : 100 - i;
      if (score > 0)
        uit.push({
          sleutel: `scherm:${m.to}`,
          groep: 'Schermen',
          titel: m.label,
          sub: m.beschrijving,
          score,
          icon: m.icon,
          kies: ga(() => navigate(m.to)),
        });
    });
    if (!v) return uit;

    // Activiteiten op de kalenders: wat je bekijkt eerst
    const plekken: { niveau: Niveau; id: string; naam: string; items: KalenderItem[]; hier: boolean }[] = [
      { niveau: 'bestuur', id: '', naam: 'Bestuurskalender', items: state.bestuurItems, hier: niveau === 'bestuur' },
      ...org.scholen.map((s) => ({
        niveau: 'school' as Niveau,
        id: s.id,
        naam: s.naam,
        items: state.schoolKalenders[s.id] ?? [],
        hier: (niveau === 'school' && s.id === schoolId) || (niveau === 'cluster' && s.cluster === clusterId),
      })),
    ];
    for (const p of plekken) {
      for (const it of p.items) {
        const act = activiteitVan(it);
        const naam = effectieveNaam(it);
        const score = zoekScore(v, naam, `${act?.naam ?? ''} ${act?.standaard ?? ''} ${it.eigenaar ?? ''} ${it.notitie ?? ''} ${maandVoluit(it.maand)}`);
        if (score === 0) continue;
        const st = STATUS_STIJL[it.status];
        uit.push({
          sleutel: `item:${p.id}:${it.uid}`,
          groep: 'Op de kalender',
          titel: naam,
          sub: [p.naam, act?.standaard, maandVoluit(it.maand)].filter(Boolean).join(' · '),
          score: score + (p.hier ? 40 : 0),
          icon: CalendarDays,
          rechts: <span className={cx('text-2xs font-semibold', st.ink)}>{st.label}</span>,
          kies: ga(() => {
            if (!p.hier || niveau === 'cluster') kiesWeergave({ niveau: p.niveau, id: p.id });
            navigate(`/kalender?item=${encodeURIComponent(it.uid)}`);
          }),
        });
      }
    }

    // Bibliotheek van het huidige niveau
    const eigen = editScope ? (editScope.kind === 'bestuur' ? state.bestuurItems : state.schoolKalenders[editScope.schoolId] ?? []) : [];
    for (const a of bibliotheek(isBestuur)) {
      const score = zoekScore(v, a.naam, `${a.standaard} ${a.omschrijving} ${a.tags.join(' ')} ${a.verantwoordelijke}`);
      if (score === 0) continue;
      const opKalender = eigen.find((i) => i.activiteitId === a.id);
      uit.push({
        sleutel: `act:${a.id}`,
        groep: 'In de bibliotheek',
        titel: a.naam,
        sub: `${a.standaard} · ${a.periode ? `periode ${a.periode}` : 'doorlopend'}${opKalender ? ' · staat al op je kalender' : ''}`,
        score,
        icon: Library,
        kies: ga(() =>
          navigate(opKalender ? `/kalender?item=${encodeURIComponent(opKalender.uid)}` : `/bibliotheek?zoek=${encodeURIComponent(a.naam)}`),
        ),
      });
    }

    // Scholen, clusters en het bestuur
    for (const o of opties) {
      const score = zoekScore(v, o.naam, `${o.uitleg} ${o.groep}`);
      if (score === 0) continue;
      uit.push({
        sleutel: `weergave:${o.sleutel}`,
        groep: 'Scholen en clusters',
        titel: o.naam,
        sub: o.uitleg,
        score: score + 20,
        niveau: o.niveau,
        kies: ga(() => {
          kiesWeergave(o);
          navigate('/');
        }),
      });
    }

    // Begrippen
    for (const b of BEGRIPPEN_LIJST) {
      const score = zoekScore(v, b.term, (b.ookGenoemd ?? []).join(' '));
      if (score === 0) continue;
      uit.push({
        sleutel: `begrip:${b.sleutel}`,
        groep: 'Begrippen',
        titel: b.term.charAt(0).toUpperCase() + b.term.slice(1),
        sub: b.uitleg,
        score,
        icon: BookOpenText,
        kies: ga(() => navigate(`/begrippen?begrip=${b.sleutel}`)),
      });
    }

    // Veelgestelde vragen
    for (const c of FAQ) {
      for (const q of c.vragen) {
        const score = zoekScore(v, q.v, q.a) * 0.5;
        if (score === 0) continue;
        uit.push({
          sleutel: `faq:${q.v}`,
          groep: 'Veelgestelde vragen',
          titel: q.v,
          sub: c.titel,
          score,
          icon: CircleHelp,
          kies: ga(() => navigate(`/faq?zoek=${encodeURIComponent(q.v)}`)),
        });
      }
    }
    return uit;
  }, [vraag, state, org, niveau, schoolId, clusterId, editScope, isBestuur, opties, kiesWeergave, navigate, ga]);

  // Groeperen: per groep de beste PER_GROEP; groepen op volgorde van hun beste treffer
  const groepen = useMemo(() => {
    const per = new Map<Groep, Resultaat[]>();
    for (const r of resultaten) per.set(r.groep, [...(per.get(r.groep) ?? []), r]);
    const lijst = [...per.entries()].map(([groep, rs]) => ({
      groep,
      totaal: rs.length,
      rs: [...rs].sort((a, b) => b.score - a.score).slice(0, vraag.trim() ? PER_GROEP : rs.length),
    }));
    return lijst.sort(
      (a, b) => b.rs[0].score - a.rs[0].score || GROEP_VOLGORDE.indexOf(a.groep) - GROEP_VOLGORDE.indexOf(b.groep),
    );
  }, [resultaten, vraag]);
  const plat = useMemo(() => groepen.flatMap((g) => g.rs), [groepen]);

  useEffect(() => {
    const vorige = document.activeElement as HTMLElement | null;
    invoer.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (vorige && document.contains(vorige) && vorige !== document.body) vorige.focus?.();
    };
  }, []);
  useEffect(() => {
    lijst.current?.querySelector(`[data-index="${actief}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [actief]);

  const opToets = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onSluit();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActief((a) => (plat.length ? (a + 1) % plat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActief((a) => (plat.length ? (a - 1 + plat.length) % plat.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      plat[actief]?.kies();
    } else if (e.key === 'Tab') {
      e.preventDefault(); // focus blijft in het zoekveld
    }
  };

  let index = -1;
  return createPortal(
    <div
      className="no-print fixed inset-0 z-[1000] flex animate-fade items-start justify-center p-3 pt-[8vh] sm:p-6 sm:pt-[12vh]"
      style={{ background: 'var(--scrim)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onSluit()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Zoeken"
        onKeyDown={opToets}
        className="flex max-h-[80vh] w-full max-w-[640px] animate-rise flex-col overflow-hidden rounded-xl bg-surface-card shadow-pop"
      >
        <div className="flex items-center gap-3 border-b border-line-subtle px-4">
          <Search className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
          <input
            ref={invoer}
            role="combobox"
            aria-expanded="true"
            aria-controls={lijstId}
            aria-autocomplete="list"
            aria-activedescendant={plat[actief] ? `${lijstId}-${actief}` : undefined}
            aria-label="Zoek een activiteit, school, scherm of begrip"
            placeholder="Zoek een activiteit, school, scherm of begrip"
            value={vraag}
            onChange={(e) => {
              setVraag(e.target.value);
              setActief(0);
            }}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink-strong outline-none placeholder:text-ink-subtle focus-visible:shadow-none"
          />
          <kbd className="hidden rounded-sm border border-line px-1.5 py-0.5 text-2xs font-semibold text-ink-muted sm:inline">Esc</kbd>
        </div>

        <div ref={lijst} id={lijstId} role="listbox" aria-label="Resultaten" className="min-h-0 flex-1 overflow-y-auto p-2">
          {plat.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-ink-strong">Niets gevonden voor “{vraag.trim()}”</p>
              <p className="mt-1 text-sm text-ink-muted">Probeer een deel van de naam, een standaard (bv. OP2) of een maand.</p>
            </div>
          ) : (
            groepen.map((g) => (
              <div key={g.groep} role="group" aria-label={g.groep} className="pb-1">
                <p className="eyebrow flex items-center justify-between px-3 pb-1 pt-2.5">
                  <span>{vraag.trim() ? g.groep : 'Snel naar'}</span>
                  {g.totaal > g.rs.length && <span className="normal-case tracking-normal text-ink-subtle">{g.rs.length} van {g.totaal}</span>}
                </p>
                {g.rs.map((r) => {
                  index += 1;
                  const i = index;
                  const Icoon = r.icon;
                  return (
                    <div
                      key={r.sleutel}
                      id={`${lijstId}-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === actief}
                      onMouseMove={() => i !== actief && setActief(i)}
                      onClick={r.kies}
                      className={cx(
                        'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2',
                        i === actief ? 'bg-niveau-surface' : 'hover:bg-surface-hover',
                      )}
                    >
                      {r.niveau ? (
                        <NiveauTegel niveau={r.niveau} klein />
                      ) : (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-sunken text-ink-muted">
                          {Icoon && <Icoon className="h-4 w-4" aria-hidden />}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-ink-strong">{r.titel}</span>
                        <span className={cx('text-xs text-ink-muted', r.groep === 'Begrippen' ? 'line-clamp-2' : 'truncate')}>{r.sub}</span>
                      </span>
                      {r.rechts}
                      {i === actief && <CornerDownLeft className="hidden h-4 w-4 shrink-0 text-niveau-strong sm:block" aria-hidden />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-line-subtle bg-surface-subtle px-4 py-2 text-2xs text-ink-muted sm:flex">
          <span>
            <kbd className="font-semibold">↑</kbd> <kbd className="font-semibold">↓</kbd> kiezen
          </span>
          <span>
            <kbd className="font-semibold">Enter</kbd> openen
          </span>
          <span>
            <kbd className="font-semibold">Esc</kbd> sluiten
          </span>
          <span className="ml-auto">Overal te openen met {SNELTOETS}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Zoekknop voor de topbar: breed met sneltoets vanaf 1024px, anders een icoon. */
export function ZoekKnop() {
  const { open } = useZoeken();
  return (
    <button
      type="button"
      onClick={open}
      data-rondleiding="zoeken"
      aria-label={`Zoeken (${SNELTOETS})`}
      aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-line-subtle bg-surface-card px-2.5 text-sm text-ink-muted transition-colors duration-fast hover:border-line hover:text-ink-strong lg:w-64"
    >
      <Search className="h-4 w-4" aria-hidden />
      <span className="hidden flex-1 text-left lg:inline">Zoeken</span>
      <kbd className="hidden rounded-sm border border-line-subtle bg-surface-subtle px-1.5 text-2xs font-semibold text-ink-muted lg:inline">
        {SNELTOETS}
      </kbd>
    </button>
  );
}
