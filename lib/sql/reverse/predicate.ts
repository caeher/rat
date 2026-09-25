import type { SqlExpr } from '../ast/types';

function escapeRaString(value: string): string {
  if (value.includes('"') && !value.includes("'")) {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function sqlExprToRaPredicate(expr: SqlExpr): string {
  switch (expr.type) {
    case 'binary':
      return `(${sqlExprToRaPredicate(expr.left)} ${expr.operator} ${sqlExprToRaPredicate(expr.right)})`;
    case 'unary':
      return `(NOT ${sqlExprToRaPredicate(expr.operand)})`;
    case 'comparison': {
      const left = sqlExprToRaPredicate(expr.left);
      const right = sqlExprToRaPredicate(expr.right);
      const op = expr.operator === '<>' ? '!=' : expr.operator;
      return `${left} ${op} ${right}`;
    }
    case 'is_null': {
      const col = formatRaColumn(expr.operand);
      return expr.negated ? `${col} IS NOT NULL` : `${col} IS NULL`;
    }
    case 'column':
      return formatRaColumn(expr);
    case 'literal':
      if (expr.value === null) return 'NULL';
      if (typeof expr.value === 'boolean') return expr.value ? 'TRUE' : 'FALSE';
      if (typeof expr.value === 'number') return String(expr.value);
      return escapeRaString(String(expr.value));
    case 'paren':
      return `(${sqlExprToRaPredicate(expr.inner)})`;
    default: {
      const _exhaustive: never = expr;
      return String(_exhaustive);
    }
  }
}

function formatRaColumn(col: { qualifier?: string; name: string }): string {
  if (col.qualifier) {
    return `${col.qualifier}.${col.name}`;
  }
  return col.name;
}
