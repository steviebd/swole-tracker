"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary specifically for authentication-related errors
 * Catches auth failures and provides graceful fallback UI with analytics tracking
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Auth Error:", error, errorInfo);
    
    // Track authentication error in analytics
    try {
      posthog.capture("auth_error", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    } catch (analyticsError) {
      console.warn("Failed to track auth error:", analyticsError);
    }

    // Show error toast notification
    toast.error("Authentication error occurred. Please try refreshing the page.", {
      duration: 5000,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Reload the page to reset auth state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided, otherwise default fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <AuthErrorFallback onRetry={this.handleRetry} error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Default fallback UI component for authentication errors
 */
function AuthErrorFallback({ 
  onRetry, 
  error 
}: { 
  onRetry: () => void; 
  error: Error | null; 
}) {
  return (
    <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-3 sm:px-4">
      <div className="glass-surface card p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl w-full min-w-0">
        <div className="space-y-4">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary">
            Authentication Error
          </h2>
          <p className="text-secondary">
            Something went wrong with the authentication system. 
            This might be a temporary issue.
          </p>
          {process.env.NODE_ENV === "development" && error && (
            <details className="text-left text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
              <summary className="cursor-pointer font-mono text-red-600 dark:text-red-400">
                Error Details (Dev Only)
              </summary>
              <pre className="mt-2 text-red-700 dark:text-red-300 overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onRetry}
              className="btn-primary px-6 py-2 rounded-lg"
            >
              Refresh Page
            </button>
            <a
              href="/sign-in"
              className="btn-outline px-6 py-2 rounded-lg text-center"
            >
              Go to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}