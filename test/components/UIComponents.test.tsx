import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tag } from '@/components/ui/Tag';
import { TerminalSnippet } from '@/components/ui/TerminalSnippet';
import { EmptyState } from '@/components/ui/EmptyState';
import { WindowFrame } from '@/components/ui/WindowFrame';

describe('Additional UI Components', () => {
  it('renders Tag with various variants', () => {
    render(<Tag variant="ember">emphasis</Tag>);
    expect(screen.getByText('emphasis')).toBeInTheDocument();
  });

  it('renders TerminalSnippet with command and copy trigger', () => {
    render(<TerminalSnippet command="rat eval 'σ salary > 50000(R)'" prompt="$" />);
    expect(screen.getByText(/rat eval/i)).toBeInTheDocument();
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('renders EmptyState with title, description, and status role', () => {
    render(
      <EmptyState
        title="No Results Found"
        description="Try relaxing query predicates."
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('No Results Found')).toBeInTheDocument();
    expect(screen.getByText('Try relaxing query predicates.')).toBeInTheDocument();
  });

  it('renders WindowFrame with tabs and chrome bar', () => {
    render(
      <WindowFrame
        title="RAT Evaluator"
        tabs={[{ id: '1', label: 'eval.ra', active: true }]}
      >
        <div>Content Inside Frame</div>
      </WindowFrame>
    );
    expect(screen.getByText('RAT Evaluator')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'eval.ra' })).toBeInTheDocument();
    expect(screen.getByText('Content Inside Frame')).toBeInTheDocument();
  });
});
