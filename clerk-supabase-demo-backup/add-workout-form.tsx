"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addWorkoutTemplate } from "./actions";

export function AddWorkoutForm() {
  const [templateName, setTemplateName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim()) return;

    setIsSubmitting(true);

    try {
      await addWorkoutTemplate(templateName.trim());
      setTemplateName("");
      router.refresh(); // Refresh to show new template in server-side section
    } catch (error) {
      console.error("Error adding template:", error);
      alert("Failed to add workout template");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="templateName"
          className="mb-2 block text-sm font-medium"
        >
          Add New Workout Template
        </label>
        <input
          id="templateName"
          type="text"
          placeholder="Enter template name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
          disabled={isSubmitting}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !templateName.trim()}
        className="rounded-md bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
      >
        {isSubmitting ? "Adding..." : "Add Template"}
      </button>
    </form>
  );
}
