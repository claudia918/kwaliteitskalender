/** Testgegevens (alleen voor tests). */

/** Een back-up zoals de oude app (versie 4) die maakte, met elk veld gevuld. */
export function oudeBackupV4() {
  return {
    versie: 4,
    schooljaar: '2025/2026',
    organisatie: {
      bestuurNaam: 'Stichting Voorbeeld',
      scholen: [
        { id: 1, naam: 'Lyceum Noord', type: 'havo/vwo', cluster: 'noord' },
        { id: 7, naam: 'VMBO Zuid', type: 'vmbo', cluster: '' },
      ],
      clusters: [{ id: 'noord', naam: 'Cluster Noord', scholen: [1] }],
      gesprekscyclus: [
        { id: 'Herfst', naam: 'Herfst', maand: 'Nov', kleur: 'Herfst', icoon: 'blad', thema: 'T', volgorde: 0 },
        { id: 'g-1a2b3c4d', naam: 'Tussengesprek', maand: 'Mrt', kleur: 'Doorlopend', icoon: 'vlag', volgorde: 1 },
      ],
    },
    modus: 'eigen',
    setupVoltooid: true,
    onboardingVerborgen: true,
    bestuurItems: [{ uid: 'bestuur-CVB-01', activiteitId: 'CVB-01', maand: 'Okt', gesprek: 'Herfst', status: 'bezig' }],
    schoolKalenders: {
      '1': [
        {
          uid: 's1-OP0-01',
          activiteitId: 'OP0-01',
          maand: 'Okt',
          gesprek: 'g-1a2b3c4d',
          status: 'gereed',
          afwijking: { reden: 'Andere planning' },
          notitie: 'Notitie',
          eigenNaam: 'Toetsweek taal',
          eigenaar: 'Sectievoorzitter',
          deadline: '2025-10-15',
          bewijs: [{ id: 'b1', label: 'Verslag', url: 'https://intranet.example/verslag' }],
          historie: [{ status: 'gereed', datum: '2025-10-10' }],
        },
        {
          uid: '3f2a-uuid',
          activiteitId: 'EIGEN-abcd1234',
          maand: 'Mei',
          gesprek: 'Doorlopend',
          status: 'gepland',
          custom: {
            id: 'EIGEN-abcd1234',
            naam: 'Audit examendossiers',
            omschrijving: '',
            standaard: 'OR1',
            gebied: 'OR',
            gesprek: 'Doorlopend',
            periode: 'mei',
            frequentie: 'Eigen',
            verantwoordelijke: '',
            verplicht: false,
            tags: ['eigen'],
            type: 'school',
          },
        },
      ],
      '7': [],
    },
  };
}
