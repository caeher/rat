import type { ASTNodeType, Diagnostic, RelationSchema, SourceRange } from '@/lib/engine/types';
import type { SqlFromClause, SqlQuery, SqlSelectQuery, SqlTableRef } from '../ast/types';
import { sqlExprToRaPredicate } from './predicate';

export interface SqlToRaStep {
  order: number;
  operator: ASTNodeType | 'relation';
  symbol: string;
  summary: string;
  expressionFragment: string;
}

export interface RaExpressionBuild {
  expression: string;
  steps: SqlToRaStep[];
  diagnostics: Diagnostic[];
}

interface TableBinding {
  /** RA sub-expression for this FROM slot */
  expr: string;
  /** Name used in qualifiers (alias or relation name) */
  qualifier: string;
  relationName: string;
  range: SourceRange;
}

let stepCounter = 0;

function resetSteps(): void {
  stepCounter = 0;
}

function pushStep(
  steps: SqlToRaStep[],
  operator: ASTNodeType | 'relation',
  symbol: string,
  summary: string,
  expressionFragment: string
): void {
  stepCounter += 1;
  steps.push({
    order: stepCounter,
    operator,
    symbol,
    summary,
    expressionFragment,
  });
}

function wrapUnary(op: string, arg: string): string {
  return `${op} ( ${arg} )`;
}

function bindTable(
  ref: SqlTableRef,
  schemas: Record<string, RelationSchema>,
  steps: SqlToRaStep[]
): TableBinding {
  if (ref.subquery) {
    const inner = compileSetQuery(ref.subquery, schemas, steps);
    let expr = `( ${inner} )`;
    const qualifier = ref.alias ?? 'Q';
    if (ref.alias) {
      expr = wrapUnary(`ρ ${ref.alias}`, `( ${inner} )`);
    }
    return {
      expr,
      qualifier,
      relationName: qualifier,
      range: ref.range,
    };
  }

  const relationName = ref.relationName!;
  const schemaKey = Object.keys(schemas).find(
    (k) => k.toLowerCase() === relationName.toLowerCase()
  );
  if (!schemaKey) {
    throw new Error(`Unknown relation "${relationName}" in FROM clause.`);
  }
  const canonical = schemaKey;
  let expr = canonical;
  const qualifier = ref.alias ?? canonical;
  if (ref.alias && ref.alias !== canonical) {
    expr = wrapUnary(`ρ ${ref.alias}`, canonical);
  }
  return {
    expr,
    qualifier,
    relationName: canonical,
    range: ref.range,
  };
}

function compileFrom(from: SqlFromClause, schemas: Record<string, RelationSchema>, steps: SqlToRaStep[]): string {
  let left = bindTable(from.base, schemas, steps);
  let expr = left.expr;

  for (let i = 0; i < from.joins.length; i += 1) {
    const join = from.joins[i];
    const right = bindTable(join.right, schemas, steps);
    const combinedRange = { start: left.range.start, end: right.range.end };

    if (from.implicitCross[i] || join.kind === 'cross') {
      expr = `${expr} × ${right.expr}`;
      pushStep(
        steps,
        'cartesian_product',
        '×',
        `Combine ${left.qualifier} with ${right.qualifier} (Cartesian product).`,
        expr
      );
    } else if (join.kind === 'natural') {
      expr = `${expr} ⋈ ${right.expr}`;
      pushStep(
        steps,
        'natural_join',
        '⋈',
        `Natural join on common attribute names between ${left.qualifier} and ${right.qualifier}.`,
        expr
      );
    } else if (join.kind === 'left') {
      const pred = join.on ? `[ ${sqlExprToRaPredicate(join.on)} ]` : '';
      expr = `${expr} ⟕ ${pred} ${right.expr}`.replace(/\s+/g, ' ').trim();
      pushStep(
        steps,
        'left_join',
        '⟕',
        `Left outer join ${left.qualifier} with ${right.qualifier}.`,
        expr
      );
    } else if (join.kind === 'right') {
      const pred = join.on ? `[ ${sqlExprToRaPredicate(join.on)} ]` : '';
      expr = `${expr} ⟖ ${pred} ${right.expr}`.replace(/\s+/g, ' ').trim();
      pushStep(
        steps,
        'right_join',
        '⟖',
        `Right outer join ${left.qualifier} with ${right.qualifier}.`,
        expr
      );
    } else if (join.kind === 'full') {
      const pred = join.on ? `[ ${sqlExprToRaPredicate(join.on)} ]` : '';
      expr = `${expr} ⟗ ${pred} ${right.expr}`.replace(/\s+/g, ' ').trim();
      pushStep(
        steps,
        'full_join',
        '⟗',
        `Full outer join ${left.qualifier} with ${right.qualifier}.`,
        expr
      );
    } else {
      if (!join.on) {
        throw new Error('JOIN requires an ON predicate for theta join translation.');
      }
      const pred = sqlExprToRaPredicate(join.on);
      expr = `${expr} ⋈ [ ${pred} ] ${right.expr}`;
      pushStep(
        steps,
        'theta_join',
        '⋈θ',
        `Theta join ${left.qualifier} and ${right.qualifier} on ${pred}.`,
        expr
      );
    }

    left = {
      expr,
      qualifier: `${left.qualifier}+${right.qualifier}`,
      relationName: left.relationName,
      range: combinedRange,
    };
  }

  return expr;
}

