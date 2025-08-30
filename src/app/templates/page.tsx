"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, FileText, PlayCircle, Edit, Trash2, Clock, Dumbbell, Target } from "lucide-react";
import { api } from "~/convex/_generated/api";
import { useAuth } from "~/providers/AuthProvider";
import { Button } from "~/components/ui/button";
import { SkeletonWorkoutCard, SkeletonScreen } from "~/components/ui/skeleton";
import { GlassSurface } from "~/components/ui/glass-surface";
import { StatCard } from "~/components/ui/stat-card";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "~/lib/utils";

/**
 * Templates Page Component
 * 
 * Features:
 * - Displays user's workout templates with exercise details
 * - Shows template statistics and metrics
 * - Handles template actions (start workout, edit, delete)
 * - Responsive design with loading and empty states
 * - Integration with Convex backend for real-time data
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
  onStartWorkout: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onDelete: (templateId: string) => void;
}

const TemplateCard = ({ template, onStartWorkout, onEdit, onDelete }: TemplateCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const exerciseCount = template.exercises?.length || 0;
  const estimatedDuration = Math.max(15, exerciseCount * 3); // Rough estimate: 3 min per exercise, min 15 min
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      onDelete(template._id);
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.01,
        y: -2,
      }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="group relative"
    >
      <GlassSurface className="p-6">
        <div className="relative z-10 space-y-4">
          {/* Header with template name and updated date */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground leading-tight">
              {template.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Updated {formatDate(template.updatedAt)}
            </p>
          </div>
          
          {/* Template metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <motion.div 
                className="text-xl font-bold text-foreground"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {exerciseCount}
              </motion.div>
              <div className="text-xs text-muted-foreground font-medium mt-1">
                Exercises
              </div>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-xl font-bold text-foreground"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
              >
                ~{estimatedDuration}m
              </motion.div>
              <div className="text-xs text-muted-foreground font-medium mt-1">
                Est. Time
              </div>
            </div>
          </div>
          
          {/* Exercise preview */}
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
          
          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {/* Start Workout button */}
            <motion.button
              onClick={() => onStartWorkout(template._id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg",
                "text-sm font-medium transition-all duration-200",
                "text-white border-transparent",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "min-h-[40px]"
              )}
              style={{
                background: 'var(--gradient-universal-action-primary)',
                backgroundSize: '200% 200%',
                backgroundPosition: '0% 50%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundPosition = '100% 50%';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundPosition = '0% 50%';
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
              aria-label={`Start workout with ${template.name} template`}
            >
              <PlayCircle className="w-4 h-4" />
              Start
            </motion.button>
            
            {/* Edit button */}
            <motion.button
              onClick={() => onEdit(template._id)}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg",
                "text-sm font-medium transition-all duration-200",
                "bg-muted hover:bg-muted-foreground/10",
                "text-foreground hover:text-primary",
                "border border-transparent hover:border-primary/20",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "min-h-[40px] min-w-[40px]"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              aria-label={`Edit ${template.name} template`}
            >
              <Edit className="w-4 h-4" />
            </motion.button>
            
            {/* Delete button */}
            <motion.button
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg",
                "text-sm font-medium transition-all duration-200",
                "bg-muted hover:bg-red-500/10",
                "text-muted-foreground hover:text-red-500",
                "border border-transparent hover:border-red-500/20",
                "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
                "min-h-[40px] min-w-[40px]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              whileHover={{ scale: isDeleting ? 1 : 1.05 }}
              whileTap={{ scale: isDeleting ? 1 : 0.95 }}
              transition={{ duration: 0.1 }}
              aria-label={`Delete ${template.name} template`}
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
        
        {/* Subtle hover glow effect */}
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

export default function TemplatesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  
  // Fetch templates data from Convex
  const templates = useQuery(api.templates.getTemplates);
  const deleteTemplate = useMutation(api.templates.deleteTemplate);
  const isLoading = isAuthLoading || templates === undefined;

  // Handle authentication
  if (isAuthLoading) {
    return (
      <div className="space-y-6">
        <SkeletonScreen 
          title="Loading your templates..."
          showStats={true}
          showChart={false}
          showWorkouts={true}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <GlassSurface className="p-8 max-w-lg mx-auto">
          <FileText className="w-16 h-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your workout templates.
          </p>
          <Button onClick={() => router.push('/')}>
            Go to Sign In
          </Button>
        </GlassSurface>
      </div>
    );
  }

  // Handle template actions
  const handleStartWorkout = (templateId: string) => {
    try {
      router.push(`/workout/start?templateId=${templateId}`);
    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Failed to start workout. Please try again.');
    }
  };

  const handleEditTemplate = (templateId: string) => {
    try {
      router.push(`/templates/${templateId}/edit`);
    } catch (error) {
      console.error('Error navigating to edit template:', error);
      toast.error('Failed to edit template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate({ id: templateId as any });
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template. Please try again.');
    }
  };

  const handleCreateNew = () => {
    try {
      router.push('/templates/new');
    } catch (error) {
      console.error('Error navigating to create template:', error);
      toast.error('Failed to create new template. Please try again.');
    }
  };

  // Calculate template statistics
  const calculateStats = () => {
    if (!templates || templates.length === 0) {
      return {
        totalTemplates: 0,
        totalExercises: 0,
        avgExercisesPerTemplate: 0,
        mostRecentUpdate: 0
      };
    }

    const totalExercises = templates.reduce((sum, template) => sum + (template.exercises?.length || 0), 0);
    const avgExercises = templates.length > 0 ? Math.round(totalExercises / templates.length) : 0;
    const mostRecent = Math.max(...templates.map(t => t.updatedAt));

    return {
      totalTemplates: templates.length,
      totalExercises,
      avgExercisesPerTemplate: avgExercises,
      mostRecentUpdate: mostRecent
    };
  };

  const stats = calculateStats();

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
            <FileText className="w-8 h-8 text-primary" />
            Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your workout templates
          </p>
        </div>
        
        <Button 
          onClick={handleCreateNew}
          size="lg"
          className="w-full sm:w-auto"
          haptic
        >
          <Plus className="w-5 h-5" />
          Create Template
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
          label="Total Templates"
          value={stats.totalTemplates.toString()}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Total Exercises"
          value={stats.totalExercises.toString()}
          icon={<Dumbbell className="w-5 h-5" />}
        />
        <StatCard
          label="Avg per Template"
          value={stats.avgExercisesPerTemplate.toString()}
          icon={<Target className="w-5 h-5" />}
        />
        <StatCard
          label="Last Updated"
          value={stats.mostRecentUpdate > 0 ? new Date(stats.mostRecentUpdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
          icon={<Clock className="w-5 h-5" />}
        />
      </motion.div>

      {/* Templates List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Your Templates</h2>
          {templates && templates.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleCreateNew}>
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonWorkoutCard key={index} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!templates || templates.length === 0) && (
          <GlassSurface className="p-8 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first workout template to get started. Templates help you quickly start workouts with pre-defined exercises.
            </p>
            <Button onClick={handleCreateNew} haptic>
              <Plus className="w-5 h-5" />
              Create Your First Template
            </Button>
          </GlassSurface>
        )}

        {/* Templates Grid */}
        {!isLoading && templates && templates.length > 0 && (
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
                <TemplateCard
                  template={template}
                  onStartWorkout={handleStartWorkout}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}