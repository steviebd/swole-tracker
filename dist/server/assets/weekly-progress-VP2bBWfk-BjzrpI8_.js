import { b as reactExports, s as jsxRuntimeExports } from "./worker-entry-_S0z7k3x.js";
import { u as useDashboardData, C as Card, b as CardHeader, d as CardTitle, a as CardContent, S as Skeleton, e as cva } from "./_app._index-CJwPGQVf-BFDyR4JM.js";
import { b as cn } from "./router-CfQjAsX4-BdfYCT0U.js";
import { c as createSlot, S as Slot } from "./index-BDRuzYuQ.js";
import "./middleware-C0nuZrz9-3s0fDIfv.js";
import "./session-cookie-y6_dLywe-dJqk9W7A.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
import "./queryOptions-XULLYB5y.js";
import "./schemas-Dk_VZEFo.js";
import "util";
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext3(rootComponentName, defaultContext) {
    const BaseContext = reactExports.createContext(defaultContext);
    const index = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = (props) => {
      const { scope, children, ...context } = props;
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const value = reactExports.useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Context.Provider, { value, children });
    };
    Provider.displayName = rootComponentName + "Provider";
    function useContext2(consumerName, scope) {
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const context = reactExports.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return [Provider, useContext2];
  }
  const createScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return reactExports.createContext(defaultContext);
    });
    return function useScope(scope) {
      const contexts = scope?.[scopeName] || scopeContexts;
      return reactExports.useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    };
  };
  createScope.scopeName = scopeName;
  return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
function composeContextScopes(...scopes) {
  const baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  const createScope = () => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const scopeProps = useScope(overrideScopes);
        const currentScope = scopeProps[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return reactExports.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    };
  };
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot2 = createSlot(`Primitive.${node}`);
  const Node = reactExports.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot2 : node;
    if (typeof window !== "undefined") {
      window[/* @__PURE__ */ Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node };
}, {});
var PROGRESS_NAME = "Progress";
var DEFAULT_MAX = 100;
var [createProgressContext, createProgressScope] = createContextScope(PROGRESS_NAME);
var [ProgressProvider, useProgressContext] = createProgressContext(PROGRESS_NAME);
var Progress$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeProgress,
      value: valueProp = null,
      max: maxProp,
      getValueLabel = defaultGetValueLabel,
      ...progressProps
    } = props;
    if ((maxProp || maxProp === 0) && !isValidMaxNumber(maxProp)) {
      console.error(getInvalidMaxError(`${maxProp}`, "Progress"));
    }
    const max = isValidMaxNumber(maxProp) ? maxProp : DEFAULT_MAX;
    if (valueProp !== null && !isValidValueNumber(valueProp, max)) {
      console.error(getInvalidValueError(`${valueProp}`, "Progress"));
    }
    const value = isValidValueNumber(valueProp, max) ? valueProp : null;
    const valueLabel = isNumber(value) ? getValueLabel(value, max) : void 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressProvider, { scope: __scopeProgress, value, max, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        "aria-valuemax": max,
        "aria-valuemin": 0,
        "aria-valuenow": isNumber(value) ? value : void 0,
        "aria-valuetext": valueLabel,
        role: "progressbar",
        "data-state": getProgressState(value, max),
        "data-value": value ?? void 0,
        "data-max": max,
        ...progressProps,
        ref: forwardedRef
      }
    ) });
  }
);
Progress$1.displayName = PROGRESS_NAME;
var INDICATOR_NAME = "ProgressIndicator";
var ProgressIndicator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeProgress, ...indicatorProps } = props;
    const context = useProgressContext(INDICATOR_NAME, __scopeProgress);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        "data-state": getProgressState(context.value, context.max),
        "data-value": context.value ?? void 0,
        "data-max": context.max,
        ...indicatorProps,
        ref: forwardedRef
      }
    );
  }
);
ProgressIndicator.displayName = INDICATOR_NAME;
function defaultGetValueLabel(value, max) {
  return `${Math.round(value / max * 100)}%`;
}
function getProgressState(value, maxValue) {
  return value == null ? "indeterminate" : value === maxValue ? "complete" : "loading";
}
function isNumber(value) {
  return typeof value === "number";
}
function isValidMaxNumber(max) {
  return isNumber(max) && !isNaN(max) && max > 0;
}
function isValidValueNumber(value, max) {
  return isNumber(value) && !isNaN(value) && value <= max && value >= 0;
}
function getInvalidMaxError(propValue, componentName) {
  return `Invalid prop \`max\` of value \`${propValue}\` supplied to \`${componentName}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${DEFAULT_MAX}\`.`;
}
function getInvalidValueError(propValue, componentName) {
  return `Invalid prop \`value\` of value \`${propValue}\` supplied to \`${componentName}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${DEFAULT_MAX} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`;
}
var Root = Progress$1;
var Indicator = ProgressIndicator;
function Progress({
  className,
  value,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root,
    {
      "data-slot": "progress",
      className: cn(
        "bg-surface-secondary relative h-2 w-full overflow-hidden rounded-full",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Indicator,
        {
          "data-slot": "progress-indicator",
          className: "bg-interactive-primary h-full w-full flex-1 transition-all",
          style: { transform: `translateX(-${100 - (value || 0)}%)` }
        }
      )
    }
  );
}
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 ease-out overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-interactive-primary text-primary-foreground",
        secondary: "border-transparent bg-interactive-secondary text-secondary-foreground",
        destructive: "border-transparent bg-status-danger text-white focus-visible:ring-destructive/40",
        outline: "border-interactive-primary bg-surface-base text-interactive-primary"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
