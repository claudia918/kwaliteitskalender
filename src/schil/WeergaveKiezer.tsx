/**
 * "Wat bekijk ik": één knop in de topbar die het niveau en de school of het cluster samen kiest.
 * Vervangt de niveauwisselaar en de scopebalk. De knop en elke keuze dragen de eigen niveaukleur.
 * Bij één school zonder clusters zijn er maar twee keuzes: je school en het bestuur.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cx } from '../componenten';
import { NIVEAU_ICONEN } from '../componenten/stijlen';
import { clusterNaamVan, scholenInCluster, vindCluster, vindSchool } from '../domein/berekeningen';
import { aantal } from '../domein/hulp';
import { normaliseer } from '../domein/zoeken';
import type { Niveau } from '../domein/types';
import { useStore } from '../store';

export interface WeergaveOptie {
  sleutel: string;
  niveau: Niveau;
  id: string;
  naam: string;
  uitleg: string;
  groep: 'Bestuur' | 'Clusters' | 'Scholen';
}

/** Alle keuzes voor "wat bekijk ik", plus de huidige. */
export function useWeergave() {
  const { state, niveau, clusterId, schoolId, setNiveau, setSchoolId, setClusterId } = useStore();
  const org = state.organisatie;
  const eenSchool = org.scholen.length === 1 && org.clusters.length === 0;

  const opties = useMemo<WeergaveOptie[]>(() => {
    const lijst: WeergaveOptie[] = [
      {
        sleutel: 'bestuur',
        niveau: 'bestuur',
        id: '',
        naam: eenSchool ? 'Bestuur' : 'Hele bestuur',
        uitleg: eenSchool
          ? `${org.bestuurNaam || 'Bestuur'}: bestuurskalender en instellingen`
          : `${org.bestuurNaam || 'Bestuur'} · ${aantal(org.scholen.length, 'school', 'scholen')} en de bestuurskalender`,
        groep: 'Bestuur',
      },
    ];
    for (const c of org.clusters) {
      lijst.push({
        sleutel: `cluster:${c.id}`,
        niveau: 'cluster',
        id: c.id,
        naam: c.naam,
        uitleg: `${aantal(scholenInCluster(org, c.id).length, 'school', 'scholen')} samen · alleen lezen`,
        groep: 'Clusters',
      });
    }
    for (const s of org.scholen) {
      const cl = clusterNaamVan(org, s);
      lijst.push({
        sleutel: `school:${s.id}`,
        niveau: 'school',
        id: s.id,
        naam: s.naam,
        uitleg: [s.type, cl].filter(Boolean).join(' · ') || 'School',
        groep: 'Scholen',
      });
    }
    // Eén school: de school eerst, het bestuur daaronder.
    return eenSchool ? [...lijst.slice(1), lijst[0]] : lijst;
  }, [org, eenSchool]);

  const huidigeSleutel = niveau === 'bestuur' ? 'bestuur' : niveau === 'cluster' ? `cluster:${clusterId}` : `school:${schoolId}`;

  const kies = useCallback(
    (o: Pick<WeergaveOptie, 'niveau' | 'id'>) => {
      if (o.niveau === 'school') setSchoolId(o.id);
      if (o.niveau === 'cluster') setClusterId(o.id);
      setNiveau(o.niveau);
    },
    [setNiveau, setSchoolId, setClusterId],
  );

  const huidig = useMemo(() => {
    if (niveau === 'bestuur') return { soort: eenSchool ? 'Bestuur' : 'Hele bestuur', naam: org.bestuurNaam || 'Bestuur' };
    if (niveau === 'cluster') return { soort: 'Cluster', naam: vindCluster(org, clusterId)?.naam ?? 'Cluster' };
    return { soort: eenSchool ? 'Je school' : 'School', naam: vindSchool(org, schoolId)?.naam ?? 'School' };
  }, [niveau, org, clusterId, schoolId, eenSchool]);

  return { opties, huidigeSleutel, kies, huidig, eenSchool };
}

/** Kleine tegel in de kleur van een niveau (los van het actieve niveau). */
export function NiveauTegel({ niveau, klein }: { niveau: Niveau; klein?: boolean }) {
  const Icoon = NIVEAU_ICONEN[niveau];
  return (
    <span data-niveau={niveau} className="contents">
      <span
        className={cx(
          'grid shrink-0 place-items-center rounded-md border border-niveau-border bg-niveau-surface text-niveau-strong',
          klein ? 'h-7 w-7' : 'h-8 w-8',
        )}
      >
        <Icoon className="h-4 w-4" aria-hidden />
      </span>
    </span>
  );
}

