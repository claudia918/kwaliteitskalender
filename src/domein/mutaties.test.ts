import { describe, expect, it } from 'vitest';
import * as m from './mutaties';
import { demoState, legeState } from './state';
import type { EditScope, State } from './types';

const school1: EditScope = { kind: 'school', schoolId: '1' };
const bestuur: EditScope = { kind: 'bestuur' };
const vind = (s: State, uid: string) => s.schoolKalenders['1'].find((i) => i.uid === uid)!;

describe('kalenderitems', () => {
  const s0 = demoState(1000);
  const uid = 's1-OP0-01';

  it('moveItem zet maand en tijdstempel', () => {
    const s = m.moveItem(s0, school1, uid, 'Mei', 2000);
    expect(vind(s, uid)).toMatchObject({ maand: 'Mei', gewijzigd: 2000 });
    expect(m.moveItem(s, school1, uid, 'Mei', 3000)).toBe(s); // geen wijziging = zelfde object
  });

  it('setItemStatus voegt historie toe, behalve bij dezelfde status', () => {
    const nu = new Date(2026, 10, 14, 10).getTime();
    const s = m.setItemStatus(s0, school1, uid, 'risico', nu);
    expect(vind(s, uid).historie).toEqual([{ status: 'risico', datum: '2026-11-14' }]);
    const zelfde = m.setItemStatus(s, school1, uid, 'risico', nu + 5);
    expect(vind(zelfde, uid).historie).toHaveLength(1);
  });

  it('tijdstempel is altijd later dan de vorige versie (scheve klok)', () => {
    const s = m.moveItem(s0, school1, uid, 'Mei', 999_999);
    const t = m.moveItem(s, school1, uid, 'Jun', 5);
    expect(vind(t, uid).gewijzigd).toBe(1_000_000);
  });

  it('addActiviteit en addEigenActiviteit', () => {
    const r = m.addActiviteit(s0, bestuur, 'MON-02', 2000);
    const nieuw = r.state.bestuurItems.find((i) => i.uid === r.uid)!;
    expect(nieuw).toMatchObject({ activiteitId: 'MON-02', status: 'gepland', gewijzigd: 2000 });
    expect(m.addActiviteit(s0, bestuur, 'BESTAAT-NIET', 2000).uid).toBeNull();

    const e = m.addEigenActiviteit(
      s0,
      school1,
      { naam: ' Audit ', standaard: 'VS1', gesprek: 'Winter', periode: 'mrt-apr' },
      3000,
    );
    const item = vind(e.state, e.uid);
    expect(item.maand).toBe('Mrt');
    expect(item.custom).toMatchObject({ naam: 'Audit', gebied: 'VS', type: 'school', frequentie: 'Eigen', verplicht: false });
    expect(item.activiteitId).toMatch(/^EIGEN-[0-9a-f]{8}$/);
  });

  it('removeItem zet een tombstone', () => {
    const s = m.removeItem(s0, school1, uid, 2000);
    expect(s.schoolKalenders['1'].some((i) => i.uid === uid)).toBe(false);
    expect(s.verwijderd[`item:s:1:${uid}`]).toBe(2000);
  });

  it('setKoppeling: afwijking met reden, standaardgesprek wist afwijking', () => {
    const s = m.setKoppeling(s0, school1, uid, 'Lente', '  ', 2000);
    expect(vind(s, uid).afwijking).toEqual({ reden: 'Aangepast door school' });
    const t = m.setKoppeling(s, school1, uid, 'Herfst', '', 3000);
    expect(vind(t, uid).afwijking).toBeUndefined();
    expect('afwijking' in vind(t, uid)).toBe(false);
  });

  it('slaItemOp bewaart alles in één wijziging', () => {
    const s = m.slaItemOp(
      s0,
      school1,
      uid,
      {
        gesprek: 'Winter',
        reden: 'Later',
        notitie: ' n ',
        eigenNaam: '',
        eigenaar: 'Teamleider',
        deadline: '2026-12-01',
        maand: 'Dec',
      },
      2000,
    );
    expect(vind(s, uid)).toMatchObject({
      gesprek: 'Winter',
      afwijking: { reden: 'Later' },
      notitie: 'n',
      eigenaar: 'Teamleider',
      deadline: '2026-12-01',
      maand: 'Dec',
      gewijzigd: 2000,
    });
    expect('eigenNaam' in vind(s, uid)).toBe(false);
    // nogmaals hetzelfde opslaan: geen nieuwe tijdstempel
    const t = m.slaItemOp(s, school1, uid, { gesprek: 'Winter', reden: 'Later', notitie: 'n', maand: 'Dec' }, 9000);
    expect(vind(t, uid).gewijzigd).toBe(2000);
  });

  it('bewijs toevoegen en verwijderen', () => {
    const s = m.addBewijs(s0, school1, uid, { label: 'Verslag', url: '' }, 2000);
    const b = vind(s, uid).bewijs!;
    expect(b).toHaveLength(1);
    expect(b[0].url).toBeUndefined();
    const t = m.removeBewijs(s, school1, uid, b[0].id, 3000);
    expect(vind(t, uid).bewijs).toEqual([]);
  });
});

