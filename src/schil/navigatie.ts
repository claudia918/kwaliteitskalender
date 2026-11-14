/** Menu per niveau (inventaris §1.3) plus "Gegevens & delen". */
import {
  Building2,
  Calendar,
  CircleCheckBig,
  CircleHelp,
  Download,
  FolderSync,
  Gauge,
  House,
  Library,
  Mail,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react';
import type { Niveau } from '../domein/types';

export interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Ook actief op deze paden */
  ookActief?: string[];
}

export function hoofdmenu(niveau: Niveau): MenuItem[] {
  const midden: MenuItem[] = [
    { to: '/gesprekken', label: 'Gesprekken', icon: MessagesSquare },
    { to: '/bibliotheek', label: 'Bibliotheek', icon: Library },
    { to: '/kalender', label: 'Kalender', icon: Calendar },
    { to: '/compliance', label: 'Compliance', icon: CircleCheckBig },
    { to: '/export', label: 'Export', icon: Download },
  ];
  if (niveau === 'bestuur') {
    return [
      { to: '/', label: 'Start', icon: House },
      { to: '/dashboard', label: 'Dashboard', icon: Gauge },
      ...midden,
      { to: '/organisatie', label: 'Organisatie', icon: Building2 },
    ];
  }
  return [{ to: '/', label: 'Dashboard', icon: Gauge, ookActief: ['/dashboard'] }, ...midden];
}

export const HULPMENU: MenuItem[] = [
  { to: '/gegevens', label: 'Gegevens & delen', icon: FolderSync },
  { to: '/faq', label: 'Veelgestelde vragen', icon: CircleHelp },
  { to: '/contact', label: 'Contact', icon: Mail },
];

export function isActief(item: MenuItem, pad: string): boolean {
  return pad === item.to || (item.ookActief?.includes(pad) ?? false);
}

/** Alle routes van de app (voor tests en de helpknop). */
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
  '/faq',
  '/contact',
] as const;
