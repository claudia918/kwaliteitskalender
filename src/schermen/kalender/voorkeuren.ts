/**
 * Weergavevoorkeuren van de kalender (matrix of lijst, maanden, filter) per browser in localStorage.
 * Ze horen niet in de state, want die gaat naar het gedeelde kalenderbestand.
 */
import { useCallback, useState } from 'react';
import type { KalenderFilter, Periode } from './hulp';

export type Weergave = 'matrix' | 'lijst';

export interface KalenderVoorkeur {
  weergave?: Weergave;
  periode?: Periode;
  filter?: KalenderFilter;
}

const SLEUTEL = 'kwaliteitskalender:kalender-weergave:v1';

function lees(): KalenderVoorkeur {
  try {
    const t = localStorage.getItem(SLEUTEL);
    return t ? (JSON.parse(t) as KalenderVoorkeur) : {};
  } catch {
    return {};
  }
}

function schrijf(v: KalenderVoorkeur) {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(v));
  } catch {
    /* niet erg: dan geldt de standaard */
  }
}

/** Eén voorkeur lezen en bijwerken; `begin` geldt als er niets bewaard is. */
export function useVoorkeur<K extends keyof KalenderVoorkeur>(
  sleutel: K,
  begin: () => NonNullable<KalenderVoorkeur[K]>,
): [NonNullable<KalenderVoorkeur[K]>, (v: NonNullable<KalenderVoorkeur[K]>) => void] {
  const [waarde, zet] = useState<NonNullable<KalenderVoorkeur[K]>>(() => (lees()[sleutel] as NonNullable<KalenderVoorkeur[K]>) ?? begin());
  const zetEnBewaar = useCallback(
    (v: NonNullable<KalenderVoorkeur[K]>) => {
      zet(v);
      schrijf({ ...lees(), [sleutel]: v });
    },
    [sleutel],
  );
  return [waarde, zetEnBewaar];
}
