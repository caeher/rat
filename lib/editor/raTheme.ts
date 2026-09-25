import { EditorView } from '@codemirror/view';

/** RAT parchment-atelier theme aligned with LL.md CSS variables. */
export const raEditorTheme = EditorView.theme(
  {
    '&': {
      fontSize: '13px',
      fontFamily: 'var(--font-mono)',
      backgroundColor: 'var(--color-card)',
      color: 'var(--color-text)',
    },
    '&.cm-focused': {
      outline: '2px solid var(--color-ink)',
      outlineOffset: '1px',
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      lineHeight: '1.55',
      minHeight: '7.5rem',
      maxHeight: 'min(40vh, 280px)',
    },
    '.cm-content': {
      padding: '12px 0',
      caretColor: 'var(--color-ink)',
    },
    '.cm-line': {
      padding: '0 12px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-canvas)',
      color: 'var(--color-ash)',
      border: 'none',
      borderRight: '1px solid color-mix(in srgb, var(--color-outline) 70%, transparent)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-elevated)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--color-elevated) 65%, transparent)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'color-mix(in srgb, var(--color-amber) 22%, var(--color-card))',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-ink)',
    },
    '.cm-ra-operator': {
      color: 'var(--color-ember)',
      fontWeight: '600',
    },
    '.cm-ra-relation': {
      color: 'var(--color-forest)',
    },
    '.cm-ra-identifier': {
      color: 'var(--color-text)',
    },
    '.cm-ra-literal': {
      color: 'var(--color-amber)',
    },
    '.cm-ra-predicate': {
      color: 'var(--color-driftwood)',
      fontStyle: 'italic',
    },
    '.cm-ra-punctuation': {
      color: 'var(--color-ash)',
    },
    '.cm-ra-comment': {
      color: 'var(--color-mist)',
      fontStyle: 'italic',
    },
    '.cm-lintRange-error': {
      backgroundImage: 'none',
      textDecoration: 'underline wavy var(--color-crimson)',
      textUnderlineOffset: '3px',
    },
    '.cm-lintRange-warning': {
      backgroundImage: 'none',
      textDecoration: 'underline wavy var(--color-amber)',
      textUnderlineOffset: '3px',
    },
    '.cm-lint-marker-error': {
      color: 'var(--color-crimson)',
    },
    '.cm-tooltip.cm-completionInfo': {
      backgroundColor: 'var(--color-card)',
      border: '1px solid color-mix(in srgb, var(--color-outline) 70%, transparent)',
      color: 'var(--color-text)',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
    },
    '.cm-tooltip.cm-completionIcon': {
      display: 'none',
    },
    '.cm-tooltip-autocomplete': {
      backgroundColor: 'var(--color-card)',
      border: '1px solid color-mix(in srgb, var(--color-outline) 70%, transparent)',
      borderRadius: '4px',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      '& > ul > li[aria-selected]': {
        backgroundColor: 'var(--color-elevated)',
        color: 'var(--color-text)',
      },
      '& > ul > li': {
        padding: '4px 8px',
      },
    },
    '.cm-completionLabel': {
      fontFamily: 'var(--font-mono)',
    },
    '.cm-completionDetail': {
      color: 'var(--color-ash)',
      fontStyle: 'normal',
    },
  },
  { dark: false }
);
