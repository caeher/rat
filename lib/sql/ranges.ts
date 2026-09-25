import type { SourceRange } from '@/lib/engine/types';

export function emptySqlRange(): SourceRange {
  return {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
  };
}
