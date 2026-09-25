import { createId } from '../defaults';
import type { SandboxAttribute, SandboxRelation } from '../types';
import type { SandboxAttributeType } from '../constants';
import type { Tuple } from '@/lib/engine/types';

interface RelationTemplate {
  name: string;
  attributes: Array<{ name: string; type: SandboxAttributeType; nullable: boolean }>;
  rows: Tuple[];
}

export function relationFromTemplate(template: RelationTemplate): SandboxRelation {
  return {
    id: createId(),
    name: template.name,
    attributes: template.attributes.map((a) => ({ ...a })),
    rows: template.rows.map((row) => ({ ...row })),
  };
}

export function deepCloneRelations(relations: SandboxRelation[]): SandboxRelation[] {
  return relations.map((r) => ({
    ...r,
    id: createId(),
    attributes: r.attributes.map((a) => ({ ...a })),
    rows: r.rows.map((row) => ({ ...row })),
  }));
}

export function cloneAttributes(attributes: SandboxAttribute[]): SandboxAttribute[] {
  return attributes.map((a) => ({ ...a }));
}

export function cloneRows(rows: Tuple[]): Tuple[] {
  return rows.map((row) => ({ ...row }));
}
