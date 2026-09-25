import React from 'react';
import { Tag } from '@/components/ui/Tag';
import type { TupleValue } from '@/lib/engine/types';
import type { SandboxAttributeType } from '@/lib/sandbox/constants';
import { classifyCellDisplay } from '@/lib/sandbox/validateCell';

export interface SandboxValueCellProps {
  value: TupleValue;
  type: SandboxAttributeType;
}

export function SandboxValueCell({ value, type }: SandboxValueCellProps) {
  const kind = classifyCellDisplay(value, type);

  if (kind === 'null') {
    return (
      <Tag variant="default" className="font-mono text-[11px] italic opacity-80">
        NULL
      </Tag>
    );
  }

  if (kind === 'empty_string') {
    return (
      <span className="text-[var(--color-ash)] italic font-mono text-[12px]" title="Empty string">
        (empty)
      </span>
    );
  }

  if (kind === 'zero') {
    return (
      <span className="font-mono text-[12px] text-[var(--color-text)]" title="Numeric zero">
        <span className="text-[var(--color-amber)]">0</span>
      </span>
    );
  }

  return (
    <span className="font-mono text-[12px] text-[var(--color-text)]">
      {String(value)}
    </span>
  );
}
