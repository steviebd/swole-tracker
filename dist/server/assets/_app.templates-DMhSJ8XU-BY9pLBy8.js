import { b as reactExports, s as jsxRuntimeExports } from "./worker-entry-_S0z7k3x.js";
import { L as Link } from "./router-CfQjAsX4-BdfYCT0U.js";
import { u as useTemplates, a as useDeleteTemplate, b as useDuplicateTemplate } from "./templates-DOh4vSSD-JYaotu6G.js";
import "./session-cookie-y6_dLywe-dJqk9W7A.js";
import "./middleware-C0nuZrz9-3s0fDIfv.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
import "util";
import "./queryOptions-XULLYB5y.js";
import "./schemas-Dk_VZEFo.js";
function TemplatesPage() {
  const {
    data: templates
  } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();
  const [search, setSearch] = reactExports.useState("");
  const [sort, setSort] = reactExports.useState("recent");
  const filteredTemplates = templates?.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto max-w-4xl py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold", children: "Templates" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/_app/templates/new", className: "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium", children: "New Template" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 flex gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", placeholder: "Search templates...", value: search, onChange: (e) => setSearch(e.target.value), className: "bg-background flex-1 rounded-lg border px-4 py-2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: sort, onChange: (e) => setSort(e.target.value), className: "bg-background rounded-lg border px-4 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "recent", children: "Most Recent" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "lastUsed", children: "Last Used" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "mostUsed", children: "Most Used" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "name", children: "Name" })
      ] })
    ] }),
    filteredTemplates?.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground py-12 text-center", children: "No templates found. Create your first template to get started." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-4", children: filteredTemplates?.map((template) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card flex items-center justify-between rounded-lg border p-4 transition-shadow hover:shadow-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/_app/templates/$id/edit", params: {
          id: template.id.toString()
        }, className: "text-lg font-medium hover:underline", children: template.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground text-sm", children: [
          template.exercises?.length || 0,
          " exercises",
          template.totalSessions !== void 0 && ` • ${template.totalSessions} sessions`
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => duplicateTemplate.mutate({
          data: {
            id: template.id
          }
        }), className: "text-muted-foreground hover:text-foreground px-3 py-1 text-sm", children: "Duplicate" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          if (confirm("Delete this template?")) {
            deleteTemplate.mutate({
              data: {
                id: template.id
              }
            });
          }
        }, className: "text-destructive hover:text-destructive/90 px-3 py-1 text-sm", children: "Delete" })
      ] })
    ] }, template.id)) })
  ] });
}
export {
  TemplatesPage as component
};
