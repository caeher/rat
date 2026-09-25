import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryResultTable } from '@/components/sandbox/QueryResultTable';
import type { RelationSchema } from '@/lib/engine/types';

const schema: RelationSchema = {
  name: 'out',
  attributes: [
    { name: 'name', type: 'string', nullable: false },
    { name: 'note', type: 'string', nullable: true },
  ],
};

describe('QueryResultTable', () => {
  it('renders NULL distinctly from empty string', () => {
    render(
      <QueryResultTable
        schema={schema}
        rows={[
          { name: 'α', note: null },
          { name: 'β', note: '' },
        ]}
      />
    );
    expect(screen.getByText('NULL')).toBeInTheDocument();
    expect(screen.getByText('(empty)')).toBeInTheDocument();
    expect(screen.getByText('α')).toBeInTheDocument();
  });

  it('paginates large results', () => {
    const rows = Array.from({ length: 55 }, (_, i) => ({
      name: `row-${i}`,
      note: null,
    }));
    render(<QueryResultTable schema={schema} rows={rows} pageSize={50} />);
    expect(screen.getByText('row-0')).toBeInTheDocument();
    expect(screen.queryByText('row-50')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('row-50')).toBeInTheDocument();
  });

  it('exposes accessible column headers with types', () => {
    render(
      <QueryResultTable
        schema={schema}
        rows={[{ name: 'only', note: 'x' }]}
      />
    );
    const table = screen.getByRole('table');
    expect(within(table).getByText('name')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sort by name, type string/)).toBeInTheDocument();
  });
});
