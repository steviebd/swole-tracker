import { jsxs, jsx } from "react/jsx-runtime";
function Dashboard() {
  return /* @__PURE__ */ jsxs("div", { className: "container mx-auto py-8", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold", children: "Dashboard" }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-4", children: "Welcome to Swole Tracker! Your workout tracking dashboard will appear here." })
  ] });
}
export {
  Dashboard as component
};
