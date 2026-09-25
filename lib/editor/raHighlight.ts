import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { tokenize } from '@/lib/engine/lexer';
import type { TokenType } from '@/lib/engine/types';

const mark = (className: string) => Decoration.mark({ class: className });

function classForToken(type: TokenType): string | null {
  if (type === 'EOF') return null;
  if (type.startsWith('OP_')) return 'cm-ra-operator';
  if (type === 'IDENTIFIER') return 'cm-ra-identifier';
  if (
    type === 'STRING_LITERAL' ||
    type === 'NUMBER_LITERAL' ||
    type === 'BOOLEAN_LITERAL' ||
    type === 'NULL_LITERAL'
  ) {
    return 'cm-ra-literal';
  }
  if (type === 'AND' || type === 'OR' || type === 'NOT' || type === 'IS') {
    return 'cm-ra-predicate';
  }
  if (
    type === 'EQ' ||
    type === 'NEQ' ||
    type === 'LT' ||
    type === 'LTE' ||
    type === 'GT' ||
    type === 'GTE'
  ) {
    return 'cm-ra-predicate';
  }
  if (
    type === 'LPAREN' ||
    type === 'RPAREN' ||
    type === 'LBRACKET' ||
    type === 'RBRACKET' ||
    type === 'COMMA' ||
    type === 'DOT' ||
    type === 'ARROW'
  ) {
    return 'cm-ra-punctuation';
  }
  return null;
}

function buildDecorations(doc: string): DecorationSet {
  const { tokens } = tokenize(doc);
  const spans: Array<{ from: number; to: number; value: Decoration }> = [];

  for (const token of tokens) {
    if (token.type === 'EOF') continue;
    const cls = classForToken(token.type);
    if (!cls) continue;
    const from = token.range.start.offset;
    const to = Math.max(token.range.end.offset, from);
    if (from >= doc.length) continue;
    spans.push({
      from,
      to: Math.min(to, doc.length),
      value: mark(cls),
    });
  }

  return Decoration.set(spans, true);
}

export const raSyntaxHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view.state.doc.toString());
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.state.doc.toString());
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
