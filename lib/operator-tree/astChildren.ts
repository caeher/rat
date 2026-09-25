import type { ASTNode } from '@/lib/engine/types';

/** Child AST nodes in evaluation order (left before right for binary ops). */
export function astChildNodes(node: ASTNode): ASTNode[] {
  switch (node.type) {
    case 'relation':
      return [];
    case 'selection':
    case 'projection':
    case 'rename_relation':
    case 'rename':
    case 'rename_attributes':
      return [node.child];
    case 'cartesian_product':
    case 'natural_join':
    case 'theta_join':
    case 'left_join':
    case 'right_join':
    case 'full_join':
    case 'union':
    case 'difference':
    case 'intersection':
    case 'division':
      return [node.left, node.right];
    default:
      return [];
  }
}

export function isBinaryOperator(node: ASTNode): boolean {
  return astChildNodes(node).length === 2;
}
