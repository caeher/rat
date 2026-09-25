import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

describe('Form Controls (Input & Textarea)', () => {
  it('renders Input with label and handles valid states', () => {
    render(
      <Input
        label="Relation Name"
        helperText="Enter a valid identifier"
        placeholder="e.g. Students"
      />
    );
    expect(screen.getByLabelText(/Relation Name/i)).toBeInTheDocument();
    expect(screen.getByText('Enter a valid identifier')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Students')).toBeInTheDocument();
  });

  it('renders Input in invalid state with aria-invalid and error alert', () => {
    render(
      <Input
        label="Filter Predicate"
        error="Syntax error: invalid comparison operator"
      />
    );
    const input = screen.getByLabelText(/Filter Predicate/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText('Syntax error: invalid comparison operator')
    ).toBeInTheDocument();
  });

  it('renders Textarea with monospace font for expressions', () => {
    render(
      <Textarea
        label="Expression Editor"
        defaultValue="σ salary > 50000 ( Employees )"
        mono
      />
    );
    const textarea = screen.getByLabelText(/Expression Editor/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('σ salary > 50000 ( Employees )');
  });
});
