/**
 * Setup-wizard (Bestuur, Scholen, Startpunt). PLACEHOLDER van het fundament: één formulier dat
 * werkt via store.voltooiWizard(). Moet nog volgens inventaris §1.8 worden afgemaakt
 * (stappenbalk, drie stappen, keuzekaarten, datalist met schooltypes).
 */
import { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Checkbox, IconButton, Input, Veld } from '../componenten';
import { STANDAARD_SCHOOLJAAR } from '../domein/seed';
import { useStore } from '../store';

export interface WizardProps {
  /** Terug naar het welkomstscherm */
  onTerug: () => void;
}

export default function Wizard({ onTerug }: WizardProps) {
  const { voltooiWizard } = useStore();
  const [bestuurNaam, setBestuurNaam] = useState('');
  const [schooljaar, setSchooljaar] = useState(STANDAARD_SCHOOLJAAR);
  const [scholen, setScholen] = useState<{ naam: string; type: string }[]>([]);
  const [naam, setNaam] = useState('');
  const [type, setType] = useState('');
  const [sjabloon, setSjabloon] = useState(true);

  const voegToe = () => {
    if (!naam.trim()) return;
    setScholen((s) => [...s, { naam: naam.trim(), type: type.trim() }]);
    setNaam('');
    setType('');
  };

  const klaar = bestuurNaam.trim().length > 1 && scholen.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onTerug}>
        Terug naar welkom
      </Button>
      <Card title="Over je bestuur" padding="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="Naam van het bestuur" verplicht>
            {(id) => (
              <Input
                id={id}
                value={bestuurNaam}
                onChange={(e) => setBestuurNaam(e.target.value)}
                placeholder="bv. Stichting Onderwijs Regio X"
              />
            )}
          </Veld>
          <Veld label="Schooljaar">
            {(id) => <Input id={id} value={schooljaar} onChange={(e) => setSchooljaar(e.target.value)} placeholder="2025/2026" />}
          </Veld>
        </div>
      </Card>
      <Card
        title="Voeg je scholen toe"
        subtitle="Minstens één school. Clusters en meer scholen kun je later toevoegen."
        padding="lg"
      >
        <div className="flex flex-wrap items-end gap-2">
          <Veld label="Schoolnaam" className="min-w-48 flex-1">
            {(id) => (
              <Input
                id={id}
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="bv. Lyceum Noord"
                onKeyDown={(e) => e.key === 'Enter' && voegToe()}
              />
            )}
          </Veld>
          <Veld label="Type" className="w-40">
            {(id) => <Input id={id} value={type} onChange={(e) => setType(e.target.value)} placeholder="havo/vwo" />}
          </Veld>
          <Button icon={Plus} onClick={voegToe}>
            Toevoegen
          </Button>
        </div>
        <ul className="mt-4 divide-y divide-line-subtle">
          {scholen.length === 0 && <li className="py-2 text-sm text-ink-muted">Nog geen scholen toegevoegd.</li>}
          {scholen.map((s, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <span>
                {s.naam} <span className="text-ink-subtle">· {s.type || 'vo'}</span>
              </span>
              <IconButton
                icon={Trash2}
                label={`${s.naam} verwijderen`}
                size="sm"
                onClick={() => setScholen((l) => l.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Hoe wil je beginnen?" padding="lg">
        <Checkbox
          checked={sjabloon}
          onChange={setSjabloon}
          label="Vul met aanbevolen activiteiten"
          beschrijving="Plaatst 19 aanbevolen (verplichte) activiteiten op elke school."
        />
      </Card>
      <div className="flex justify-end">
        <Button variant="primary" disabled={!klaar} onClick={() => voltooiWizard({ bestuurNaam, schooljaar, scholen, sjabloon })}>
          Kalender aanmaken
        </Button>
      </div>
    </div>
  );
}
