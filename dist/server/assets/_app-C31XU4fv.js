import { jsx } from "react/jsx-runtime";
import { Outlet } from "@tanstack/react-router";
function AppLayout() {
  return /* @__PURE__ */ jsx("div", { className: "bg-background min-h-screen", children: /* @__PURE__ */ jsx(Outlet, {}) });
}
export {
  AppLayout as component
};
