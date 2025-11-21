"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

const DefaultErrorFallback = ({
  error,
  retry,
}: {
  error?: Error;
  retry: () => void;
}) => (
  <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
    <div className="text-foreground mb-2 text-xl font-semibold">
      Something went wrong
    </div>
    <div className="text-muted-foreground mb-4 text-sm">
      {error?.message || "An unexpected error occurred"}
    </div>
    <button
      onClick={retry}
      className="bg-primary text-primary-foreground rounded px-4 py-2 transition-opacity hover:opacity-90"
    >
      Try again
    </button>
  </div>
);

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          {...(this.state.error && { error: this.state.error })}
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...(fallback && { fallback })}>
      <Component {...props} />
    </ErrorBoundary>
  );

  const componentDisplayName = Component.displayName
    ? `(${Component.displayName})`
    : "()";

  WrappedComponent.displayName = `withErrorBoundary${componentDisplayName}`;

  return WrappedComponent;
}
