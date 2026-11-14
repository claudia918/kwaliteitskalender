/** Teksten rond het komende gesprek (Start en Dashboard). */
import type { KomendGesprek } from '../../domein/berekeningen';
import { aantal } from '../../domein/hulp';

/** "79 dagen", "1 dag", "vandaag" of (alle deadlines voorbij) "12 dagen geleden". */
export function dagenTekst(k: KomendGesprek): string {
  if (k.dagenTot === 0) return 'vandaag';
  if (k.dagenTot < 0) return `${aantal(-k.dagenTot, 'dag', 'dagen')} geleden`;
  return aantal(k.dagenTot, 'dag', 'dagen');
}

export const VERSTREKEN_UITLEG =
  'Alle gesprekken van dit schooljaar zijn geweest. Pas het schooljaar aan onder Organisatie om de nieuwe cyclus te plannen.';
