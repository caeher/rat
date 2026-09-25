import React, { ReactNode } from 'react';
import Head from 'next/head';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { NavigationBar } from './NavigationBar';
import { Footer } from './Footer';

export interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function Layout({
  children,
  title = 'RAT — Relational Algebra Translator & Sandbox',
  description = 'Educational learning tool and browser sandbox for Relational Algebra query translation, visualization, and execution.',
}: LayoutProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col bg-[var(--color-canvas)] text-[var(--color-text)]">
        <Head>
          <title>{title}</title>
          <meta name="description" content={description} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        {/* Accessible skip link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-[var(--color-ink)] focus:text-[var(--color-canvas)] focus:rounded-[4px] focus:outline-none"
        >
          Skip to main content
        </a>

        <NavigationBar />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[1300px] mx-auto px-4 sm:px-6 py-8 outline-none"
        >
          {children}
        </main>

        <Footer />
      </div>
    </TooltipProvider>
  );
}
