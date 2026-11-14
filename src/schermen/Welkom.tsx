/**
 * Welkomstscherm (zolang setup niet voltooid is). PLACEHOLDER van het fundament: werkt, maar
 * moet nog volgens inventaris §1.7 worden afgemaakt (vier bouwstenen, vormgeving).
 *
 * Moet blijven bestaan: de drie acties hieronder, inclusief "Gedeeld kalenderbestand openen"
 * (zo stapt een collega in op een bestaande kalender).
 */
import { FolderOpen, PlayCircle, Sparkles } from 'lucide-react';
import { AppLogo, Button, Card } from '../componenten';
import { WELKOM_VOETNOOT } from '../domein/inhoud';
import { useStore } from '../store';
import { useSync } from '../sync/SyncProvider';
import { kiesBestandHandmatig } from '../sync/bestandstoegang';

export interface WelkomProps {
  /** Naar de wizard ("Begin met mijn eigen bestuur") */
  onStartWizard: () => void;
}

export default function Welkom({ onStartWizard }: WelkomProps) {
  const { loadDemo } = useStore();
  const sync = useSync();

  const openGedeeld = async () => {
    if (sync.ondersteund) {
      await sync.koppelBestaand();
    } else {
      const f = await kiesBestandHandmatig();
      if (f) await sync.openBestand(f);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-4 py-10">
      <AppLogo groot compact={false} />
      <Card padding="lg">
        <h1 className="text-h1">Welkom bij de Kwaliteitskalender VO</h1>
        <p className="mt-2 text-ink-muted">
          Stel als bestuur in een paar stappen je eigen kwaliteitskalender samen, gekoppeld aan het inspectiekader en de
          seizoensgesprekken.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" icon={Sparkles} onClick={onStartWizard}>
            Begin met mijn eigen bestuur
          </Button>
          <Button variant="secondary" icon={PlayCircle} onClick={loadDemo}>
            Verken eerst de demo
          </Button>
          <Button variant="ghost" icon={FolderOpen} onClick={() => void openGedeeld()}>
            Gedeeld kalenderbestand openen
          </Button>
        </div>
        <p className="mt-4 text-xs text-ink-subtle">{WELKOM_VOETNOOT}</p>
      </Card>
    </div>
  );
}
