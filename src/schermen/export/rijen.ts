/**
 * Pure opbouw van de Excel-export (inventaris §5.2) en hulpjes voor de exportschermen.
 * Geen React, geen SheetJS: alleen rijen en namen, zodat het te testen is.
 */
import {
  STATUSSEN,
  activiteitVan,
  afwijkingen,
  dekkingPerStandaard,
  effectieveNaam,
  slug,
  vindGesprek,
  type Gesprek,
  type KalenderItem,
  type Standaard,
} from '../../domein';

export type Cel = string | number;
export type Rij = Record<string, Cel>;

export interface Tabblad {
  naam: string;
  kolommen: string[];
  rijen: Rij[];
  /** Kolombreedte in tekens, per kolom. */
  breedtes: number[];
}

export interface ExcelInvoer {
  items: KalenderItem[];
  standaarden: Standaard[];
  cyclus: Gesprek[];
  opties: { compliance: boolean; afwijkingen: boolean };
  /** Op clusterniveau: schoolnaam per item-uid (extra kolom "School"). */
  schoolVanItem?: Map<string, string>;
}

export const KALENDER_KOLOMMEN = [
  'ID',
  'Activiteit',
  'Bibliotheeknaam',
  'Standaard',
  'Kwaliteitsgebied',
  'Gesprek',
  'Maand',
  'Status',
  'Eigenaar',
  'Deadline',
  'Bewijs',
  'Verplicht',
  'Afwijking',
  'Notitie',
];
const KALENDER_BREEDTES = [12, 40, 40, 10, 8, 16, 7, 9, 22, 11, 40, 9, 32, 40];

export const COMPLIANCE_KOLOMMEN = ['Standaard', 'Naam', 'Kwaliteitsgebied', 'Vaste standaard', 'Activiteiten', 'Gereed', 'Afgedekt'];
export const AFWIJKING_KOLOMMEN = ['Activiteit', 'Standaard', 'Gekoppeld gesprek', 'Reden'];

/** Statuslabel ("Gereed") in plaats van de ruwe waarde. */
export function statusLabel(status: string): string {
  return STATUSSEN[status as keyof typeof STATUSSEN]?.label ?? status;
}

/** "label (url); label" zoals het origineel. */
export function bewijsTekst(item: KalenderItem): string {
  return (item.bewijs ?? []).map((b) => (b.url ? `${b.label} (${b.url})` : b.label)).join('; ');
}

export function kalenderRijen(items: KalenderItem[], cyclus: Gesprek[], schoolVanItem?: Map<string, string>): Rij[] {
  return items
    .map((item) => {
      const a = activiteitVan(item);
      const rij: Rij = {};
      if (schoolVanItem) rij.School = schoolVanItem.get(item.uid) ?? '';
      Object.assign(rij, {
        ID: a?.id ?? item.activiteitId,
        Activiteit: effectieveNaam(item),
        Bibliotheeknaam: a?.naam ?? '',
        Standaard: a?.standaard ?? '',
        Kwaliteitsgebied: a?.gebied ?? '',
        Gesprek: vindGesprek(cyclus, item.gesprek).naam,
        Maand: item.maand,
        Status: statusLabel(item.status),
        Eigenaar: item.eigenaar ?? '',
        Deadline: item.deadline ?? '',
        Bewijs: bewijsTekst(item),
        Verplicht: a?.verplicht ? 'Ja' : 'Nee',
        Afwijking: item.afwijking?.reden ?? '',
        Notitie: item.notitie ?? '',
      });
      return rij;
    })
    .sort(
      (x, y) =>
        String(x.Standaard).localeCompare(String(y.Standaard), 'nl') ||
        String(x.School ?? '').localeCompare(String(y.School ?? ''), 'nl') ||
        String(x.Activiteit).localeCompare(String(y.Activiteit), 'nl'),
    );
}

export function complianceRijen(items: KalenderItem[], standaarden: Standaard[]): Rij[] {
  return dekkingPerStandaard(items, standaarden).map((d) => ({
    Standaard: d.standaard.code,
    Naam: d.standaard.naam,
    Kwaliteitsgebied: d.standaard.gebied,
    'Vaste standaard': d.standaard.kern ? 'Ja' : 'Nee',
    Activiteiten: d.aantal,
    Gereed: d.gereed,
    Afgedekt: d.afgedekt ? 'Ja' : 'Nee',
  }));
}

export function afwijkingRijen(items: KalenderItem[], cyclus: Gesprek[], schoolVanItem?: Map<string, string>): Rij[] {
  const rijen = afwijkingen(items).map((item) => {
    const rij: Rij = {};
    if (schoolVanItem) rij.School = schoolVanItem.get(item.uid) ?? '';
    Object.assign(rij, {
      Activiteit: effectieveNaam(item),
      Standaard: activiteitVan(item)?.standaard ?? '',
      'Gekoppeld gesprek': vindGesprek(cyclus, item.gesprek).naam,
      Reden: item.afwijking?.reden ?? '',
    });
    return rij;
  });
  return rijen.length ? rijen : [{ Activiteit: 'Geen afwijkingen' }];
}

/** Alle tabbladen van de werkmap, in volgorde. */
export function excelTabbladen(invoer: ExcelInvoer): Tabblad[] {
  const { items, standaarden, cyclus, opties, schoolVanItem } = invoer;
  const metSchool = !!schoolVanItem;
  const bladen: Tabblad[] = [
    {
      naam: 'Kalender',
      kolommen: metSchool ? ['School', ...KALENDER_KOLOMMEN] : KALENDER_KOLOMMEN,
      rijen: kalenderRijen(items, cyclus, schoolVanItem),
      breedtes: metSchool ? [22, ...KALENDER_BREEDTES] : KALENDER_BREEDTES,
    },
  ];
  if (opties.compliance) {
    bladen.push({
      naam: 'Compliance',
      kolommen: COMPLIANCE_KOLOMMEN,
      rijen: complianceRijen(items, standaarden),
      breedtes: [10, 44, 16, 15, 12, 8, 10],
    });
  }
  if (opties.afwijkingen) {
    bladen.push({
      naam: 'Afwijkingen',
      kolommen: metSchool ? ['School', ...AFWIJKING_KOLOMMEN] : AFWIJKING_KOLOMMEN,
      rijen: afwijkingRijen(items, cyclus, schoolVanItem),
      breedtes: metSchool ? [22, 40, 10, 18, 50] : [40, 10, 18, 50],
    });
  }
  return bladen;
}

/** kwaliteitskalender-{slug(scope)}-{schooljaar met / → -}.xlsx */
export function excelBestandsnaam(scopeLabel: string, schooljaar: string): string {
  const jaar = schooljaar.replace(/\//g, '-').replace(/[^\w-]+/g, '');
  return `kwaliteitskalender-${slug(scopeLabel) || 'kalender'}${jaar ? `-${jaar}` : ''}.xlsx`;
}

/** kwaliteitskalender-backup-JJJJ-MM-DD.json */
export function backupBestandsnaam(vandaag: string): string {
  return `kwaliteitskalender-backup-${vandaag}.json`;
}
