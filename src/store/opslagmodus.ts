/**
 * Waar de kalendergegevens bewaard worden.
 *
 * Standaard: in de opslag van de browser (localStorage), en daarnaast eventueel in een gekoppeld
 * kalenderbestand. Met "alleen in het kalenderbestand" staat er geen kalenderinhoud meer in de
 * browser: de gegevens staan alleen in het bestand in de eigen omgeving van de organisatie en,
 * zolang het tabblad open is, in het werkgeheugen.
 *
 * De keuze zelf is een instelling per browser (geen kalenderinhoud) en staat in localStorage.
 */
import { useSyncExternalStore } from 'react';

export const OPSLAGMODUS_SLEUTEL = 'kwaliteitskalender:alleen-bestand:v1';

const luisteraars = new Set<() => void>();

export function alleenBestand(): boolean {
  try {
    return localStorage.getItem(OPSLAGMODUS_SLEUTEL) === '1';
  } catch {
    return false;
  }
}

/** Zet de instelling. Geeft false als de browser de instelling niet kan onthouden. */
export function zetAlleenBestand(aan: boolean): boolean {
  try {
    if (aan) localStorage.setItem(OPSLAGMODUS_SLEUTEL, '1');
    else localStorage.removeItem(OPSLAGMODUS_SLEUTEL);
  } catch {
    return false;
  }
  luisteraars.forEach((l) => l());
  return true;
}

function abonneer(l: () => void): () => void {
  luisteraars.add(l);
  return () => luisteraars.delete(l);
}

/** De instelling als React-waarde; volgt wijzigingen direct. */
export function useAlleenBestand(): boolean {
  return useSyncExternalStore(abonneer, alleenBestand, () => false);
}
