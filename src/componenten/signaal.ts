/**
 * Signalen voor de rondleiding: kleine gebeurtenissen die je niet aan de gegevens kunt zien,
 * zoals "ongedaan gemaakt" of "zoekresultaat gekozen". Alleen binnen deze pagina (window-event).
 */
export type Signaal = 'ongedaan' | 'zoek-gekozen' | 'zoek-open';

const EVENT = 'kk-rondleiding';

export function meldSignaal(naam: Signaal): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<Signaal>(EVENT, { detail: naam }));
}

/** Luister naar signalen; geeft een functie om te stoppen. */
export function luisterNaarSignalen(fn: (naam: Signaal) => void): () => void {
  const opEvent = (e: Event) => fn((e as CustomEvent<Signaal>).detail);
  window.addEventListener(EVENT, opEvent);
  return () => window.removeEventListener(EVENT, opEvent);
}
