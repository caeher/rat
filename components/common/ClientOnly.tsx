import React, { ReactNode } from 'react';
import { useIsMounted } from '@/lib/browser/useIsMounted';

export interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Hydration-safe boundary that guarantees children only render after mounting on the browser client.
 * Use for editor components, localStorage consumers, Web Worker hooks, and WASM engines.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