export function WeergaveKiezer() {
  const { opties, huidigeSleutel, kies, huidig } = useWeergave();
  const { niveau } = useStore();
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState('');
  const [actief, setActief] = useState(0);
  const knop = useRef<HTMLButtonElement>(null);
  const paneel = useRef<HTMLDivElement>(null);
  const zoekveld = useRef<HTMLInputElement>(null);
  const lijstId = useId();
  const [plek, setPlek] = useState<{ left: number; top: number; breedte: number }>({ left: 0, top: 0, breedte: 360 });

  const metZoeken = opties.length > 7;
  const zichtbaar = useMemo(() => {
    const v = normaliseer(zoek);
    return v ? opties.filter((o) => normaliseer(`${o.naam} ${o.uitleg}`).includes(v)) : opties;
  }, [opties, zoek]);

  const sluit = useCallback((terug = true) => {
    setOpen(false);
    setZoek('');
    if (terug) knop.current?.focus();
  }, []);

  const openen = () => {
    const r = knop.current?.getBoundingClientRect();
    if (r) {
      const breedte = Math.min(380, window.innerWidth - 24);
      setPlek({ left: Math.max(12, Math.min(r.left, window.innerWidth - breedte - 12)), top: r.bottom + 6, breedte });
    }
    setActief(Math.max(0, opties.findIndex((o) => o.sleutel === huidigeSleutel)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    (metZoeken ? zoekveld.current : paneel.current?.querySelector<HTMLElement>('[aria-selected="true"]'))?.focus();
    const weg = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!paneel.current?.contains(t) && !knop.current?.contains(t)) sluit(false);
    };
    document.addEventListener('pointerdown', weg);
    return () => document.removeEventListener('pointerdown', weg);
  }, [open, metZoeken, sluit]);

  useEffect(() => {
    if (!open || metZoeken) return;
    paneel.current?.querySelectorAll<HTMLElement>('[role=option]')[actief]?.focus();
  }, [actief, open, metZoeken]);


  const kiesOptie = (o: WeergaveOptie) => {
    kies(o);
    sluit();
  };

  const opToets = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      sluit();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActief((a) => Math.min(zichtbaar.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActief((a) => Math.max(0, a - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActief(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActief(zichtbaar.length - 1);
    } else if (e.key === 'Enter' || (e.key === ' ' && !metZoeken)) {
      e.preventDefault();
      const o = zichtbaar[actief];
      if (o) kiesOptie(o);
    } else if (e.key === 'Tab') {
      sluit(false);
    }
  };

  const Icoon = NIVEAU_ICONEN[niveau];
  let vorigeGroep = '';

  return (
    <>
      <button
        ref={knop}
        type="button"
        data-rondleiding="weergave"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Je bekijkt ${huidig.naam} (${huidig.soort.toLowerCase()}). Kies wat je wilt bekijken`}
        onClick={() => (open ? sluit() : openen())}
        className={cx(
          'group inline-flex h-10 min-w-0 max-w-full items-center gap-2 rounded-md border border-niveau-border bg-niveau-surface py-1 pl-1.5 pr-2 text-left transition-colors duration-fast hover:border-niveau focus-visible:border-niveau',
          open && 'border-niveau',
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-niveau text-white">
          <Icoon className="h-4 w-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-2xs font-semibold uppercase tracking-wide text-niveau-strong">{huidig.soort}</span>
          <span className="truncate text-sm font-semibold text-ink-strong">{huidig.naam}</span>
        </span>
        <ChevronDown
          className={cx('h-4 w-4 shrink-0 text-niveau-strong transition-transform duration-fast', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={paneel}
            role="dialog"
            aria-label="Wat wil je bekijken?"
            data-rondleiding="weergave-lijst"
            onKeyDown={opToets}
            className="no-print fixed z-[900] flex max-h-[min(70vh,560px)] animate-rise flex-col overflow-hidden rounded-xl border border-line-subtle bg-surface-card shadow-pop"
            style={{ left: plek.left, top: plek.top, width: plek.breedte }}
          >
            <div className="border-b border-line-subtle px-4 pb-3 pt-3.5">
              <p className="text-sm font-semibold text-ink-strong">Wat wil je bekijken?</p>
              <p className="mt-0.5 text-xs text-ink-muted">Menu en schermen volgen je keuze.</p>
              {metZoeken && (
                <label className="mt-3 flex h-9 items-center gap-2 rounded-md border border-line bg-surface-card px-2.5 focus-within:border-niveau">
                  <Search className="h-4 w-4 text-ink-subtle" aria-hidden />
                  <input
                    ref={zoekveld}
                    value={zoek}
                    onChange={(e) => {
                      setZoek(e.target.value);
                      setActief(0);
                    }}
                    placeholder="Zoek een school of cluster"
                    aria-label="Zoek een school of cluster"
                    aria-controls={lijstId}
                    aria-activedescendant={zichtbaar[actief] ? `${lijstId}-${zichtbaar[actief].sleutel}` : undefined}
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink-strong outline-none placeholder:text-ink-subtle focus-visible:shadow-none"
                  />
                </label>
              )}
            </div>
            <ul id={lijstId} role="listbox" aria-label="Wat wil je bekijken?" className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {zichtbaar.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-muted">Niets gevonden.</li>}
              {zichtbaar.map((o, i) => {
                const kop = o.groep !== vorigeGroep && opties.length > 2 ? o.groep : null;
                vorigeGroep = o.groep;
                const gekozen = o.sleutel === huidigeSleutel;
                return (
                  <li key={o.sleutel} role="presentation">
                    {kop && (
                      <p role="presentation" className="eyebrow px-2.5 pb-1 pt-2.5 first:pt-1">
                        {kop}
                      </p>
                    )}
                    <div
                      id={`${lijstId}-${o.sleutel}`}
                      role="option"
                      aria-selected={gekozen}
                      tabIndex={metZoeken ? -1 : i === actief ? 0 : -1}
                      onClick={() => kiesOptie(o)}
                      onMouseMove={() => setActief(i)}
                      className={cx(
                        'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 outline-none',
                        i === actief ? 'bg-surface-hover' : '',
                      )}
                    >
                      <NiveauTegel niveau={o.niveau} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold text-ink-strong">{o.naam}</span>
                        <span className="truncate text-xs text-ink-muted">{o.uitleg}</span>
                      </span>
                      {gekozen && <Check className="h-4 w-4 shrink-0 text-ink-strong" aria-label="Gekozen" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
