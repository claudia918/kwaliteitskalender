import { useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BevestigProvider, ToastProvider } from '../componenten';
import Bibliotheek from '../schermen/Bibliotheek';
import Begrippen from '../schermen/Begrippen';
import Compliance from '../schermen/Compliance';
import Contact from '../schermen/Contact';
import Export from '../schermen/Export';
import Faq from '../schermen/Faq';
import Gesprekken from '../schermen/Gesprekken';
import Kalender from '../schermen/Kalender';
import Organisatie from '../schermen/Organisatie';
import Start from '../schermen/Start';
import Welkom from '../schermen/Welkom';
import Wizard from '../schermen/Wizard';
import { StoreProvider, useStore } from '../store';
import { SyncProvider, useSync } from '../sync/SyncProvider';
import { BestandOpenen } from './BestandOpenen';
import { ConflictDialoog } from './ConflictDialoog';
import { Foutgrens } from './Foutgrens';
import GegevensDelen from './GegevensDelen';
import { Layout } from './Layout';
import Stijlgids from './Stijlgids';
import { OefenOmgeving, RondleidingProvider, useRondleiding } from './rondleiding/RondleidingProvider';

/** Zolang de setup niet voltooid is: welkom of wizard (buiten de router-layout). */
function Opstart() {
  const [wizard, setWizard] = useState(false);
  return (
    <main className="min-h-screen bg-surface-page">
      {wizard ? <Wizard onTerug={() => setWizard(false)} /> : <Welkom onStartWizard={() => setWizard(true)} />}
      <ConflictDialoog />
    </main>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Start />} />
        {/* Start en Dashboard zijn samengevoegd; oude links blijven werken. */}
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="gesprekken" element={<Gesprekken />} />
        <Route path="bibliotheek" element={<Bibliotheek />} />
        <Route path="kalender" element={<Kalender />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="export" element={<Export />} />
        <Route path="organisatie" element={<Organisatie />} />
        <Route path="gegevens" element={<GegevensDelen />} />
        <Route path="begrippen" element={<Begrippen />} />
        <Route path="faq" element={<Faq />} />
        <Route path="contact" element={<Contact />} />
        <Route path="stijlgids" element={<Stijlgids />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function Poort() {
  const { state } = useStore();
  const { oefenen } = useRondleiding();
  const sync = useSync();
  const [zonderBestand, setZonderBestand] = useState(false);
  // Tijdens een rondleiding: dezelfde schermen, maar op de oefenkalender.
  if (oefenen)
    return (
      <OefenOmgeving>
        <AppRoutes />
      </OefenOmgeving>
    );
  // Alleen in het kalenderbestand: de browser is leeg, dus eerst het bestand openen.
  if (!state.setupVoltooid && sync.alleenInBestand && !zonderBestand) return <BestandOpenen onNieuw={() => setZonderBestand(true)} />;
  if (!state.setupVoltooid) return <Opstart />;
  return <AppRoutes />;
}

/** De echte synchronisatie ligt stil zolang er geoefend wordt. */
function Sync({ children }: { children: React.ReactNode }) {
  const { oefenen } = useRondleiding();
  return <SyncProvider gepauzeerd={oefenen}>{children}</SyncProvider>;
}

/** Wrapperketen: Foutgrens → Store → Toasts → Bevestigen → HashRouter → Rondleiding → Sync → Poort. */
export default function App() {
  return (
    <Foutgrens>
      <StoreProvider>
        <ToastProvider>
          <BevestigProvider>
            <HashRouter>
              <RondleidingProvider>
                <Sync>
                  <Poort />
                </Sync>
              </RondleidingProvider>
            </HashRouter>
          </BevestigProvider>
        </ToastProvider>
      </StoreProvider>
    </Foutgrens>
  );
}
