import { useCallback, useMemo, useReducer } from 'react';
import { createInitialSandboxState } from './defaults';
import { sandboxReducer, type SandboxAction } from './reducer';
import { createSandboxSnapshot, snapshotAttributeNames, snapshotRelationNames } from './snapshot';
import type { SandboxState } from './types';

export function useSandboxState(initialState?: SandboxState) {
  const [state, dispatch] = useReducer(sandboxReducer, initialState ?? createInitialSandboxState());

  const snapshot = useMemo(() => createSandboxSnapshot(state), [state]);

  const relationNames = useMemo(() => snapshotRelationNames(snapshot), [snapshot]);
  const attributeNames = useMemo(() => snapshotAttributeNames(snapshot), [snapshot]);

  const activeSchemaSet = useMemo(
    () => state.schemaSets.find((s) => s.id === state.activeSchemaSetId),
    [state]
  );

  const act = useCallback((action: SandboxAction) => dispatch(action), []);

  return {
    state,
    dispatch: act,
    snapshot,
    relationNames,
    attributeNames,
    activeSchemaSet,
    dataVersion: state.dataVersion,
  };
}
