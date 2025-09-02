"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { useMutation } from "convex/react";
import { Plus, X, ArrowLeft, Save, Dumbbell } from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { GlassSurface } from "~/components/ui/glass-surface";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { AuthGuard } from "~/components/auth/AuthGuard";

/**
 * New Template Creation Page
 * 
 * Features:
 * - Template name input with validation
 * - Dynamic exercise management (add/remove/reorder)
 * - Form validation with error handling
 * - Integration with Convex backend
 * - Responsive design with animations
 * - Navigation handling and success feedback
 */

interface FormData {
  name: string;
  exercises: string[];
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createTemplate = useMutation(api.templates.createTemplate);
  
  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      exercises: [""]
    }
  });

  // Add new exercise input
  const addExercise = () => {
    setExercises(prev => [...prev, ""]);
  };

  // Remove exercise at index
  const removeExercise = (index: number) => {
    if (exercises.length > 1) {
      const newExercises = exercises.filter((_, i) => i !== index);
      setExercises(newExercises);
    }
  };

  // Update exercise at index
  const updateExercise = (index: number, value: string) => {
    const newExercises = [...exercises];
    newExercises[index] = value;
    setExercises(newExercises);
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return;
    
    // Validate template name
    if (!data.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    // Filter out empty exercises
    const validExercises = exercises.filter(exercise => exercise.trim().length > 0);
    
    if (validExercises.length === 0) {
      toast.error("At least one exercise is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const templateId = await createTemplate({
        name: data.name.trim(),
        exercises: validExercises
      });

      toast.success("Template created successfully!");
      
      // Navigate to templates page or the new template
      router.push("/templates");
      
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (form.watch("name") || exercises.some(e => e.trim())) {
      if (window.confirm("You have unsaved changes. Are you sure you want to go back?")) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  return (
    <AuthGuard>
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
                New Template
              </h1>
              <p className="text-muted-foreground mt-1">
                Create a new workout template with custom exercises
              </p>
            </div>
          </motion.div>

          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <GlassSurface className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Template Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{
                      required: "Template name is required",
                      minLength: { value: 1, message: "Template name cannot be empty" },
                      maxLength: { value: 256, message: "Template name is too long" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Push Day, Full Body Workout..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Exercises Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Exercises</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {exercises.map((exercise, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="flex items-center gap-3"
                        >
                          <div className="flex-1">
                            <Input
                              placeholder={`Exercise ${index + 1} (e.g., Bench Press, Squats...)`}
                              value={exercise}
                              onChange={(e) => updateExercise(index, e.target.value)}
                            />
                          </div>
                          {exercises.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExercise(index)}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    
                    {exercises.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        Add at least one exercise to create your template
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleBack}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1"
                      haptic
                    >
                      <Save className="w-4 h-4" />
                      {isSubmitting ? 'Creating...' : 'Create Template'}
                    </Button>
                  </div>
                </form>
              </Form>
            </GlassSurface>
          </motion.div>

          {/* Helper Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground">
              Templates help you quickly start workouts with predefined exercises. You can always edit them later.
            </p>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}