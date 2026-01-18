import { type SetData } from "./set-input";

export interface ExerciseData {
  exerciseName: string;
  sets: SetData[];
  unit: "kg" | "lbs";
  templateExerciseId?: number;
}
