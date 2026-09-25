import type { SandboxSchemaSet } from '@/lib/sandbox/types';

/** Stable string for comparing whether an expression-only save matches the active schema. */
export function schemaSetFingerprint(schemaSet: SandboxSchemaSet): string {
  const relations = schemaSet.relations
    .map((rel) => {
      const attrs = rel.attributes
        .map((a) => `${a.name}:${a.type}:${a.nullable ? 'n' : 'nn'}`)
        .join(',');
      return `${rel.name}[${attrs}]`;
    })
    .sort()
    .join('|');
  return relations;
}

export function schemaSetRelationNames(schemaSet: SandboxSchemaSet): string[] {
  return schemaSet.relations.map((r) => r.name).sort();
}
