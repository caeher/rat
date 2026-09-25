import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import {
  getPresetGuide,
  isSchemaSetDirty,
  listBundledPresets,
  type SandboxAction,
} from '@/lib/sandbox';
import type { BundledPresetId } from '@/lib/sandbox/presets/types';
import type { SandboxSchemaSet, SandboxState } from '@/lib/sandbox/types';
import { SANDBOX_LIMITS } from '@/lib/sandbox/constants';
import { BookOpen, RotateCcw, Sparkles } from 'lucide-react';

export interface PresetPanelProps {
  state: SandboxState;
  activeSchemaSet: SandboxSchemaSet;
  dispatch: (action: SandboxAction) => void;
}

export function PresetPanel({ state, activeSchemaSet, dispatch }: PresetPanelProps) {
  const [pendingLoad, setPendingLoad] = useState<BundledPresetId | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [guidePreset, setGuidePreset] = useState<BundledPresetId | null>(null);

  const presets = listBundledPresets();
  const atSchemaLimit = state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets;

  const loadPreset = useCallback(
    (presetId: BundledPresetId) => {
      dispatch({ type: 'LOAD_PRESET', presetId });
      setPendingLoad(null);
    },
    [dispatch]
  );

  const tryLoadPreset = useCallback(
    (presetId: BundledPresetId) => {
      if (atSchemaLimit) {
        setPendingLoad(presetId);
        return;
      }
      loadPreset(presetId);
    },
    [atSchemaLimit, loadPreset]
  );

  const tryReset = useCallback(() => {
    if (!activeSchemaSet.presetId) return;
    if (isSchemaSetDirty(activeSchemaSet, activeSchemaSet.presetId)) {
      setPendingReset(true);
      return;
    }
    dispatch({ type: 'RESET_PRESET', schemaSetId: activeSchemaSet.id });
  }, [activeSchemaSet, dispatch]);

  return (
    <div className="rounded-[4px] border border-[var(--color-outline)]/50 bg-[var(--color-canvas)] p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-4 h-4 text-[var(--color-amber)]" />
        <span className="text-[12px] font-medium text-[var(--color-text)]">Educational datasets</span>
        {activeSchemaSet.presetId ? (
          <Tag variant="forest">Preset: {activeSchemaSet.name}</Tag>
        ) : (
          <Tag variant="default">Custom schema</Tag>
        )}
      </div>
      <p className="text-[12px] text-[var(--color-driftwood)] leading-relaxed">
        Load University or Store as a new editable schema collection. Bundled originals stay read-only;
        reset restores your copy from the bundle.
      </p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <div key={preset.id} className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => tryLoadPreset(preset.id)}
              disabled={atSchemaLimit && !activeSchemaSet.presetId}
            >
              Load {preset.displayName}
            </Button>
            <Dialog
              open={guidePreset === preset.id}
              onOpenChange={(open) => setGuidePreset(open ? preset.id : null)}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2" aria-label={`${preset.displayName} guide`}>
                  <BookOpen className="w-3.5 h-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{preset.displayName} dataset guide</DialogTitle>
                  <DialogDescription>{getPresetGuide(preset.id).summary}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-[13px] text-[var(--color-driftwood)] max-h-[50vh] overflow-y-auto">
                  <div>
                    <h4 className="text-[12px] font-medium text-[var(--color-text)] mb-1">Relationships</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {getPresetGuide(preset.id).relationships.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[12px] font-medium text-[var(--color-text)] mb-1">Starter questions</h4>
                    <ul className="space-y-2">
                      {getPresetGuide(preset.id).starterQuestions.map((q) => (
                        <li key={q.title} className="border border-[var(--color-outline)]/40 rounded-[4px] p-2">
                          <div className="font-medium text-[var(--color-text)]">{q.title}</div>
                          <div className="text-[11px] text-[var(--color-ash)] mt-0.5">{q.concept}</div>
                          <pre className="mt-1 text-[11px] font-mono bg-[var(--color-elevated)] p-1.5 rounded-[2px] whitespace-pre-wrap">
                            {q.expressionHint}
                          </pre>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="gap-1"
          disabled={!activeSchemaSet.presetId}
          onClick={tryReset}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset preset data
        </Button>
      </div>

      <AlertDialog open={pendingLoad !== null} onOpenChange={(open) => !open && setPendingLoad(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load preset copy?</AlertDialogTitle>
            <AlertDialogDescription>
              You reached the {SANDBOX_LIMITS.maxSchemaSets} schema limit. Delete an unused schema, then load
              the preset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={atSchemaLimit}
              onClick={() => pendingLoad && loadPreset(pendingLoad)}
            >
              Load copy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingReset} onOpenChange={setPendingReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset preset data?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces all relations and rows in &ldquo;{activeSchemaSet.name}&rdquo; with the bundled
              original. Your edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                dispatch({ type: 'RESET_PRESET', schemaSetId: activeSchemaSet.id });
                setPendingReset(false);
              }}
            >
              Reset to bundled data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
