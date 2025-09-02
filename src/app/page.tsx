"use client";

import { useAuth } from "~/providers/AuthProvider";
import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { StatsCards } from "~/app/_components/StatsCards";
import { QuickActions } from "~/components/quick-actions";
import { WeeklyProgress } from "~/components/weekly-progress";
import { RecentWorkouts } from "~/components/recent-workouts";
import { motion } from "framer-motion";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { StrengthIcon, FireIcon } from "~/components/icons/fitness-icons";

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
            className="mt-8"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          >
            <SignInButtons />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Template-inspired dashboard layout
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 sm:px-8 py-8 space-y-10">
        <StatsCards />
        <QuickActions />
        <div className="grid lg:grid-cols-2 gap-8">
          <WeeklyProgress />
          <RecentWorkouts />
        </div>
      </main>
    </div>
  );
}
