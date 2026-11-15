/**
 * Keuzepaneel "Activiteit toevoegen" vanuit de kalender zelf: geopend vanuit een cel (standaard +
 * maand al gekozen), een rij (standaard) of de knop bovenaan. Toont eerst wat het best past:
 * nog niet op de kalender, aanbevolen in deze maand, verplicht. Blijft open om meer toe te voegen.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, CalendarCheck, Undo2 } from 'lucide-react';
import { maandUitPeriode } from '../../domein/hulp';
import { Button, Dialog, SearchField, Select, VerplichtBadge, cx, gebiedKlassen } from '../../componenten';
import { MAANDEN, STANDAARD_OP_CODE } from '../../domein/seed';
import type { Activiteit, KalenderItem, Maand, Standaard } from '../../domein/types';
import { maandTitel, maandVoluit, toevoegSuggesties, type Suggestie } from './hulp';

export interface ToevoegBegin {
  standaard?: string | null;
  maand?: Maand | null;
}

export interface ToevoegPaneelProps {
  open: boolean;
  begin: ToevoegBegin;
  onClose: () => void;
  bibliotheek: Activiteit[];
  items: KalenderItem[];
  standaarden: Standaard[];
  kalenderNaam: string;
  /** Voeg toe; maand null = aanbevolen maand. Geeft de uid. */
  onToevoegen: (a: Activiteit, maand: Maand | null) => string | null;
  onTerugdraaien: (uid: string) => void;
  /** Naar het formulier voor een eigen activiteit (met dezelfde standaard en maand). */
  onEigen: (begin: ToevoegBegin) => void;
}

const AANBEVOLEN = '';

