/** Klassen samenvoegen; valse waarden vallen weg. cx('a', x && 'b') */
export function cx(...klassen: (string | false | null | undefined | 0)[]): string {
  return klassen.filter(Boolean).join(' ');
}
