import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Terminal, BookOpen, Layers, Play, Component, Menu, X, Repeat } from 'lucide-react';

export function NavigationBar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/sandbox', label: 'Sandbox', icon: Terminal },
    { href: '/exercises', label: 'Exercises', icon: Layers },
    { href: '/quiz', label: 'Quizzes', icon: Repeat },
    { href: '/reference', label: 'Reference', icon: BookOpen },
    { href: '/components', label: 'Components', icon: Component },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.asPath]);

  return (
    <header className="px-4 sm:px-6 border-b border-[var(--color-outline)]/60 bg-[var(--color-canvas)]/95 backdrop-blur-xs sticky top-0 z-40">
      <div className="max-w-[1300px] h-[52px] mx-auto flex items-center justify-between">
        {/* Left: Brand / Wordmark */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-[var(--color-text)] hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] rounded-[2px]"
          >
            <span className="font-mono px-1.5 py-0.5 bg-[var(--color-card)] border border-[var(--color-outline)]/70 rounded-[3px] text-[12px] font-semibold text-[var(--color-text)]">
              RAT
            </span>
            <span className="font-normal text-[14px] text-[var(--color-driftwood)] hidden sm:inline">
              Relational Algebra Translator
            </span>
          </Link>
        </div>

        {/* Center: Desktop Nav links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive =
              router.pathname === link.href || router.pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-3 py-1.5 rounded-[4px] text-[13px] transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
                  isActive
                    ? 'text-[var(--color-text)] bg-[var(--color-card)] border border-[var(--color-outline)]/70 font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                    : 'text-[var(--color-text)]/70 hover:text-[var(--color-text)] hover:bg-[var(--color-card)]/50'
                )}
              >
                {link.icon && <link.icon className="w-3.5 h-3.5 opacity-70" />}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Quick Launch CTA & Mobile Menu Toggle */}
        <div className="flex items-center gap-2">
          <Link href="/sandbox" className="hidden sm:inline-flex">
            <Button size="sm" variant="primary" className="gap-1.5">
              <Play className="w-3 h-3 fill-current" />
              <span>Launch Sandbox</span>
            </Button>
          </Link>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-[4px] text-[var(--color-text)] hover:bg-[var(--color-card)] border border-[var(--color-outline)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden py-3 border-t border-[var(--color-outline)]/40 space-y-1"
        >
          {navLinks.map((link) => {
            const isActive =
              router.pathname === link.href || router.pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  'px-3.5 py-2.5 rounded-[4px] text-[14px] transition-colors flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
                  isActive
                    ? 'text-[var(--color-text)] bg-[var(--color-card)] border border-[var(--color-outline)]/70 font-medium'
                    : 'text-[var(--color-text)]/75 hover:text-[var(--color-text)] hover:bg-[var(--color-card)]/60'
                )}
              >
                {link.icon && <link.icon className="w-4 h-4 opacity-75 shrink-0" />}
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 px-1">
            <Link href="/sandbox" onClick={() => setMobileMenuOpen(false)} className="w-full block">
              <Button size="md" variant="primary" className="w-full gap-2 justify-center">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Sandbox</span>
              </Button>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
