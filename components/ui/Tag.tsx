import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type TagVariant = 'default' | 'ember' | 'forest' | 'amber' | 'crimson';

export interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  className?: string;
}

export function Tag({ children, variant = 'default', className }: TagProps) {
  const variantStyles: Record<TagVariant, string> = {
    default: 'text-[var(--color-ash)] bg-transparent',
    ember:
      'text-[var(--color-ember)] bg-[var(--color-card)] border border-[var(--color-outline)]/60 px-1.5 py-0.5 rounded-[2px]',
    forest:
      'text-[var(--color-forest)] bg-[var(--color-card)] border border-[var(--color-outline)]/60 px-1.5 py-0.5 rounded-[2px]',
    amber:
      'text-[var(--color-amber)] bg-[var(--color-card)] border border-[var(--color-outline)]/60 px-1.5 py-0.5 rounded-[2px]',
    crimson:
      'text-[var(--color-crimson)] bg-[var(--color-card)] border border-[var(--color-crimson)]/40 px-1.5 py-0.5 rounded-[2px]',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'font-mono text-[11px] sm:text-[12px] inline-flex items-center tracking-tight font-medium select-none',
          variantStyles[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
}
