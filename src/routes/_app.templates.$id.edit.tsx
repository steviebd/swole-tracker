import { createFileRoute } from "@tanstack/react-router";
import {
  useTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "~/lib/queries/templates";
import { useState } from "react";
import { useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/templates/$id/edit")({
  component: EditTemplatePage,
});

function EditTemplatePage() {
  const params = useParams({ from: "/_app/templates/$id/edit" });
  const templateId = parseInt(params.id, 10);
  const { data: template, isLoading } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [name, setName] = useState("");
  const [exerciseInput, setExerciseInput] = useState("");
  const [exercises, setExercises] = useState<string[]>([]);

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!template) {
    return <div className="container mx-auto py-8">Template not found</div>;
  }

  if (name === "") setName(template.name);
  if (exercises.length === 0 && template.exercises) {
    setExercises(template.exercises.map((e) => e.exerciseName));
  }

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
      updateTemplate.mutate({
        data: { id: templateId, name: name.trim(), exercises },
      });
    }
  };

  const handleDelete = () => {
    if (confirm("Delete this template? This cannot be undone.")) {
      deleteTemplate.mutate({ data: { id: templateId } });
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="mb-6 text-3xl font-bold">Edit Template</h1>

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
              !name.trim() || exercises.length === 0 || updateTemplate.isPending
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 disabled:opacity-50"
          >
            {updateTemplate.isPending ? "Saving..." : "Save Changes"}
          </button>
          <a
            href="/_app/templates"
            className="hover:bg-muted rounded-lg border px-4 py-2"
          >
            Cancel
          </a>
          <button
            type="button"
            onClick={handleDelete}
            className="border-destructive text-destructive hover:bg-destructive/10 rounded-lg border px-4 py-2"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
