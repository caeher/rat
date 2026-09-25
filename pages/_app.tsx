import type { AppProps } from 'next/app';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { WorkspaceProvider } from '@/lib/persistence/WorkspaceProvider';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={200}>
        <WorkspaceProvider>
          <Component {...pageProps} />
        </WorkspaceProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
