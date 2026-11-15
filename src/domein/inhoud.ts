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
      'Bovenaan staat de volgende stap: wat nu het belangrijkst is, met één knop om het te doen. Daaronder zie je wat er deze maand of voor het komende gesprek op de kalender staat; zet een activiteit met één klik op bezig of gereed. Onder "Hoe staat het ervoor" vind je de cijfers, de aandachtspunten en (voor bestuur en cluster) de stand per school. Wat je bekijkt, kies je bovenin.',
  },
  '/gesprekken': {
    titel: 'Seizoensgesprekken',
    tekst:
      'Per seizoensgesprek zie je wat er klaar moet zijn: de vereiste input, de standaarden en de activiteiten met hun status. Bekijk je het bestuur of een cluster, dan zie je ook de stand per school.',
  },
  '/bibliotheek': {
    titel: 'Bibliotheek',
    tekst:
      'Alle activiteiten die je op de kalender kunt zetten, per standaard. Bovenaan zie je wat er al op staat en welke verplichte activiteiten nog ontbreken. Zoek en filter op gesprek en kwaliteitsgebied, en zet een activiteit met Toevoegen op de kalender. Staat iets er niet bij, maak dan een eigen activiteit.',
  },
  '/kalender': {
    titel: 'Kalender',
    tekst:
      'Elke rij is een standaard, elke kolom een maand. Sleep een activiteit naar een andere maand, of klik haar aan en kies een maand of status in de balk onderaan. Met de plus in een cel voeg je daar iets toe. Klik twee keer (of op Details) voor alles over de activiteit. Alles wat je doet, kun je meteen ongedaan maken.',
  },
  '/compliance': {
    titel: 'Dekking standaarden',
    tekst:
      'Zie per standaard of er een activiteit op de kalender staat, en of de vijf vaste standaarden zijn afgedekt. Onderaan staan de activiteiten die een school bij een ander gesprek heeft gezet dan het sjabloon voorstelt.',
  },
  '/export': {
    titel: 'Dossier en export',
    tekst:
      'Maak een gespreksdossier om een gesprek voor te bereiden, exporteer de kalender naar Excel of print naar PDF (A3 liggend). De export volgt wat je bovenin bekijkt. Hier maak je ook een back-up.',
  },
  '/organisatie': {
    titel: 'Organisatie',
    tekst:
      'Leg je bestuur, scholen en clusters vast, kies het schooljaar en stel de gesprekscyclus in. Deze instellingen gelden voor de hele organisatie. Met de aanbevolen activiteiten vul je alle kalenders in één keer.',
  },
  '/gegevens': {
    titel: 'Gegevens & delen',
    tekst:
      'Hier zie je waar je gegevens staan en koppel je een gedeeld kalenderbestand, zodat collega’s in je organisatie in dezelfde kalender werken. Er gaat niets via internet.',
  },
  '/begrippen': {
    titel: 'Begrippen',
    tekst:
      'De vaktermen uit de kalender in gewone taal. In de app herken je een begrip aan de stippellijn: wijs het aan of tik erop voor de uitleg.',
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
  { icon: 'Users', titel: 'Drie niveaus', tekst: 'Bestuur, cluster en school. Wat scholen doen, telt vanzelf mee bij cluster en bestuur.' },
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
    titel: 'Aan de slag',
    vragen: [
      {
        v: 'Hoe start ik de rondleiding opnieuw?',
        a: 'Klik bovenin op het vraagteken en kies De rondleiding opnieuw, of Laat zien hoe dit scherm werkt voor een korte rondleiding door het scherm waar je bent. Je vindt alle rondleidingen ook in het menu onder Hulp, bij Rondleiding, en via zoeken (typ rondleiding). Heb je er een onderbroken, dan ga je op dezelfde plekken verder waar je was.',
      },
      {
        v: 'Verandert de rondleiding mijn kalender?',
        a: 'Nee. Tijdens een rondleiding werk je op een oefenkalender met voorbeeldgegevens; de gele band bovenin laat zien dat je oefent. Er wordt dan niets opgeslagen in je eigen kalender en er wordt niet gesynchroniseerd met het gedeelde kalenderbestand. Stop je of ben je klaar, dan sta je weer waar je was, met je eigen gegevens precies zoals ze waren.',
      },
    ],
  },
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
        v: 'Heb ik internet nodig?',
        a: 'Nee. De Kwaliteitskalender is één bestand dat je opent in je browser en werkt helemaal zonder internet. Als het gedeelde kalenderbestand in een SharePoint- of OneDrive-map staat, zorgt OneDrive (niet de kalender) dat collega’s de nieuwste versie krijgen.',
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
      {
        v: 'Kan ik de gesprekscyclus aanpassen?',
        a: 'Ja. Standaard staan er vier seizoensgesprekken, maar bij Organisatie, onderdeel Gesprekscyclus, bepaal je zelf het aantal gesprekken, hun namen, maanden en kleuren. De hele app volgt automatisch.',
      },
      vraag('Voor besturen', 'Een school heeft een activiteit aan een ander gesprek gekoppeld. Hoe zie ik dat?'),
    ],
  },
  {
    titel: 'Voor scholen',
    vragen: [
      {
        v: 'Hoe werk ik een activiteit bij?',
        a: 'Klik in de Kalender een activiteit aan (in de matrix: twee keer) en pas in het venster de status, eigenaar, deadline, notitie of bewijsstukken aan. Wat je bewaart, staat meteen in deze browser en, als je een bestand gekoppeld hebt, even later ook in het gedeelde kalenderbestand.',
      },
      {
        v: 'Hoe verplaats ik een activiteit naar een andere maand?',
        a: 'Sleep de activiteit in de Kalender naar een andere maand in dezelfde rij. Of klik haar aan en kies onderaan Eerder of Later, of klik een gemarkeerde maand. In de lijst en in het detailvenster kies je de maand in het veld Maand. Vergist? Klik op Ongedaan maken in de melding onderaan, of druk Ctrl+Z.',
      },
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
        a: 'Ga naar Dossier en export en kies bij Gespreksdossier de school en het gesprek. Je krijgt een printklaar A4-document met alle activiteiten, statussen, bewijzen en afwijkingen: de voorbereiding voor het gesprek tussen bestuur en school.',
      },
      {
        v: 'Mag ik leerling- of persoonsgegevens in de kalender zetten?',
        a: 'Nee, en het is ook nergens nodig. De Kwaliteitskalender gaat over activiteiten, planningen en statussen, niet over individuele leerlingen of medewerkers. Zet geen leerlinggegevens in notities of omschrijvingen; verwijs met een bewijslink naar het document in je eigen beveiligde omgeving. Gebruik bij Eigenaar bij voorkeur een rol.',
      },
      {
        v: 'Kan ik een back-up maken?',
        a: 'Ja, via Dossier en export en dan Back-up (JSON) download je alle gegevens in één leesbaar bestand. Datzelfde bestand kun je ook weer importeren. Back-ups uit de vorige (online) versie van de Kwaliteitskalender kun je ook importeren.',
      },
      {
        v: 'Wat is het verschil tussen een back-up en het gedeelde kalenderbestand?',
        a: 'Een back-up is een momentopname voor jezelf: hij verandert niet meer, en importeren vervangt alles wat in de kalender staat. Het gedeelde kalenderbestand is het bestand waarin je met collega’s samenwerkt: het wordt steeds bijgewerkt en wijzigingen worden samengevoegd. Een back-up maak je bij Dossier en export, het gedeelde bestand beheer je bij Gegevens & delen.',
      },
      {
        v: 'Wat staat er in het gedeelde kalenderbestand en wie kan het lezen?',
        a: 'De naam van je bestuur, scholen en clusters, de activiteiten met planning en status, en wat jullie zelf invullen bij eigenaar, notitie, bewijs en afwijking. Er staan geen accounts, e-mailadressen of apparaatnamen in. Iedereen die de map met het bestand kan openen, kan de kalender lezen en wijzigen; dat regel je met de rechten op die map.',
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

/**
 * Startpagina-tegels van de oude bestuursstart, zonder verwijzing naar "toegang & leden".
 * Niet meer in gebruik op Start (het menu en het zoekvenster nemen die rol over); bewaard voor de
 * inventaris.
 */
export const BESTUUR_START_TEGELS = SEED.bestuur_start_tegels.map((t) =>
  t.to === '/organisatie' ? { ...t, tekst: 'Scholen, clusters, gesprekscyclus en schooljaar.' } : { ...t },
);
