import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Layout } from '@/components/layout/Layout';
import HomePage from '@/pages/index';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    asPath: '/',
    query: {},
    push: vi.fn(),
  }),
}));

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('core accessibility surfaces', () => {
  it('exposes skip link and main landmark in Layout', () => {
    render(
      <Layout title="Test">
        <p>Body</p>
      </Layout>
    );
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute(
      'href',
      '#main-content'
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('labels primary navigation on the home page shell', () => {
    render(<HomePage />);
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
  });

  it('includes reduced-motion rules in global styles', () => {
    const cssPath = path.join(process.cwd(), 'styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});
