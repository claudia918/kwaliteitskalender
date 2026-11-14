/** Modal "Eigen activiteit toevoegen" (inventaris §1.12, `$S`). */
import { useEffect, useState } from 'react';
import { Button, Dialog, Input, Select, Textarea, Veld, useToast } from '../../componenten';
import { gesprekOpties, maandUitPeriode } from '../../domein/hulp';
import { PRIVACY_REGEL } from '../../domein/inhoud';
import type { EditScope, Standaard } from '../../domein/types';
import { useStore } from '../../store';
import { maandVoluit } from '../kalender/hulp';

export interface EigenActiviteitDialoogProps {
  open: boolean;
  onClose: () => void;
  editScope: EditScope;
  standaarden: Standaard[];
  scopeLabel: string;
  /** Na toevoegen, met de uid van het nieuwe item */
  onToegevoegd?: (uid: string) => void;
}

export function EigenActiviteitDialoog({ open, onClose, editScope, standaarden, scopeLabel, onToegevoegd }: EigenActiviteitDialoogProps) {
  const { state, addEigenActiviteit } = useStore();
  const toast = useToast();
  const opties = gesprekOpties(state.organisatie.gesprekscyclus);
  const [naam, setNaam] = useState('');
  const [standaard, setStandaard] = useState(standaarden[0]?.code ?? '');
  const [gesprek, setGesprek] = useState(opties[0]?.id ?? 'Doorlopend');
  const [periode, setPeriode] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [geprobeerd, setGeprobeerd] = useState(false);

  // Bij openen (of ander niveau) opnieuw beginnen.
  useEffect(() => {
    if (!open) return;
    setNaam('');
    setStandaard(standaarden[0]?.code ?? '');
    setGesprek(opties[0]?.id ?? 'Doorlopend');
    setPeriode('');
    setOmschrijving('');
    setGeprobeerd(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, standaarden]);

  const geldig = naam.trim().length > 1 && !!standaard;
  const ingevuld = !!(naam || periode || omschrijving);

  function toevoegen() {
    setGeprobeerd(true);
    if (!geldig) return;
    const uid = addEigenActiviteit(editScope, { naam, standaard, gesprek, periode, omschrijving });
    toast(`${naam.trim()} toegevoegd aan de kalender`);
    onToegevoegd?.(uid);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      blokkeerAchtergrond={ingevuld}
      title="Eigen activiteit toevoegen"
      subtitle={`Komt alleen op de kalender van ${scopeLabel}, niet in de bibliotheek.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button variant="primary" onClick={toevoegen} disabled={geprobeerd && !geldig}>
            Toevoegen aan {scopeLabel}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          toevoegen();
        }}
      >
        <Veld
          label="Naam"
          verplicht
          hint={PRIVACY_REGEL}
          fout={geprobeerd && naam.trim().length <= 1 ? 'Geef de activiteit een naam van minstens 2 tekens.' : undefined}
        >
          {(id) => (
            <Input id={id} value={naam} placeholder="bv. Audit examendossiers" onChange={(e) => setNaam(e.target.value)} autoFocus />
          )}
        </Veld>
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="Standaard" verplicht>
            {(id) => (
              <Select
                id={id}
                value={standaard}
                onChange={(e) => setStandaard(e.target.value)}
                options={standaarden.map((s) => ({ value: s.code, label: `${s.code} · ${s.naam}` }))}
              />
            )}
          </Veld>
          <Veld label="Gekoppeld gesprek">
            {(id) => (
              <Select id={id} value={gesprek} onChange={(e) => setGesprek(e.target.value)} options={opties.map((g) => ({ value: g.id, label: g.naam }))} />
            )}
          </Veld>
        </div>
        <Veld
          label="Aanbevolen periode"
          hint={`Bepaalt de maand op de kalender: ${periode.trim() ? `deze activiteit komt in ${maandVoluit(maandUitPeriode(periode))}` : 'zonder periode wordt dat september'}. Je kunt haar daarna verplaatsen.`}
        >
          {(id) => <Input id={id} value={periode} placeholder="bv. sep-okt" onChange={(e) => setPeriode(e.target.value)} />}
        </Veld>
        <Veld label="Omschrijving" hint={PRIVACY_REGEL}>
          {(id) => <Textarea id={id} rows={2} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />}
        </Veld>
        <button type="submit" hidden tabIndex={-1} aria-hidden />
      </form>
    </Dialog>
  );
}
