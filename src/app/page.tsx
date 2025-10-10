"use client";

import Link from "next/link";
import { Suspense, lazy } from "react";
import { m as motion } from "framer-motion";
import { Activity, Smartphone, Sparkles } from "lucide-react";

import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { Button } from "~/components/ui/button";
import { StrengthIcon, FireIcon } from "~/components/icons/fitness-icons";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { useAuth } from "~/providers/AuthProvider";

// Dynamic imports for heavy components
import { StatsCards } from "~/app/_components/StatsCards";
import { ReadinessHighlight } from "~/app/_components/readiness-highlight";
const QuickActions = lazy(() => import("~/components/quick-actions").then(module => ({ default: module.QuickActions })));
const WeeklyProgress = lazy(() => import("~/components/weekly-progress").then(module => ({ default: module.WeeklyProgress })));
const RecentWorkouts = lazy(() => import("~/components/recent-workouts").then(module => ({ default: module.RecentWorkouts })));

const heroHighlights = [
  {
    id: "offline",
    Icon: Smartphone,
    title: "Offline-first logging",
    description: "Keep recording sets when reception drops—sync resumes automatically.",
  },
  {
    id: "coaching",
    Icon: Sparkles,
    title: "AI coaching on tap",
    description: "Preview readiness cues and guidance before you hit your first set.",
  },
  {
    id: "whoop",
    Icon: Activity,
    title: "Whoop + wellness",
    description: "Blend recovery, strain, and wellness trends into every session plan.",
  },
] as const;

// Loading component for dashboard sections
const DashboardLoading = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-32 bg-muted/50 rounded-lg"></div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-16 bg-muted/50 rounded"></div>
      <div className="h-16 bg-muted/50 rounded"></div>
    </div>
  </div>
);

export default function Home() {
  const { user, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-4 sm:px-6">
        <div className="glass-hero py-grid-6 px-6 sm:px-8 md:px-12 lg:px-16 rounded-2xl w-full min-w-0 shadow-2xl">
          <div className="space-y-8">
            <div className="skeleton skeleton-title w-3/4 mx-auto"></div>
            <div className="space-y-3">
              <div className="skeleton skeleton-text w-full"></div>
              <div className="skeleton skeleton-text w-5/6 mx-auto"></div>
              <div className="skeleton skeleton-text w-4/6 mx-auto"></div>
            </div>
            <div className="skeleton skeleton-button w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-4 sm:px-6">
        <motion.div 
          className="glass-hero py-grid-6 px-6 sm:px-8 md:px-12 lg:px-16 rounded-2xl w-full min-w-0 shadow-2xl border-0 animate-fade-in-up"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 32, scale: 0.95 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
          >
            <h1 className="gradient-text-display mb-6">
              <span className="sr-only">Swole Tracker - </span>
              <StrengthIcon 
                className="inline-block mr-4 text-primary" 
                size={64} 
                aria-hidden="true"
              />
              Swole Tracker
            </h1>
          </motion.div>
          
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            className="mb-8"
          >
            <p className="text-muted-foreground mx-auto max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed">
              <FireIcon 
                className="inline-block mr-2 text-accent" 
                size={20} 
                aria-hidden="true"
              />
              Transform your workouts into victories. Track every rep, celebrate every personal best, 
              and unlock your potential with intelligent, mobile-first fitness tracking.
            </p>
          </motion.div>
          
          <motion.div
            className="mt-8 space-y-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          >
            <SignInButtons />
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-white/30 bg-white/5 text-primary-foreground backdrop-blur touch-target-xl hover:bg-white/15"
                >
                  Try the interactive demo
                </Button>
              </Link>
              <Link
                href="#dashboard-preview"
                className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80"
              >
                See athlete insights
              </Link>
            </div>
          </motion.div>

          <motion.div
            id="dashboard-preview"
            className="mt-10 grid gap-4 sm:grid-cols-3"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
          >
            {heroHighlights.map(({ id, Icon, title, description }) => (
              <div
                key={id}
                className="glass-card glass-hairline flex flex-col gap-2 rounded-xl border border-white/10 p-4 text-left shadow-lg"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground/80">{description}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Template-inspired dashboard layout with progressive loading
  return (
    <div className="min-h-screen bg-app-gradient">
      <main className="container mx-auto px-6 sm:px-8 py-8 space-y-10">
        <Suspense fallback={<div className="h-16 bg-muted/50 rounded-lg animate-pulse"></div>}>
          <QuickActions />
        </Suspense>
        <ReadinessHighlight />
        <StatsCards />
        <div className="grid lg:grid-cols-2 gap-8">
          <Suspense fallback={<div className="h-64 bg-muted/50 rounded-lg animate-pulse"></div>}>
            <WeeklyProgress />
          </Suspense>
          <Suspense fallback={<div className="h-64 bg-muted/50 rounded-lg animate-pulse"></div>}>
            <RecentWorkouts />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
