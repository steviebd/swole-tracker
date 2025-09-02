"use client";

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { GlassSurface } from '~/components/ui/glass-surface';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Production-ready Error Boundary with elegant fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In production, this would send to your error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      console.error('Error Boundary caught an error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    } else {
      console.group('🚨 Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderError() {
    const { error, errorInfo } = this.state;
    const isDevelopment = process.env.NODE_ENV === 'development';

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <GlassSurface className="p-6 text-center">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 mb-4 mx-auto rounded-full bg-red-100 dark:bg-red-900/30"
            >
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </motion.div>

            <h1 className="text-xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            
            <p className="text-muted-foreground mb-6 text-sm">
              We encountered an unexpected error. This has been automatically reported 
              and we're working to fix it.
            </p>

            {/* Error details for development */}
            {isDevelopment && error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left"
              >
                <div className="text-xs font-mono text-red-800 dark:text-red-200 space-y-2">
                  <div>
                    <strong>Error:</strong> {error.message}
                  </div>
                  {errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-600 hover:text-red-700">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-32">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                className="w-full"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>
            </div>

            {/* Development tools */}
            {isDevelopment && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 pt-4 border-t border-border/50"
              >
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Bug className="w-3 h-3" />
                  Development Mode - Full error details shown above
                </p>
              </motion.div>
            )}
          </GlassSurface>
        </motion.div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return this.renderError();
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallbackComponent} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for error boundary within functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  return { captureError, resetError };
}

/**
 * Async error boundary for handling promise rejections
 */
export function useAsyncError() {
  const { captureError } = useErrorHandler();

  return React.useCallback((error: Error) => {
    captureError(error);
  }, [captureError]);
}