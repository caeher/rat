import type { ASTNode } from '@/lib/engine/types';
import { astChildNodes } from './astChildren';
import { labelForAstNode } from './labels';

export interface OperatorTreeRow {
  nodeId: string;
  ast: ASTNode;
  depth: number;
  index: number;
  hasChildren: boolean;
  label: ReturnType<typeof labelForAstNode>;
}

/** Preorder rows for the keyboard-navigable textual tree. */
export function flattenOperatorTreeRows(root: ASTNode): OperatorTreeRow[] {
  const rows: OperatorTreeRow[] = [];
  let index = 0;

  function walk(node: ASTNode, depth: number): void {
    const children = astChildNodes(node);
    rows.push({
      nodeId: node.id,
      ast: node,
      depth,
      index,
      hasChildren: children.length > 0,
      label: labelForAstNode(node),
    });
    index += 1;
    for (const child of children) {
      walk(child, depth + 1);
    }
  }

  walk(root, 0);
  return rows;
}
