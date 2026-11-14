import { describe, expect, it } from 'vitest';
import { STANDAARDEN_SCHOOL, demoState, migreer } from '../../domein';
import { oudeBackupV4 } from '../../domein/testdata';
import { excelBestandsnaam, excelTabbladen, kalenderRijen } from './rijen';

describe('Excel-export (rijen)', () => {
  const s = migreer(oudeBackupV4())!;
  const items = s.schoolKalenders['1'];
  const cyclus = s.organisatie.gesprekscyclus;

  it('kalenderregels met gespreksnaam, statuslabel en bewijs', () => {
    const rijen = kalenderRijen(items, cyclus);
    const r = rijen.find((x) => x.ID === 'OP0-01')!;
    expect(r.Activiteit).toBe('Toetsweek taal');
    expect(r.Gesprek).toBe('Tussengesprek');
    expect(r.Status).toBe('Gereed');
    expect(r.Bewijs).toBe('Verslag (https://intranet.example/verslag)');
    expect(r.Afwijking).toBe('Andere planning');
    expect(r.Verplicht === 'Ja' || r.Verplicht === 'Nee').toBe(true);
  });

  it('tabbladen volgen de opties; lege afwijkingen geven één regel', () => {
    const d = demoState(0);
    const bladen = excelTabbladen({
      items: [],
      standaarden: STANDAARDEN_SCHOOL,
      cyclus: d.organisatie.gesprekscyclus,
      opties: { compliance: true, afwijkingen: true },
    });
    expect(bladen.map((b) => b.naam)).toEqual(['Kalender', 'Compliance', 'Afwijkingen']);
    expect(bladen[0].rijen).toHaveLength(0);
    expect(bladen[1].rijen).toHaveLength(13);
    expect(bladen[2].rijen).toEqual([{ Activiteit: 'Geen afwijkingen' }]);
    const alleen = excelTabbladen({ items, standaarden: STANDAARDEN_SCHOOL, cyclus, opties: { compliance: false, afwijkingen: false } });
    expect(alleen.map((b) => b.naam)).toEqual(['Kalender']);
  });

  it('clusterniveau krijgt een kolom School', () => {
    const bladen = excelTabbladen({
      items,
      standaarden: STANDAARDEN_SCHOOL,
      cyclus,
      opties: { compliance: false, afwijkingen: true },
      schoolVanItem: new Map(items.map((i) => [i.uid, 'Lyceum Noord'])),
    });
    expect(bladen[0].kolommen[0]).toBe('School');
    expect(bladen[0].rijen[0].School).toBe('Lyceum Noord');
    expect(bladen[1].rijen[0].School).toBe('Lyceum Noord');
  });

  it('bestandsnaam', () => {
    expect(excelBestandsnaam('Lyceum Noord', '2026/2027')).toBe('kwaliteitskalender-lyceum-noord-2026-2027.xlsx');
    expect(excelBestandsnaam('', '')).toBe('kwaliteitskalender-kalender.xlsx');
  });
});
