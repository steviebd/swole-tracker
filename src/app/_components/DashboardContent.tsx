"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Play, FileText, TrendingUp, Dumbbell, Calendar, Trophy, Plus, BarChart3 } from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { GlassSurface } from "~/components/ui/glass-surface";
import { StatCard } from "~/components/ui/stat-card";
import { SkeletonWorkoutCard, SkeletonScreen } from "~/components/ui/skeleton";

/**
 * Dashboard Content Component
 * 
 * Features:
 * - Quick access to main features
 * - Recent workouts summary
 * - Templates overview
 * - Key statistics
 * - Quick action buttons
 */

export function DashboardContent() {
  const router = useRouter();
  
  // Fetch data
  const recentWorkouts = useQuery(api.workouts.getWorkouts, { limit: 3 });
  const templates = useQuery(api.templates.getTemplates);
  const exercises = useQuery(api.exercises.getAllMaster);
  
  const isLoading = recentWorkouts === undefined || templates === undefined;

  // Calculate stats
  const calculateStats = () => {
    if (!recentWorkouts || !templates) {
      return {
        totalWorkouts: 0,
        totalTemplates: 0,
        thisWeekWorkouts: 0,
        totalExercises: 0
      };
    }

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeekWorkouts = recentWorkouts.filter(w => w.workoutDate > oneWeekAgo).length;

    return {
      totalWorkouts: recentWorkouts.length,
      totalTemplates: templates.length,
      thisWeekWorkouts,
      totalExercises: exercises?.length || 0
    };
  };

  const stats = calculateStats();

  const handleStartWorkout = () => {
    router.push('/workout/start');
  };

  const handleCreateTemplate = () => {
    router.push('/templates/new');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
            Welcome to Swole Tracker
          </h1>
          <p className="text-muted-foreground text-lg">
            Your complete workout tracking and progress companion
          </p>
        </motion.div>

        {/* Quick Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button 
            size="lg" 
            onClick={handleStartWorkout}
            className="flex-1 max-w-xs"
            haptic
          >
            <Play className="w-5 h-5" />
            Start Workout
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            onClick={handleCreateTemplate}
            className="flex-1 max-w-xs"
          >
            <Plus className="w-5 h-5" />
            New Template
          </Button>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Total Workouts"
            value={stats.totalWorkouts.toString()}
            icon={<Trophy className="w-5 h-5" />}
          />
          <StatCard
            label="This Week"
            value={stats.thisWeekWorkouts.toString()}
            icon={<Calendar className="w-5 h-5" />}
            change={stats.thisWeekWorkouts > 0 ? `+${stats.thisWeekWorkouts}` : undefined}
          />
          <StatCard
            label="Templates"
            value={stats.totalTemplates.toString()}
            icon={<FileText className="w-5 h-5" />}
          />
          <StatCard
            label="Exercises"
            value={stats.totalExercises.toString()}
            icon={<Dumbbell className="w-5 h-5" />}
          />
        </motion.div>

        {/* Main Content Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid gap-6 lg:grid-cols-2"
        >
          {/* Recent Workouts */}
          <GlassSurface className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                Recent Workouts
              </h2>
              <Button variant="ghost" size="sm" onClick={() => router.push('/workouts')}>
                View All
              </Button>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentWorkouts && recentWorkouts.length > 0 ? (
              <div className="space-y-3">
                {recentWorkouts.slice(0, 3).map((workout) => (
                  <div 
                    key={workout._id}
                    className="p-3 bg-muted rounded-lg hover:bg-muted-foreground/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/workout/session/${workout._id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{workout.template?.name || 'Unnamed Workout'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(workout.workoutDate)} • {workout.exercises?.length || 0} exercises
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {/* Could show duration or volume here */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No workouts yet</p>
                <Button onClick={handleStartWorkout} size="sm">
                  <Play className="w-4 h-4" />
                  Start Your First Workout
                </Button>
              </div>
            )}
          </GlassSurface>

          {/* Templates Overview */}
          <GlassSurface className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Templates
              </h2>
              <Button variant="ghost" size="sm" onClick={() => router.push('/templates')}>
                View All
              </Button>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="space-y-3">
                {templates.slice(0, 3).map((template) => (
                  <div 
                    key={template._id}
                    className="p-3 bg-muted rounded-lg hover:bg-muted-foreground/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/templates/${template._id}/edit`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.exercises?.length || 0} exercises
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/workout/start?templateId=${template._id}`);
                        }}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No templates yet</p>
                <Button onClick={handleCreateTemplate} size="sm">
                  <Plus className="w-4 h-4" />
                  Create Your First Template
                </Button>
              </div>
            )}
          </GlassSurface>
        </motion.div>

        {/* Navigation Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid gap-4 md:grid-cols-3"
        >
          <GlassSurface 
            className="p-6 cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => router.push('/workouts')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Workouts</h3>
                <p className="text-sm text-muted-foreground">View history & analytics</p>
              </div>
            </div>
          </GlassSurface>

          <GlassSurface 
            className="p-6 cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => router.push('/exercises')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Exercises</h3>
                <p className="text-sm text-muted-foreground">Manage exercise database</p>
              </div>
            </div>
          </GlassSurface>

          <GlassSurface 
            className="p-6 cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => router.push('/progress')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Progress</h3>
                <p className="text-sm text-muted-foreground">Track your gains</p>
              </div>
            </div>
          </GlassSurface>
        </motion.div>
      </div>
    </div>
  );
}