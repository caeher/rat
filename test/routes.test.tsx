import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage from '@/pages/index';
import SandboxPage from '@/pages/sandbox';
import ExercisesPage from '@/pages/exercises';
import ReferencePage from '@/pages/reference';
import NotFoundPage from '@/pages/404';
import ComponentsShowcasePage from '@/pages/components';

// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    asPath: '/',
    query: {},
    push: vi.fn(),
  }),
}));

// Mock next/head
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Static Route Component Rendering', () => {
  it('renders HomePage with key branding and headlines', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /The modern interactive canvas for relational algebra/i,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Relational Algebra Translator/i).length).toBeGreaterThan(0);
  });

  it('renders SandboxPage with editor and toolbar', () => {
    render(<SandboxPage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Relational Algebra Sandbox/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Insert Operator:')).toBeInTheDocument();
  });

  it('renders ExercisesPage with problem catalogue', () => {
    render(<ExercisesPage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Relational Algebra Exercises/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('High-Earning Engineers')).toBeInTheDocument();
  });

  it('renders ReferencePage with operator definitions', () => {
    render(<ReferencePage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Relational Algebra Operator Reference/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Selection (Restrict)')).toBeInTheDocument();
  });

  it('renders NotFoundPage with return links', () => {
    render(<NotFoundPage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Relation Not Found/i,
      })
    ).toBeInTheDocument();
  });

  it('renders ComponentsShowcasePage with token swatches and interactive sections', () => {
    render(<ComponentsShowcasePage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /RAT Component Library & Tokens/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('1. Semantic Tokens & Contrast Ratios')).toBeInTheDocument();
  });
});
