/**
 * Browser sandbox capacity limits (documented in docs/SANDBOX_LIMITS.md).
 */
export const SANDBOX_LIMITS = {
  maxSchemaSets: 8,
  maxRelationsPerSet: 12,
  maxAttributesPerRelation: 16,
  maxRowsPerRelation: 200,
  maxRelationNameLength: 48,
  maxAttributeNameLength: 48,
  maxSchemaSetNameLength: 64,
} as const;

export const SUPPORTED_ATTRIBUTE_TYPES = ['string', 'number', 'boolean', 'date'] as const;

export type SandboxAttributeType = (typeof SUPPORTED_ATTRIBUTE_TYPES)[number];
