/**
 * De rondleidingen: de eerste (acht stappen die het werk volgen) en een korte per scherm.
 *
 * Een stap licht het echte onderdeel uit (`doel`: selectors, de eerste die zichtbaar is wint; `ook`:
 * extra uitgelichte onderdelen zoals een open keuzelijst). Met `klaar` gaat de stap verder zodra de
 * gebruiker de handeling echt gedaan heeft; zonder `klaar` is het een kijkstap met "Volgende".
 * Teksten: één zin wat het is (`wat`), één opdracht (`doe`), een korte bevestiging (`gelukt`).
 */
import { ietsVerschoven, OEFENSCHOOL_ID, type OefenMeting } from '../../domein/oefenen';
import type { Store } from '../../store';
import type { Teller, TourId } from './opslag';

export interface StapContext {
  store: Store;
  pad: string;
  /** Meting van de oefenkalender bij het begin van de stap. */
  begin: OefenMeting;
  nu: OefenMeting;
  /** Signalen sinds het begin van de stap. */
  signalen: Record<string, number>;
  breed: boolean;
}

export interface Stap {
  id: string;
  titel: string;
  wat: string;
  doe?: string | ((breed: boolean) => string);
  /** Tekst als het doel er (nog) niet is, bv. een melding die al weg is. */
  zonderDoel?: string;
  gelukt?: string;
  doel: string[] | ((breed: boolean) => string[]);
  ook?: string[];
  /** Hier begint de stap (de rondleiding navigeert er zo nodig heen). */
  pad?: string;
  klaar?: (c: StapContext) => boolean;
  /** Voorbereiding als de stap begint (op de oefenkalender). */
  bijBegin?: (store: Store) => void;
  /** Wat de stap telt voor de afsluiting. */
  telt?: keyof Teller;
  /** Meldingen van de vorige stap laten staan (anders worden ze bij het begin van de stap gewist). */
  houdMeldingen?: boolean;
}

export interface Tour {
  id: TourId;
  titel: string;
  /** "3 minuten" */
  duur: string;
  stappen: Stap[];
  /** Bij een schermrondleiding: het pad. */
  pad?: string;
}

const lade = (anker: string) => [`[role=dialog][aria-label="Menu"] [data-rondleiding="${anker}"]`, '[data-rondleiding="menu-knop"]'];

const naarOefenschool = (store: Store) => {
  if (store.niveau !== 'school') {
    store.setSchoolId(OEFENSCHOOL_ID);
    store.setNiveau('school');
  }
};

/** De matrixrij met de eerste activiteit (om te verschuiven); anders de eerste rij in de lijst. */
export const EERSTE_RIJ = '[data-rondleiding="eerste-rij"]';

