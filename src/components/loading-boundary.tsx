"use client";

import React, { Suspense } from "react";

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

const SkeletonFallback = ({ name }: { name?: string }) => (
  <div className="space-y-4 p-4">
    <div className="bg-muted/50 h-4 w-3/4 animate-pulse rounded"></div>
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-muted/30 h-3 animate-pulse rounded"></div>
      ))}
    </div>
    {name && (
      <div className="text-muted-foreground mt-4 text-center text-xs">
        Loading {name}...
      </div>
    )}
  </div>
);

export function LoadingBoundary({
  children,
  fallback,
  name,
}: LoadingBoundaryProps) {
  const defaultFallback = fallback || (
    <SkeletonFallback {...(name && { name })} />
  );

  return <Suspense fallback={defaultFallback}>{children}</Suspense>;
}

// Specialized loading boundaries for different UI patterns
export const PageLoadingBoundary = ({
  children,
  name,
}: {
  children: React.ReactNode;
  name?: string;
}) => (
  <LoadingBoundary
    fallback={
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-8">
          <div className="bg-muted/50 h-8 w-48 rounded"></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted/30 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
        {name && (
          <div className="text-muted-foreground mt-8 text-center text-sm">
            Loading {name} page...
          </div>
        )}
      </div>
    }
    {...(name && { name })}
  >
    {children}
  </LoadingBoundary>
);

export const CardLoadingBoundary = ({
  children,
  name,
}: {
  children: React.ReactNode;
  name?: string;
}) => (
  <LoadingBoundary
    fallback={
      <div className="space-y-3 rounded-lg border p-4">
        <div className="bg-muted/50 h-4 animate-pulse rounded"></div>
        <div className="bg-muted/30 h-3 w-4/5 animate-pulse rounded"></div>
        <div className="bg-muted/30 h-3 w-3/5 animate-pulse rounded"></div>
        {name && (
          <div className="text-muted-foreground pt-2 text-xs">
            Loading {name}...
          </div>
        )}
      </div>
    }
    {...(name && { name })}
  >
    {children}
  </LoadingBoundary>
);

export const ListLoadingBoundary = ({
  children,
  name,
}: {
  children: React.ReactNode;
  name?: string;
}) => (
  <LoadingBoundary
    fallback={
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3">
            <div className="bg-muted/40 h-4 w-4 animate-pulse rounded"></div>
            <div className="bg-muted/40 h-3 flex-1 animate-pulse rounded"></div>
          </div>
        ))}
        {name && (
          <div className="text-muted-foreground pt-2 text-center text-xs">
            Loading {name}...
          </div>
        )}
      </div>
    }
    {...(name && { name })}
  >
    {children}
  </LoadingBoundary>
);
