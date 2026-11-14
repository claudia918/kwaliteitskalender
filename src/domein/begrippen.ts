/**
 * Begrippen: vaktermen met een korte uitleg in gewone taal. Eén bron voor de `Begrip`-component,
 * het zoekvenster en de pagina Begrippen. Houd de uitleg kort (een of twee zinnen), in je-vorm,
 * zonder em dash en zonder emoji.
 */

export type BegripSleutel =
  | 'standaard'
  | 'vaste-standaard'
  | 'kwaliteitsgebied'
  | 'seizoensgesprek'
  | 'gesprekscyclus'
  | 'afwijking'
  | 'standaardkoppeling'
  | 'cluster'
  | 'niveau'
  | 'bestuurskalender'
  | 'schoolkalender'
  | 'bibliotheek'
  | 'verplicht'
  | 'status'
  | 'bewijs'
  | 'gespreksdossier'
  | 'kalenderbestand'
  | 'back-up'
  | 'startsjabloon'
  | 'dekking'
  | 'heatmap'
  | 'eigen-activiteit';

export interface Begrip {
  sleutel: BegripSleutel;
  /** Zoals het in de tekst staat (enkelvoud, kleine letter tenzij eigennaam). */
  term: string;
  /** Korte uitleg in gewone taal. */
  uitleg: string;
  /** Andere woorden waarop het zoekvenster dit begrip ook vindt. */
  ookGenoemd?: string[];
  /** Waar je er meer mee doet in de app. */
  pad?: string;
}

