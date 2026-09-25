import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

describe('Dialog Component', () => {
  it('opens dialog on trigger click and announces title and description', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Query AST</DialogTitle>
            <DialogDescription>Review the abstract syntax tree for this query.</DialogDescription>
          </DialogHeader>
          <div>AST Content</div>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByText('Export Query AST')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /Open Dialog/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Export Query AST')).toBeInTheDocument();
    expect(
      screen.getByText('Review the abstract syntax tree for this query.')
    ).toBeInTheDocument();
  });
});
