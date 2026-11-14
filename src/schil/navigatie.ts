/**
 * Menu in de volgorde van het werk: overzicht, plannen, voorbereiden, controleren; beheer en hulp
 * apart. Elk item heeft een korte beschrijving (zoekvenster) en zoekwoorden (ook oude namen).
 */
import {
  BookOpenText,
  Building2,
  Calendar,
  CircleCheckBig,
  CircleHelp,
  FileText,
  FolderSync,
  House,
  Library,
  Mail,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Eén regel: wat je er doet. */
  beschrijving: string;
  /** Extra woorden waarop het zoekvenster dit scherm vindt (ook oude namen). */
  zoekwoorden?: string;
  /** Ook actief op deze paden */
  ookActief?: string[];
}

export interface MenuGroep {
  id: 'overzicht' | 'plannen' | 'voorbereiden' | 'controleren' | 'beheer' | 'hulp';
  titel?: string;
  items: MenuItem[];
}

export const START: MenuItem = {
  to: '/',
  label: 'Start',
  icon: House,
  beschrijving: 'Wat je nu moet doen, wat er deze maand speelt en hoe het ervoor staat.',
  zoekwoorden: 'dashboard overzicht thuis voortgang heatmap aandachtspunten',
  ookActief: ['/dashboard'],
};

export const MENU: MenuGroep[] = [
  { id: 'overzicht', items: [START] },
  {
    id: 'plannen',
    titel: 'Plannen',
    items: [
      {
        to: '/kalender',
        label: 'Kalender',
        icon: Calendar,
        beschrijving: 'Je jaarplanning per maand en standaard; activiteiten verplaatsen en bijwerken.',
        zoekwoorden: 'jaarkalender matrix planning maand',
      },
      {
        to: '/bibliotheek',
        label: 'Bibliotheek',
        icon: Library,
        beschrijving: 'Kies activiteiten om op je kalender te zetten, of maak een eigen activiteit.',
        zoekwoorden: 'activiteiten toevoegen sjabloon eigen activiteit',
      },
    ],
  },
  {
    id: 'voorbereiden',
    titel: 'Voorbereiden',
    items: [
      {
        to: '/gesprekken',
        label: 'Seizoensgesprekken',
        icon: MessagesSquare,
        beschrijving: 'Per gesprek: welke activiteiten erbij horen en hoe ver elke school is.',
        zoekwoorden: 'gesprekken gesprekscyclus herfst winter lente zomer',
      },
      {
        to: '/export',
        label: 'Dossier en export',
        icon: FileText,
        beschrijving: 'Gespreksdossier printen, kalender naar Excel of PDF, back-up maken.',
        zoekwoorden: 'export exporteren excel pdf printen gespreksdossier back-up backup',
      },
    ],
  },
  {
    id: 'controleren',
    titel: 'Controleren',
    items: [
      {
        to: '/compliance',
        label: 'Dekking standaarden',
        icon: CircleCheckBig,
        beschrijving: 'Of elke standaard een activiteit heeft, en waar scholen afwijken.',
        zoekwoorden: 'compliance dekking vaste standaarden afwijkingen inspectie',
      },
    ],
  },
  {
    id: 'beheer',
    titel: 'Beheer',
    items: [
      {
        to: '/organisatie',
        label: 'Organisatie',
        icon: Building2,
        beschrijving: 'Bestuur, scholen, clusters, schooljaar en de gesprekscyclus instellen.',
        zoekwoorden: 'beheer scholen clusters schooljaar gesprekscyclus instellingen',
      },
      {
        to: '/gegevens',
        label: 'Gegevens & delen',
        icon: FolderSync,
        beschrijving: 'Samenwerken via een gedeeld kalenderbestand en zien waar je gegevens staan.',
        zoekwoorden: 'samenwerken kalenderbestand sharepoint onedrive synchroniseren privacy opslag',
      },
    ],
  },
  {
    id: 'hulp',
    titel: 'Hulp',
    items: [
      {
        to: '/begrippen',
        label: 'Begrippen',
        icon: BookOpenText,
        beschrijving: 'De vaktermen uit de kalender in gewone taal.',
        zoekwoorden: 'woordenlijst uitleg termen',
      },
      {
        to: '/faq',
        label: 'Veelgestelde vragen',
        icon: CircleHelp,
        beschrijving: 'Antwoorden over werken met de kalender, samenwerken en privacy.',
        zoekwoorden: 'faq vragen help',
      },
      {
        to: '/contact',
        label: 'Contact',
        icon: Mail,
        beschrijving: 'Mail of bel Project Leren Verbeteren met je vraag.',
        zoekwoorden: 'mail telefoon vraag suggestie',
      },
    ],
  },
];

/** Alle menu-items in volgorde. */
export const ALLE_MENU_ITEMS: MenuItem[] = MENU.flatMap((g) => g.items);

export function isActief(item: MenuItem, pad: string): boolean {
  return pad === item.to || (item.ookActief?.includes(pad) ?? false);
}

/** Het menu-item bij een pad (voor de helpknop en het zoekvenster). */
export function menuItemVoorPad(pad: string): MenuItem | undefined {
  return ALLE_MENU_ITEMS.find((i) => isActief(i, pad));
}

/** Alle routes van de app (voor tests en de helpknop). `/dashboard` verwijst door naar `/`. */
export const ROUTES = [
  '/',
  '/dashboard',
  '/gesprekken',
  '/bibliotheek',
  '/kalender',
  '/compliance',
  '/export',
  '/organisatie',
  '/gegevens',
  '/begrippen',
  '/faq',
  '/contact',
] as const;
