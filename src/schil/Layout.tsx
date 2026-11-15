import { useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useBezoek } from '../store';
import { ConflictDialoog } from './ConflictDialoog';
import { Footer } from './Footer';
import { Foutgrens } from './Foutgrens';
import { Lade, Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ZoekProvider } from './Zoekvenster';
import { OefenBand, RondleidingAanbod, RondleidingKeuze } from './rondleiding/Aanbod';
import { AfsluitingVenster } from './rondleiding/Afsluiting';
import { Spotlight } from './rondleiding/Spotlight';

/** Topbar (met weergavekeuze en zoeken), zijbalk (of lade), pagina-inhoud (max 1440px) en footer. */
export function Layout() {
  const [lade, setLade] = useState(false);
  const sluit = useCallback(() => setLade(false), []);
  const { pathname } = useLocation();
  useBezoek(); // houdt "laatst actief" bij voor "Sinds je vorige bezoek"
  return (
    <ZoekProvider>
    <div className="flex min-h-screen flex-col bg-surface-page">
      <a
        href="#inhoud"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-surface-card focus:px-3 focus:py-2"
      >
        Naar de inhoud
      </a>
      <OefenBand />
      <Topbar onMenu={() => setLade(true)} />
      <Lade open={lade} onSluit={sluit} />
      <div className="flex flex-1">
        <Sidebar />
        <main id="inhoud" className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-content flex-1 px-4 py-6 md:px-6 md:py-8">
            <Foutgrens resetSleutel={pathname}>
              <Outlet />
            </Foutgrens>
          </div>
          <Footer />
        </main>
      </div>
      <ConflictDialoog />
      <Spotlight />
      <RondleidingAanbod />
      <RondleidingKeuze />
      <AfsluitingVenster />
    </div>
    </ZoekProvider>
  );
}
