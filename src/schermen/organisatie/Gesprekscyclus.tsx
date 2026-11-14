/** Kaart "Gesprekscyclus" in Organisatie (`r_` in het origineel). */
import { ChevronDown, ChevronUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  IconButton,
  SeizoenBadge,
  Select,
  cx,
  gesprekIcoon,
  seizoenKlassen,
  useBevestig,
  useToast,
} from '../../componenten';
import { deadlineVanGesprek, startjaar } from '../../domein/berekeningen';
import { formatDatumLang, gesorteerdeCyclus } from '../../domein/hulp';
import { ICOON_OPTIES, KLEUR_OPTIES, MAANDEN } from '../../domein/seed';
import type { Gesprek, Maand } from '../../domein/types';
import { PRIVACY_REGEL } from '../../domein/inhoud';
import { useStore } from '../../store';
import { BewerkVeld } from './BewerkVeld';

const ICOON_LABEL: Record<string, string> = {
  blad: 'Blad',
  sneeuw: 'Sneeuwvlok',
  bloem: 'Bloem',
  zon: 'Zon',
  herhaal: 'Herhalen',
  vlag: 'Vlag',
  cirkel: 'Cirkel',
  ster: 'Ster',
};

export function Gesprekscyclus() {
  const { state, addGesprek, resetCyclus } = useStore();
  const bevestig = useBevestig();
  const toast = useToast();
  const cyclus = gesorteerdeCyclus(state.organisatie.gesprekscyclus);
  const jaar = startjaar(state.schooljaar, new Date().getFullYear());

  return (
    <Card
      id="gesprekscyclus"
      title="Gesprekscyclus"
      subtitle="Aantal gesprekken, namen, maanden, kleur en icoon. Een verwijderd gesprek zet gekoppelde activiteiten op 'Doorlopend'."
      action={
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={async () => {
            if (
              await bevestig({
                titel: 'Cyclus terugzetten naar de vier seizoensgesprekken?',
                tekst: 'Eigen gesprekken verdwijnen; activiteiten die daaraan gekoppeld waren worden Doorlopend.',
                bevestigLabel: 'Terugzetten',
              })
            ) {
              resetCyclus();
              toast('Gesprekscyclus teruggezet');
            }
          }}
        >
          Standaard
        </Button>
      }
    >
      <ol className="space-y-3">
        {cyclus.map((g, i) => (
          <GesprekRij key={g.id} gesprek={g} eerste={i === 0} laatste={i === cyclus.length - 1} jaar={jaar} />
        ))}
      </ol>
      {cyclus.length === 0 && (
        <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
          Geen gesprekken. Alle activiteiten staan op Doorlopend.
        </p>
      )}
      <Button
        icon={Plus}
        className="mt-4"
        onClick={() => {
          addGesprek();
          toast('Gesprek toegevoegd');
        }}
      >
        Gesprek toevoegen
      </Button>
    </Card>
  );
}

function GesprekRij({ gesprek: g, eerste, laatste, jaar }: { gesprek: Gesprek; eerste: boolean; laatste: boolean; jaar: number }) {
  const { updateGesprek, removeGesprek, moveGesprek } = useStore();
  const bevestig = useBevestig();
  const toast = useToast();

  return (
    <li className="rounded-md border border-line-subtle p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <div className="flex shrink-0 flex-col">
          <IconButton icon={ChevronUp} label={`${g.naam} omhoog`} size="sm" disabled={eerste} onClick={() => moveGesprek(g.id, -1)} />
          <IconButton icon={ChevronDown} label={`${g.naam} omlaag`} size="sm" disabled={laatste} onClick={() => moveGesprek(g.id, 1)} />
        </div>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_7rem]">
          <BewerkVeld
            aria-label="Naam van het gesprek"
            value={g.naam}
            verplicht
            onCommit={(naam) => updateGesprek(g.id, { naam })}
          />
          <Select
            aria-label={`Maand van ${g.naam}`}
            value={g.maand}
            options={MAANDEN}
            onChange={(e) => updateGesprek(g.id, { maand: e.target.value as Maand })}
          />
          <BewerkVeld
            aria-label={`Thema van ${g.naam}`}
            value={g.thema ?? ''}
            placeholder="Thema (optioneel), bv. Onderwijsresultaten & veiligheid"
            title={PRIVACY_REGEL}
            veldMaat="sm"
            className="sm:col-span-2"
            onCommit={(thema) => updateGesprek(g.id, { thema })}
          />
        </div>
        <IconButton
          icon={Trash2}
          label={`${g.naam} verwijderen`}
          size="sm"
          onClick={async () => {
            if (
              await bevestig({
                titel: `Gesprek "${g.naam}" verwijderen?`,
                tekst: "Gekoppelde activiteiten worden 'Doorlopend'.",
                bevestigLabel: 'Verwijderen',
                gevaarlijk: true,
              })
            ) {
              removeGesprek(g.id);
              toast('Gesprek verwijderd', 'danger');
            }
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 pl-0 sm:pl-10">
        <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-2xs font-semibold uppercase tracking-label text-ink-muted">Kleur</span>
          <div role="radiogroup" aria-label={`Kleur van ${g.naam}`} className="flex gap-1.5">
            {KLEUR_OPTIES.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={g.kleur === k}
                aria-label={k}
                title={k}
                onClick={() => updateGesprek(g.id, { kleur: k })}
                className={cx(
                  'h-6 w-6 rounded-full border-2 border-surface-card transition-shadow duration-fast',
                  seizoenKlassen(k).dot,
                  g.kleur === k ? 'ring-2 ring-ink-strong' : 'ring-1 ring-line hover:ring-line-strong',
                )}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-2xs font-semibold uppercase tracking-label text-ink-muted">Icoon</span>
          <div role="radiogroup" aria-label={`Icoon van ${g.naam}`} className="flex flex-wrap gap-1">
            {ICOON_OPTIES.map((ic) => {
              const Icoon = gesprekIcoon(ic);
              const actief = g.icoon === ic;
              return (
                <button
                  key={ic}
                  type="button"
                  role="radio"
                  aria-checked={actief}
                  aria-label={ICOON_LABEL[ic] ?? ic}
                  title={ICOON_LABEL[ic] ?? ic}
                  onClick={() => updateGesprek(g.id, { icoon: ic })}
                  className={cx(
                    'grid h-7 w-7 place-items-center rounded-sm border transition-colors duration-fast',
                    actief
                      ? cx(seizoenKlassen(g.kleur).surface, seizoenKlassen(g.kleur).border, seizoenKlassen(g.kleur).ink)
                      : 'border-line-subtle text-ink-muted hover:bg-surface-hover',
                  )}
                >
                  <Icoon className="h-4 w-4" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <SeizoenBadge gesprek={g} size="md" />
          <span className="tnum text-xs text-ink-subtle">deadline {formatDatumLang(deadlineVanGesprek(g, jaar))}</span>
        </div>
      </div>
    </li>
  );
}
