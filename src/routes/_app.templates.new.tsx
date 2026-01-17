import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCreateTemplate } from "~/lib/queries/templates";
import { useState } from "react";

export const Route = createFileRoute("/_app/templates/new")({
  component: NewTemplatePage,
});

function NewTemplatePage() {
  const createTemplate = useCreateTemplate();
  const [name, setName] = useState("");
  const [exerciseInput, setExerciseInput] = useState("");
  const [exercises, setExercises] = useState<string[]>([]);

  const handleAddExercise = () => {
    if (exerciseInput.trim() && !exercises.includes(exerciseInput.trim())) {
      setExercises([...exercises, exerciseInput.trim()]);
      setExerciseInput("");
    }
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && exercises.length > 0) {
      createTemplate.mutate({
        data: { name: name.trim(), exercises },
      });
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="mb-6 text-3xl font-bold">Create Template</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Template Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Push Day"
            className="bg-background w-full rounded-lg border px-4 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="exercise" className="mb-2 block text-sm font-medium">
            Exercises
          </label>
          <div className="flex gap-2">
            <input
              id="exercise"
              type="text"
              value={exerciseInput}
              onChange={(e) => setExerciseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddExercise();
                }
              }}
              placeholder="Add an exercise"
              className="bg-background flex-1 rounded-lg border px-4 py-2"
            />
            <button
              type="button"
              onClick={handleAddExercise}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg border px-4 py-2"
            >
              Add
            </button>
          </div>
        </div>

        {exercises.length > 0 && (
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <div
                key={index}
                className="bg-muted/50 flex items-center justify-between rounded-lg border p-3"
              >
                <span>{exercise}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveExercise(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={
              !name.trim() || exercises.length === 0 || createTemplate.isPending
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 disabled:opacity-50"
          >
            {createTemplate.isPending ? "Creating..." : "Create Template"}
          </button>
          <a
            href="/_app/templates"
            className="hover:bg-muted rounded-lg border px-4 py-2"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
