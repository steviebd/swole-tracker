import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  useTemplates,
  useDeleteTemplate,
  useDuplicateTemplate,
} from "~/lib/queries/templates";
import { useState } from "react";
import { PageShell } from "~/components/layout/page-shell";

export const Route = createFileRoute("/_app/templates")({
  component: TemplatesPage,
});

function TemplatesPage() {
  const { data: templates } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "lastUsed" | "mostUsed" | "name">(
    "recent",
  );

  const filteredTemplates = templates?.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PageShell
      title="Your Workout Arsenal"
      description="Organise, duplicate, and launch templates built for your training focus."
      backHref="/"
      backLabel="Dashboard"
      actions={
        <Link
          to="/templates/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
        >
          Create Template
        </Link>
      }
    >
      <Outlet />
      <div className="space-y-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background flex-1 rounded-lg border px-4 py-2"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-background rounded-lg border px-4 py-2"
          >
            <option value="recent">Most Recent</option>
            <option value="lastUsed">Last Used</option>
            <option value="mostUsed">Most Used</option>
            <option value="name">Name</option>
          </select>
        </div>

        {filteredTemplates?.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            No templates found. Create your first template to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTemplates?.map((template) => (
              <div
                key={template.id}
                className="bg-card flex items-center justify-between rounded-lg border p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex-1">
                  <Link
                    to="/templates/$id/edit"
                    params={{ id: template.id.toString() }}
                    className="text-lg font-medium hover:underline"
                  >
                    {template.name}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {template.exercises?.length || 0} exercises
                    {template.totalSessions !== undefined &&
                      ` • ${template.totalSessions} sessions`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      duplicateTemplate.mutate({ data: { id: template.id } })
                    }
                    className="text-muted-foreground hover:text-foreground px-3 py-1 text-sm"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this template?")) {
                        deleteTemplate.mutate({ data: { id: template.id } });
                      }
                    }}
                    className="text-destructive hover:text-destructive/90 px-3 py-1 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
