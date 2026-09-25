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
import { lintGutter, forceLinting } from '@codemirror/lint';
import type { ValidationResult } from '@/lib/engine/types';
import { raEditorTheme } from '@/lib/editor/raTheme';
import { raSyntaxHighlight } from '@/lib/editor/raHighlight';
import { createRaLinter } from '@/lib/editor/raLinter';

export interface RelationalAlgebraEditorHandle {
  insertAtCursor: (text: string) => void;
  focus: () => void;
  scrollToOffset: (offset: number) => void;
}

export interface RelationalAlgebraEditorProps {
  value: string;
  onChange: (value: string) => void;
  validation: ValidationResult;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  placeholder?: string;
}

export const RelationalAlgebraEditor = forwardRef<
  RelationalAlgebraEditorHandle,
  RelationalAlgebraEditorProps
>(function RelationalAlgebraEditor(
  {
    value,
    onChange,
    validation,
    id,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    placeholder,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const validationRef = useRef(validation);
  validationRef.current = validation;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extensions = useMemo((): Extension[] => {
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      raEditorTheme,
      raSyntaxHighlight,
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

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
      view.focus();
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
