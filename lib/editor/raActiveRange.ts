import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import type { SourceRange } from '@/lib/engine/types';

export const setActiveExpressionRange = StateEffect.define<SourceRange | null>();

const activeRangeMark = Decoration.mark({ class: 'cm-ra-active-subexpression' });

const activeRangeField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    let next = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setActiveExpressionRange)) {
        const range = effect.value;
        if (!range) {
          next = Decoration.none;
        } else {
          const from = Math.max(0, range.start.offset);
          const to = Math.max(from, range.end.offset);
          next =
            from < to
              ? Decoration.set([{ from, to, value: activeRangeMark }])
              : Decoration.none;
        }
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const raActiveRangeHighlight = activeRangeField;

export function dispatchActiveRange(view: EditorView, range: SourceRange | null): void {
  view.dispatch({ effects: setActiveExpressionRange.of(range) });
}
