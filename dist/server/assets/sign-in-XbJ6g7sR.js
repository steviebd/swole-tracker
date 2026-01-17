import { jsx, jsxs } from "react/jsx-runtime";
function SignInPage() {
  return /* @__PURE__ */ jsx("div", { className: "bg-background flex min-h-screen items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md space-y-8 p-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-foreground text-3xl font-bold tracking-tight", children: "Welcome to Swole Tracker" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-2 text-sm", children: "Sign in to track your workouts and progress" })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-center", children: "Auth UI coming in Phase 1" })
  ] }) });
}
export {
  SignInPage as component
};
