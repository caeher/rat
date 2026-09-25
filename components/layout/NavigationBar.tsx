import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Terminal, BookOpen, Layers, Play, Component } from 'lucide-react';

export function NavigationBar() {
  const router = useRouter();

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/sandbox', label: 'Sandbox', icon: Terminal },
    { href: '/exercises', label: 'Exercises', icon: Layers },
    { href: '/reference', label: 'Reference', icon: BookOpen },
    { href: '/components', label: 'Components', icon: Component },
  ];

  return (
    <header className="h-[52px] px-6 border-b border-[var(--color-outline)]/60 bg-[var(--color-canvas)]/90 backdrop-blur-xs sticky top-0 z-40">
      <div className="max-w-[1300px] h-full mx-auto flex items-center justify-between">
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

        {/* Center: Nav links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = router.pathname === link.href;
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

        {/* Right: Quick Launch CTA */}
        <div className="flex items-center gap-3">
          <Link href="/sandbox">
            <Button size="sm" variant="primary" className="hidden sm:inline-flex gap-1.5">
              <Play className="w-3 h-3 fill-current" />
              <span>Launch Sandbox</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
