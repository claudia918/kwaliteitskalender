/**
 * Teksten voor de lokale versie. De letterlijke teksten van de oude app staan in seed-data.json;
 * waar die over de cloudversie gingen (inloggen, leden, database, AI, contactformulier) of een
 * em dash bevatten, staat hier de aangepaste versie. Schermen gebruiken DEZE teksten.
 */
import { SEED } from './seed';

/* ------------------------------------------------------------------ */
/* Contact en organisatie                                               */
/* ------------------------------------------------------------------ */

export const CONTACT = {
  organisatie: 'Project Leren Verbeteren',
  email: 'contact@projectlerenverbeteren.nl',
  mailto: 'mailto:contact@projectlerenverbeteren.nl',
  telefoon: '088 20 51 636',
  tel: 'tel:+31882051636',
  website: 'projectlerenverbeteren.nl',
  websiteUrl: 'https://www.projectlerenverbeteren.nl',
} as const;

export const FOOTER_TEKST = 'De Kwaliteitskalender VO is een initiatief van Project Leren Verbeteren.';

/** Vaste privacyregel; staat bij elk vrij tekstveld. */
export const PRIVACY_REGEL = 'Vermeld geen leerling- of andere persoonsgegevens.';
export const BEWIJS_HINT =
  'Verwijs naar documenten in je eigen beveiligde omgeving; vermeld geen leerling- of andere persoonsgegevens.';

/* ------------------------------------------------------------------ */
/* Helpteksten per route ("?" in de topbar)                             */
/* ------------------------------------------------------------------ */

export const HELPTEKSTEN: Record<string, { titel: string; tekst: string }> = {
  '/': {
    titel: 'Start',
    tekst:
      'Voor het bestuur: de startpagina met de Aan-de-slag-stappen en snelkoppelingen. Voor school en cluster: het dashboard. Wissel bovenin van niveau.',
  },
  '/dashboard': {
    titel: 'Dashboard',
    tekst:
      'Het dashboard toont het komende seizoensgesprek, de voortgang en de aandachtspunten voor het gekozen niveau. Op bestuursniveau zie je ook de heatmap van alle scholen.',
  },
  '/gesprekken': { ...SEED.helpteksten_per_scherm['/gesprekken'] },
  '/bibliotheek': { ...SEED.helpteksten_per_scherm['/bibliotheek'] },
  '/kalender': { ...SEED.helpteksten_per_scherm['/kalender'] },
  '/compliance': { ...SEED.helpteksten_per_scherm['/compliance'] },
  '/export': {
    titel: 'Export',
    tekst:
      'Maak een gespreksdossier, exporteer de huidige kalender naar Excel of print naar PDF (A3 liggend). De export volgt het gekozen niveau. Hier maak je ook een back-up.',
  },
  '/organisatie': { ...SEED.helpteksten_per_scherm['/organisatie'] },
  '/gegevens': {
    titel: 'Gegevens & delen',
    tekst:
      'Hier zie je waar je gegevens staan en koppel je een gedeeld kalenderbestand, zodat collega’s in je organisatie in dezelfde kalender werken. Er gaat niets via internet.',
  },
  '/faq': {
    titel: 'Veelgestelde vragen',
    tekst:
      'Antwoorden op de meest gestelde vragen over de kalender, samenwerken, exports en privacy. Staat je vraag er niet bij? Neem dan contact op.',
  },
  '/contact': {
    titel: 'Contact',
    tekst: 'De contactgegevens van Project Leren Verbeteren. Mail of bel ons met je vraag of suggestie.',
  },
};

/** Helptekst bij een pad; onbekende paden vallen terug op Start. */
export function helpVoorPad(pad: string): { titel: string; tekst: string } {
  return HELPTEKSTEN[pad] ?? HELPTEKSTEN['/'];
}

/* ------------------------------------------------------------------ */
/* Welkom                                                               */
/* ------------------------------------------------------------------ */

export const WELKOM_BOUWSTENEN: { icon: string; titel: string; tekst: string }[] = [
  { icon: 'Users', titel: 'Drie niveaus', tekst: 'Bestuur, cluster en school, met doorlopende aggregatie naar boven.' },
  { icon: 'Calendar', titel: 'Seizoensgesprekken', tekst: 'Herfst, Winter, Lente en Zomer geven het ritme door het schooljaar.' },
  {
    icon: 'GitBranch',
    titel: 'Zachte koppeling',
    tekst: 'Een standaardkoppeling in het sjabloon; scholen mogen afwijken, met reden.',
  },
  {
    icon: 'ShieldCheck',
    titel: 'Inspectiekader',
    tekst: 'Elke activiteit gekoppeld aan een standaard van het Onderzoekskader (versie 1 augustus 2026).',
  },
];

export const WELKOM_VOETNOOT =
  'Je gegevens blijven in deze browser en, als je dat wilt, in een kalenderbestand op je eigen schijf. Er gaat niets via internet.';

/* ------------------------------------------------------------------ */
/* FAQ (lokale versie)                                                  */
/* ------------------------------------------------------------------ */

export interface FaqCategorie {
  titel: string;
  vragen: { v: string; a: string }[];
}

const origineel = (titel: string) => SEED.faq.find((c) => c.titel === titel)?.vragen ?? [];
const vraag = (titel: string, v: string) => origineel(titel).find((q) => q.v === v)!;