describe('organisatie', () => {
  it('scholen krijgen botsingsvrije id’s', () => {
    const s0 = legeState();
    const a = m.addSchool(s0, { naam: 'A' }, 1);
    const b = m.addSchool(s0, { naam: 'B' }, 1);
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^sch-[0-9a-f]{12}$/);
    expect(a.state.schoolKalenders[a.id]).toEqual([]);
    expect(m.addSchool(s0, { naam: ' ' }, 1).state.organisatie.scholen[0]).toMatchObject({
      naam: 'School 1',
      type: 'vo',
      cluster: '',
    });
  });
  it('school verwijderen verwijdert ook de kalender en zet een tombstone', () => {
    const s = m.removeSchool(demoState(1), '2', 50);
    expect(s.organisatie.scholen.map((x) => x.id)).toEqual(['1', '3', '4', '5']);
    expect(s.schoolKalenders['2']).toBeUndefined();
    expect(s.verwijderd['school:2']).toBe(50);
  });
  it('cluster verwijderen ontkoppelt scholen', () => {
    const s = m.removeCluster(demoState(1), 'Noord', 50);
    expect(s.organisatie.scholen.filter((x) => x.cluster === '')).toHaveLength(2);
    expect(s.organisatie.scholen.find((x) => x.id === '1')!.gewijzigd).toBe(50);
    expect(s.verwijderd['cluster:Noord']).toBe(50);
  });
  it('instellingen hebben elk een eigen tijdstempel', () => {
    let s = m.setBestuurNaam(legeState(), 'X', 10);
    s = m.setSchooljaar(s, '2027/2028', 20);
    expect(s.tijden).toEqual({ bestuurNaam: 10, schooljaar: 20 });
    expect(m.setBestuurNaam(s, 'X', 30)).toBe(s);
  });
});

describe('gesprekscyclus', () => {
  it('gesprek toevoegen, verplaatsen en verwijderen', () => {
    let s = demoState(1);
    const r = m.addGesprek(s, 10);
    s = r.state;
    const g = s.organisatie.gesprekscyclus.find((x) => x.id === r.id)!;
    expect(g).toMatchObject({ naam: 'Gesprek 5', maand: 'Nov', kleur: 'Doorlopend', icoon: 'vlag', volgorde: 4 });
    s = m.moveGesprek(s, r.id, -1, 20);
    expect(s.organisatie.gesprekscyclus.find((x) => x.id === r.id)!.volgorde).toBe(3);
    expect(s.organisatie.gesprekscyclus.find((x) => x.id === 'Zomer')!.volgorde).toBe(4);
    expect(m.moveGesprek(s, 'Herfst', -1, 30)).toBe(s);

    // item koppelen aan het nieuwe gesprek en dan het gesprek verwijderen
    s = m.setKoppeling(s, school1, 's1-OP0-01', r.id, 'eigen', 40);
    s = m.removeGesprek(s, r.id, 50);
    const item = vind(s, 's1-OP0-01');
    expect(item.gesprek).toBe('Doorlopend');
    expect(item.afwijking).toBeUndefined();
    expect(s.verwijderd[`gesprek:${r.id}`]).toBe(50);
  });
  it('resetCyclus zet de vier seizoenen terug', () => {
    let s = m.addGesprek(demoState(1), 10).state;
    s = m.removeGesprek(s, 'Winter', 20);
    s = m.resetCyclus(s, 30);
    expect(s.organisatie.gesprekscyclus.map((g) => g.id)).toEqual(['Herfst', 'Winter', 'Lente', 'Zomer']);
    expect(s.verwijderd['gesprek:Winter']).toBeUndefined();
    expect(Object.keys(s.verwijderd).filter((k) => k.startsWith('gesprek:g-'))).toHaveLength(1);
  });
});

describe('startsjabloon en wizard', () => {
  it('sjabloon vult 19 verplichte schoolactiviteiten en alle 30 bestuursactiviteiten, zonder dubbel', () => {
    let s = m.addSchool(legeState(), { naam: 'A' }, 1).state;
    const id = s.organisatie.scholen[0].id;
    s = m.pasSjabloonToe(s, 5);
    expect(s.schoolKalenders[id]).toHaveLength(19);
    expect(s.schoolKalenders[id][0].uid).toBe(`s${id}-${s.schoolKalenders[id][0].activiteitId}`);
    expect(s.bestuurItems).toHaveLength(30);
    expect(m.pasSjabloonToe(s, 6).schoolKalenders[id]).toHaveLength(19);
  });
  it('een verwijderd sjabloonitem komt terug met een nieuwere tijdstempel', () => {
    let s = m.addSchool(legeState(), { naam: 'A' }, 1).state;
    const id = s.organisatie.scholen[0].id;
    s = m.pasSjabloonToe(s, 5);
    const uid = s.schoolKalenders[id][0].uid;
    s = m.removeItem(s, { kind: 'school', schoolId: id }, uid, 100);
    s = m.pasSjabloonToe(s, 50); // klok staat achter
    const terug = s.schoolKalenders[id].find((i) => i.uid === uid)!;
    expect(terug.gewijzigd).toBe(101);
    expect(s.verwijderd[`item:s:${id}:${uid}`]).toBeUndefined();
  });
  it('voltooiWizard', () => {
    const s = m.voltooiWizard(
      legeState(),
      {
        bestuurNaam: ' Stichting X ',
        schooljaar: '2026/2027',
        scholen: [{ naam: 'A', type: 'vmbo' }, { naam: 'B' }],
        sjabloon: true,
      },
      7,
    );
    expect(s.setupVoltooid).toBe(true);
    expect(s.modus).toBe('eigen');
    expect(s.organisatie.bestuurNaam).toBe('Stichting X');
    expect(s.organisatie.scholen).toHaveLength(2);
    expect(Object.values(s.schoolKalenders).every((l) => l.length === 19)).toBe(true);
  });
});
