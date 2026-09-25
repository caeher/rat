import React, { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      mono = true,
      disabled,
      id: customId,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const isInvalid = Boolean(error);

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

        <div className="relative">
          <textarea
            ref={ref}
            id={inputId}
            rows={rows}
            disabled={disabled}
            aria-invalid={isInvalid ? 'true' : undefined}
            aria-describedby={
              clsx(isInvalid && errorId, helperText && helperId) || undefined
            }
            className={twMerge(
              clsx(
                'w-full bg-[var(--color-card)] text-[var(--color-text)] placeholder:text-[var(--color-mist)] rounded-[4px] border p-3 leading-relaxed transition-colors',
                mono ? 'font-mono text-[13px]' : 'font-sans text-[14px]',
                isInvalid
                  ? 'border-[var(--color-crimson)] focus-visible:ring-[var(--color-crimson)]'
                  : 'border-[var(--color-outline)]/70 hover:border-[var(--color-outline)] focus-visible:border-[var(--color-ink)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-canvas)]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--color-elevated)]/50 resize-y',
                className
              )
            )}
            {...props}
          />
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-[12px] text-[var(--color-crimson)] flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
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

Textarea.displayName = 'Textarea';
