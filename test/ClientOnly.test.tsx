import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClientOnly } from '@/components/common/ClientOnly';

describe('ClientOnly Component', () => {
  it('renders children when mounted in jsdom environment', () => {
    render(
      <ClientOnly fallback={<div>Loading...</div>}>
        <div data-testid="client-child">Interactive Canvas</div>
      </ClientOnly>
    );

    expect(screen.getByTestId('client-child')).toBeInTheDocument();
    expect(screen.getByText('Interactive Canvas')).toBeInTheDocument();
  });
});
