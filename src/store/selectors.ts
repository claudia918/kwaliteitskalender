/**
 * Selector-hooks bovenop de store. Alle rekenwerk zit in src/domein/berekeningen.ts;
 * deze hooks koppelen dat aan het gekozen niveau.
 */
import { useMemo } from 'react';
import {
  editScopeVoor,
  komendGesprek,
  scopeLabel as maakScopeLabel,
  scopeVoor,
  type KomendGesprek,
} from '../domein/berekeningen';
import { bibliotheek } from '../domein/hulp';
import type { Activiteit, EditScope, Niveau, Scope } from '../domein/types';
import { useStore } from './StoreProvider';

export interface ScopeInfo {
  niveau: Niveau;
  /** Items en standaarden van het gekozen niveau. */
  scope: Scope;
  /** Bewerkbare kalender; null op clusterniveau. */
  editScope: EditScope | null;
  editable: boolean;
  isBestuur: boolean;
  /** Bibliotheek bij het niveau: 30 bestuurs- of 67 schoolactiviteiten. */
  library: Activiteit[];
  /** School-, cluster- of bestuursnaam. */
  scopeLabel: string;
}

/** Scope van het gekozen niveau (zoals `vr()` in het origineel). */
export function useScope(): ScopeInfo {
  const { state, niveau, clusterId, schoolId } = useStore();
  return useMemo(() => {
    const scope = scopeVoor(state, niveau, clusterId, schoolId);
    const editScope = editScopeVoor(niveau, schoolId);
    return {
      niveau,
      scope,
      editScope,
      editable: editScope !== null,
      isBestuur: scope.isBestuur,
      library: bibliotheek(scope.isBestuur),
      scopeLabel: maakScopeLabel(state, niveau, clusterId, schoolId),
    };
  }, [state, niveau, clusterId, schoolId]);
}

/** Het komende gesprek volgens de cyclus en het schooljaar (vandaag = nu). */
export function useKomendGesprek(): KomendGesprek | null {
  const { state } = useStore();
  const cyclus = state.organisatie.gesprekscyclus;
  const jaar = state.schooljaar;
  return useMemo(() => komendGesprek(cyclus, jaar, new Date()), [cyclus, jaar]);
}
