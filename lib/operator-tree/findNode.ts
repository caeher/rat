import type { ASTNode } from '@/lib/engine/types';
import { astChildNodes } from './astChildren';

export function findAstNodeById(root: ASTNode, nodeId: string): ASTNode | undefined {
  if (root.id === nodeId) return root;
  for (const child of astChildNodes(root)) {
    const found = findAstNodeById(child, nodeId);
    if (found) return found;
  }
  return undefined;
}
