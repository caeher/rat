import { keymap } from '@codemirror/view';
import { startCompletion } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';

export interface RaEditorKeymapHandlers {
  onFocusOperatorPalette?: () => void;
  onOpenShortcutsHelp?: () => boolean;
}

export function createRaEditorKeymap(handlers: RaEditorKeymapHandlers): Extension {
  return keymap.of([
    {
      key: 'Mod-Shift-o',
      run: () => {
        handlers.onFocusOperatorPalette?.();
        return true;
      },
    },
    {
      key: 'Mod-/',
      run: () => handlers.onOpenShortcutsHelp?.() ?? false,
    },
    {
      key: 'Mod-Space',
      run: startCompletion,
    },
  ]);
}
