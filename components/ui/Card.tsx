import React, { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevated = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'bg-[var(--color-card)] rounded-[4px] border border-[var(--color-outline)]/50 p-6',
            elevated
              ? 'shadow-[rgba(38,37,30,0.12)_0px_20px_50px_0px,rgba(38,37,30,0.06)_0px_8px_20px_0px]'
              : 'shadow-[rgba(38,37,30,0.03)_0px_1px_3px_0px]',
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
