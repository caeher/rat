import type { SandboxAttribute, SandboxRelation } from './types';
import { coerceValueToType, isValueCompatibleWithType } from './validateCell';
import type { DestructiveEffect, DestructivePreview } from './types';
import type { SandboxAttributeType } from './constants';

export function previewRemoveAttribute(
  relation: SandboxRelation,
  attributeName: string
): DestructivePreview {
  const affected = relation.rows.length;
  const effects: DestructiveEffect[] = [
    {
      kind: 'drop_rows',
      relationName: relation.name,
      attributeName,
      affectedRowCount: affected,
      detail: `Column "${attributeName}" will be removed from all ${affected} row(s).`,
    },
  ];
  return { effects, requiresConfirmation: affected > 0 };
}

export function previewChangeAttributeType(
  relation: SandboxRelation,
  attributeName: string,
  newType: SandboxAttributeType,
  newNullable: boolean
): DestructivePreview {
  const attr = relation.attributes.find((a) => a.name === attributeName);
  if (!attr) {
    return { effects: [], requiresConfirmation: false };
  }

  const effects: DestructiveEffect[] = [];
  let cleared = 0;

  for (const row of relation.rows) {
    const value = row[attributeName];
    if (value === null) {
      if (!newNullable) {
        cleared += 1;
      }
      continue;
    }
    if (!isValueCompatibleWithType(value, attr.type, newType)) {
      cleared += 1;
      continue;
    }
    const coerced = coerceValueToType(value, newType);
    if (coerced === null && value !== null) {
      cleared += 1;
    }
  }

  if (attr.type !== newType) {
    effects.push({
      kind: 'clear_cells',
      relationName: relation.name,
      attributeName,
      affectedRowCount: cleared,
      detail:
        cleared > 0
          ? `Changing "${attributeName}" from ${attr.type} to ${newType} will clear ${cleared} incompatible cell value(s).`
          : `Type will change from ${attr.type} to ${newType} without data loss.`,
    });
  }

  if (attr.nullable && !newNullable) {
    const nullCount = relation.rows.filter((r) => r[attributeName] === null).length;
    if (nullCount > 0) {
      effects.push({
        kind: 'clear_cells',
        relationName: relation.name,
        attributeName,
        affectedRowCount: nullCount,
        detail: `Disallowing NULL will clear ${nullCount} NULL value(s) in "${attributeName}".`,
      });
    }
  }

  const requiresConfirmation = effects.some((e) => e.affectedRowCount > 0);
  return { effects, requiresConfirmation };
}

export function previewDeleteRelation(relation: SandboxRelation): DestructivePreview {
  return {
    effects: [
      {
        kind: 'remove_relation',
        relationName: relation.name,
        affectedRowCount: relation.rows.length,
        detail: `Relation "${relation.name}" and its ${relation.rows.length} row(s) will be removed.`,
      },
    ],
    requiresConfirmation: true,
  };
}

export function previewRenameAttribute(
  relation: SandboxRelation,
  oldName: string,
  newName: string
): DestructivePreview {
  if (oldName === newName) {
    return { effects: [], requiresConfirmation: false };
  }
  return {
    effects: [
      {
        kind: 'clear_cells',
        relationName: relation.name,
        attributeName: newName,
        affectedRowCount: 0,
        detail: `Attribute "${oldName}" will be renamed to "${newName}" across ${relation.rows.length} row(s).`,
      },
    ],
    requiresConfirmation: false,
  };
}

export function applyAttributeTypeChange(
  relation: SandboxRelation,
  attributeName: string,
  newType: SandboxAttributeType,
  newNullable: boolean
): SandboxRelation {
  const attrIndex = relation.attributes.findIndex((a) => a.name === attributeName);
  if (attrIndex < 0) return relation;

  const attr = relation.attributes[attrIndex];
  const nextAttr: SandboxAttribute = {
    ...attr,
    type: newType,
    nullable: newNullable,
  };

  const nextRows = relation.rows.map((row) => {
    const value = row[attributeName];
    if (value === null) {
      if (!newNullable) {
        const next = { ...row };
        delete next[attributeName];
        return next;
      }
      return row;
    }
    if (!isValueCompatibleWithType(value, attr.type, newType)) {
      const next = { ...row };
      delete next[attributeName];
      return next;
    }
    const coerced = coerceValueToType(value, newType);
    if (coerced === null && value !== null) {
      const next = { ...row };
      delete next[attributeName];
      return next;
    }
    return { ...row, [attributeName]: coerced };
  });

  const attributes = [...relation.attributes];
  attributes[attrIndex] = nextAttr;

  return { ...relation, attributes, rows: nextRows };
}
