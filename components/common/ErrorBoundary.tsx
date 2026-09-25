import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 my-4 border border-[var(--color-crimson)]/30 bg-[var(--color-bone)] rounded-[4px]">
          <h3 className="text-[16px] font-medium text-[var(--color-crimson)] mb-2">
            Runtime Initialization Error
          </h3>
          <p className="text-[14px] text-[var(--color-driftwood)] mb-3">
            An error occurred while executing client-side functionality.
          </p>
          {this.state.error && (
            <pre className="p-3 bg-[var(--color-linen)] text-[12px] font-mono text-[var(--color-ink)] rounded-[4px] overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-3 py-1.5 text-[13px] bg-[var(--color-ink)] text-[var(--color-parchment)] rounded-[4px] hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
