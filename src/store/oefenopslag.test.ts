import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { leesVoorkeurOpslag, oefenGeheugenActief, oefenGeheugenInhoud, schrijfVoorkeurOpslag, zetOefenGeheugen } from './oefenopslag';

/** Eenvoudige localStorage voor de node-omgeving. */
function nepOpslag() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

describe('voorkeuren tijdens het oefenen', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = nepOpslag();
  });
  afterEach(() => zetOefenGeheugen(false));

  it('schrijft buiten het oefenen gewoon naar localStorage', () => {
    schrijfVoorkeurOpslag('k', 'echt');
    expect(localStorage.getItem('k')).toBe('echt');
    expect(leesVoorkeurOpslag('k')).toBe('echt');
  });

  it('raakt localStorage niet aan tijdens het oefenen, en daarna is alles zoals ervoor', () => {
    localStorage.setItem('k', 'echt');
    const voor = JSON.stringify(Object.fromEntries([...Array(localStorage.length)].map((_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i)!)])));
    zetOefenGeheugen(true);
    expect(oefenGeheugenActief()).toBe(true);
    // oefenen begint met standaardvoorkeuren, niet met de eigen
    expect(leesVoorkeurOpslag('k')).toBeNull();
    schrijfVoorkeurOpslag('k', 'oefen');
    schrijfVoorkeurOpslag('nieuw', 'x');
    expect(leesVoorkeurOpslag('k')).toBe('oefen');
    expect(oefenGeheugenInhoud()).toEqual({ k: 'oefen', nieuw: 'x' });
    expect(localStorage.getItem('k')).toBe('echt');
    expect(localStorage.getItem('nieuw')).toBeNull();
    zetOefenGeheugen(false);
    const na = JSON.stringify(Object.fromEntries([...Array(localStorage.length)].map((_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i)!)])));
    expect(na).toBe(voor);
    expect(leesVoorkeurOpslag('k')).toBe('echt');
  });

  it('kan na herladen verder met de bewaarde oefenvoorkeuren', () => {
    zetOefenGeheugen(true, { k: 'oefen' });
    expect(leesVoorkeurOpslag('k')).toBe('oefen');
  });
});
