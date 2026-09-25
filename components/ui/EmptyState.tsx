import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Database } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <Database className="w-8 h-8 text-[var(--color-ash)] opacity-60" />,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center text-center p-8 rounded-[4px] border border-dashed border-[var(--color-outline)]/80 bg-[var(--color-card)]/50',
          className
        )
      )}
    >
      <div className="mb-3 flex items-center justify-center">{icon}</div>
      <h3 className="text-[15px] font-normal text-[var(--color-text)] mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-[var(--color-driftwood)] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
