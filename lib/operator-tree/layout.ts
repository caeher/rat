import type { ASTNode } from '@/lib/engine/types';
import { astChildNodes } from './astChildren';
import { labelForAstNode } from './labels';

export interface LayoutNode {
  id: string;
  ast: ASTNode;
  x: number;
  y: number;
  width: number;
  height: number;
  label: ReturnType<typeof labelForAstNode>;
}

export interface LayoutEdge {
  fromId: string;
  toId: string;
  /** Input slot on parent: 0 = left/first, 1 = right/second */
  inputIndex: number;
}

export interface OperatorTreeLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: { width: number; height: number };
}

const NODE_WIDTH = 132;
const NODE_HEIGHT = 56;
const H_GAP = 24;
const V_GAP = 72;

interface InternalNode {
  ast: ASTNode;
  children: InternalNode[];
  subtreeWidth: number;
  xCenter: number;
  depth: number;
}

function measure(ast: ASTNode, depth: number): InternalNode {
  const children = astChildNodes(ast).map((c) => measure(c, depth + 1));
  let subtreeWidth: number;
  if (children.length === 0) {
    subtreeWidth = NODE_WIDTH;
  } else if (children.length === 1) {
    subtreeWidth = Math.max(NODE_WIDTH, children[0].subtreeWidth);
  } else {
    subtreeWidth =
      children[0].subtreeWidth + H_GAP + children[1].subtreeWidth;
  }
  return { ast, children, subtreeWidth, xCenter: 0, depth };
}

function assignX(node: InternalNode, left: number): number {
  if (node.children.length === 0) {
    node.xCenter = left + NODE_WIDTH / 2;
    return left + NODE_WIDTH;
  }
  if (node.children.length === 1) {
    const child = node.children[0];
    const childLeft = left + (node.subtreeWidth - child.subtreeWidth) / 2;
    assignX(child, childLeft);
    node.xCenter = child.xCenter;
    return left + node.subtreeWidth;
  }
  const [leftChild, rightChild] = node.children;
  const leftBound = assignX(leftChild, left);
  const rightBound = assignX(rightChild, leftBound + H_GAP);
  node.xCenter = (leftChild.xCenter + rightChild.xCenter) / 2;
  return rightBound;
}

function flatten(
  node: InternalNode,
  nodes: LayoutNode[],
  edges: LayoutEdge[]
): void {
  const y = node.depth * (NODE_HEIGHT + V_GAP);
  nodes.push({
    id: node.ast.id,
    ast: node.ast,
    x: node.xCenter - NODE_WIDTH / 2,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    label: labelForAstNode(node.ast),
  });
  node.children.forEach((child, inputIndex) => {
    edges.push({ fromId: node.ast.id, toId: child.ast.id, inputIndex });
    flatten(child, nodes, edges);
  });
}

/** Root-at-top operator tree layout for the validated AST. */
export function layoutOperatorTree(root: ASTNode): OperatorTreeLayout {
  const tree = measure(root, 0);
  assignX(tree, 0);
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  flatten(tree, nodes, edges);
  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + n.width), 0);
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + n.height), 0);
  return {
    nodes,
    edges,
    bounds: {
      width: Math.max(maxX + 32, NODE_WIDTH + 32),
      height: Math.max(maxY + 32, NODE_HEIGHT + 32),
    },
  };
}
