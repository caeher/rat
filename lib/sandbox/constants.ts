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
  /** Maximum CSV upload size (bytes), processed locally in the browser. */
  maxCsvFileBytes: 512_000,
  /** Rows shown in CSV preview UI (full file may contain more). */
  maxCsvPreviewRows: 25,
} as const;

export const SUPPORTED_ATTRIBUTE_TYPES = ['string', 'number', 'boolean', 'date'] as const;

export type SandboxAttributeType = (typeof SUPPORTED_ATTRIBUTE_TYPES)[number];
