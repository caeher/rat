import React, { InputHTMLAttributes, forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  inputSize?: 'sm' | 'md' | 'lg';
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      inputSize = 'md',
      mono = false,
      disabled,
      id: customId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const isInvalid = Boolean(error);

    const sizeStyles = {
      sm: 'h-7 text-[12px] px-2.5 py-1',
      md: 'h-9 text-[14px] px-3 py-1.5',
      lg: 'h-11 text-[15px] px-3.5 py-2',
    };

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-[var(--color-text)] select-none flex items-center justify-between"
          >
            <span>{label}</span>
            {props.required && <span className="text-[var(--color-ember)] text-[12px]">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={isInvalid ? 'true' : undefined}
            aria-describedby={
              clsx(isInvalid && errorId, helperText && helperId) || undefined
            }
            className={twMerge(
              clsx(
                'w-full bg-[var(--color-card)] text-[var(--color-text)] placeholder:text-[var(--color-mist)] rounded-[4px] border transition-colors',
                mono ? 'font-mono' : 'font-sans',
                sizeStyles[inputSize],
                isInvalid
                  ? 'border-[var(--color-crimson)] focus-visible:ring-[var(--color-crimson)]'
                  : 'border-[var(--color-outline)]/70 hover:border-[var(--color-outline)] focus-visible:border-[var(--color-ink)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-canvas)]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--color-elevated)]/50',
                isInvalid && 'pr-8',
                className
              )
            )}
            {...props}
          />

          {isInvalid && (
            <div className="absolute right-2.5 pointer-events-none text-[var(--color-crimson)]" aria-hidden="true">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-[12px] text-[var(--color-crimson)] flex items-center gap-1 mt-0.5">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-[12px] text-[var(--color-driftwood)] mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
