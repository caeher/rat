import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import type { ASTNode, ASTNodeType } from '@/lib/engine/types';
import { operatorSymbolFor } from '@/lib/evaluator/trace';

function operatorName(type: ASTNodeType): string {
  if (type === 'relation') return 'Relation';
  const contract = OPERATOR_CONTRACTS[type as keyof typeof OPERATOR_CONTRACTS];
  return contract?.name ?? type;
}

function predicateSummary(node: ASTNode): string | undefined {
  if (node.type === 'selection' || node.type === 'theta_join') {
    const pred = node.predicate;
    if (typeof pred === 'string') {
      const trimmed = pred.trim();
      return trimmed.length > 48 ? `${trimmed.slice(0, 45)}…` : trimmed;
    }
  }
  return undefined;
}

export interface OperatorTreeNodeLabel {
  symbol: string;
  title: string;
  subtitle?: string;
  /** Short stable disambiguator when relation names repeat */
  disambiguator: string;
}

export function labelForAstNode(node: ASTNode): OperatorTreeNodeLabel {
  const symbol = operatorSymbolFor(node.type);
  const name = operatorName(node.type);
  const disambiguator = node.id.replace(/^node_/, '#');

  switch (node.type) {
    case 'relation':
      return {
        symbol: 'R',
        title: node.relationName,
        subtitle: `base relation · ${disambiguator}`,
        disambiguator,
      };
    case 'projection':
      return {
        symbol,
        title: name,
        subtitle: node.attributes.join(', '),
        disambiguator,
      };
    case 'rename_relation':
    case 'rename':
      return {
        symbol,
        title: name,
        subtitle: `→ ${node.newRelationName}`,
        disambiguator,
      };
    case 'rename_attributes':
      return {
        symbol,
        title: name,
        subtitle: Object.entries(node.attributeMap)
          .map(([from, to]) => `${from}→${to}`)
          .join(', '),
        disambiguator,
      };
    case 'selection':
    case 'theta_join':
      return {
        symbol,
        title: name,
        subtitle: predicateSummary(node),
        disambiguator,
      };
    case 'natural_join':
      return {
        symbol,
        title: 'Natural join',
        subtitle: '⋈ on common names',
        disambiguator,
      };
    case 'left_join':
      return { symbol, title: 'Left outer join', subtitle: '⟕', disambiguator };
    case 'right_join':
      return { symbol, title: 'Right outer join', subtitle: '⟖', disambiguator };
    case 'full_join':
      return { symbol, title: 'Full outer join', subtitle: '⟗', disambiguator };
    case 'cartesian_product':
      return { symbol, title: 'Cartesian product', subtitle: '⨯', disambiguator };
    case 'union':
      return { symbol, title: 'Union', subtitle: '∪', disambiguator };
    case 'difference':
      return { symbol, title: 'Difference', subtitle: '−', disambiguator };
    case 'intersection':
      return { symbol, title: 'Intersection', subtitle: '∩', disambiguator };
    case 'division':
      return { symbol, title: 'Division', subtitle: '÷', disambiguator };
    default:
      return { symbol, title: name, disambiguator };
  }
}

export function accessibilityLabelForNode(
  node: ASTNode,
  stepStatus: 'active' | 'completed' | 'failed' | 'unevaluated' | 'structural'
): string {
  const { title, subtitle, disambiguator } = labelForAstNode(node);
  const statusText =
    stepStatus === 'active'
      ? 'active step'
      : stepStatus === 'completed'
        ? 'evaluated in last run'
        : stepStatus === 'failed'
          ? 'failed in last run'
          : stepStatus === 'unevaluated'
            ? 'not reached in last run'
            : 'structure only, re-run to evaluate';
  const detail = subtitle ? `, ${subtitle}` : '';
  return `${title}${detail}, node ${disambiguator}, ${statusText}`;
}
