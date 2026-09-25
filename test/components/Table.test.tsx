import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataTable } from '@/components/ui/Table';

describe('Table & DataTable Component', () => {
  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Employee Name', mono: false },
    { key: 'salary', header: 'Salary' },
  ];

  const data = [
    { id: 1, name: 'Alice Smith', salary: '$92,000' },
    { id: 2, name: 'Bob Jones', salary: '$65,000' },
  ];

  it('renders table headers and row tuples correctly', () => {
    render(<DataTable columns={columns} data={data} caption="Active Employees" />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Employee Name')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('$65,000')).toBeInTheDocument();
    expect(screen.getByText('Active Employees')).toBeInTheDocument();
  });

  it('renders empty message when dataset is empty', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="No tuples matched the query predicate."
      />
    );
    expect(
      screen.getByText('No tuples matched the query predicate.')
    ).toBeInTheDocument();
  });
});