export const BEGRIPPEN: Record<BegripSleutel, Begrip> = {
  standaard: {
    sleutel: 'standaard',
    term: 'standaard',
    uitleg:
      'Een onderdeel van het onderzoekskader van de inspectie, zoals OP2 (zicht op ontwikkeling). Elke activiteit hoort bij één standaard.',
    ookGenoemd: ['inspectiekader', 'onderzoekskader', 'inspectie'],
    pad: '/compliance',
  },
  'vaste-standaard': {
    sleutel: 'vaste-standaard',
    term: 'vaste standaard',
    uitleg:
      'Een standaard die de inspectie bij elk onderzoek beoordeelt (OP0, OP2, OP3, VS1 en OR1). Zorg dat elke school er minstens één activiteit voor heeft.',
    ookGenoemd: ['kernstandaard', 'kern'],
    pad: '/compliance',
  },
  kwaliteitsgebied: {
    sleutel: 'kwaliteitsgebied',
    term: 'kwaliteitsgebied',
    uitleg:
      'Een van de vijf hoofdgroepen van het inspectiekader: Onderwijsproces (OP), Veiligheid en schoolklimaat (VS), Onderwijsresultaten (OR), Sturen, kwaliteitszorg en ambitie (SKA, school) en Besturing, kwaliteitszorg en ambitie (BKA, bestuur).',
    ookGenoemd: ['gebied', 'OP', 'VS', 'OR', 'SKA', 'BKA'],
  },
  seizoensgesprek: {
    sleutel: 'seizoensgesprek',
    term: 'seizoensgesprek',
    uitleg:
      'Een vast gesprek tussen bestuur en school, standaard vier per jaar (herfst, winter, lente, zomer). Elk gesprek heeft een deadline: de eerste van de maand van het gesprek.',
    ookGenoemd: ['gesprek', 'herfst', 'winter', 'lente', 'zomer'],
    pad: '/gesprekken',
  },
  gesprekscyclus: {
    sleutel: 'gesprekscyclus',
    term: 'gesprekscyclus',
    uitleg: 'De reeks seizoensgesprekken van één schooljaar. Het bestuur stelt aantal, namen en maanden in bij Organisatie.',
    ookGenoemd: ['cyclus'],
    pad: '/organisatie',
  },
  afwijking: {
    sleutel: 'afwijking',
    term: 'afwijking',
    uitleg:
      'Een school heeft een activiteit bij een ander gesprek gezet dan het sjabloon voorstelt, met een reden. Dat mag; het bestuur ziet het terug bij Dekking.',
    ookGenoemd: ['afwijken', 'zachte koppeling'],
    pad: '/compliance',
  },
  standaardkoppeling: {
    sleutel: 'standaardkoppeling',
    term: 'standaardkoppeling',
    uitleg: 'Het gesprek waarbij een activiteit volgens het sjabloon hoort. Een school mag er met reden van afwijken.',
    ookGenoemd: ['koppeling', 'zachte koppeling'],
  },
  cluster: {
    sleutel: 'cluster',
    term: 'cluster',
    uitleg:
      'Een groep scholen binnen het bestuur, bijvoorbeeld per regio. Een cluster heeft geen eigen kalender: je ziet de scholen samen, alleen om te lezen.',
    ookGenoemd: ['regio', 'sector'],
    pad: '/organisatie',
  },
  niveau: {
    sleutel: 'niveau',
    term: 'niveau',
    uitleg:
      'Wat je bekijkt: het hele bestuur, een cluster of één school. De kleur bovenin laat zien waar je bent: wijnrood voor bestuur, pruim voor cluster, blauw voor school.',
    ookGenoemd: ['weergave', 'bestuur', 'school'],
  },
  bestuurskalender: {
    sleutel: 'bestuurskalender',
    term: 'bestuurskalender',
    uitleg: 'De activiteiten van het bestuur zelf, zoals het bestuursverslag of de begroting. Los van de kalenders van de scholen.',
  },
  schoolkalender: {
    sleutel: 'schoolkalender',
    term: 'schoolkalender',
    uitleg: 'De activiteiten van één school over het hele schooljaar, per maand en per standaard.',
  },
  bibliotheek: {
    sleutel: 'bibliotheek',
    term: 'bibliotheek',
    uitleg: 'De verzameling voorbeeldactiviteiten (67 voor scholen, 30 voor het bestuur) die je met één klik op je kalender zet.',
    ookGenoemd: ['activiteitenbank', 'sjabloon'],
    pad: '/bibliotheek',
  },
  verplicht: {
    sleutel: 'verplicht',
    term: 'verplicht',
    uitleg: 'Een activiteit die elke school in het startsjabloon krijgt, omdat ze nodig is voor een vaste standaard of de wet.',
  },
  status: {
    sleutel: 'status',
    term: 'status',
    uitleg: 'Hoe ver een activiteit is: gepland, bezig, gereed of risico. Risico betekent: dit dreigt niet op tijd klaar te zijn.',
    ookGenoemd: ['gepland', 'bezig', 'gereed', 'risico'],
  },
  bewijs: {
    sleutel: 'bewijs',
    term: 'bewijs',
    uitleg:
      'Een verwijzing naar het document dat laat zien dat een activiteit is uitgevoerd, bijvoorbeeld een verslag op SharePoint. Het document zelf staat niet in de kalender.',
    ookGenoemd: ['bewijsstuk', 'document'],
  },
  gespreksdossier: {
    sleutel: 'gespreksdossier',
    term: 'gespreksdossier',
    uitleg:
      'Een printklaar overzicht (A4) van alle activiteiten van één school voor één gesprek, met status, bewijs en afwijkingen. Ter voorbereiding van het gesprek.',
    ookGenoemd: ['dossier', 'printen', 'pdf'],
    pad: '/export',
  },
  kalenderbestand: {
    sleutel: 'kalenderbestand',
    term: 'kalenderbestand',
    uitleg:
      'Eén bestand in een gedeelde map (SharePoint, OneDrive of netwerkschijf) waarin je met collega’s samenwerkt. Wijzigingen worden automatisch samengevoegd.',
    ookGenoemd: ['gedeeld bestand', 'samenwerken', 'sharepoint', 'onedrive', 'synchroniseren'],
    pad: '/gegevens',
  },
  'back-up': {
    sleutel: 'back-up',
    term: 'back-up',
    uitleg: 'Een momentopname van al je gegevens in één bestand. Terugzetten vervangt alles wat nu in de kalender staat.',
    ookGenoemd: ['backup', 'json', 'importeren'],
    pad: '/export',
  },
  startsjabloon: {
    sleutel: 'startsjabloon',
    term: 'startsjabloon',
    uitleg:
      'De aanbevolen activiteiten om mee te beginnen: de 19 verplichte activiteiten voor elke school en de activiteiten van het bestuur. Wat al op de kalender staat, blijft staan.',
    ookGenoemd: ['sjabloon', 'aanbevolen'],
  },
  dekking: {
    sleutel: 'dekking',
    term: 'dekking',
    uitleg: 'Of er voor een standaard minstens één activiteit op de kalender staat. Een standaard zonder activiteit is niet afgedekt.',
    ookGenoemd: ['compliance', 'afgedekt'],
    pad: '/compliance',
  },
  heatmap: {
    sleutel: 'heatmap',
    term: 'heatmap',
    uitleg: 'Een tabel met per school en per gesprek hoeveel procent gereed is. Groen is alles gereed, oranje betekent dat er iets risico loopt.',
  },
  'eigen-activiteit': {
    sleutel: 'eigen-activiteit',
    term: 'eigen activiteit',
    uitleg: 'Een activiteit die je zelf maakt omdat ze niet in de bibliotheek staat. Je koppelt haar zelf aan een standaard en gesprek.',
  },
};

export const BEGRIPPEN_LIJST: Begrip[] = Object.values(BEGRIPPEN).sort((a, b) => a.term.localeCompare(b.term, 'nl'));

export function begrip(sleutel: BegripSleutel): Begrip {
  return BEGRIPPEN[sleutel];
}
