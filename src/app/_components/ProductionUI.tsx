"use client";

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  X,
  Sparkles,
  Trophy,
  Zap,
  Heart,
  Target,
  Dumbbell,
  Plus
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { GlassSurface } from '~/components/ui/glass-surface';
import { cn } from '~/lib/utils';

/**
 * Production-ready UI components with advanced loading states,
 * empty states, and success celebrations
 */

// Advanced loading spinner with multiple variants
export const LoadingSpinner = memo<{
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dots' | 'pulse' | 'bars';
  className?: string;
  text?: string;
}>(({ size = 'md', variant = 'default', className, text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
        {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <motion.div
          className={cn("bg-primary rounded-full", sizeClasses[size])}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
        />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn("flex items-end gap-1", className)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-1 bg-primary rounded-full"
            animate={{
              height: ['8px', '24px', '8px']
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.1
            }}
          />
        ))}
        {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// Success celebration component
export const SuccessCelebration = memo<{
  isVisible: boolean;
  title: string;
  message?: string;
  onClose?: () => void;
  confetti?: boolean;
}>(({ isVisible, title, message, onClose, confetti = true }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          
          <motion.div
            className="relative"
            animate={confetti ? {
              rotate: [0, 5, -5, 0]
            } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <GlassSurface className="p-8 text-center max-w-sm relative overflow-hidden">
              {/* Confetti animation */}
              {confetti && (
                <div className="absolute inset-0">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b'][i % 5],
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`
                      }}
                      animate={{
                        y: [-20, 100],
                        rotate: [0, 360],
                        opacity: [1, 0]
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.1,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                </div>
              )}

              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 mb-4 mx-auto rounded-full bg-green-100 dark:bg-green-900/30"
              >
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-foreground mb-2"
              >
                {title}
              </motion.h2>

              {message && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mb-6 text-sm"
                >
                  {message}
                </motion.p>
              )}

              {onClose && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button onClick={onClose} size="sm">
                    <Sparkles className="w-4 h-4" />
                    Continue
                  </Button>
                </motion.div>
              )}
            </GlassSurface>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SuccessCelebration.displayName = 'SuccessCelebration';

// Empty state component with call-to-action
export const EmptyState = memo<{
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  variant?: 'default' | 'workouts' | 'exercises' | 'templates';
}>(({ icon: Icon, title, description, action, variant = 'default' }) => {
  const variants = {
    default: {
      icon: AlertCircle,
      gradient: 'from-gray-400 to-gray-600'
    },
    workouts: {
      icon: Dumbbell,
      gradient: 'from-blue-400 to-purple-600'
    },
    exercises: {
      icon: Target,
      gradient: 'from-green-400 to-blue-500'
    },
    templates: {
      icon: Plus,
      gradient: 'from-orange-400 to-red-500'
    }
  };

  const config = variants[variant];
  const DisplayIcon = Icon || config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-12"
    >
      <GlassSurface className="p-8 max-w-md mx-auto">
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "inline-flex items-center justify-center w-20 h-20 mb-6 mx-auto rounded-full",
            "bg-gradient-to-br shadow-lg",
            config.gradient
          )}
        >
          <DisplayIcon className="w-10 h-10 text-white" />
        </motion.div>

        <h3 className="text-xl font-bold text-foreground mb-3">
          {title}
        </h3>
        
        <p className="text-muted-foreground mb-6">
          {description}
        </p>

        {action && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </Button>
          </motion.div>
        )}
      </GlassSurface>
    </motion.div>
  );
});

EmptyState.displayName = 'EmptyState';

// Toast notification component
export const Toast = memo<{
  isVisible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  duration?: number;
}>(({ isVisible, message, type = 'info', onClose, duration = 4000 }) => {
  React.useEffect(() => {
    if (isVisible && onClose && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  const variants = {
    success: {
      icon: CheckCircle,
      classes: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
    },
    error: {
      icon: AlertCircle,
      classes: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
    },
    warning: {
      icon: AlertCircle,
      classes: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
    },
    info: {
      icon: Info,
      classes: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
    }
  };

  const config = variants[type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.95 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4"
        >
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-lg border shadow-lg",
            config.classes
          )}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{message}</p>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

Toast.displayName = 'Toast';

// Milestone celebration for achievements
export const MilestoneCelebration = memo<{
  isVisible: boolean;
  milestone: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
  };
  onClose: () => void;
}>(({ isVisible, milestone, onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative"
          >
            <GlassSurface className="p-8 text-center max-w-sm">
              {/* Celebration particles */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${20 + Math.random() * 60}%`
                    }}
                    animate={{
                      y: [-10, -50, -10],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.1,
                      repeat: Infinity
                    }}
                  />
                ))}
              </div>

              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center justify-center w-20 h-20 mb-4 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-xl"
              >
                <milestone.icon className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                {milestone.title}
              </h2>
              
              <div className="text-3xl font-bold text-primary mb-3">
                {milestone.value}
              </div>

              <p className="text-muted-foreground mb-6 text-sm">
                {milestone.description}
              </p>

              <Button onClick={onClose} className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600">
                <Trophy className="w-4 h-4" />
                Awesome!
              </Button>
            </GlassSurface>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

MilestoneCelebration.displayName = 'MilestoneCelebration';