"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, PlayCircle, FileText, Dumbbell, Clock, Target, Plus, Loader2 } from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { GlassSurface } from "~/components/ui/glass-surface";
import { SkeletonWorkoutCard, SkeletonScreen } from "~/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { Id } from "~/convex/_generated/dataModel";

/**
 * Workout Start Page
 * 
 * Features:
 * - Display available workout templates
 * - Template selection interface
 * - Create workout session from template
 * - Navigate to workout session interface
 * - Handle loading and error states
 * - Support for direct template selection via URL params
 */

interface TemplateCardProps {
  template: {
    _id: string;
    name: string;
    exercises: Array<{
      exerciseName: string;
      orderIndex: number;
    }>;
    updatedAt: number;
    _creationTime: number;
  };
  onSelect: (templateId: string) => void;
  isStarting: boolean;
}

const TemplateSelectCard = ({ template, onSelect, isStarting }: TemplateCardProps) => {
  const exerciseCount = template.exercises?.length || 0;
  const estimatedDuration = Math.max(15, exerciseCount * 3); // Rough estimate
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="group cursor-pointer"
      onClick={() => !isStarting && onSelect(template._id)}
    >
      <GlassSurface className="p-6 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground leading-tight">
              {template.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Updated {formatDate(template.updatedAt)}
            </p>
          </div>
          
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">{exerciseCount}</div>
              <div className="text-xs text-muted-foreground font-medium">Exercises</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">~{estimatedDuration}m</div>
              <div className="text-xs text-muted-foreground font-medium">Est. Time</div>
            </div>
          </div>
          
          {/* Exercise Preview */}
          {exerciseCount > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Exercises:</h4>
              <div className="flex flex-wrap gap-1">
                {template.exercises.slice(0, 3).map((exercise) => (
                  <span
                    key={`${template._id}-${exercise.orderIndex}`}
                    className="inline-block px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground"
                  >
                    {exercise.exerciseName}
                  </span>
                ))}
                {exerciseCount > 3 && (
                  <span className="inline-block px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
                    +{exerciseCount - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Start Button */}
          <div className="pt-2">
            <Button 
              className="w-full" 
              disabled={isStarting}
              haptic
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              {isStarting ? 'Starting...' : 'Start Workout'}
            </Button>
          </div>
        </div>
        
        {/* Hover glow effect */}
        <div 
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
          style={{
            boxShadow: '0 10px 25px -5px rgba(255, 138, 76, 0.1)'
          }}
          aria-hidden="true"
        />
      </GlassSurface>
    </motion.div>
  );
};

export default function WorkoutStartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedTemplateId = searchParams.get('templateId');
  
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null);
  
  // Fetch templates from Convex
  const templates = useQuery(api.templates.getTemplates);
  const createWorkout = useMutation(api.workouts.createWorkout);
  
  const isLoading = templates === undefined;

  // Auto-start if templateId is provided in URL
  useEffect(() => {
    if (preSelectedTemplateId && templates && !startingTemplateId) {
      const template = templates.find(t => t._id === preSelectedTemplateId);
      if (template) {
        handleStartWorkout(preSelectedTemplateId);
      }
    }
  }, [preSelectedTemplateId, templates, startingTemplateId]);

  const handleStartWorkout = async (templateId: string) => {
    if (startingTemplateId) return; // Prevent multiple starts
    
    setStartingTemplateId(templateId);
    
    try {
      const result = await createWorkout({
        templateId: templateId as Id<"workoutTemplates">,
        workoutDate: Date.now(),
        themeUsed: 'system', // Could be detected from user preferences
        deviceType: 'desktop' // Could be detected
      });

      toast.success("Workout started!");
      
      // Navigate to the workout session page
      router.push(`/workout/session/${result.sessionId}`);
      
    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Failed to start workout. Please try again.');
      setStartingTemplateId(null);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCreateTemplate = () => {
    router.push('/templates/new');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
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
              <PlayCircle className="w-8 h-8 text-primary" />
              Start Workout
            </h1>
            <p className="text-muted-foreground mt-1">
              Choose a template to begin your workout session
            </p>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonWorkoutCard key={index} />
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && (!templates || templates.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassSurface className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Templates Available</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You need to create a workout template first before you can start a workout session.
              </p>
              <Button onClick={handleCreateTemplate} haptic>
                <Plus className="w-5 h-5" />
                Create Your First Template
              </Button>
            </GlassSurface>
          </motion.div>
        )}

        {/* Templates Grid */}
        {!isLoading && templates && templates.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Choose a Template</h2>
              <Button variant="ghost" size="sm" onClick={handleCreateTemplate}>
                <Plus className="w-4 h-4" />
                New Template
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template, index) => (
                <motion.div
                  key={template._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 0.1 * index,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  <TemplateSelectCard
                    template={template}
                    onSelect={handleStartWorkout}
                    isStarting={startingTemplateId === template._id}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Helper Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">
            Select a template to start your workout session with pre-defined exercises and tracking.
          </p>
        </motion.div>
      </div>
    </div>
  );
}