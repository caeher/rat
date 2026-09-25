import type { ReferenceExecutableExample } from '@/lib/reference/types';
import type { SandboxAction } from '@/lib/sandbox/reducer';
import type { BundledPresetId } from '@/lib/sandbox/presets/types';

export function applyReferenceExampleToSandbox(
  dispatch: (action: SandboxAction) => void,
  example: ReferenceExecutableExample
): void {
  if (example.preset === 'lesson') {
    dispatch({ type: 'LOAD_LESSON_SCHEMA' });
    return;
  }
  dispatch({ type: 'LOAD_PRESET', presetId: example.preset as BundledPresetId });
}

export function sandboxNeedsExampleConfirm(expression: string, dataVersion: number): boolean {
  return expression.trim().length > 0 || dataVersion > 1;
}
