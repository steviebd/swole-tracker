import { s as jsxRuntimeExports } from "./worker-entry-_S0z7k3x.js";
import { R as Route$4 } from "./router-CfQjAsX4-BdfYCT0U.js";
import "./session-cookie-y6_dLywe-dJqk9W7A.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
import "util";
function WorkoutDetailsPage() {
  const {
    workoutId
  } = Route$4.useParams();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "Workout Details" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground mt-2", children: [
      "Workout ID: ",
      workoutId
    ] })
  ] });
}
export {
  WorkoutDetailsPage as component
};
