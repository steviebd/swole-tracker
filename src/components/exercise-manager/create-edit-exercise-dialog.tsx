import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags?: string | null;
  muscleGroup?: string | null;
  createdAt: Date;
  linkedCount: number;
}

interface CreateEditExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExercise: MasterExercise | null;
  onSubmit: (data: {
    name: string;
    tags: string;
    muscleGroup: string;
  }) => void;
  isSubmitting: boolean;
}

export function CreateEditExerciseDialog({
  open,
  onOpenChange,
  editingExercise,
  onSubmit,
  isSubmitting,
}: CreateEditExerciseDialogProps) {
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseTags, setExerciseTags] = useState("");
  const [exerciseMuscleGroup, setExerciseMuscleGroup] = useState("");

  useEffect(() => {
    if (editingExercise) {
      setExerciseName(editingExercise.name);
      setExerciseTags(editingExercise.tags || "");
      setExerciseMuscleGroup(editingExercise.muscleGroup || "");
    } else {
      setExerciseName("");
      setExerciseTags("");
      setExerciseMuscleGroup("");
    }
  }, [editingExercise]);

  const handleSubmit = () => {
    onSubmit({
      name: exerciseName,
      tags: exerciseTags,
      muscleGroup: exerciseMuscleGroup,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setExerciseName("");
    setExerciseTags("");
    setExerciseMuscleGroup("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingExercise ? "Edit Exercise" : "Create New Exercise"}
          </DialogTitle>
          <DialogDescription>
            {editingExercise
              ? "Update the exercise details below."
              : "Add a new master exercise that can be linked to workout templates."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="exercise-name">Exercise Name</Label>
            <Input
              id="exercise-name"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="e.g., Bench Press"
            />
          </div>
          <div>
            <Label htmlFor="exercise-tags">Tags (comma-separated)</Label>
            <Input
              id="exercise-tags"
              value={exerciseTags}
              onChange={(e) => setExerciseTags(e.target.value)}
              placeholder="e.g., compound, chest, pressing"
            />
          </div>
          <div>
            <Label htmlFor="exercise-muscle-group">
              Primary Muscle Group
            </Label>
            <Select
              value={exerciseMuscleGroup}
              onValueChange={setExerciseMuscleGroup}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select muscle group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chest">Chest</SelectItem>
                <SelectItem value="back">Back</SelectItem>
                <SelectItem value="shoulders">Shoulders</SelectItem>
                <SelectItem value="arms">Arms</SelectItem>
                <SelectItem value="legs">Legs</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!exerciseName.trim() || isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : editingExercise
                ? "Update Exercise"
                : "Create Exercise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}