function compileSelect(query: SqlSelectQuery, schemas: Record<string, RelationSchema>, steps: SqlToRaStep[]): string {
  if (!query.from) {
    throw new Error('FROM clause is required to map SQL into relational algebra.');
  }

  let expr = compileFrom(query.from, schemas, steps);

  if (query.where) {
    const pred = sqlExprToRaPredicate(query.where);
    expr = wrapUnary(`σ ${pred}`, expr);
    pushStep(steps, 'selection', 'σ', `Keep tuples satisfying ${pred}.`, expr);
  }

  const projectsAll =
    query.columns.length === 1 && query.columns[0].kind === 'all';

  if (!projectsAll) {
    const attrs: string[] = [];
    const renamePairs: string[] = [];
    for (const item of query.columns) {
      if (item.kind === 'all') {
        throw new Error('SELECT * cannot be mixed with other columns.');
      }
      const col = item.column!;
      const sourceName = col.name;
      attrs.push(sourceName);
      if (item.alias && item.alias !== sourceName) {
        renamePairs.push(`${sourceName} -> ${item.alias}`);
      }
    }
    expr = wrapUnary(`π ${attrs.join(', ')}`, expr);
    pushStep(
      steps,
      'projection',
      'π',
      `Project onto ${attrs.join(', ')} (duplicate tuples removed).`,
      expr
    );
    if (renamePairs.length > 0) {
      expr = wrapUnary(`ρ ${renamePairs.join(', ')}`, expr);
      pushStep(
        steps,
        'rename_attributes',
        'ρ',
        `Rename projected attributes (${renamePairs.join(', ')}).`,
        expr
      );
    }
  }

  return expr;
}

function compileSetQuery(query: SqlQuery, schemas: Record<string, RelationSchema>, steps: SqlToRaStep[]): string {
  if (query.type === 'select') {
    return compileSelect(query, schemas, steps);
  }

  const leftExpr = compileSetQuery(query.left, schemas, steps);
  const rightExpr = compileSetQuery(query.operation.right, schemas, steps);

  let expr: string;
  let op: ASTNodeType;
  let symbol: string;
  let summary: string;

  switch (query.operation.operator) {
    case 'union':
      op = 'union';
      symbol = '∪';
      summary = 'Set union (duplicates eliminated).';
      expr = `( ${leftExpr} ) ∪ ( ${rightExpr} )`;
      break;
    case 'intersect':
      op = 'intersection';
      symbol = '∩';
      summary = 'Set intersection.';
      expr = `( ${leftExpr} ) ∩ ( ${rightExpr} )`;
      break;
    case 'except':
      op = 'difference';
      symbol = '−';
      summary = 'Set difference (left minus right).';
      expr = `( ${leftExpr} ) − ( ${rightExpr} )`;
      break;
    default: {
      const _exhaustive: never = query.operation.operator;
      throw new Error(String(_exhaustive));
    }
  }

  pushStep(steps, op, symbol, summary, expr);
  return expr;
}

const AGGREGATE_PATTERN =
  /\b(COUNT|SUM|AVG|MIN|MAX|GROUP\s+BY|HAVING|OVER\s*\(|DISTINCT\s+COUNT)\b/i;

export function buildRaExpressionFromSqlAst(
  ast: SqlQuery,
  schemas: Record<string, RelationSchema>,
  rawSql: string
): RaExpressionBuild {
  resetSteps();
  const steps: SqlToRaStep[] = [];
  const diagnostics: Diagnostic[] = [];

  if (AGGREGATE_PATTERN.test(rawSql)) {
    diagnostics.push({
      code: 'E_SQL_UNSUPPORTED',
      severity: 'error',
      message:
        'Aggregations and window functions are outside pure relational algebra and cannot be translated.',
      range: ast.range,
    });
    return { expression: '', steps, diagnostics };
  }

  if (ast.type === 'set' && ast.operation.all) {
    diagnostics.push({
      code: 'E_SQL_BAG_SEMANTICS',
      severity: 'error',
      message:
        'UNION ALL / INTERSECT ALL / EXCEPT ALL preserve duplicate rows (bag semantics). RAT uses set semantics — remove ALL or rewrite with DISTINCT.',
      range: ast.operation.range,
    });
    return { expression: '', steps, diagnostics };
  }

  function checkSelectDistinct(q: SqlQuery): boolean {
    if (q.type === 'select') return q.distinct;
    return checkSelectDistinct(q.left) && checkSelectDistinct(q.operation.right);
  }

  if (!checkSelectDistinct(ast)) {
    diagnostics.push({
      code: 'E_SQL_BAG_SEMANTICS',
      severity: 'error',
      message:
        'Every SELECT in a translated query must include DISTINCT so results match set-based relational algebra.',
      range: ast.range,
    });
    return { expression: '', steps, diagnostics };
  }

  try {
    const expression = compileSetQuery(ast, schemas, steps);
    return { expression, steps, diagnostics };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SQL could not be translated.';
    diagnostics.push({
      code: 'E_SQL_UNSUPPORTED',
      severity: 'error',
      message,
      range: ast.range,
    });
    return { expression: '', steps, diagnostics };
  }
}