export function ToevoegPaneel(p: ToevoegPaneelProps) {
  const [zoek, setZoek] = useState('');
  const [standaard, setStandaard] = useState<string>(p.begin.standaard ?? '');
  const [maand, setMaand] = useState<string>(p.begin.maand ?? AANBEVOLEN);
  /** Wat in deze sessie van het paneel is toegevoegd: activiteit-id → uid */
  const [toegevoegd, setToegevoegd] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!p.open) return;
    setZoek('');
    setStandaard(p.begin.standaard ?? '');
    setMaand(p.begin.maand ?? AANBEVOLEN);
    setToegevoegd({});
  }, [p.open, p.begin.standaard, p.begin.maand]);

  const gekozenMaand = (maand || null) as Maand | null;
  const lijst = useMemo(
    () => toevoegSuggesties(p.bibliotheek, p.items, { zoek, standaard: standaard || null, maand: gekozenMaand }),
    [p.bibliotheek, p.items, zoek, standaard, gekozenMaand],
  );
  // Net toegevoegd blijft op zijn plek staan (anders springt de lijst).
  const [volgorde, setVolgorde] = useState<string[]>([]);
  useEffect(() => {
    setVolgorde(lijst.map((s) => s.activiteit.id));
    // alleen bij een andere zoekopdracht of keuze, niet na toevoegen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open, zoek, standaard, maand]);
  const opId = new Map(lijst.map((s) => [s.activiteit.id, s]));
  const getoond = (volgorde.length ? volgorde.map((id) => opId.get(id)).filter(Boolean) : lijst) as Suggestie[];

  const nogTeKiezen = getoond.filter((s) => !s.opKalender || toegevoegd[s.activiteit.id]);
  const alGepland = getoond.filter((s) => s.opKalender && !toegevoegd[s.activiteit.id]);
  const std = standaard ? STANDAARD_OP_CODE[standaard] : undefined;
  const aantalToegevoegd = Object.keys(toegevoegd).length;

  function voegToe(a: Activiteit) {
    const uid = p.onToevoegen(a, gekozenMaand);
    if (uid) setToegevoegd((t) => ({ ...t, [a.id]: uid }));
  }

  function draaiTerug(a: Activiteit) {
    const uid = toegevoegd[a.id];
    if (!uid) return;
    p.onTerugdraaien(uid);
    setToegevoegd((t) => {
      const k = { ...t };
      delete k[a.id];
      return k;
    });
  }

  const contextTekst = [std ? `${std.code} · ${std.naam}` : null, gekozenMaand ? maandVoluit(gekozenMaand) : null]
    .filter(Boolean)
    .join(', ');

  return (
    <Dialog
      open={p.open}
      onClose={p.onClose}
      width="lg"
      title="Activiteit toevoegen"
      subtitle={contextTekst ? `${contextTekst} · kalender van ${p.kalenderNaam}` : `Aan de kalender van ${p.kalenderNaam}`}
      footer={
        <>
          {nogTeKiezen.length > 0 ? (
            <Button variant="ghost" icon={Plus} className="mr-auto" onClick={() => p.onEigen({ standaard: standaard || null, maand: gekozenMaand })}>
              Eigen activiteit maken
            </Button>
          ) : (
            <span className="mr-auto" />
          )}
          {aantalToegevoegd > 0 && (
            <span className="tnum hidden text-xs text-ink-muted sm:inline">{aantalToegevoegd} toegevoegd</span>
          )}
          <Button variant={aantalToegevoegd ? 'primary' : 'secondary'} onClick={p.onClose}>
            {aantalToegevoegd ? 'Klaar' : 'Sluiten'}
          </Button>
        </>
      }
    >
      <div className="space-y-4" data-rondleiding="toevoegpaneel">
        <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
          <SearchField
            value={zoek}
            onChange={setZoek}
            placeholder="Zoek een activiteit…"
            label="Zoek een activiteit"
            autoFocus
            className="sm:col-span-2"
          />
          <Select
            aria-label="Standaard"
            value={standaard}
            onChange={(e) => setStandaard(e.target.value)}
            options={[{ value: '', label: 'Alle standaarden' }, ...p.standaarden.map((s) => ({ value: s.code, label: `${s.code} · ${s.naam}` }))]}
          />
          <Select
            aria-label="Maand"
            value={maand}
            onChange={(e) => setMaand(e.target.value)}
            options={[{ value: AANBEVOLEN, label: 'Aanbevolen maand' }, ...MAANDEN.map((m) => ({ value: m, label: maandTitel(m) }))]}
          />
        </div>

        {nogTeKiezen.length === 0 && (
          <div className="rounded-md border border-dashed border-line bg-surface-subtle px-4 py-5 text-center">
            <p className="text-sm font-semibold text-ink-strong">
              {zoek ? 'Niets gevonden' : std ? `Alles bij ${std.code} staat al op de kalender` : 'Alles staat al op de kalender'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">Maak een eigen activiteit als je iets anders wilt plannen.</p>
            <Button className="mt-3" size="sm" variant="secondary" icon={Plus} onClick={() => p.onEigen({ standaard: standaard || null, maand: gekozenMaand })}>
              Eigen activiteit maken
            </Button>
          </div>
        )}

        {nogTeKiezen.length > 0 && (
          <ul className="divide-y divide-line-subtle overflow-hidden rounded-md border border-line-subtle" aria-label="Activiteiten om toe te voegen">
            {nogTeKiezen.map((s) => (
              <SuggestieRij
                key={s.activiteit.id}
                s={s}
                maand={gekozenMaand}
                toegevoegdUid={toegevoegd[s.activiteit.id]}
                metStandaard={!standaard}
                onToevoegen={() => voegToe(s.activiteit)}
                onTerug={() => draaiTerug(s.activiteit)}
              />
            ))}
          </ul>
        )}

        {alGepland.length > 0 && (
          <details className="group rounded-md">
            <summary className="cursor-pointer select-none text-xs font-semibold text-ink-muted hover:text-ink-strong">
              Al op de kalender ({alGepland.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {alGepland.map((s) => (
                <li key={s.activiteit.id} className="flex items-center gap-2 text-xs text-ink-muted">
                  <Check className="h-3.5 w-3.5 shrink-0 text-status-success" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{s.activiteit.naam}</span>
                  <span className="shrink-0">{s.opKalender ? maandVoluit(s.opKalender.maand) : ''}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Dialog>
  );
}

function SuggestieRij({
  s,
  maand,
  toegevoegdUid,
  metStandaard,
  onToevoegen,
  onTerug,
}: {
  s: Suggestie;
  maand: Maand | null;
  toegevoegdUid?: string;
  metStandaard: boolean;
  onToevoegen: () => void;
  onTerug: () => void;
}) {
  const a = s.activiteit;
  const k = gebiedKlassen(a.gebied);
  const doelMaand = maand ?? maandUitPeriode(a.periode);
  return (
    <li className={cx('flex items-center gap-3 px-3 py-2.5', toegevoegdUid ? 'bg-status-success-surface' : 'bg-surface-card')}>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-ink-strong">{a.naam}</span>
          {a.verplicht && <VerplichtBadge />}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-ink-muted">
          {metStandaard && (
            <span className="inline-flex items-center gap-1 font-semibold">
              <span aria-hidden className={cx('h-2 w-2 rounded-xs', k.dot)} />
              {a.standaard}
            </span>
          )}
          <span>aanbevolen {a.periode || 'variabel'}</span>
          {maand && s.pastInMaand && (
            <span className="inline-flex items-center gap-1 font-semibold text-status-success">
              <CalendarCheck className="h-3 w-3" aria-hidden />
              past in {maandVoluit(maand)}
            </span>
          )}
        </p>
      </div>
      {toegevoegdUid ? (
        <span className="flex shrink-0 items-center gap-1">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-success">
            <Check className="h-3.5 w-3.5" aria-hidden />
            In {maandVoluit(doelMaand)}
          </span>
          <button
            type="button"
            onClick={onTerug}
            className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-ink-strong hover:bg-surface-sunken"
            aria-label={`${a.naam} weer weghalen`}
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            Ongedaan
          </button>
        </span>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          icon={Plus}
          onClick={onToevoegen}
          aria-label={`${a.naam} toevoegen in ${maandVoluit(doelMaand)}`}
          title={`Zet in ${maandVoluit(doelMaand)}`}
        >
          <span className="hidden sm:inline">Toevoegen</span>
        </Button>
      )}
    </li>
  );
}
