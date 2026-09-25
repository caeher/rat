import { analyzeAST, parseExpression } from '@/lib/engine/validator';
import type { ASTNode, Attribute, RelationSchema } from '@/lib/engine/types';

export type SchemaSuggestionKind = 'relation' | 'attribute';

export interface SchemaSuggestion {
  kind: SchemaSuggestionKind;
  label: string;
  insert: string;
  detail: string;
  /** Lower sort priority — unique names first */
  sortKey: string;
}

function offsetInNode(offset: number, node: ASTNode): boolean {
  return offset >= node.range.start.offset && offset <= node.range.end.offset;
}

function baseSchemas(schemas: Record<string, RelationSchema>): RelationSchema[] {
  return Object.values(schemas);
}

/**
 * Collects relation schemas whose attributes are valid at the given source offset.
 */
export function collectSchemasAtOffset(
  ast: ASTNode,
  offset: number,
  fallback: Record<string, RelationSchema>
): RelationSchema[] {
  const scoped = walkSchemasAtOffset(ast, offset);
  if (scoped.length > 0) return scoped;
  return baseSchemas(fallback);
}

function walkSchemasAtOffset(node: ASTNode, offset: number): RelationSchema[] {
  if (!offsetInNode(offset, node)) return [];

  switch (node.type) {
    case 'relation':
      return node.inferredSchema ? [node.inferredSchema] : [];
    case 'selection':
    case 'projection':
    case 'rename_relation':
    case 'rename_attributes':
    case 'rename': {
      if (offset < node.child.range.start.offset) {
        const childSchema = node.child.inferredSchema;
        return childSchema ? [childSchema] : walkSchemasAtOffset(node.child, offset);
      }
      return walkSchemasAtOffset(node.child, offset);
    }
    case 'cartesian_product':
    case 'natural_join':
    case 'theta_join':
    case 'left_join':
    case 'right_join':
    case 'full_join':
    case 'union':
    case 'difference':
    case 'intersection':
    case 'division': {
      if (offset <= node.left.range.end.offset) {
        return walkSchemasAtOffset(node.left, offset);
      }
      if (offset >= node.right.range.start.offset) {
        return walkSchemasAtOffset(node.right, offset);
      }
      const left = node.left.inferredSchema;
      const right = node.right.inferredSchema;
      return [left, right].filter((s): s is RelationSchema => Boolean(s));
    }
    default:
      return [];
  }
}

function attributeInsertLabel(attr: Attribute, relationName: string, ambiguous: Set<string>): string {
  if (ambiguous.has(attr.name)) {
    const qualifier = attr.sourceRelation ?? relationName;
    return `${qualifier}.${attr.name}`;
  }
  return attr.name;
}

function buildAttributeSuggestions(schemas: RelationSchema[]): SchemaSuggestion[] {
  const nameCounts = new Map<string, number>();
  for (const schema of schemas) {
    for (const attr of schema.attributes) {
      nameCounts.set(attr.name, (nameCounts.get(attr.name) ?? 0) + 1);
    }
  }
  const ambiguous = new Set(
    [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
  );

  const suggestions: SchemaSuggestion[] = [];
  for (const schema of schemas) {
    for (const attr of schema.attributes) {
      const insert = attributeInsertLabel(attr, schema.name, ambiguous);
      const label = ambiguous.has(attr.name)
        ? `${attr.sourceRelation ?? schema.name}.${attr.name}`
        : attr.name;
      suggestions.push({
        kind: 'attribute',
        label,
        insert,
        detail: attr.type,
        sortKey: `1-${label}`,
      });
    }
  }
  return suggestions;
}

function buildRelationSuggestions(schemas: Record<string, RelationSchema>): SchemaSuggestion[] {
  return Object.values(schemas).map((schema) => ({
    kind: 'relation' as const,
    label: schema.name,
    insert: schema.name,
    detail: `${schema.attributes.length} attributes`,
    sortKey: `0-${schema.name}`,
  }));
}

export interface BuildSuggestionsOptions {
  expression: string;
  cursorOffset: number;
  prefix: string;
  schemas: Record<string, RelationSchema>;
  /** When true, prefer attributes over relations (e.g. after π or inside predicates) */
  preferAttributes?: boolean;
}

/**
 * Builds schema-aware completion entries for the current editor context.
 */
export function buildSchemaSuggestions(options: BuildSuggestionsOptions): SchemaSuggestion[] {
  const { expression, cursorOffset, prefix, schemas, preferAttributes = false } = options;
  const normalizedPrefix = prefix.toLowerCase();

  const parseResult = parseExpression(expression);
  let scopedSchemas = baseSchemas(schemas);

  if (parseResult.ast) {
    const analyzed = analyzeAST(parseResult.ast, schemas);
    scopedSchemas = collectSchemasAtOffset(analyzed.typedAST, cursorOffset, schemas);
  }

  const relationSuggestions = buildRelationSuggestions(schemas).filter((s) =>
    s.label.toLowerCase().startsWith(normalizedPrefix)
  );

  const attributeSuggestions = buildAttributeSuggestions(scopedSchemas).filter((s) =>
    s.label.toLowerCase().startsWith(normalizedPrefix) ||
    s.insert.toLowerCase().startsWith(normalizedPrefix)
  );

  const combined = preferAttributes
    ? [...attributeSuggestions, ...relationSuggestions]
    : [...relationSuggestions, ...attributeSuggestions];

  const seen = new Set<string>();
  return combined.filter((item) => {
    const key = `${item.kind}:${item.insert}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Detects whether the cursor sits in a context that expects attribute names. */
export function shouldPreferAttributes(expression: string, cursorOffset: number): boolean {
  const before = expression.slice(0, cursorOffset);
  const trimmed = before.trimEnd();
  if (/π\s*[\w.,\s]*$/u.test(trimmed)) return true;
  if (/σ\s+[^()]*$/u.test(trimmed) && !/\(\s*[^)]*$/u.test(trimmed)) return true;
  if (/⋈\s*\[[^\]]*$/u.test(trimmed)) return true;
  if (/⟕\s*\[[^\]]*$/u.test(trimmed)) return true;
  if (/⟖\s*\[[^\]]*$/u.test(trimmed)) return true;
  if (/⟗\s*\[[^\]]*$/u.test(trimmed)) return true;
  return false;
}

export function readIdentifierPrefix(doc: string, cursor: number): { from: number; prefix: string } {
  let from = cursor;
  while (from > 0) {
    const ch = doc[from - 1];
    if (!ch || !/[\w.]/u.test(ch)) break;
    from -= 1;
  }
  return { from, prefix: doc.slice(from, cursor) };
}
