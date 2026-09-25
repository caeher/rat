import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'amber' | 'forest' | 'crimson';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      disabled = false,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    const baseStyles =
      'inline-flex items-center justify-center font-normal rounded-[4px] transition-colors ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] ' +
      'disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'text-[12px] px-2.5 py-1 gap-1.5 min-h-[28px]',
      md: 'text-[14px] px-3.5 py-1.5 gap-2 min-h-[36px]',
      lg: 'text-[15px] px-5 py-2.5 gap-2.5 min-h-[44px]',
    };

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-[var(--color-ink)] text-[var(--color-canvas)] hover:bg-[#3d3b32] active:bg-[#1a1914] border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
      secondary:
        'bg-[var(--color-elevated)] text-[var(--color-ink)] hover:bg-[#dcdbd4] active:bg-[#cecdc6] border border-[var(--color-outline)]/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
      ghost:
        'bg-transparent text-[var(--color-ink)]/75 hover:text-[var(--color-ink)] hover:bg-[var(--color-card)] active:bg-[var(--color-elevated)]',
      amber:
        'bg-[var(--color-amber)] text-[#fbfaf8] hover:bg-[#ab7328] active:bg-[#966320] border border-[var(--color-amber)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
      forest:
        'bg-[var(--color-forest)] text-[var(--color-canvas)] hover:bg-[#2c654d] active:bg-[#23523e] border border-[var(--color-forest)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
      crimson:
        'bg-[var(--color-crimson)] text-[var(--color-canvas)] hover:bg-[#b52449] active:bg-[#9c1c3c] border border-[var(--color-crimson)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
    };

    return (
      <Comp
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled ? 'true' : undefined}
        aria-busy={loading ? 'true' : undefined}
        className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-3.5 w-3.5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>{loadingText || children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