export const EERSTE_RONDLEIDING: Tour = {
  id: 'eerste',
  titel: 'De rondleiding',
  duur: '3 minuten',
  stappen: [
    {
      id: 'weergave',
      titel: 'Wat bekijk ik',
      wat: 'Hier kies je wiens kalender je ziet: het hele bestuur, een cluster of één school.',
      doe: 'Kies een school, bijvoorbeeld Lyceum Noord.',
      gelukt: 'Menu, cijfers en kalender volgen nu die school.',
      doel: ['[data-rondleiding="weergave"]'],
      ook: ['[data-rondleiding="weergave-lijst"]'],
      pad: '/',
      bijBegin: (store) => store.setNiveau('bestuur'),
      klaar: (c) => c.store.niveau === 'school',
    },
    {
      id: 'nu',
      titel: 'Wat moet ik nu doen',
      wat: 'Start laat zien wat er deze maand speelt, met de volgende stap erboven.',
      doe: 'Zet een activiteit op Gereed.',
      gelukt: 'Gereed. Zo houd je bij hoe het ervoor staat.',
      doel: ['[data-rondleiding="deze-maand"]'],
      pad: '/',
      bijBegin: naarOefenschool,
      klaar: (c) => c.nu.gereed > c.begin.gereed,
      telt: 'gereed',
    },
    {
      id: 'plannen',
      titel: 'Plannen',
      wat: 'In de kalender is elke rij een standaard en elke kolom een maand.',
      doe: (breed) =>
        breed
          ? 'Schuif een activiteit naar een andere maand: sleep haar, of klik haar aan en kies Later in de balk onderaan.'
          : 'Open een activiteit en kies een andere maand.',
      gelukt: 'Verschoven. De kalender onthoudt de nieuwe maand.',
      doel: [EERSTE_RIJ, '[data-rondleiding="matrix"]'],
      ook: ['[data-rondleiding="actiebalk"]'],
      pad: '/kalender',
      bijBegin: naarOefenschool,
      klaar: (c) => ietsVerschoven(c.begin, c.nu),
      telt: 'verschoven',
    },
    {
      id: 'ongedaan',
      titel: 'Ongedaan maken',
      wat: 'Na elke wijziging verschijnt onderaan een melding waarmee je haar terugdraait.',
      doe: 'Klik op Ongedaan maken (of druk Ctrl+Z).',
      zonderDoel: 'De melding is al weg. Verschuif nog een activiteit, dan komt hij terug.',
      gelukt: 'Teruggezet. Proberen kost dus niets.',
      doel: ['[data-rondleiding="ongedaan"]'],
      houdMeldingen: true,
      klaar: (c) => (c.signalen.ongedaan ?? 0) > 0,
      telt: 'ongedaan',
    },
    {
      id: 'toevoegen',
      titel: 'Toevoegen',
      wat: 'Iets nieuws plannen doe je waar je bent, met deze knop of met de plus in een cel.',
      doe: 'Voeg een activiteit toe aan de kalender.',
      gelukt: 'Toegevoegd, in de maand die erbij hoort.',
      doel: ['[data-rondleiding="toevoegen"]'],
      pad: '/kalender',
      bijBegin: naarOefenschool,
      klaar: (c) => c.nu.aantal > c.begin.aantal,
      telt: 'toegevoegd',
    },
    {
      id: 'zoeken',
      titel: 'Zoeken',
      wat: 'Activiteiten, scholen, schermen en begrippen vind je op één plek.',
      doe: 'Open zoeken, typ lesuitval en kies een resultaat.',
      gelukt: 'Gevonden. Ctrl K werkt op elk scherm.',
      doel: ['[data-rondleiding="zoeken"]'],
      klaar: (c) => (c.signalen['zoek-gekozen'] ?? 0) > 0,
      telt: 'gezocht',
    },
    {
      id: 'voorbereiden',
      titel: 'Voorbereiden',
      wat: 'Per seizoensgesprek zie je wat er klaar moet zijn, en je print er een dossier bij.',
      doe: 'Open Seizoensgesprekken.',
      gelukt: 'Hier zie je per gesprek wat nog open staat.',
      doel: (breed) => (breed ? ['[data-rondleiding="menu-voorbereiden"]'] : lade('menu-voorbereiden')),
      klaar: (c) => c.pad === '/gesprekken',
    },
    {
      id: 'delen',
      titel: 'Delen en privacy',
      wat: 'Je kalender staat alleen in deze browser, tot je een gedeeld kalenderbestand koppelt. Er gaat niets via internet.',
      doe: 'Kijk hier waar je gegevens staan.',
      gelukt: 'Jij bepaalt waar je kalender staat.',
      doel: (breed) => (breed ? ['[data-rondleiding="delen"]'] : lade('delen')),
      klaar: (c) => c.pad === '/gegevens',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Per scherm                                                           */
/* ------------------------------------------------------------------ */

const kijk = (id: string, titel: string, wat: string, doel: string[], extra: Partial<Stap> = {}): Stap => ({
  id,
  titel,
  wat,
  doel,
  ...extra,
});

const SCHERMEN: Tour[] = [
  {
    id: 'scherm:/',
    pad: '/',
    titel: 'Start',
    duur: '1 minuut',
    stappen: [
      kijk('stap', 'Volgende stap', 'Bovenaan staat wat nu het belangrijkst is, met één knop om het te doen.', ['[data-rondleiding="volgende-stap"]']),
      kijk('maand', 'Deze maand', 'Wat er deze maand of voor het komende gesprek speelt. Bezig en Gereed zet je hier met één klik.', ['[data-rondleiding="deze-maand"]'], {
        doe: 'Zet een activiteit op Bezig of Gereed.',
        gelukt: 'Bijgewerkt, zonder venster.',
        klaar: statusGewijzigd,
      }),
      kijk('stand', 'Hoe staat het ervoor', 'De cijfers en aandachtspunten. Klik om ze te tonen of te verbergen.', ['[data-rondleiding="hoe-staat-het"]']),
    ],
  },
  {
    id: 'scherm:/kalender',
    pad: '/kalender',
    titel: 'Kalender',
    duur: '1 minuut',
    stappen: [
      kijk('voortgang', 'Toon', 'Hoeveel er gereed is, en een filter op wat nog moet, het komende gesprek of risico.', ['[data-rondleiding="filter"]', '[data-rondleiding="voortgang"]']),
      kijk('chip', 'Een activiteit', 'Klik een activiteit aan: onderaan verschijnt alles wat je ermee kunt.', [EERSTE_RIJ, '[data-rondleiding="matrix"]'], {
        doe: (breed) => (breed ? 'Klik een activiteit aan.' : 'Tik op de bol voor de status van een activiteit.'),
        ook: ['[data-rondleiding="actiebalk"]'],
        gelukt: 'Status, maand en details zitten in de balk.',
        klaar: (c) => (c.breed ? !!document.querySelector('[data-rondleiding="actiebalk"]') : statusGewijzigd(c)),
      }),
      kijk('toevoegen', 'Toevoegen', 'Nieuwe activiteiten zet je hier of met de plus in een cel op de kalender.', ['[data-rondleiding="toevoegen"]']),
      kijk('weergave', 'Matrix of lijst', 'De matrix toont het hele jaar per standaard; de lijst per maand.', ['[data-rondleiding="kalender-weergave"]']),
    ],
  },
  {
    id: 'scherm:/bibliotheek',
    pad: '/bibliotheek',
    titel: 'Bibliotheek',
    duur: '1 minuut',
    stappen: [
      kijk('stand', 'Stand van de kalender', 'Wat er al op je kalender staat en welke verplichte activiteiten nog ontbreken.', ['[data-rondleiding="bibliotheek-stand"]']),
      kijk('zoek', 'Zoeken en filteren', 'Zoek op naam of standaard, en filter op gesprek en kwaliteitsgebied.', ['[data-rondleiding="bibliotheek-zoek"]'], {
        doe: 'Typ een woord, bijvoorbeeld toets.',
        gelukt: 'De lijst filtert terwijl je typt.',
        klaar: () => !!(document.querySelector('[data-rondleiding="bibliotheek-zoek"] input') as HTMLInputElement | null)?.value.trim(),
      }),
      kijk('eigen', 'Eigen activiteit', 'Staat iets er niet bij? Maak een eigen activiteit, gekoppeld aan een standaard.', ['[data-rondleiding="eigen-activiteit"]']),
    ],
  },
  {
    id: 'scherm:/gesprekken',
    pad: '/gesprekken',
    titel: 'Seizoensgesprekken',
    duur: '1 minuut',
    stappen: [
      kijk('keuze', 'Kies een gesprek', 'De vier gesprekken van het jaar. Het komende is gemarkeerd.', ['[data-rondleiding="gesprek-keuze"]'], {
        doe: 'Kies een ander gesprek.',
        gelukt: 'Alles hieronder volgt het gesprek.',
        klaar: () => gesprekGewisseld(),
      }),
      kijk('info', 'Wat er nodig is', 'Welke input het gesprek vraagt en welke standaarden erbij horen.', ['[data-rondleiding="gesprek-info"]']),
      kijk('voorbereiding', 'Jouw voorbereiding', 'De activiteiten voor dit gesprek met hun status. Klik er een aan om haar bij te werken.', ['[data-rondleiding="gesprek-voorbereiding"]', '[data-rondleiding="gesprek-scholen"]']),
    ],
  },
  {
    id: 'scherm:/export',
    pad: '/export',
    titel: 'Dossier en export',
    duur: '1 minuut',
    stappen: [
      kijk('dossier', 'Gespreksdossier', 'Een A4 per school en gesprek: alles wat je in het gesprek wilt laten zien.', ['[data-rondleiding="export-dossier"]']),
      kijk('kalender', 'Excel en PDF', 'De kalender als werkmap of als print, van wat je bovenin bekijkt.', ['[data-rondleiding="export-kalender"]']),
      kijk('backup', 'Back-up', 'Een kopie van alles in één bestand. Handig zonder gedeeld kalenderbestand.', ['[data-rondleiding="export-backup"]']),
    ],
  },
  {
    id: 'scherm:/compliance',
    pad: '/compliance',
    titel: 'Dekking standaarden',
    duur: '1 minuut',
    stappen: [
      kijk('vast', 'Vaste standaarden', 'Deze beoordeelt de inspectie altijd. Hier zie je of ze een activiteit hebben.', ['[data-rondleiding="dekking-vast"]']),
      kijk('alle', 'Alle standaarden', 'Per kwaliteitsgebied: hoeveel activiteiten er per standaard op de kalender staan.', ['[data-rondleiding="dekking-alle"]']),
      kijk('afwijkingen', 'Afwijkingen', 'Activiteiten die bij een ander gesprek staan dan het sjabloon voorstelt, met de reden.', ['[data-rondleiding="dekking-afwijkingen"]']),
    ],
  },
  {
    id: 'scherm:/organisatie',
    pad: '/organisatie',
    titel: 'Organisatie',
    duur: '1 minuut',
    stappen: [
      kijk('bestuur', 'Bestuur en schooljaar', 'De naam en het schooljaar gelden voor de hele kalender.', ['[data-rondleiding="org-bestuur"]']),
      kijk('scholen', 'Scholen', 'Elke school heeft een eigen kalender. Voeg ze hier toe of hernoem ze.', ['[data-rondleiding="org-scholen"]']),
      kijk('cyclus', 'Gesprekscyclus', 'Wanneer de seizoensgesprekken zijn. De deadlines op Start volgen hieruit.', ['[data-rondleiding="org-cyclus"]']),
    ],
  },
  {
    id: 'scherm:/gegevens',
    pad: '/gegevens',
    titel: 'Gegevens & delen',
    duur: '1 minuut',
    stappen: [
      kijk('waar', 'Waar staan je gegevens', 'In deze browser, en als je dat wilt in één gedeeld kalenderbestand. Nergens anders.', ['[data-rondleiding="gegevens-waar"]']),
      kijk('samen', 'Samenwerken', 'Koppel één kalenderbestand in een gedeelde map; collega’s koppelen hetzelfde bestand.', ['[data-rondleiding="gegevens-samenwerken"]']),
      kijk('privacy', 'Privacy', 'Zet geen leerling- of persoonsgegevens in de kalender. Gebruik rollen en verwijs naar documenten.', ['[data-rondleiding="gegevens-privacy"]']),
    ],
  },
];

/** Elke stap van een schermrondleiding hoort op dat scherm (de rondleiding brengt je erheen). */
export const SCHERM_RONDLEIDINGEN: Tour[] = SCHERMEN.map((t) => ({ ...t, stappen: t.stappen.map((s) => ({ pad: t.pad, ...s })) }));

/** Is er sinds het begin van de stap een status gewijzigd (zonder verschuiven of toevoegen)? */
function statusGewijzigd(c: StapContext): boolean {
  return c.nu.statussen !== c.begin.statussen;
}

/** Het gekozen gesprekstabblad (om te zien of de gebruiker een ander koos). */
let eersteGesprek: string | null = null;
function gesprekGewisseld(): boolean {
  const gekozen = document.querySelector('[data-rondleiding="gesprek-keuze"] [aria-selected="true"]')?.textContent ?? null;
  if (eersteGesprek === null) eersteGesprek = gekozen;
  return gekozen !== null && gekozen !== eersteGesprek;
}
export function resetGesprekKeuze(): void {
  eersteGesprek = null;
}

export const ALLE_RONDLEIDINGEN: Tour[] = [EERSTE_RONDLEIDING, ...SCHERM_RONDLEIDINGEN];

export function vindTour(id: TourId): Tour | undefined {
  return ALLE_RONDLEIDINGEN.find((t) => t.id === id);
}

/** De schermrondleiding bij een pad, of undefined. */
export function tourVoorPad(pad: string): Tour | undefined {
  return SCHERM_RONDLEIDINGEN.find((t) => t.pad === pad);
}

export function doelSelectors(stap: Stap, breed: boolean): string[] {
  return typeof stap.doel === 'function' ? stap.doel(breed) : stap.doel;
}

export function doeTekst(stap: Stap, breed: boolean): string | undefined {
  return typeof stap.doe === 'function' ? stap.doe(breed) : stap.doe;
}
