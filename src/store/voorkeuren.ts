/**
 * Voorkeuren per browser (ingeklapte onderdelen, gekozen tabblad) en het vorige bezoek.
 * Staan in localStorage, NIET in de state: ze gaan nooit naar het gedeelde kalenderbestand.
 */
import { useCallback, useEffect, useState } from 'react';
import { leesVoorkeurOpslag, schrijfVoorkeurOpslag } from './oefenopslag';

export const VOORKEUR_SLEUTEL = 'kwaliteitskalender:voorkeur:v1';
export const BEZOEK_SLEUTEL = 'kwaliteitskalender:bezoek:v1';

function leesAlles(): Record<string, unknown> {
  try {
    const t = leesVoorkeurOpslag(VOORKEUR_SLEUTEL);
    return t ? (JSON.parse(t) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Eén voorkeur, onthouden in deze browser. */
export function useVoorkeur<T extends string | number | boolean>(sleutel: string, standaard: T): [T, (v: T) => void] {
  const [waarde, setWaarde] = useState<T>(() => {
    const v = leesAlles()[sleutel];
    return typeof v === typeof standaard ? (v as T) : standaard;
  });
  const zet = useCallback(
    (v: T) => {
      setWaarde(v);
      schrijfVoorkeurOpslag(VOORKEUR_SLEUTEL, JSON.stringify({ ...leesAlles(), [sleutel]: v }));
    },
    [sleutel],
  );
  return [waarde, zet];
}

/* ------------------------------------------------------------------ */
/* Vorige bezoek                                                        */
/* ------------------------------------------------------------------ */

/** Begin van dit bezoek (laden van de pagina) en het laatste moment van het vorige bezoek. */
const BEZOEK = (() => {
  const nu = Date.now();
  let vorig: number | null = null;
  try {
    const t = localStorage.getItem(BEZOEK_SLEUTEL);
    const v = t ? (JSON.parse(t) as { laatst?: number }).laatst : undefined;
    vorig = typeof v === 'number' ? v : null;
  } catch {
    /* geen opslag */
  }
  return { begin: nu, vorig };
})();

function bewaarLaatst() {
  try {
    localStorage.setItem(BEZOEK_SLEUTEL, JSON.stringify({ laatst: Date.now() }));
  } catch {
    /* niet erg */
  }
}

/**
 * `{ vorig, begin }`: het laatste moment van het vorige bezoek (null bij het eerste) en het begin
 * van dit bezoek. Houdt zelf "laatst actief" bij zolang de app open is.
 */
export function useBezoek(): { vorig: number | null; begin: number } {
  useEffect(() => {
    bewaarLaatst();
    const t = window.setInterval(bewaarLaatst, 60_000);
    const weg = () => document.visibilityState === 'hidden' && bewaarLaatst();
    document.addEventListener('visibilitychange', weg);
    window.addEventListener('pagehide', bewaarLaatst);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', weg);
      window.removeEventListener('pagehide', bewaarLaatst);
    };
  }, []);
  return BEZOEK;
}
