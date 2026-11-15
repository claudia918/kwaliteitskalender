/**
 * Wat de rondleiding onthoudt, per browser in localStorage (nooit in de state, dus nooit in het
 * gedeelde kalenderbestand): of hij is aangeboden, welke rondleidingen af zijn en waar je was.
 *
 * Het oefenen zelf (de oefenkalender) staat alleen in sessionStorage van dit tabblad, zodat je na
 * herladen verdergaat waar je was; sluit je het tabblad, dan is het weg.
 */
import { migreer } from '../../domein/state';
import type { Niveau, State } from '../../domein/types';

export const RONDLEIDING_SLEUTEL = 'kwaliteitskalender:rondleiding:v1';
export const OEFEN_SLEUTEL = 'kwaliteitskalender:oefen:v1';

/** 'eerste' of 'scherm:<pad>' */
export type TourId = string;

/** Wat je tijdens het oefenen deed (voor de afsluiting). */
export interface Teller {
  gereed: number;
  verschoven: number;
  toegevoegd: number;
  ongedaan: number;
  gezocht: number;
}

export const LEGE_TELLER: Teller = { gereed: 0, verschoven: 0, toegevoegd: 0, ongedaan: 0, gezocht: 0 };

export interface Lopend {
  tour: TourId;
  stap: number;
  /** Waar je was voordat het oefenen begon (pad + zoekdeel). */
  terug: string;
  begonnen: number;
  teller: Teller;
}

export interface Voortgang {
  /** Automatisch aangeboden (eerste gebruik in deze browser). */
  aangeboden: boolean;
  /** De eerste rondleiding helemaal gedaan. */
  eersteAf: boolean;
  /** Afgeronde schermrondleidingen (paden). */
  schermen: string[];
  /** Een begonnen rondleiding (ook na onderbreken). */
  lopend: Lopend | null;
}

export const LEGE_VOORTGANG: Voortgang = { aangeboden: false, eersteAf: false, schermen: [], lopend: null };

export function laadVoortgang(): Voortgang {
  try {
    const t = localStorage.getItem(RONDLEIDING_SLEUTEL);
    if (!t) return { ...LEGE_VOORTGANG };
    const v = JSON.parse(t) as Partial<Voortgang>;
    return {
      aangeboden: !!v.aangeboden,
      eersteAf: !!v.eersteAf,
      schermen: Array.isArray(v.schermen) ? v.schermen.filter((x) => typeof x === 'string') : [],
      lopend:
        v.lopend && typeof v.lopend.tour === 'string' && typeof v.lopend.stap === 'number'
          ? { ...v.lopend, teller: { ...LEGE_TELLER, ...(v.lopend.teller ?? {}) }, terug: v.lopend.terug || '/' }
          : null,
    };
  } catch {
    return { ...LEGE_VOORTGANG };
  }
}

export function bewaarVoortgang(v: Voortgang): void {
  try {
    localStorage.setItem(RONDLEIDING_SLEUTEL, JSON.stringify(v));
  } catch {
    /* niet erg: dan wordt hij een volgende keer opnieuw aangeboden */
  }
}

export interface OefenSessie {
  state: State;
  niveau: Niveau;
  schoolId: string;
  clusterId: string;
  voorkeuren: Record<string, string>;
}

export function laadOefenSessie(): OefenSessie | null {
  try {
    const t = sessionStorage.getItem(OEFEN_SLEUTEL);
    if (!t) return null;
    const s = JSON.parse(t) as OefenSessie;
    const state = migreer(s.state);
    if (!state) return null;
    return { ...s, state, voorkeuren: s.voorkeuren ?? {} };
  } catch {
    return null;
  }
}

export function bewaarOefenSessie(s: OefenSessie): void {
  try {
    sessionStorage.setItem(OEFEN_SLEUTEL, JSON.stringify(s));
  } catch {
    /* niet erg */
  }
}

export function wisOefenSessie(): void {
  try {
    sessionStorage.removeItem(OEFEN_SLEUTEL);
  } catch {
    /* niet erg */
  }
}
