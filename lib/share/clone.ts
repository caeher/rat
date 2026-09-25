import type { SandboxRelation, SandboxSchemaSet, SandboxState } from '@/lib/sandbox/types';

function createId(): string {
  return `id_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
}

function cloneRelation(rel: SandboxRelation): SandboxRelation {
  return {
    id: createId(),
    name: rel.name,
    attributes: rel.attributes.map((a) => ({ ...a })),
    rows: rel.rows.map((row) => ({ ...row })),
  };
}

function cloneSchemaSet(set: SandboxSchemaSet): { set: SandboxSchemaSet; sourceId: string } {
  const id = createId();
  return {
    sourceId: set.id,
    set: {
      id,
      name: set.name,
      relations: set.relations.map(cloneRelation),
      ...(set.presetId ? { presetId: set.presetId } : {}),
      ...(set.exerciseId ? { exerciseId: set.exerciseId } : {}),
    },
  };
}

/** Deep-clone sandbox state with fresh ids (for non-destructive share import). */
export function cloneSandboxStateWithFreshIds(state: SandboxState): SandboxState {
  const pairs = state.schemaSets.map(cloneSchemaSet);
  const idMap = new Map(pairs.map((p) => [p.sourceId, p.set.id]));
  const schemaSets = pairs.map((p) => p.set);
  const activeSchemaSetId = idMap.get(state.activeSchemaSetId) ?? schemaSets[0]?.id ?? state.activeSchemaSetId;

  return {
    schemaSets,
    activeSchemaSetId,
    dataVersion: state.dataVersion,
  };
}