export const FAQ: FaqCategorie[] = [
  {
    titel: 'Gegevens en samenwerken',
    vragen: [
      {
        v: 'Waar staan mijn gegevens?',
        a: 'Op je eigen computer: in deze browser, en als je een kalenderbestand koppelt ook in dat bestand (bijvoorbeeld in een SharePoint- of OneDrive-map van je organisatie). De Kwaliteitskalender stuurt niets over internet en er is geen server of account. Project Leren Verbeteren kan je gegevens niet inzien.',
      },
      {
        v: 'Hoe werk ik samen met collega’s?',
        a: 'Zet één kalenderbestand (.kwaliteitskalender.json) in een gedeelde map van je organisatie, bijvoorbeeld op SharePoint, OneDrive of een netwerkschijf. Iedereen opent de Kwaliteitskalender en koppelt via Gegevens & delen hetzelfde bestand. Wijzigingen worden automatisch samengevoegd: per activiteit wint de nieuwste wijziging en een verwijderde activiteit komt niet terug.',
      },
      {
        v: 'Werkt automatisch samenwerken in elke browser?',
        a: 'Automatisch koppelen werkt in Microsoft Edge en Google Chrome. In andere browsers gebruik je Bestand openen, Opslaan als bestand en Samenvoegen met bestand op de pagina Gegevens & delen.',
      },
      {
        v: 'Wat gebeurt er als twee collega’s tegelijk hetzelfde wijzigen?',
        a: 'Dan blijft de nieuwste wijziging bewaard. Je krijgt een melding welke activiteiten het betrof, zodat je het even kunt nakijken.',
      },
      {
        v: 'Kan ik op meerdere computers werken?',
        a: 'Ja, als je op elke computer hetzelfde gedeelde kalenderbestand koppelt. Zonder gekoppeld bestand staan je gegevens alleen in de browser waarin je werkt.',
      },
    ],
  },
  {
    titel: 'Voor besturen',
    vragen: [
      {
        v: 'Hoe geef ik scholen of collega’s toegang?',
        a: 'Door het kalenderbestand in een map te zetten waar zij bij kunnen. Wie het bestand kan openen, kan de kalender bekijken en bewerken. Toegang regel je dus met de rechten op die map in je eigen omgeving.',
      },
      vraag('Voor besturen', 'Wat zijn de "vaste standaarden"?'),
      vraag('Voor besturen', 'Kan ik de gesprekscyclus aanpassen?'),
      vraag('Voor besturen', 'Een school heeft een activiteit aan een ander gesprek gekoppeld. Hoe zie ik dat?'),
    ],
  },
  {
    titel: 'Voor scholen',
    vragen: [
      {
        v: 'Hoe werk ik een activiteit bij?',
        a: 'Klik in de Kalender een activiteit aan (in de matrix: twee keer) en pas in het venster de status, eigenaar, deadline, notitie of bewijsstukken aan. Wijzigingen worden automatisch bewaard; je ziet kort "Opgeslagen" bovenin.',
      },
      vraag('Voor scholen', 'Hoe verplaats ik een activiteit naar een andere maand?'),
      {
        v: 'Wat betekent "bewijs" bij een activiteit?',
        a: 'Een verwijzing naar het document dat aantoont dat de activiteit is uitgevoerd, bijvoorbeeld een verslag of analyse. Handig richting bestuur en inspectie. Je koppelt een documentnaam en eventueel een link naar je eigen omgeving (SharePoint, Drive); het document zelf wordt niet opgeslagen in de kalender.',
      },
      vraag('Voor scholen', 'Kan ik een activiteit onze eigen naam geven?'),
    ],
  },
  {
    titel: 'Exporteren en privacy',
    vragen: [
      {
        v: 'Hoe maak ik een gespreksdossier?',
        a: 'Ga naar Export en kies bij Gespreksdossier de school en het gesprek. Je krijgt een printklaar A4-document met alle activiteiten, statussen, bewijzen en afwijkingen: de voorbereiding voor het gesprek tussen bestuur en school.',
      },
      {
        v: 'Mag ik leerling- of persoonsgegevens in de kalender zetten?',
        a: 'Nee, en het is ook nergens nodig. De Kwaliteitskalender gaat over activiteiten, planningen en statussen, niet over individuele leerlingen of medewerkers. Zet geen leerlinggegevens in notities of omschrijvingen; verwijs met een bewijslink naar het document in je eigen beveiligde omgeving. Gebruik bij Eigenaar bij voorkeur een rol.',
      },
      {
        v: 'Kan ik een back-up maken?',
        a: 'Ja, via Export en dan Back-up (JSON) download je alle gegevens in één leesbaar bestand. Datzelfde bestand kun je ook weer importeren. Back-ups uit de vorige (online) versie van de Kwaliteitskalender kun je ook importeren.',
      },
      {
        v: 'Wat als ik mijn browsergegevens wis?',
        a: 'Dan verdwijnen de gegevens uit deze browser. Heb je een kalenderbestand gekoppeld of een back-up gemaakt, dan haal je alles terug door dat bestand weer te openen.',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Bouwstenen voor schermen                                             */
/* ------------------------------------------------------------------ */

/** Startpagina-tegels (bestuur), zonder verwijzing naar "toegang & leden". */
export const BESTUUR_START_TEGELS = SEED.bestuur_start_tegels.map((t) =>
  t.to === '/organisatie' ? { ...t, tekst: 'Scholen, clusters, gesprekscyclus en schooljaar.' } : { ...t },
);
