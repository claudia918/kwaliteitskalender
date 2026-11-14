/**
 * Zoeken voor het zoekvenster (Ctrl/Cmd+K): ongevoelig voor hoofdletters en accenten,
 * alle woorden moeten voorkomen. Puur, zonder React.
 */

/** Kleine letters, zonder accenten en leestekens, enkele spaties. */
export function normaliseer(tekst: string): string {
  return tekst
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, ' ')
    .trim();
}

/**
 * Score van een tekst voor een zoekvraag; 0 = geen treffer. Elk woord van de vraag moet in de
 * tekst voorkomen. Hoger als de tekst met de vraag begint of een woord exact gelijk is.
 * `hoofd` is het belangrijkste veld (de naam); `rest` telt ook mee maar lager.
 */
export function zoekScore(vraag: string, hoofd: string, rest = ''): number {
  const v = normaliseer(vraag);
  if (!v) return 0;
  const h = normaliseer(hoofd);
  const alles = `${h} ${normaliseer(rest)}`;
  const woorden = v.split(' ');
  if (!woorden.every((w) => alles.includes(w))) return 0;
  let score = 1;
  if (h === v) score += 100;
  else if (h.startsWith(v)) score += 50;
  else if (h.includes(v)) score += 25;
  for (const w of woorden) {
    if (h.split(' ').includes(w)) score += 6;
    else if (h.split(' ').some((d) => d.startsWith(w))) score += 4;
    else if (h.includes(w)) score += 2;
  }
  return score;
}

export interface Treffer<T> {
  waarde: T;
  score: number;
}

/** Filtert en sorteert een lijst op score (stabiel bij gelijke score), hooguit `max` treffers. */
export function zoekIn<T>(lijst: T[], vraag: string, velden: (x: T) => [string, string?], max = 6): Treffer<T>[] {
  const uit: Treffer<T>[] = [];
  for (const waarde of lijst) {
    const [hoofd, rest] = velden(waarde);
    const score = zoekScore(vraag, hoofd, rest);
    if (score > 0) uit.push({ waarde, score });
  }
  return uit.sort((a, b) => b.score - a.score).slice(0, max);
}
