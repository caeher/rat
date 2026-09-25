import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <Layout title="404 — Page Not Found | RAT">
      <div className="py-24 text-center max-w-md mx-auto">
        <span className="font-mono text-[13px] text-[var(--color-ember)] tracking-wide uppercase font-medium">
          404 Error
        </span>
        <h1 className="text-[36px] font-normal tracking-[-0.02em] text-[var(--color-text)] mt-2 mb-4">
          Relation Not Found
        </h1>
        <p className="text-[15px] text-[var(--color-driftwood)] leading-relaxed mb-8">
          The page or relation schema you requested does not exist in the working space.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="primary" size="md" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return to Overview
            </Button>
          </Link>
          <Link href="/sandbox">
            <Button variant="secondary" size="md">
              Go to Sandbox
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
