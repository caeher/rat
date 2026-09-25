import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-outline)]/60 mt-20 py-12 px-6 bg-[var(--color-canvas)]">
      <div className="max-w-[1300px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono px-1.5 py-0.5 bg-[var(--color-card)] border border-[var(--color-outline)]/70 rounded-[3px] text-[12px] font-semibold text-[var(--color-text)]">
              RAT
            </span>
            <span className="text-[14px] font-medium text-[var(--color-text)]">
              Relational Algebra Translator
            </span>
          </div>
          <p className="text-[13px] text-[var(--color-driftwood)] leading-relaxed mb-4">
            Educational learning tool, relational algebra compiler, and browser sandbox.
          </p>
          <div className="text-[12px] font-mono text-[var(--color-ash)]">
            Static Client-Side Runtime
          </div>
        </div>

        {/* Modules */}
        <div>
          <h4 className="text-[14px] font-medium text-[var(--color-text)] mb-3">Platform</h4>
          <ul className="space-y-2 text-[13px] text-[var(--color-ash)]">
            <li>
              <Link href="/sandbox" className="hover:text-[var(--color-text)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]">
                Interactive Sandbox
              </Link>
            </li>
            <li>
              <Link href="/exercises" className="hover:text-[var(--color-text)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]">
                Practice Exercises
              </Link>
            </li>
            <li>
              <Link href="/reference" className="hover:text-[var(--color-text)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]">
                Operator Reference
              </Link>
            </li>
            <li>
              <Link href="/components" className="hover:text-[var(--color-text)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]">
                Component Showcase
              </Link>
            </li>
          </ul>
        </div>

        {/* Relational Algebra Operators */}
        <div>
          <h4 className="text-[14px] font-medium text-[var(--color-text)] mb-3">Operators</h4>
          <ul className="space-y-2 text-[13px] text-[var(--color-ash)] font-mono text-[12px]">
            <li>
              <Link href="/reference#selection" className="hover:text-[var(--color-accent)] transition-colors">
                σ Selection
              </Link>
            </li>
            <li>
              <Link href="/reference#projection" className="hover:text-[var(--color-accent)] transition-colors">
                π Projection
              </Link>
            </li>
            <li>
              <Link href="/reference#join" className="hover:text-[var(--color-accent)] transition-colors">
                ⋈ Natural Join
              </Link>
            </li>
            <li>
              <Link href="/reference#set-operations" className="hover:text-[var(--color-accent)] transition-colors">
                ∪ / − / ∩ Set Operations
              </Link>
            </li>
          </ul>
        </div>

        {/* Architecture & Open Source */}
        <div>
          <h4 className="text-[14px] font-medium text-[var(--color-text)] mb-3">Architecture</h4>
          <ul className="space-y-2 text-[13px] text-[var(--color-ash)]">
            <li className="text-[12px]">Zero backend dependency</li>
            <li className="text-[12px]">GitHub Pages static export</li>
            <li className="text-[12px]">Deterministic URL state sharing</li>
            <li className="text-[12px] font-mono text-[var(--color-driftwood)] pt-1">
              Next.js 16.3.6 (Pages Router)
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto mt-10 pt-6 border-t border-[var(--color-outline)]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[var(--color-ash)]">
        <div>© {new Date().getFullYear()} RAT. Open-source educational software.</div>
        <div className="font-mono text-[11px] text-[var(--color-driftwood)]">
          Parchment Design Tokens · WCAG AA
        </div>
      </div>
    </footer>
  );
}
