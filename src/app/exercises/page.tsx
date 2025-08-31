"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { Search, Dumbbell, Link as LinkIcon, Unlink, Plus, Target, BarChart } from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { GlassSurface } from "~/components/ui/glass-surface";
import { StatCard } from "~/components/ui/stat-card";
import { SkeletonScreen } from "~/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

/**
 * Exercises Management Page
 * 
 * Features:
 * - View all master exercises with linking statistics
 * - Search and filter exercises
 * - Manual exercise creation
 * - Basic exercise management
 * - Statistics about exercise database
 */

interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    normalizedName: string;
    createdAt: number;
    linkedCount: number;
  };
}

const ExerciseCard = ({ exercise }: ExerciseCardProps) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="group"
    >
      <GlassSurface className="p-4 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          {/* Exercise name */}
          <div>
            <h3 className="text-lg font-semibold text-foreground leading-tight">
              {exercise.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(exercise.createdAt)}
            </p>
          </div>
          
          {/* Statistics */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {exercise.linkedCount} {exercise.linkedCount === 1 ? 'template' : 'templates'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {exercise.linkedCount > 0 ? (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Linked to templates" />
              ) : (
                <div className="w-2 h-2 bg-gray-400 rounded-full" title="No links" />
              )}
            </div>
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

export default function ExercisesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  
  // Fetch exercises data
  const exercises = useQuery(api.exercises.getAllMaster);
  const createMasterExercise = useMutation(api.exercises.createOrGetMaster);
  
  const isLoading = exercises === undefined;

  // Filter exercises based on search query
  const filteredExercises = exercises?.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.normalizedName.includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate statistics
  const calculateStats = () => {
    if (!exercises) {
      return {
        totalExercises: 0,
        linkedExercises: 0,
        totalLinks: 0,
        averageLinks: 0
      };
    }

    const linkedExercises = exercises.filter(ex => ex.linkedCount > 0).length;
    const totalLinks = exercises.reduce((sum, ex) => sum + ex.linkedCount, 0);
    const averageLinks = exercises.length > 0 ? Math.round((totalLinks / exercises.length) * 10) / 10 : 0;

    return {
      totalExercises: exercises.length,
      linkedExercises,
      totalLinks,
      averageLinks
    };
  };

  const stats = calculateStats();

  // Handle creating new exercise
  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      toast.error("Exercise name is required");
      return;
    }

    setIsCreatingExercise(true);
    
    try {
      await createMasterExercise({ name: newExerciseName.trim() });
      toast.success("Exercise created successfully!");
      setNewExerciseName("");
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast.error('Failed to create exercise. Please try again.');
    } finally {
      setIsCreatingExercise(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <SkeletonScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
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
              Exercises
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your exercise database and template connections
            </p>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Total Exercises"
            value={stats.totalExercises.toString()}
            icon={<Dumbbell className="w-5 h-5" />}
          />
          <StatCard
            label="Linked to Templates"
            value={stats.linkedExercises.toString()}
            icon={<LinkIcon className="w-5 h-5" />}
          />
          <StatCard
            label="Total Connections"
            value={stats.totalLinks.toString()}
            icon={<Target className="w-5 h-5" />}
          />
          <StatCard
            label="Avg per Exercise"
            value={stats.averageLinks.toString()}
            icon={<BarChart className="w-5 h-5" />}
          />
        </motion.div>

        {/* Search and Create */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          <GlassSurface className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <Input
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftAdornment={<Search className="w-4 h-4 text-muted-foreground" />}
                />
              </div>
              
              {/* Create Exercise */}
              <div className="flex gap-2">
                <Input
                  placeholder="New exercise name..."
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  className="min-w-48"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateExercise();
                    }
                  }}
                />
                <Button 
                  onClick={handleCreateExercise}
                  disabled={isCreatingExercise || !newExerciseName.trim()}
                  haptic
                >
                  <Plus className="w-4 h-4" />
                  {isCreatingExercise ? 'Creating...' : 'Add'}
                </Button>
              </div>
            </div>
          </GlassSurface>
        </motion.div>

        {/* Exercise Results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {searchQuery ? 'Search Results' : 'All Exercises'}
            </h2>
            <span className="text-sm text-muted-foreground">
              {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Empty State */}
          {filteredExercises.length === 0 && (
            <GlassSurface className="p-8 text-center">
              <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? 'No exercises found' : 'No exercises yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? 'Try adjusting your search terms or create a new exercise.'
                  : 'Create workout templates to automatically build your exercise database.'
                }
              </p>
              {searchQuery && (
                <Button onClick={() => setSearchQuery("")} variant="outline">
                  Clear Search
                </Button>
              )}
            </GlassSurface>
          )}

          {/* Exercise Grid */}
          {filteredExercises.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredExercises.map((exercise, index) => (
                <motion.div
                  key={exercise.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 0.1 * (index % 8), // Stagger animation for first 8 items
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  <ExerciseCard exercise={exercise} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Helper Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">
            Exercises are automatically created when you add them to templates. 
            The system links similar exercises to track your progress across templates.
          </p>
        </motion.div>
      </div>
    </div>
  );
}