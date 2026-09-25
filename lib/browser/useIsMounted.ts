import { useEffect, useState } from 'react';

/**
 * Hook to determine if the component has mounted on the client.
 * Essential for preventing hydration mismatches when using browser-only APIs.
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}

/**
 * Checks if the current environment is a browser.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
