import { useCallback, useState } from 'react';
import { Button, Dialog } from '../componenten';
import type { KeuzeVrager } from '../sync/SyncProvider';

type Keuze = 'samenvoegen' | 'overnemen' | null;

/**
 * Dialoog "Je hebt hier al gegevens": samenvoegen of het bestand overnemen.
 * Gebruik: const [vraag, dialoog] = useBestandKeuze(); ... sync.koppelBestaand(vraag); ... {dialoog}
 */
export function useBestandKeuze(): [KeuzeVrager, JSX.Element] {
  const [open, setOpen] = useState<{ naam: string; klaar: (k: Keuze) => void } | null>(null);

  const vraag = useCallback<KeuzeVrager>((naam) => new Promise<Keuze>((klaar) => setOpen({ naam, klaar })), []);

  const kies = (k: Keuze) => {
    open?.klaar(k);
    setOpen(null);
  };

  const dialoog = (
    <Dialog
      open={!!open}
      onClose={() => kies(null)}
      title="Je hebt hier al gegevens"
      subtitle={open?.naam}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={() => kies(null)}>
            Annuleren
          </Button>
          <Button variant="secondary" onClick={() => kies('overnemen')}>
            Bestand overnemen
          </Button>
          <Button variant="primary" onClick={() => kies('samenvoegen')}>
            Samenvoegen
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-ink-body">
        <p>Op dit apparaat staat al een kalender. Wat wil je doen?</p>
        <ul className="space-y-2">
          <li>
            <strong className="text-ink-strong">Samenvoegen:</strong> de kalender hier en die in het bestand worden één. Per
            activiteit blijft de nieuwste versie bewaard.
          </li>
          <li>
            <strong className="text-ink-strong">Bestand overnemen:</strong> de kalender uit het bestand vervangt wat hier staat.
          </li>
        </ul>
      </div>
    </Dialog>
  );

  return [vraag, dialoog];
}
