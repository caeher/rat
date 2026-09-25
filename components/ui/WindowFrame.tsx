import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface WindowFrameProps {
  title?: string;
  tabs?: { id: string; label: string; active?: boolean }[];
  onSelectTab?: (id: string) => void;
  children: ReactNode;
  className?: string;
}

export function WindowFrame({
  title = 'RAT Sandbox',
  tabs,
  onSelectTab,
  children,
  className,
}: WindowFrameProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-[var(--color-card)] rounded-[4px] border border-[var(--color-outline)]/60 overflow-hidden shadow-[rgba(38,37,30,0.12)_0px_20px_50px_0px,rgba(38,37,30,0.06)_0px_8px_20px_0px]',
          className
        )
      )}
    >
      {/* Chrome Top Bar */}
      <div className="min-h-10 px-3 sm:px-4 py-1.5 bg-[var(--color-elevated)]/60 border-b border-[var(--color-outline)]/60 flex items-center justify-between gap-2 select-none">
        <div className="hidden sm:flex items-center gap-1.5 w-12 shrink-0" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-stone)] inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-stone)] inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-stone)] inline-block" />
        </div>

        <div className="text-[12px] font-sans text-[var(--color-ash)] font-normal truncate flex-1 min-w-0">
          {title}
        </div>

        <div className="w-auto flex justify-end shrink-0 overflow-x-auto">
          {tabs && (
            <div className="flex items-center gap-1.5" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={tab.active ? 'true' : 'false'}
                  onClick={() => onSelectTab?.(tab.id)}
                  className={clsx(
                    'text-[11px] sm:text-[12px] font-mono px-2 py-0.5 rounded-[2px] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] cursor-pointer',
                    tab.active
                      ? 'bg-[var(--color-canvas)] text-[var(--color-text)] border border-[var(--color-outline)]/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-medium'
                      : 'text-[var(--color-driftwood)] hover:text-[var(--color-text)]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Frame Content */}
      <div className="p-4 bg-[var(--color-canvas)]">{children}</div>
    </div>
  );
}
