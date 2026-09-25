import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders primary button with children', () => {
    render(<Button variant="primary">Evaluate Query</Button>);
    const button = screen.getByRole('button', { name: /Evaluate Query/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders disabled state with aria-disabled', () => {
    render(<Button disabled>Disabled Action</Button>);
    const button = screen.getByRole('button', { name: /Disabled Action/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders loading state with aria-busy and spinner', () => {
    render(
      <Button loading loadingText="Compiling...">
        Execute
      </Button>
    );
    const button = screen.getByRole('button', { name: /Compiling.../i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Compiling...')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { container: primaryContainer } = render(<Button variant="primary">Primary</Button>);
    expect(primaryContainer.firstChild).toHaveClass('bg-[var(--color-ink)]');

    const { container: secondaryContainer } = render(
      <Button variant="secondary">Secondary</Button>
    );
    expect(secondaryContainer.firstChild).toHaveClass('bg-[var(--color-elevated)]');
  });
});
