import React, { useCallback, useState } from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { EDITOR_SHORTCUTS, formatShortcutKeys } from '@/lib/editor/editorShortcuts';
import { useIsMounted } from '@/lib/browser/useIsMounted';

export interface EditorShortcutsDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditorShortcutsDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EditorShortcutsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isMounted = useIsMounted();
  const isMac = isMounted && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const defaultTrigger = (
    <Button variant="secondary" size="sm" className="gap-1.5" type="button">
      <Keyboard className="w-3.5 h-3.5" aria-hidden />
      Shortcuts
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Expression editor shortcuts</DialogTitle>
          <DialogDescription>
            Platform-aware bindings that avoid overriding standard browser copy, paste, and navigation.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <caption className="sr-only">Keyboard shortcuts for the relational algebra editor</caption>
            <thead>
              <tr className="border-b border-[var(--color-outline)]/60">
                <th scope="col" className="py-2 pr-3 font-medium text-[var(--color-text)]">
                  Action
                </th>
                <th scope="col" className="py-2 pr-3 font-medium text-[var(--color-text)] whitespace-nowrap">
                  Keys
                </th>
                <th scope="col" className="py-2 font-medium text-[var(--color-text)]">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {EDITOR_SHORTCUTS.map((shortcut) => (
                <tr key={shortcut.id} className="border-b border-[var(--color-outline)]/40 last:border-0">
                  <th scope="row" className="py-2 pr-3 font-normal text-[var(--color-text)] align-top">
                    {shortcut.label}
                  </th>
                  <td className="py-2 pr-3 font-mono text-[12px] text-[var(--color-ember)] whitespace-nowrap align-top">
                    <kbd>{formatShortcutKeys(shortcut, isMac)}</kbd>
                  </td>
                  <td className="py-2 text-[var(--color-driftwood)] align-top">{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useEditorShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const openShortcuts = useCallback(() => {
    setOpen(true);
    return true;
  }, []);
  return { open, setOpen, openShortcuts };
}
