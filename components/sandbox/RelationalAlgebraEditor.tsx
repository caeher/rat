import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useMemo,
} from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { completionKeymap } from '@codemirror/autocomplete';
import { lintGutter, forceLinting } from '@codemirror/lint';
import type { RelationSchema, SourceRange, ValidationResult } from '@/lib/engine/types';
import { dispatchActiveRange, raActiveRangeHighlight } from '@/lib/editor/raActiveRange';
import { raEditorTheme } from '@/lib/editor/raTheme';
import { raSyntaxHighlight } from '@/lib/editor/raHighlight';
import { createRaLinter } from '@/lib/editor/raLinter';
import { prepareTemplate, firstPlaceholderSelection } from '@/lib/editor/insertTemplate';
import { createRaCompletion } from '@/lib/editor/raCompletion';
import { createRaEditorKeymap } from '@/lib/editor/raEditorKeymap';

export interface RelationalAlgebraEditorHandle {
  insertAtCursor: (text: string) => void;
  insertTemplate: (template: string) => void;
  focus: () => void;
  scrollToOffset: (offset: number) => void;
}

export interface RelationalAlgebraEditorProps {
  value: string;
  onChange: (value: string) => void;
  validation: ValidationResult;
  schemas: Record<string, RelationSchema>;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  placeholder?: string;
  onFocusOperatorPalette?: () => void;
  onOpenShortcutsHelp?: () => boolean;
  /** Highlights the source span of the active operator-tree / trace step. */
  activeSubexpressionRange?: SourceRange | null;
}

export const RelationalAlgebraEditor = forwardRef<
  RelationalAlgebraEditorHandle,
  RelationalAlgebraEditorProps
>(function RelationalAlgebraEditor(
  {
    value,
    onChange,
    validation,
    schemas,
    id,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    placeholder,
    onFocusOperatorPalette,
    onOpenShortcutsHelp,
    activeSubexpressionRange = null,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const validationRef = useRef(validation);
  validationRef.current = validation;

  const schemasRef = useRef(schemas);
  schemasRef.current = schemas;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const paletteRef = useRef(onFocusOperatorPalette);
  paletteRef.current = onFocusOperatorPalette;

  const shortcutsRef = useRef(onOpenShortcutsHelp);
  shortcutsRef.current = onOpenShortcutsHelp;

  const extensions = useMemo((): Extension[] => {
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      createRaCompletion({
        getSchemas: () => schemasRef.current,
        getIsIncomplete: () => validationRef.current.isIncomplete,
      }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
      ]),
      createRaEditorKeymap({
        onFocusOperatorPalette: () => paletteRef.current?.(),
        onOpenShortcutsHelp: () => shortcutsRef.current?.() ?? false,
      }),
      raEditorTheme,
      raSyntaxHighlight,
      raActiveRangeHighlight,
      lintGutter(),
      createRaLinter({ getValidation: () => validationRef.current }),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.contentAttributes.of({
        ...(id ? { id } : {}),
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        ...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {}),
        'aria-multiline': 'true',
        role: 'textbox',
        spellcheck: 'false',
        autocapitalize: 'off',
        autocomplete: 'off',
      }),
    ];
  }, [ariaDescribedBy, ariaLabel, id]);

  const dispatchInsert = (view: EditorView, insertText: string, selection?: { anchor: number; head?: number }) => {
    const { from, to } = view.state.selection.main;
    const anchor = selection?.anchor ?? from + insertText.length;
    const head = selection?.head ?? anchor;
    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor, head },
      scrollIntoView: true,
    });
    view.focus();
  };

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const view = viewRef.current;
      if (!view) return;
      dispatchInsert(view, text);
    },
    insertTemplate(template: string) {
      const view = viewRef.current;
      if (!view) return;
      const prepared = prepareTemplate(template);
      const { from } = view.state.selection.main;
      const selection = firstPlaceholderSelection(from, prepared);
      dispatchInsert(view, prepared.text, selection ?? { anchor: from + prepared.text.length });
    },
    focus() {
      viewRef.current?.focus();
    },
    scrollToOffset(offset: number) {
      const view = viewRef.current;
      if (!view) return;
      const pos = Math.min(Math.max(0, offset), view.state.doc.length);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
      });
      view.focus();
    },
  }));

  useEffect(() => {
    if (!containerRef.current || viewRef.current) return;

    const startState = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      const end = value.length;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        selection: { anchor: end },
      });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (view) forceLinting(view);
  }, [validation]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    dispatchActiveRange(view, activeSubexpressionRange ?? null);
    if (activeSubexpressionRange) {
      const pos = activeSubexpressionRange.start.offset;
      view.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: 'nearest' }),
      });
    }
  }, [activeSubexpressionRange]);

  return (
    <div className="relative rounded-[4px] border border-[var(--color-outline)]/70 bg-[var(--color-card)] overflow-hidden">
      {placeholder && !value.trim() && (
        <span
          className="pointer-events-none absolute left-3 top-3 text-[13px] font-mono text-[var(--color-mist)] z-10"
          aria-hidden
        >
          {placeholder}
        </span>
      )}
      <div ref={containerRef} className="min-h-[7.5rem] w-full" />
    </div>
  );
});
