export interface SetData {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  sets: number;
  unit: "kg" | "lbs";
  rpe?: number;
  rest?: number;
}
