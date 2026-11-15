/**
 * Setup-wizard (inventaris §1.8): drie stappen Bestuur, Scholen, Startpunt.
 * Alles blijft lokaal in deze component tot "Kalender aanmaken" (store.voltooiWizard).
 */
import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  School as SchoolIcoon,
  ListChecks,
  SquareDashed,
  Trash2,
  type LucideIcon as LucideIconType,
} from 'lucide-react';
import { AppLogo, Badge, Button, IconButton, Input, Veld, cx, useToast } from '../componenten';
import { VERPLICHTE_SCHOOLACTIVITEITEN, SCHOOLTYPE_SUGGESTIES, STANDAARD_SCHOOLJAAR } from '../domein/seed';
import { PRIVACY_REGEL } from '../domein/inhoud';
import { aantal } from '../domein/hulp';
import { useStore } from '../store';
import { rondleidingNa } from '../schil/rondleiding/RondleidingProvider';

export interface WizardProps {
  /** Terug naar het welkomstscherm */
  onTerug: () => void;
}

const STAPPEN = ['Bestuur', 'Scholen', 'Startpunt'] as const;
const AANTAL_AANBEVOLEN = VERPLICHTE_SCHOOLACTIVITEITEN.length;

export default function Wizard({ onTerug }: WizardProps) {
  const { voltooiWizard } = useStore();
  const toast = useToast();
  const [stap, setStap] = useState(0);
  const [bestuurNaam, setBestuurNaam] = useState('');
  const [schooljaar, setSchooljaar] = useState(STANDAARD_SCHOOLJAAR);
  const [scholen, setScholen] = useState<{ naam: string; type: string }[]>([]);
  const [naam, setNaam] = useState('');
  const [type, setType] = useState('');
  const [sjabloon, setSjabloon] = useState<'sjabloon' | 'leeg'>('sjabloon');
  const naamRef = useRef<HTMLInputElement>(null);

  const stapKlaar = stap === 0 ? bestuurNaam.trim().length > 1 : stap === 1 ? scholen.length > 0 : true;
  const dubbel = scholen.some((s) => s.naam.toLowerCase() === naam.trim().toLowerCase());

  const voegToe = () => {
    if (!naam.trim() || dubbel) return;
    setScholen((s) => [...s, { naam: naam.trim(), type: type.trim() }]);
    setNaam('');
    setType('');
    naamRef.current?.focus();
  };

  const maakAan = () => {
    rondleidingNa('eigen');
    voltooiWizard({ bestuurNaam: bestuurNaam.trim(), schooljaar: schooljaar.trim() || STANDAARD_SCHOOLJAAR, scholen, sjabloon: sjabloon === 'sjabloon' });
    toast('Je kwaliteitskalender is aangemaakt');
  };

  const volgende = (e?: FormEvent) => {
    e?.preventDefault();
    if (!stapKlaar) return;
    if (stap < 2) setStap(stap + 1);
    else maakAan();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <section className="rounded-md border border-line-subtle bg-surface-card p-5 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <AppLogo />
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onTerug}>
            Terug naar welkom
          </Button>
        </div>

        {/* Stappenbalk */}
        <ol className="mt-8 flex items-center gap-2" aria-label="Stappen">
          {STAPPEN.map((label, i) => (
            <li key={label} className={cx('flex items-center gap-2', i < STAPPEN.length - 1 && 'flex-1')}>
              <span
                aria-hidden
                className={cx(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                  i <= stap ? 'bg-gray-900 text-white' : 'border border-line text-ink-muted',
                )}
              >
                {i < stap ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cx('text-sm font-medium', i === stap ? 'text-ink-strong' : 'text-ink-muted', i !== stap && 'hidden sm:inline')}
                aria-current={i === stap ? 'step' : undefined}
              >
                {label}
              </span>
              {i < STAPPEN.length - 1 && <span aria-hidden className="h-px flex-1 bg-line" />}
            </li>
          ))}
        </ol>

        <form onSubmit={volgende} className="mt-8">
          {stap === 0 && (
            <div className="space-y-5">
              <StapKop nummer={1} titel="Over je bestuur" uitleg="Dit kun je later altijd aanpassen onder Organisatie." />
              <Veld label="Naam van het bestuur" verplicht hint={PRIVACY_REGEL}>
                {(id) => (
                  <Input
                    id={id}
                    value={bestuurNaam}
                    onChange={(e) => setBestuurNaam(e.target.value)}
                    placeholder="bv. Stichting Onderwijs Regio X"
                    autoFocus
                  />
                )}
              </Veld>
              <Veld
                label="Schooljaar"
                className="max-w-[16rem]"
                hint="Bepaalt de datums van de gesprekken, bijvoorbeeld 2026/2027."
              >
                {(id) => <Input id={id} value={schooljaar} onChange={(e) => setSchooljaar(e.target.value)} placeholder="2025/2026" />}
              </Veld>
            </div>
          )}

          {stap === 1 && (
            <div className="space-y-5">
              <StapKop
                nummer={2}
                titel="Voeg je scholen toe"
                uitleg="Minstens één school. Clusters en meer scholen kun je later toevoegen."
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-start">
                <Veld label="Schoolnaam" fout={naam.trim() && dubbel ? 'Deze school staat al in de lijst.' : undefined}>
                  {(id) => (
                    <Input
                      id={id}
                      ref={naamRef}
                      value={naam}
                      autoFocus
                      onChange={(e) => setNaam(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          voegToe();
                        }
                      }}
                      placeholder="bv. Lyceum Noord"
                    />
                  )}
                </Veld>
                <Veld label="Type">
                  {(id) => (
                    <Input
                      id={id}
                      value={type}
                      list="wizard-schooltypes"
                      onChange={(e) => setType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          voegToe();
                        }
                      }}
                      placeholder="havo/vwo"
                    />
                  )}
                </Veld>
                <datalist id="wizard-schooltypes">
                  {SCHOOLTYPE_SUGGESTIES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <Button icon={Plus} onClick={voegToe} disabled={!naam.trim() || dubbel} className="sm:mt-[22px]">
                  Toevoegen
                </Button>
              </div>
              <ul className="divide-y divide-line-subtle rounded-md border border-line-subtle">
                {scholen.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-ink-subtle">Nog geen scholen toegevoegd.</li>
                )}
                {scholen.map((s, i) => (
                  <li key={s.naam} className="flex items-center gap-3 px-3 py-2">
                    <SchoolIcoon className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-strong">
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
              {scholen.length > 0 && (
                <p className="text-xs text-ink-muted">{aantal(scholen.length, 'school', 'scholen')} toegevoegd.</p>
              )}
            </div>
          )}

          {stap === 2 && (
            <div className="space-y-4">
              <StapKop nummer={3} titel="Hoe wil je beginnen?" />
              <div role="radiogroup" aria-label="Startpunt" className="space-y-3">
                <Keuzekaart
                  actief={sjabloon === 'sjabloon'}
                  onClick={() => setSjabloon('sjabloon')}
                  icon={ListChecks}
                  titel="Vul met aanbevolen activiteiten"
                  aanbevolen
                  tekst={`Plaatst ${AANTAL_AANBEVOLEN} aanbevolen (verplichte) activiteiten op ${
                    scholen.length === 1 ? 'je school' : `alle ${scholen.length} scholen`
                  }, op de juiste maand en gesprek, en de bestuursactiviteiten op de bestuurskalender. Je past ze daarna naar wens aan.`}
                />
                <Keuzekaart
                  actief={sjabloon === 'leeg'}
                  onClick={() => setSjabloon('leeg')}
                  icon={SquareDashed}
                  titel="Begin met lege kalenders"
                  tekst="Start helemaal blanco en kies zelf activiteiten uit de bibliotheek."
                />
              </div>
              <div className="rounded-md bg-surface-sunken px-4 py-3 text-sm text-ink-body">
                <span className="font-semibold text-ink-strong">{bestuurNaam.trim()}</span> · schooljaar{' '}
                {schooljaar.trim() || STANDAARD_SCHOOLJAAR} · {aantal(scholen.length, 'school', 'scholen')}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line-subtle pt-5">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => (stap === 0 ? onTerug() : setStap(stap - 1))}>
              {stap === 0 ? 'Welkom' : 'Vorige'}
            </Button>
            {stap < 2 ? (
              <Button type="submit" variant="primary" iconRight={ArrowRight} disabled={!stapKlaar}>
                Volgende
              </Button>
            ) : (
              <Button type="submit" variant="primary" icon={Check}>
                Kalender aanmaken
              </Button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

function StapKop({ nummer, titel, uitleg }: { nummer: number; titel: string; uitleg?: string }) {
  return (
    <div>
      <p className="eyebrow">Stap {nummer}</p>
      <h1 className="mt-1 text-h2 text-ink-strong">{titel}</h1>
      {uitleg && <p className="mt-1 text-sm text-ink-muted">{uitleg}</p>}
    </div>
  );
}

function Keuzekaart({
  actief,
  onClick,
  icon: Icon,
  titel,
  tekst,
  aanbevolen,
}: {
  actief: boolean;
  onClick: () => void;
  icon: LucideIconType;
  titel: string;
  tekst: string;
  aanbevolen?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actief}
      onClick={onClick}
      className={cx(
        'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors duration-fast',
        actief ? 'border-gray-900 bg-surface-card' : 'border-line-subtle hover:border-line',
      )}
    >
      <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', actief ? 'text-ink-strong' : 'text-ink-muted')} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-strong">
          {titel}
          {aanbevolen && (
            <Badge tone="brand" size="sm">
              aanbevolen
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">{tekst}</span>
      </span>
      <span
        aria-hidden
        className={cx(
          'mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
          actief ? 'border-gray-900 bg-gray-900 text-white' : 'border-line-strong',
        )}
      >
        {actief && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}
