"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "~/providers/AuthProvider";
import { cn } from "~/lib/utils";

// Icon components
const PlusIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const WorkoutIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const TemplatesIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ProgressIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CloseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    label: "Start Workout",
    href: "/workout/start",
    icon: WorkoutIcon,
    description: "Begin a new workout session",
  },
  {
    label: "View Progress",
    href: "/workouts",
    icon: ProgressIcon,
    description: "Check workout history and stats",
  },
  {
    label: "Manage Templates",
    href: "/templates",
    icon: TemplatesIcon,
    description: "Create and edit workout templates",
  },
];

export interface FloatingActionButtonsProps {
  className?: string;
  hideOnPaths?: string[];
}

export function FloatingActionButtons({ 
  className,
  hideOnPaths = ["/workout/session", "/workout/start"] 
}: FloatingActionButtonsProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Close FAB when route changes
    setIsExpanded(false);
  }, [pathname]);

  // Handle click outside to close
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.fab-group')) {
        setIsExpanded(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExpanded]);

  const toggleFAB = () => {
    setIsExpanded(!isExpanded);
  };

  // Don't render if not authenticated or on hidden paths
  if (!mounted || !user) {
    return null;
  }

  // Hide on specific paths
  if (pathname && hideOnPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  return (
    <div className={cn("fab-group", isExpanded && "expanded", className)}>
      {/* Secondary action buttons */}
      {quickActions.map((action, index) => {
        const Icon = action.icon;
        const delay = index * 50; // Stagger animation
        
        return (
          <div key={action.href} className="relative">
            <Link
              href={action.href}
              className="fab-secondary touch-target-large"
              style={{ 
                transitionDelay: isExpanded ? `${delay}ms` : '0ms',
                animationDelay: isExpanded ? `${delay}ms` : '0ms'
              }}
              aria-label={action.label}
              title={action.description}
              onClick={() => setIsExpanded(false)}
            >
              <Icon />
              <span className="fab-label">{action.label}</span>
            </Link>
          </div>
        );
      })}

      {/* Main FAB button */}
      <button
        onClick={toggleFAB}
        className="fab touch-target-large"
        aria-label={isExpanded ? "Close quick actions" : "Open quick actions"}
        aria-expanded={isExpanded}
        title={isExpanded ? "Close quick actions" : "Quick actions"}
      >
        <div
          className={cn(
            "transition-transform duration-300",
            isExpanded && "rotate-45"
          )}
        >
          {isExpanded ? <CloseIcon /> : <PlusIcon />}
        </div>
      </button>
    </div>
  );
}

// Alternative single FAB for primary action
export interface SingleFABProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  hideOnPaths?: string[];
}

export function SingleFAB({ 
  href, 
  label, 
  icon: Icon, 
  className,
  hideOnPaths = []
}: SingleFABProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render if not authenticated or on hidden paths
  if (!mounted || !user) {
    return null;
  }

  // Hide on specific paths
  if (pathname && hideOnPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  return (
    <Link
      href={href}
      className={cn("fab touch-target-large", className)}
      aria-label={label}
      title={label}
    >
      <Icon />
    </Link>
  );
}

// Quick Actions Grid for mobile/tablet layout
export function QuickActionsGrid({ className }: { className?: string }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) {
    return null;
  }

  return (
    <div className={cn("quick-actions-grid", className)}>
      {quickActions.map((action) => {
        const Icon = action.icon;
        
        return (
          <Link
            key={action.href}
            href={action.href}
            className="quick-action-card touch-target"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{action.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{action.description}</p>
          </Link>
        );
      })}
    </div>
  );
}