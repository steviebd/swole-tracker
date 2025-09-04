"use client";

import { Suspense } from 'react';

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

const DefaultFallback = ({ name }: { name?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    {name && (
      <span className="ml-3 text-sm text-muted-foreground">
        Loading {name}...
      </span>
    )}
  </div>
);

const SkeletonFallback = ({ name }: { name?: string }) => (
  <div className="space-y-4 p-4">
    <div className="h-4 bg-muted/50 rounded w-3/4 animate-pulse"></div>
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-3 bg-muted/30 rounded animate-pulse"></div>
      ))}
    </div>
    {name && (
      <div className="text-xs text-muted-foreground text-center mt-4">
        Loading {name}...
      </div>
    )}
  </div>
);

export function LoadingBoundary({ 
  children, 
  fallback, 
  name 
}: LoadingBoundaryProps) {
  const defaultFallback = fallback || <SkeletonFallback name={name} />;

  return (
    <Suspense fallback={defaultFallback}>
      {children}
    </Suspense>
  );
}

// Specialized loading boundaries for different UI patterns
export const PageLoadingBoundary = ({ children, name }: { children: React.ReactNode; name?: string }) => (
  <LoadingBoundary
    fallback={
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted/50 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted/30 rounded-lg"></div>
            ))}
          </div>
        </div>
        {name && (
          <div className="text-center mt-8 text-sm text-muted-foreground">
            Loading {name} page...
          </div>
        )}
      </div>
    }
    name={name}
  >
    {children}
  </LoadingBoundary>
);

export const CardLoadingBoundary = ({ children, name }: { children: React.ReactNode; name?: string }) => (
  <LoadingBoundary
    fallback={
      <div className="border rounded-lg p-4 space-y-3">
        <div className="h-4 bg-muted/50 rounded animate-pulse"></div>
        <div className="h-3 bg-muted/30 rounded w-4/5 animate-pulse"></div>
        <div className="h-3 bg-muted/30 rounded w-3/5 animate-pulse"></div>
        {name && (
          <div className="text-xs text-muted-foreground pt-2">
            Loading {name}...
          </div>
        )}
      </div>
    }
    name={name}
  >
    {children}
  </LoadingBoundary>
);

export const ListLoadingBoundary = ({ children, name }: { children: React.ReactNode; name?: string }) => (
  <LoadingBoundary
    fallback={
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3">
            <div className="h-4 w-4 bg-muted/40 rounded animate-pulse"></div>
            <div className="h-3 bg-muted/40 rounded flex-1 animate-pulse"></div>
          </div>
        ))}
        {name && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Loading {name}...
          </div>
        )}
      </div>
    }
    name={name}
  >
    {children}
  </LoadingBoundary>
);