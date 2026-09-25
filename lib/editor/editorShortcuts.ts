export interface EditorShortcutDoc {
  id: string;
  label: string;
  keysMac: string;
  keysWinLinux: string;
  description: string;
}

export const EDITOR_SHORTCUTS: EditorShortcutDoc[] = [
  {
    id: 'undo',
    label: 'Undo',
    keysMac: '⌘ Z',
    keysWinLinux: 'Ctrl+Z',
    description: 'Standard editor undo (including operator insertions).',
  },
  {
    id: 'redo',
    label: 'Redo',
    keysMac: '⌘ ⇧ Z',
    keysWinLinux: 'Ctrl+Shift+Z',
    description: 'Standard editor redo.',
  },
  {
    id: 'complete',
    label: 'Trigger autocomplete',
    keysMac: '⌃ Space',
    keysWinLinux: 'Ctrl+Space',
    description: 'Show schema-aware relation and attribute suggestions.',
  },
  {
    id: 'palette',
    label: 'Focus operator palette',
    keysMac: '⌘ ⇧ O',
    keysWinLinux: 'Ctrl+Shift+O',
    description: 'Move focus to the operator palette to pick a template.',
  },
  {
    id: 'shortcuts-help',
    label: 'Keyboard shortcuts',
    keysMac: '⌘ /',
    keysWinLinux: 'Ctrl+/',
    description: 'Open this shortcuts reference from the editor.',
  },
  {
    id: 'accept-complete',
    label: 'Accept completion',
    keysMac: 'Enter or Tab',
    keysWinLinux: 'Enter or Tab',
    description: 'Accept the highlighted autocomplete suggestion.',
  },
  {
    id: 'dismiss-complete',
    label: 'Dismiss completion',
    keysMac: 'Escape',
    keysWinLinux: 'Escape',
    description: 'Close the suggestion list without inserting.',
  },
];

export function formatShortcutKeys(doc: EditorShortcutDoc, isMac: boolean): string {
  return isMac ? doc.keysMac : doc.keysWinLinux;
}
