import { useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BevestigProvider, ToastProvider } from '../componenten';
import Bibliotheek from '../schermen/Bibliotheek';
import Compliance from '../schermen/Compliance';
import Contact from '../schermen/Contact';
import Dashboard from '../schermen/Dashboard';
import Export from '../schermen/Export';
import Faq from '../schermen/Faq';
import Gesprekken from '../schermen/Gesprekken';
import Kalender from '../schermen/Kalender';
import Organisatie from '../schermen/Organisatie';
import Start from '../schermen/Start';
import Welkom from '../schermen/Welkom';
import Wizard from '../schermen/Wizard';
import { StoreProvider, useStore } from '../store';
import { SyncProvider } from '../sync/SyncProvider';
import { ConflictDialoog } from './ConflictDialoog';
import { Foutgrens } from './Foutgrens';
import GegevensDelen from './GegevensDelen';
import { Layout } from './Layout';
import Stijlgids from './Stijlgids';

/** "/" : bestuur → Start, anders Dashboard. */
function Index() {
  const { niveau } = useStore();
  return niveau === 'bestuur' ? <Start /> : <Dashboard />;
}

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

function Poort() {
  const { state } = useStore();
  if (!state.setupVoltooid) return <Opstart />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Index />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="gesprekken" element={<Gesprekken />} />
        <Route path="bibliotheek" element={<Bibliotheek />} />
        <Route path="kalender" element={<Kalender />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="export" element={<Export />} />
        <Route path="organisatie" element={<Organisatie />} />
        <Route path="gegevens" element={<GegevensDelen />} />
        <Route path="faq" element={<Faq />} />
        <Route path="contact" element={<Contact />} />
        <Route path="stijlgids" element={<Stijlgids />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/** Wrapperketen: Foutgrens → Store → Toasts → Bevestigen → Sync → HashRouter → Poort. */
export default function App() {
  return (
    <Foutgrens>
      <StoreProvider>
        <ToastProvider>
          <BevestigProvider>
            <SyncProvider>
              <HashRouter>
                <Poort />
              </HashRouter>
            </SyncProvider>
          </BevestigProvider>
        </ToastProvider>
      </StoreProvider>
    </Foutgrens>
  );
}
