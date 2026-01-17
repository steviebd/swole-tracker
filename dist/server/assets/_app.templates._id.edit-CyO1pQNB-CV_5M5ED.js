import { b as reactExports, s as jsxRuntimeExports } from "./worker-entry-_S0z7k3x.js";
import { d as useTemplate, e as useUpdateTemplate, a as useDeleteTemplate } from "./templates-DOh4vSSD-JYaotu6G.js";
import { f as useParams } from "./router-CfQjAsX4-BdfYCT0U.js";
import "./session-cookie-y6_dLywe-dJqk9W7A.js";
import "./middleware-C0nuZrz9-3s0fDIfv.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
import "./queryOptions-XULLYB5y.js";
import "./schemas-Dk_VZEFo.js";
import "util";
function EditTemplatePage() {
  const params = useParams({
    from: "/_app/templates/$id/edit"
  });
  const templateId = parseInt(params.id, 10);
  const {
    data: template,
    isLoading
  } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const [name, setName] = reactExports.useState("");
  const [exerciseInput, setExerciseInput] = reactExports.useState("");
  const [exercises, setExercises] = reactExports.useState([]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container mx-auto py-8", children: "Loading..." });
  }
  if (!template) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container mx-auto py-8", children: "Template not found" });
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
  const handleRemoveExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && exercises.length > 0) {
      updateTemplate.mutate({
        data: {
          id: templateId,
          name: name.trim(),
          exercises
        }
      });
    }
  };
  const handleDelete = () => {
    if (confirm("Delete this template? This cannot be undone.")) {
      deleteTemplate.mutate({
        data: {
          id: templateId
        }
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto max-w-2xl py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mb-6 text-3xl font-bold", children: "Edit Template" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "name", className: "mb-2 block text-sm font-medium", children: "Template Name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "name", type: "text", value: name, onChange: (e) => setName(e.target.value), className: "bg-background w-full rounded-lg border px-4 py-2", required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "exercise", className: "mb-2 block text-sm font-medium", children: "Exercises" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "exercise", type: "text", value: exerciseInput, onChange: (e) => setExerciseInput(e.target.value), onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddExercise();
            }
          }, placeholder: "Add an exercise", className: "bg-background flex-1 rounded-lg border px-4 py-2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleAddExercise, className: "bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg border px-4 py-2", children: "Add" })
        ] })
      ] }),
      exercises.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: exercises.map((exercise, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted/50 flex items-center justify-between rounded-lg border p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: exercise }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => handleRemoveExercise(index), className: "text-muted-foreground hover:text-destructive", children: "Remove" })
      ] }, index)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: !name.trim() || exercises.length === 0 || updateTemplate.isPending, className: "bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 disabled:opacity-50", children: updateTemplate.isPending ? "Saving..." : "Save Changes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "/_app/templates", className: "hover:bg-muted rounded-lg border px-4 py-2", children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: handleDelete, className: "border-destructive text-destructive hover:bg-destructive/10 rounded-lg border px-4 py-2", children: "Delete" })
      ] })
    ] })
  ] });
}
export {
  EditTemplatePage as component
};
