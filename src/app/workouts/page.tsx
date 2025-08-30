"use client";

import { useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Calendar, Dumbbell, Trophy, Clock } from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { WorkoutCard, type WorkoutMetric } from "~/components/ui/workout-card";
import { SkeletonWorkoutCard, SkeletonScreen } from "~/components/ui/skeleton";
import { GlassSurface } from "~/components/ui/glass-surface";
import { StatCard } from "~/components/ui/stat-card";
import { toast } from "sonner";
import { useState } from "react";

/**
 * Workouts Page Component
 * 
 * Features:
 * - Displays user's workout history with template details
 * - Shows workout statistics and metrics
 * - Handles loading, error, and empty states
 * - Mobile-first responsive design
 * - Integration with Convex backend for real-time data
 */

// Sign-in prompt component for unauthenticated users
function SignInPrompt() {
  const router = useRouter();
  
  return (
    <div className="text-center py-12">
      <GlassSurface className="p-8 max-w-lg mx-auto">
        <Dumbbell className="w-16 h-16 mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
        <p className="text-muted-foreground mb-6">
          Please sign in to view your workout history.
        </p>
        <Button onClick={() => router.push('/')}>
          Go to Sign In
        </Button>
      </GlassSurface>
    </div>
  );
}

// Main authenticated page content
function WorkoutsPageContent() {
  const router = useRouter();
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);

  // Fetch workouts data from Convex
  const workouts = useQuery(api.workouts.getWorkouts, { limit: 10 });
  const isLoading = workouts === undefined;

  // Handle start workout navigation
  const handleStartWorkout = async () => {
    setIsStartingWorkout(true);
    try {
      router.push('/templates');
    } catch (error) {
      console.error('Error navigating to templates:', error);
      toast.error('Failed to start workout. Please try again.');
    } finally {
      setIsStartingWorkout(false);
    }
  };

  // Handle repeat workout
  const handleRepeatWorkout = (workoutSessionId: string, templateId: string) => {
    try {
      // Navigate to workout session with the same template
      router.push(`/workout?templateId=${templateId}&repeat=${workoutSessionId}`);
    } catch (error) {
      console.error('Error repeating workout:', error);
      toast.error('Failed to repeat workout. Please try again.');
    }
  };

  // Handle view workout details
  const handleViewDetails = (workoutSessionId: string) => {
    try {
      router.push(`/workout/${workoutSessionId}`);
    } catch (error) {
      console.error('Error viewing workout details:', error);
      toast.error('Failed to view workout details. Please try again.');
    }
  };

  // Calculate workout statistics
  const calculateStats = () => {
    if (!workouts || workouts.length === 0) {
      return {
        totalWorkouts: 0,
        thisWeek: 0,
        totalVolume: 0,
        avgDuration: 0
      };
    }

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeekWorkouts = workouts.filter(workout => workout.workoutDate > oneWeekAgo);
    
    const totalVolume = workouts.reduce((sum, workout) => {
      return sum + (workout.exercises?.reduce((exerciseSum, exercise) => {
        const weight = exercise.weight || 0;
        const reps = exercise.reps || 0;
        const sets = exercise.sets || 1;
        return exerciseSum + (weight * reps * sets);
      }, 0) || 0);
    }, 0);

    const avgDuration = workouts.length > 0 
      ? workouts.reduce((sum, workout) => {
          const startTime = workout.workoutDate;
          const endTime = workout.updatedAt || startTime + 3600000; // Default to 1 hour
          return sum + (endTime - startTime);
        }, 0) / workouts.length
      : 0;

    return {
      totalWorkouts: workouts.length,
      thisWeek: thisWeekWorkouts.length,
      totalVolume: Math.round(totalVolume),
      avgDuration: Math.round(avgDuration / (1000 * 60)) // Convert to minutes
    };
  };

  const stats = calculateStats();

  // Format workout data for WorkoutCard component
  const formatWorkoutData = (workout: any) => {
    const exerciseCount = workout.exercises?.length || 0;
    const totalVolume = workout.exercises?.reduce((sum: number, exercise: any) => {
      const weight = exercise.weight || 0;
      const reps = exercise.reps || 0;
      const sets = exercise.sets || 1;
      return sum + (weight * reps * sets);
    }, 0) || 0;

    const duration = workout.updatedAt && workout.workoutDate 
      ? Math.round((workout.updatedAt - workout.workoutDate) / (1000 * 60))
      : 0;

    const metrics: WorkoutMetric[] = [
      { label: 'Duration', value: duration > 0 ? `${duration}m` : 'N/A' },
      { label: 'Volume', value: totalVolume > 0 ? `${Math.round(totalVolume)}` : '0' },
      { label: 'Exercises', value: exerciseCount.toString() }
    ];

    const workoutDate = new Date(workout.workoutDate).toISOString();
    const isRecent = (Date.now() - workout.workoutDate) < 24 * 60 * 60 * 1000;

    return {
      workoutName: workout.template?.name || 'Unnamed Workout',
      date: workoutDate,
      metrics,
      isRecent,
      onRepeat: () => handleRepeatWorkout(workout._id, workout.templateId),
      onViewDetails: () => handleViewDetails(workout._id)
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Dumbbell className="w-8 h-8 text-primary" />
            Workouts
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your progress and view your workout history
          </p>
        </div>
        
        <Button 
          onClick={handleStartWorkout}
          size="lg"
          disabled={isStartingWorkout}
          className="w-full sm:w-auto"
          haptic
        >
          <Plus className="w-5 h-5" />
          {isStartingWorkout ? 'Starting...' : 'Start Workout'}
        </Button>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          label="Total Workouts"
          value={stats.totalWorkouts.toString()}
          icon={<Trophy className="w-5 h-5" />}
        />
        <StatCard
          label="This Week"
          value={stats.thisWeek.toString()}
          icon={<Calendar className="w-5 h-5" />}
          change={stats.thisWeek > 0 ? `+${stats.thisWeek}` : undefined}
        />
        <StatCard
          label="Total Volume"
          value={stats.totalVolume > 0 ? `${stats.totalVolume.toLocaleString()}` : '0'}
          icon={<Dumbbell className="w-5 h-5" />}
        />
        <StatCard
          label="Avg Duration"
          value={stats.avgDuration > 0 ? `${stats.avgDuration}m` : '0m'}
          icon={<Clock className="w-5 h-5" />}
        />
      </motion.div>

      {/* Workouts List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Recent Workouts</h2>
          {workouts && workouts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/history')}>
              View All
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonWorkoutCard key={index} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!workouts || workouts.length === 0) && (
          <GlassSurface className="p-8 text-center">
            <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Workouts Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your fitness journey by creating your first workout.
            </p>
            <Button onClick={handleStartWorkout} haptic>
              <Plus className="w-5 h-5" />
              Start Your First Workout
            </Button>
          </GlassSurface>
        )}

        {/* Workouts Grid */}
        {!isLoading && workouts && workouts.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {workouts.map((workout, index) => (
              <motion.div
                key={workout._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  delay: 0.1 * index,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <WorkoutCard {...formatWorkoutData(workout)} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Main page component with Convex auth wrapper
export default function WorkoutsPage() {
  return (
    <>
      <AuthLoading>
        <div className="space-y-6">
          <SkeletonScreen 
            title="Loading your workouts..."
            showStats={true}
            showChart={false}
            showWorkouts={true}
          />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignInPrompt />
      </Unauthenticated>
      <Authenticated>
        <WorkoutsPageContent />
      </Authenticated>
    </>
  );
}