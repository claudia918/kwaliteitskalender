/**
 * Opslag in de browser (localStorage). Alleen op dit apparaat; er gaat niets over het netwerk.
 */
import { legeState, migreer } from '../domein/state';
import type { Niveau, SchoolId, State } from '../domein/types';
import { alleenBestand } from './opslagmodus';

export const STATE_SLEUTEL = 'kwaliteitskalender:state:v5';
/** Sleutel van de oude lokale modus; wordt eenmalig gemigreerd als die bestaat. */
export const OUDE_STATE_SLEUTEL = 'kwaliteitskalender:state:v1';
export const UI_SLEUTEL = 'kwaliteitskalender:ui:v1';

export function laadState(): State {
  // Alleen in het kalenderbestand: de browser bevat geen kalender. Begin leeg; het bestand volgt.
  if (alleenBestand()) {
    verwijderState();
    return legeState();
  }
  try {
    const nieuw = localStorage.getItem(STATE_SLEUTEL);
    if (nieuw) {
      const s = migreer(JSON.parse(nieuw));
      if (s) return s;
    }
    const oud = localStorage.getItem(OUDE_STATE_SLEUTEL);
    if (oud) {
      const s = migreer(JSON.parse(oud));
      if (s) return s;
    }
  } catch {
    /* onleesbaar: begin leeg */
  }
  return legeState();
}

/** Bewaart de state. Geeft false als de browser weigert (vol, privémodus). */
export function bewaarState(s: State): boolean {
  try {
    localStorage.setItem(STATE_SLEUTEL, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/** Haalt de kalenderinhoud uit de browseropslag (bij "alleen in het kalenderbestand"). */
export function verwijderState(): void {
  try {
    localStorage.removeItem(STATE_SLEUTEL);
    localStorage.removeItem(OUDE_STATE_SLEUTEL);
  } catch {
    /* niets te verwijderen */
  }
}

export interface UiVoorkeur {
  niveau?: Niveau;
  schoolId?: SchoolId;
  clusterId?: string;
}

export function laadUi(): UiVoorkeur {
  try {
    const t = localStorage.getItem(UI_SLEUTEL);
    return t ? (JSON.parse(t) as UiVoorkeur) : {};
  } catch {
    return {};
  }
}

export function bewaarUi(ui: UiVoorkeur): void {
  try {
    localStorage.setItem(UI_SLEUTEL, JSON.stringify(ui));
  } catch {
    /* niet erg */
  }
}
