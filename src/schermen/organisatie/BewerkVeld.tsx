/**
 * Invoerveld dat pas bewaart bij verlaten of Enter (Esc zet terug). Zo ontstaat er geen
 * wijziging per toetsaanslag (rustiger voor het gedeelde bestand) en blijft een naam nooit leeg.
 * Wijzigt de waarde van buitenaf (bv. een collega via het gedeelde bestand) terwijl het veld
 * niet in gebruik is, dan volgt het veld die waarde.
 */
import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { Input } from '../../componenten';

export interface BewerkVeldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onCommit: (waarde: string) => void;
  /** Leeg is niet toegestaan: dan terug naar de vorige waarde. */
  verplicht?: boolean;
  veldMaat?: 'sm' | 'md';
}

export function BewerkVeld({ value, onCommit, verplicht, onBlur, onKeyDown, ...rest }: BewerkVeldProps) {
  const [concept, setConcept] = useState(value);
  const actief = useRef(false);

  useEffect(() => {
    if (!actief.current) setConcept(value);
  }, [value]);

  const bewaar = () => {
    const schoon = concept.trim();
    if (verplicht && !schoon) {
      setConcept(value);
      return;
    }
    if (schoon !== value) onCommit(schoon);
    setConcept(schoon);
  };

  return (
    <Input
      {...rest}
      value={concept}
      onFocus={() => (actief.current = true)}
      onChange={(e) => setConcept(e.target.value)}
      onBlur={(e) => {
        actief.current = false;
        bewaar();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          bewaar();
        } else if (e.key === 'Escape') {
          setConcept(value);
        }
        onKeyDown?.(e);
      }}
    />
  );
}