const STATE_LAYER_BY_BADGE_VARIANT = {
  default: "primary",
  secondary: "secondary",
  destructive: "error",
  outline: "surface"
};
function Badge({
  className,
  variant,
  asChild = false,
  style,
  ...props
}) {
  const Comp = asChild ? Slot : "span";
  const stateLayer = STATE_LAYER_BY_BADGE_VARIANT[variant ?? "default"] ?? "surface";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Comp,
    {
      "data-slot": "badge",
      "data-state-layer": stateLayer,
      className: cn(badgeVariants({ variant }), className),
      style,
      ...props
    }
  );
}
const LoadingState = reactExports.forwardRef(
  ({ label, description, children, className, ...props }, ref) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        ref,
        className: cn("relative", className),
        role: "status",
        "aria-live": "polite",
        "aria-busy": "true",
        ...props,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: label }),
          description ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: description }) : null,
          children
        ]
      }
    );
  }
);
LoadingState.displayName = "LoadingState";
const EmptyState = reactExports.forwardRef(
  ({ title, description, icon, actions, srLabel, className, children, ...props }, ref) => {
    const announcement = srLabel ?? `${title}${description ? `. ${description}` : ""}`;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        ref,
        className: cn(
          "glass-surface relative overflow-hidden rounded-xl p-8 text-center sm:p-10",
          className
        ),
        role: "status",
        "aria-live": "polite",
        ...props,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: announcement }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 space-y-5", children: [
            icon ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl",
                "aria-hidden": "true",
                children: icon
              }
            ) : null,
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-display text-lg font-semibold text-foreground", children: title }),
              description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mx-auto max-w-sm", children: description }) : null
            ] }),
            children,
            actions ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center justify-center gap-3", children: actions }) : null
          ] })
        ]
      }
    );
  }
);
EmptyState.displayName = "EmptyState";
function WeeklyProgress() {
  const [selectedPeriod, setSelectedPeriod] = reactExports.useState(
    "week"
  );
  const { data: dashboardData, isLoading } = useDashboardData(selectedPeriod);
  const calculateGoals = () => {
    const targetWorkouts = selectedPeriod === "week" ? 3 : 12;
    const totalWorkouts = dashboardData?.workoutCount || 0;
    const workoutProgress = Math.min(
      100,
      totalWorkouts / targetWorkouts * 100
    );
    const workoutStatus = totalWorkouts > targetWorkouts ? "exceeded" : totalWorkouts === targetWorkouts ? "perfect" : "in_progress";
    const totalVolume = dashboardData?.totalVolume || 0;
    const targetVolume = selectedPeriod === "week" ? 15e3 : 6e4;
    const volumeProgress = Math.min(100, totalVolume / targetVolume * 100);
    const volumeStatus = totalVolume > targetVolume ? "exceeded" : totalVolume === targetVolume ? "perfect" : "in_progress";
    const consistencyScore = Math.min(
      100,
      totalWorkouts / targetWorkouts * 100
    );
    const consistencyStatus = consistencyScore === 100 ? "perfect" : consistencyScore >= 80 ? "exceeded" : "in_progress";
    return [
      {
        label: "Workout Goal",
        current: totalWorkouts,
        target: targetWorkouts,
        unit: " sessions",
        progress: workoutProgress,
        status: workoutStatus
      },
      {
        label: "Volume Goal",
        current: (totalVolume / 1e3).toFixed(1),
        target: (targetVolume / 1e3).toFixed(0),
        unit: "k kg",
        progress: volumeProgress,
        status: volumeStatus
      },
      {
        label: "Consistency",
        current: Math.round(consistencyScore),
        target: 100,
        unit: "%",
        progress: consistencyScore,
        status: consistencyStatus
      }
    ];
  };
  const goals = calculateGoals();
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass-card glass-hairline bg-card/85 flex h-full flex-col border border-white/8 shadow-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "font-display text-foreground text-xl font-bold sm:text-2xl", children: "Weekly Progress" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        LoadingState,
        {
          label: "Loading weekly progress",
          description: "Crunching your workout volume and consistency",
          className: "space-y-6",
          children: Array.from({ length: 3 }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Skeleton,
              {
                announce: false,
                variant: "text",
                className: "h-6 w-32"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { announce: false, className: "h-8 w-48" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { announce: false, className: "h-3 w-full" })
          ] }, index))
        }
      ) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass-card glass-hairline bg-card/85 flex h-full flex-col border border-white/8 shadow-xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "font-display text-foreground text-xl font-bold sm:text-2xl", children: [
        selectedPeriod === "week" ? "Weekly" : "Monthly",
        " Progress"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: selectedPeriod === "week" ? "secondary" : "outline",
            className: selectedPeriod === "week" ? "bg-muted text-muted-foreground" : "cursor-pointer",
            onClick: () => setSelectedPeriod("week"),
            children: "Week"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: selectedPeriod === "month" ? "secondary" : "outline",
            className: selectedPeriod === "month" ? "bg-muted text-muted-foreground" : "cursor-pointer",
            onClick: () => setSelectedPeriod("month"),
            children: "Month"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "flex-1 space-y-6", children: goals.map((goal, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-foreground font-semibold", children: goal.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-foreground font-serif text-2xl font-black", children: [
            goal.current,
            goal.unit,
            " / ",
            goal.target,
            goal.unit
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            className: `${goal.status === "exceeded" ? "from-chart-1 to-chart-3 text-primary-foreground bg-gradient-to-r" : goal.status === "perfect" ? "from-chart-3 to-chart-4 text-primary-foreground bg-gradient-to-r" : "bg-muted text-muted-foreground"}`,
            children: goal.status === "exceeded" ? "Exceeded!" : goal.status === "perfect" ? "Perfect!" : "In Progress"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, { value: goal.progress, className: "h-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: goal.status === "exceeded" ? `${parseFloat(goal.current.toString()) - parseFloat(goal.target.toString())}${goal.unit} over target` : goal.status === "perfect" ? "Great consistency!" : `${parseFloat(goal.target.toString()) - parseFloat(goal.current.toString())}${goal.unit} remaining` })
    ] }, index)) })
  ] });
}
export {
  WeeklyProgress
};
