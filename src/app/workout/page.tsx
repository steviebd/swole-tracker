"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, Play, Pause, Save, Timer, Dumbbell } from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { GlassSurface } from "~/components/ui/glass-surface";
import { SkeletonScreen } from "~/components/ui/skeleton";
import { toast } from "sonner";
import type { Id } from "~/convex/_generated/dataModel";

/**
 * Main Workout Interface Page
 * 
 * Handles:
 * - Loading a workout session from templateId (new workout)
 * - Loading a previous workout to repeat (repeat parameter)
 * - Managing workout state and exercise tracking
 * - Navigation to proper workout session interface
 */

export default function WorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const templateId = searchParams.get('templateId');
  const repeatSessionId = searchParams.get('repeat');
  
  const [isStarting, setIsStarting] = useState(false);
  
  // Mutations
  const createWorkout = useMutation(api.workouts.createWorkout);
  
  // Fetch template if templateId is provided
  const template = useQuery(
    api.templates.getTemplate,
    templateId ? { id: templateId as Id<"workoutTemplates"> } : "skip"
  );
  
  // Fetch previous workout if repeat is specified
  const repeatWorkout = useQuery(
    api.workouts.getWorkout,
    repeatSessionId ? { id: repeatSessionId as Id<"workoutSessions"> } : "skip"
  );

  useEffect(() => {
    // Auto-start workout when data is loaded
    if (templateId && template && !isStarting) {
      handleStartWorkout();
    } else if (repeatSessionId && repeatWorkout && !isStarting) {
      handleRepeatWorkout();
    }
  }, [template, repeatWorkout, templateId, repeatSessionId, isStarting]);

  const handleStartWorkout = async () => {
    if (!templateId || !template || isStarting) return;
    
    setIsStarting(true);
    
    try {
      const result = await createWorkout({
        templateId: templateId as Id<"workoutTemplates">,
        workoutDate: Date.now(),
        themeUsed: 'system',
        deviceType: 'desktop'
      });

      toast.success("Workout started!");
      
      // Navigate to the workout session interface
      router.push(`/workout/session/${result.sessionId}`);
      
    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Failed to start workout. Please try again.');
      setIsStarting(false);
    }
  };

  const handleRepeatWorkout = async () => {
    if (!repeatWorkout || !templateId || isStarting) return;
    
    setIsStarting(true);
    
    try {
      const result = await createWorkout({
        templateId: templateId as Id<"workoutTemplates">,
        workoutDate: Date.now(),
        themeUsed: 'system',
        deviceType: 'desktop'
      });

      toast.success("Starting repeat workout!");
      
      // Navigate to the workout session interface
      router.push(`/workout/session/${result.sessionId}?repeat=${repeatSessionId}`);
      
    } catch (error) {
      console.error('Error starting repeat workout:', error);
      toast.error('Failed to start repeat workout. Please try again.');
      setIsStarting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Loading state
  if ((templateId && template === undefined) || (repeatSessionId && repeatWorkout === undefined)) {
    return <SkeletonScreen />;
  }

  // Error states
  if (templateId && template === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlassSurface className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Template Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The workout template you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={handleBack}>
            Back
          </Button>
        </GlassSurface>
      </div>
    );
  }

  if (repeatSessionId && repeatWorkout === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlassSurface className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Workout Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The workout you're trying to repeat doesn't exist or has been deleted.
          </p>
          <Button onClick={handleBack}>
            Back
          </Button>
        </GlassSurface>
      </div>
    );
  }

  if (!templateId && !repeatSessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlassSurface className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Missing Parameters</h1>
          <p className="text-muted-foreground mb-6">
            Please provide a templateId or repeat parameter to start a workout.
          </p>
          <Button onClick={() => router.push('/workout/start')}>
            Start New Workout
          </Button>
        </GlassSurface>
      </div>
    );
  }

  const workoutName = template?.name || repeatWorkout?.template?.name || 'Workout';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4"
        >
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Dumbbell className="w-8 h-8 text-primary" />
              {repeatSessionId ? 'Repeat Workout' : 'Start Workout'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {workoutName}
            </p>
          </div>
        </motion.div>

        {/* Loading/Starting State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <GlassSurface className="p-8 text-center">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 360, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-16 h-16 mx-auto mb-6"
            >
              <Dumbbell className="w-full h-full text-primary" />
            </motion.div>
            
            <h3 className="text-xl font-semibold mb-2">
              {isStarting ? 'Starting Workout...' : 'Preparing Workout'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {isStarting 
                ? 'Creating your workout session...' 
                : 'Getting everything ready for your workout session.'
              }
            </p>
            
            {!isStarting && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={repeatSessionId ? handleRepeatWorkout : handleStartWorkout}
                  className="flex-1"
                  haptic
                >
                  <Play className="w-4 h-4" />
                  {repeatSessionId ? 'Repeat Workout' : 'Start Workout'}
                </Button>
              </div>
            )}
          </GlassSurface>
        </motion.div>
      </div>
    </div>
  );
}