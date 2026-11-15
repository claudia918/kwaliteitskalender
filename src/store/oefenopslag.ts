/**
 * Voorkeuren tijdens het oefenen (rondleiding). Zolang de oefenkalender open is, schrijven de
 * voorkeur-hooks (ingeklapte onderdelen, tabbladen, matrix of lijst) naar een tijdelijk geheugen in
 * plaats van naar localStorage. Lezen kijkt eerst in dat geheugen. Na het oefenen is het weg en staan
 * de echte voorkeuren er precies zo als ervoor.
 */

let geheugen: Map<string, string> | null = null;

/** Aan: oefenen begint (met optioneel vooraf ingevulde voorkeuren). Uit: geheugen weg. */
export function zetOefenGeheugen(aan: boolean, begin: Record<string, string> = {}): void {
  geheugen = aan ? new Map(Object.entries(begin)) : null;
}

export function oefenGeheugenActief(): boolean {
  return geheugen !== null;
}

export function leesVoorkeurOpslag(sleutel: string): string | null {
  if (geheugen) return geheugen.has(sleutel) ? geheugen.get(sleutel)! : null;
  try {
    return localStorage.getItem(sleutel);
  } catch {
    return null;
  }
}

export function schrijfVoorkeurOpslag(sleutel: string, waarde: string): void {
  if (geheugen) {
    geheugen.set(sleutel, waarde);
    return;
  }
  try {
    localStorage.setItem(sleutel, waarde);
  } catch {
    /* niet erg */
  }
}

/** Inhoud van het tijdelijke geheugen (om het oefenen na herladen voort te zetten). */
export function oefenGeheugenInhoud(): Record<string, string> {
  return geheugen ? Object.fromEntries(geheugen) : {};
}
