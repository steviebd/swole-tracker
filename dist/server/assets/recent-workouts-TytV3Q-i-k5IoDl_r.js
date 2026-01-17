import { b as reactExports, s as jsxRuntimeExports, e as useRouter, c as createServerFn } from "./worker-entry-_S0z7k3x.js";
import { B as analytics, b as cn, L as Link, d as createSsrRpc } from "./router-CfQjAsX4-BdfYCT0U.js";
import { u as useSuspenseQuery, q as queryOptions } from "./queryOptions-XULLYB5y.js";
import { w as withAuth } from "./middleware-C0nuZrz9-3s0fDIfv.js";
import { B as Button } from "./button-2to0siaj-D12d3OdY.js";
import { M as MotionConfigContext, i as isHTMLElement, f as useConstant, P as PresenceContext, g as usePresence, h as useIsomorphicLayoutEffect, L as LayoutGroupContext, c as createLucideIcon, C as Card, b as CardHeader, d as CardTitle, a as CardContent, S as Skeleton, m as motion } from "./_app._index-CJwPGQVf-BFDyR4JM.js";
import "./session-cookie-y6_dLywe-dJqk9W7A.js";
import { o as object, n as number, _ as _enum, s as string, b as array, d as date } from "./schemas-Dk_VZEFo.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
import "util";
import "./index-BDRuzYuQ.js";
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup === "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup === "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}
function useComposedRefs(...refs) {
  return reactExports.useCallback(composeRefs(...refs), refs);
}
class PopChildMeasure extends reactExports.Component {
  getSnapshotBeforeUpdate(prevProps) {
    const element = this.props.childRef.current;
    if (element && prevProps.isPresent && !this.props.isPresent) {
      const parent = element.offsetParent;
      const parentWidth = isHTMLElement(parent) ? parent.offsetWidth || 0 : 0;
      const size = this.props.sizeRef.current;
      size.height = element.offsetHeight || 0;
      size.width = element.offsetWidth || 0;
      size.top = element.offsetTop;
      size.left = element.offsetLeft;
      size.right = parentWidth - size.width - size.left;
    }
    return null;
  }
  /**
   * Required with getSnapshotBeforeUpdate to stop React complaining.
   */
  componentDidUpdate() {
  }
  render() {
    return this.props.children;
  }
}
function PopChild({ children, isPresent, anchorX, root }) {
  const id = reactExports.useId();
  const ref = reactExports.useRef(null);
  const size = reactExports.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0
  });
  const { nonce } = reactExports.useContext(MotionConfigContext);
  const composedRef = useComposedRefs(ref, children?.ref);
  reactExports.useInsertionEffect(() => {
    const { width, height, top, left, right } = size.current;
    if (isPresent || !ref.current || !width || !height)
      return;
    const x = anchorX === "left" ? `left: ${left}` : `right: ${right}`;
    ref.current.dataset.motionPopId = id;
    const style = document.createElement("style");
    if (nonce)
      style.nonce = nonce;
    const parent = root ?? document.head;
    parent.appendChild(style);
    if (style.sheet) {
      style.sheet.insertRule(`
          [data-motion-pop-id="${id}"] {
            position: absolute !important;
            width: ${width}px !important;
            height: ${height}px !important;
            ${x}px !important;
            top: ${top}px !important;
          }
        `);
    }
    return () => {
      if (parent.contains(style)) {
        parent.removeChild(style);
      }
    };
  }, [isPresent]);
  return jsxRuntimeExports.jsx(PopChildMeasure, { isPresent, childRef: ref, sizeRef: size, children: reactExports.cloneElement(children, { ref: composedRef }) });
}
const PresenceChild = ({ children, initial, isPresent, onExitComplete, custom, presenceAffectsLayout, mode, anchorX, root }) => {
  const presenceChildren = useConstant(newChildrenMap);
  const id = reactExports.useId();
  let isReusedContext = true;
  let context = reactExports.useMemo(() => {
    isReusedContext = false;
    return {
      id,
      initial,
      isPresent,
      custom,
      onExitComplete: (childId) => {
        presenceChildren.set(childId, true);
        for (const isComplete of presenceChildren.values()) {
          if (!isComplete)
            return;
        }
        onExitComplete && onExitComplete();
      },
      register: (childId) => {
        presenceChildren.set(childId, false);
        return () => presenceChildren.delete(childId);
      }
    };
  }, [isPresent, presenceChildren, onExitComplete]);
  if (presenceAffectsLayout && isReusedContext) {
    context = { ...context };
  }
  reactExports.useMemo(() => {
    presenceChildren.forEach((_, key) => presenceChildren.set(key, false));
  }, [isPresent]);
  reactExports.useEffect(() => {
    !isPresent && !presenceChildren.size && onExitComplete && onExitComplete();
  }, [isPresent]);
  if (mode === "popLayout") {
    children = jsxRuntimeExports.jsx(PopChild, { isPresent, anchorX, root, children });
  }
  return jsxRuntimeExports.jsx(PresenceContext.Provider, { value: context, children });
};
function newChildrenMap() {
  return /* @__PURE__ */ new Map();
}
const getChildKey = (child) => child.key || "";
function onlyElements(children) {
  const filtered = [];
  reactExports.Children.forEach(children, (child) => {
    if (reactExports.isValidElement(child))
      filtered.push(child);
  });
  return filtered;
}
const AnimatePresence = ({ children, custom, initial = true, onExitComplete, presenceAffectsLayout = true, mode = "sync", propagate = false, anchorX = "left", root }) => {
  const [isParentPresent, safeToRemove] = usePresence(propagate);
  const presentChildren = reactExports.useMemo(() => onlyElements(children), [children]);
  const presentKeys = propagate && !isParentPresent ? [] : presentChildren.map(getChildKey);
  const isInitialRender = reactExports.useRef(true);
  const pendingPresentChildren = reactExports.useRef(presentChildren);
  const exitComplete = useConstant(() => /* @__PURE__ */ new Map());
  const [diffedChildren, setDiffedChildren] = reactExports.useState(presentChildren);
  const [renderedChildren, setRenderedChildren] = reactExports.useState(presentChildren);
  useIsomorphicLayoutEffect(() => {
    isInitialRender.current = false;
    pendingPresentChildren.current = presentChildren;
    for (let i = 0; i < renderedChildren.length; i++) {
      const key = getChildKey(renderedChildren[i]);
      if (!presentKeys.includes(key)) {
        if (exitComplete.get(key) !== true) {
          exitComplete.set(key, false);
        }
      } else {
        exitComplete.delete(key);
      }
    }
  }, [renderedChildren, presentKeys.length, presentKeys.join("-")]);
  const exitingChildren = [];
  if (presentChildren !== diffedChildren) {
    let nextChildren = [...presentChildren];
    for (let i = 0; i < renderedChildren.length; i++) {
      const child = renderedChildren[i];
      const key = getChildKey(child);
      if (!presentKeys.includes(key)) {
        nextChildren.splice(i, 0, child);
        exitingChildren.push(child);
      }
    }
    if (mode === "wait" && exitingChildren.length) {
      nextChildren = exitingChildren;
    }
    setRenderedChildren(onlyElements(nextChildren));
    setDiffedChildren(presentChildren);
    return null;
  }
  const { forceRender } = reactExports.useContext(LayoutGroupContext);
  return jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: renderedChildren.map((child) => {
    const key = getChildKey(child);
    const isPresent = propagate && !isParentPresent ? false : presentChildren === renderedChildren || presentKeys.includes(key);
    const onExit = () => {
      if (exitComplete.has(key)) {
        exitComplete.set(key, true);
      } else {
        return;
      }
      let isEveryExitComplete = true;
      exitComplete.forEach((isExitComplete) => {
        if (!isExitComplete)
          isEveryExitComplete = false;
      });
      if (isEveryExitComplete) {
        forceRender?.();
        setRenderedChildren(pendingPresentChildren.current);
        propagate && safeToRemove?.();
        onExitComplete && onExitComplete();
      }
    };
    return jsxRuntimeExports.jsx(PresenceChild, { isPresent, initial: !isInitialRender.current || initial ? void 0 : false, custom, presenceAffectsLayout, mode, root, onExitComplete: isPresent ? void 0 : onExit, anchorX, children: child }, key);
  }) });
};
const __iconNode$8 = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
];
const ArrowRight = createLucideIcon("arrow-right", __iconNode$8);
const __iconNode$7 = [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
];
const BookOpen = createLucideIcon("book-open", __iconNode$7);
const __iconNode$6 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
];
const CircleCheck = createLucideIcon("circle-check", __iconNode$6);
const __iconNode$5 = [["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]];
const Circle = createLucideIcon("circle", __iconNode$5);
const __iconNode$4 = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Eye = createLucideIcon("eye", __iconNode$4);
const __iconNode$3 = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
];
const FileText = createLucideIcon("file-text", __iconNode$3);
const __iconNode$2 = [
  ["rect", { width: "18", height: "7", x: "3", y: "3", rx: "1", key: "f1a2em" }],
  ["rect", { width: "9", height: "7", x: "3", y: "14", rx: "1", key: "jqznyg" }],
  ["rect", { width: "5", height: "7", x: "16", y: "14", rx: "1", key: "q5h2i8" }]
];
const LayoutTemplate = createLucideIcon("layout-template", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "m17 2 4 4-4 4", key: "nntrym" }],
  ["path", { d: "M3 11v-1a4 4 0 0 1 4-4h14", key: "84bu3i" }],
  ["path", { d: "m7 22-4-4 4-4", key: "1wqhfi" }],
  ["path", { d: "M21 13v1a4 4 0 0 1-4 4H3", key: "1rx37r" }]
];
const Repeat = createLucideIcon("repeat", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
      key: "1s2grr"
    }
  ],
  ["path", { d: "M20 2v4", key: "1rf3ol" }],
  ["path", { d: "M22 4h-4", key: "gwowj6" }],
  ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }]
];
const Sparkles = createLucideIcon("sparkles", __iconNode);
const setInputSchema = object({
  id: string().optional(),
  weight: number().optional(),
  reps: number().int().positive().optional(),
  sets: number().int().positive().default(1),
  unit: _enum(["kg", "lbs"]).default("kg"),
  rpe: number().int().min(1).max(10).optional(),
  rest: number().int().positive().optional()
});
const exerciseInputSchema = object({
  templateExerciseId: number().optional(),
  exerciseName: string().min(1).max(256),
  sets: array(setInputSchema),
  unit: _enum(["kg", "lbs"]).default("kg")
});
const getRecentWorkouts = createServerFn({
  method: "GET"
}).inputValidator(object({
  limit: number().int().positive().default(10)
})).middleware([withAuth]).handler(createSsrRpc("fd51064e077a7e2c5410450d538d184cd913a23e3a3ec6270cc8d321a0dd35c4"));
createServerFn({
  method: "GET"
}).inputValidator(object({
  id: number()
})).middleware([withAuth]).handler(createSsrRpc("cbd05d3b6e9d4d9a4467af432428ff3ec9668fc1ccf7f11702b49207a36fb60d"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  templateId: number().optional(),
  workoutDate: date().default(() => /* @__PURE__ */ new Date()),
  copyFromSessionId: number().optional()
})).middleware([withAuth]).handler(createSsrRpc("55efdfc67e8d94993c01213abf20e83bbf2b7c210b536b79494dfd1520cb1817"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exercises: array(exerciseInputSchema)
})).middleware([withAuth]).handler(createSsrRpc("9b45fe33fa458a8d12a12b0f790fd4e5d3cfbf535a2aa0af1ac1128f23fb59b5"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  id: number()
})).middleware([withAuth]).handler(createSsrRpc("2c6c4a36fac579d6a56e784c3cfa8d3d179fe2429aa741eb7a8a21bccbcdd4ea"));
createServerFn({
  method: "GET"
}).inputValidator(object({
  exerciseNames: array(string()).optional(),
  templateExerciseId: number().optional()
})).middleware([withAuth]).handler(createSsrRpc("084dd54fcd0d58a1a6c106ea10b347a65cbaabb724652b220009787bc3a133c7"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseName: string().min(1).max(256),
  templateExerciseId: number().optional(),
  unit: _enum(["kg", "lbs"]).default("kg")
})).middleware([withAuth]).handler(createSsrRpc("144b739c4e6847ddfc29a2db156e0bc77a03e853a5310115fbf3017116247b16"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseId: number(),
  exerciseName: string().min(1).max(256).optional(),
  templateExerciseId: number().optional().nullable(),
  unit: _enum(["kg", "lbs"]).optional()
})).middleware([withAuth]).handler(createSsrRpc("ed37380a60c0937a5841118f118b5fabc26138055aece9b67e48c24c2f20561b"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseId: number()
})).middleware([withAuth]).handler(createSsrRpc("3753f848ef10f4aa549312d5ecc266828b151f16d860119bd66f4761a066b144"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseId: number(),
  weight: number().optional(),
  reps: number().int().positive().optional(),
  sets: number().int().positive().default(1),
  unit: _enum(["kg", "lbs"]).default("kg"),
  rpe: number().int().min(1).max(10).optional(),
  rest: number().int().positive().optional()
})).middleware([withAuth]).handler(createSsrRpc("33ab049565bbfc9bddffc879283f4a68cb4e0f70096af31e32228bc27e0871fb"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseId: number(),
  setId: number(),
  weight: number().optional().nullable(),
  reps: number().int().positive().optional().nullable(),
  sets: number().int().positive().optional().nullable(),
  unit: _enum(["kg", "lbs"]).optional(),
  rpe: number().int().min(1).max(10).optional().nullable(),
  rest: number().int().positive().optional().nullable()
})).middleware([withAuth]).handler(createSsrRpc("bfda402f223b530d3e6c1e56832336ec22946c59e9cea18601f5ce7b8cff9392"));
createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  setId: number()
})).middleware([withAuth]).handler(createSsrRpc("43e80a2d24c6616ce4a99caf445291d76a3d9757e37805f100474be2cff77a7f"));
const recentWorkoutsQueryOptions = (limit) => queryOptions({
  queryKey: ["recentWorkouts", limit],
  queryFn: () => getRecentWorkouts({ data: { limit } }),
  staleTime: 1e3 * 60 * 5
});
function useRecentWorkouts(limit) {
  return useSuspenseQuery(recentWorkoutsQueryOptions(limit));
}
function ClientPreferencesTrigger({
  inline,
  label = "Open preferences"
}) {
  if (inline) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", children: label }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", children: label }) });
}
const KG_TO_LB = 2.2046226218;
const parseNumeric = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};
const convertWeight = (value, fromUnit, toUnit) => {
  if (!Number.isFinite(value)) return 0;
  if (fromUnit === toUnit) return value;
  if (fromUnit === "lbs" && toUnit === "kg") {
    return value / KG_TO_LB;
  }
  if (fromUnit === "kg" && toUnit === "lbs") {
    return value * KG_TO_LB;
  }
  return value;
};
const determineVolumeUnit = (workout) => {
  if (!workout.exercises?.length) {
    return "kg";
  }
  let kgCount = 0;
  let lbsCount = 0;
  for (const exercise of workout.exercises) {
    if (exercise?.unit === "lbs") {
      lbsCount += 1;
    } else if (exercise?.unit === "kg") {
      kgCount += 1;
    }
  }
  if (lbsCount > kgCount) {
    return "lbs";
  }
  return "kg";
};
const formatVolume = (volume, unit) => {
  if (volume <= 0) {
    return `0 ${unit}`;
  }
  if (volume >= 1e4) {
    return `${Math.round(volume / 1e3)}k ${unit}`;
  }
  if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(1)}k ${unit}`;
  }
  return `${Math.round(volume).toLocaleString()} ${unit}`;
};
const safeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const extractDuration = (workout) => {
  const workoutObj = workout;
  if (typeof workoutObj["duration"] === "number") {
    const value = workoutObj["duration"];
    return Number.isFinite(value) ? value : null;
  }
  if (typeof workoutObj["durationMinutes"] === "number") {
    const value = workoutObj["durationMinutes"];
    return Number.isFinite(value) ? value : null;
  }
  const perfMetrics = workout.perf_metrics;
  if (perfMetrics && typeof perfMetrics === "object") {
    const durationValue = perfMetrics["durationMinutes"];
    if (typeof durationValue === "number" && Number.isFinite(durationValue)) {
      return durationValue;
    }
  }
  return null;
};
const uniqueExerciseCount = (workout) => {
  if (typeof workout.exerciseCount === "number") {
    return Math.max(0, workout.exerciseCount);
  }
  if (!workout.exercises?.length) {
    return 0;
  }
  const uniqueNames = /* @__PURE__ */ new Set();
  for (const exercise of workout.exercises) {
    if (exercise?.exerciseName) {
      uniqueNames.add(exercise.exerciseName);
    }
  }
  return uniqueNames.size;
};
const buildWorkoutSummary = (workout) => {
  const volumeUnit = determineVolumeUnit(workout);
  let totalSets = 0;
  let totalVolume = 0;
  for (const exercise of workout.exercises ?? []) {
    const sets = exercise?.sets ?? 1;
    const reps = exercise?.reps ?? 0;
    const weight = convertWeight(
      parseNumeric(exercise?.weight ?? exercise?.one_rm_estimate),
      exercise?.unit,
      volumeUnit
    );
    const volumeLoad = exercise?.volume_load ? convertWeight(
      parseNumeric(exercise.volume_load),
      exercise?.unit,
      volumeUnit
    ) : null;
    if (Number.isFinite(sets) && Number.isFinite(reps) && sets > 0 && reps > 0) {
      if (Number.isFinite(weight) && weight > 0) {
        totalVolume += volumeLoad ?? weight * reps * sets;
      }
      totalSets += sets;
    } else if (Number.isFinite(sets) && sets > 0) {
      totalSets += sets;
    }
  }
  const durationMinutes = extractDuration(workout);
  const estimatedDurationMinutes = durationMinutes ?? (totalSets > 0 ? totalSets * 3.5 : null);
  const exerciseCount = uniqueExerciseCount(workout);
  const metrics = [];
  if (durationMinutes !== null) {
    metrics.push({
      label: "Duration",
      value: `${Math.max(1, Math.round(durationMinutes))} min`
    });
  } else if (estimatedDurationMinutes !== null) {
    metrics.push({
      label: "Duration",
      value: `~${Math.max(1, Math.round(estimatedDurationMinutes))} min`
    });
  }
  if (totalVolume > 0) {
    metrics.push({
      label: "Volume",
      value: formatVolume(totalVolume, volumeUnit)
    });
  } else if (totalSets > 0) {
    metrics.push({
      label: "Sets",
      value: totalSets.toString()
    });
  }
  if (exerciseCount > 0) {
    metrics.push({
      label: "Exercises",
      value: exerciseCount.toString()
    });
  }
  while (metrics.length < 3) {
    metrics.push({ label: "—", value: "—" });
  }
  return {
    exerciseCount,
    totalSets,
    totalVolume,
    volumeUnit,
    durationMinutes,
    estimatedDurationMinutes,
    metrics: metrics.slice(0, 3)
  };
};
const isWorkoutWithinHours = (dateValue, hours = 24) => {
  const date2 = safeDate(dateValue);
  if (!date2) return false;
  const now = /* @__PURE__ */ new Date();
  const diffInMs = now.getTime() - date2.getTime();
  const diffInHours = diffInMs / (1e3 * 60 * 60);
  return diffInHours <= hours;
};
const GlassSurface = reactExports.forwardRef(
  ({ children, className, as: Component = "div", ...props }, ref) => {
    const overlayGradient = `
      radial-gradient(600px 300px at 10% -10%, var(--color-glass-highlight) 0%, transparent 55%),
      radial-gradient(420px 220px at 90% 0%, var(--color-glass-accent) 0%, transparent 60%)
    `;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Component,
      {
        ref,
        className: cn(
          // Base glass surface styling from design tokens
          "glass-surface",
          // Enhanced backdrop blur for glass effect
          "backdrop-blur-sm",
          // Subtle gradient overlay for depth
          "relative overflow-hidden",
          // Border and shadow from design system
          "border border-glass-border",
          "shadow-sm",
          // Rounded corners consistent with card system
          "rounded-lg",
          // Ensure proper z-index layering for glass architecture
          "relative",
          // Establish stronger base fill for contrast-sensitive contexts
          "bg-[color:var(--glass-surface-fill,transparent)]",
          className
        ),
        ...props,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "glass-surface-overlay pointer-events-none absolute inset-0",
              style: {
                background: overlayGradient
              },
              "aria-hidden": "true"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative z-10", children })
        ]
      }
    );
  }
);
GlassSurface.displayName = "GlassSurface";
const WorkoutCard = reactExports.forwardRef(
  ({
    workoutName,
    date: date2,
    metrics,
    onRepeat,
    onViewDetails,
    onDebrief,
    isRecent = false,
    source,
    className,
    ...props
  }, ref) => {
    const formatDate = (dateString) => {
      try {
        const workoutDate = new Date(dateString);
        const now = typeof window !== "undefined" ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(0);
        const diffInMs = now.getTime() - workoutDate.getTime();
        const diffInDays = Math.floor(diffInMs / (1e3 * 60 * 60 * 24));
        if (diffInDays === 0) {
          return "Today";
        } else if (diffInDays === 1) {
          return "Yesterday";
        } else if (diffInDays < 7) {
          return `${diffInDays} days ago`;
        } else {
          return workoutDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: workoutDate.getFullYear() !== now.getFullYear() ? "numeric" : void 0
          });
        }
      } catch {
        return dateString;
      }
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        ref,
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        whileHover: {
          scale: 1.01,
          y: -2
        },
        transition: {
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1]
        },
        className: cn("group relative", className),
        ...props,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(GlassSurface, { className: "p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-foreground truncate text-lg leading-tight font-semibold", children: workoutName }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: formatDate(date2) }),
                  source && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "span",
                    {
                      className: cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        source.type === "playbook" ? "bg-purple-500/15 text-purple-300" : "bg-blue-500/15 text-blue-300"
                      ),
                      children: [
                        source.type === "playbook" ? /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutTemplate, { className: "h-3 w-3" }),
                        source.type === "playbook" ? "Playbook" : "Template"
                      ]
                    }
                  )
                ] })
              ] }),
              isRecent && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                motion.div,
                {
                  initial: { scale: 0, rotate: -10 },
                  animate: { scale: 1, rotate: 0 },
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.1
                  },
                  className: "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
                  style: {
                    background: "var(--gradient-universal-action-primary)",
                    color: "white"
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3 w-3" }),
                    "New!"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-4", children: metrics.map((metric, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                motion.div,
                {
                  className: "text-foreground text-xl font-bold",
                  initial: { opacity: 0, scale: 0.8 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { delay: 0.1 + index * 0.05 },
                  children: metric.value
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground mt-1 text-xs font-medium", children: metric.label })
            ] }, `${metric.label}-${index}`)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                motion.button,
                {
                  onClick: onRepeat,
                  className: cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3",
                    "text-sm font-medium transition-all duration-200",
                    "border-default bg-surface-secondary text-content-primary border",
                    "focus-visible:ring-primary/40 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    "min-h-[44px]"
                    // Touch target size
                  ),
                  "data-state-layer": "surface",
                  whileHover: { scale: 1.02 },
                  whileTap: { scale: 0.98 },
                  transition: { duration: 0.1 },
                  "aria-label": `Repeat ${workoutName} workout`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Repeat, { className: "h-4 w-4" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "Repeat" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                motion.div,
                {
                  whileHover: { scale: 1.02, y: -1 },
                  whileTap: { scale: 0.98 },
                  transition: { duration: 0.1 },
                  className: "flex-1",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      variant: "secondary",
                      size: "sm",
                      onClick: onDebrief,
                      className: "min-h-[44px] w-full gap-2",
                      "aria-label": `View debrief for ${workoutName} workout`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "Debrief" })
                      ]
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                motion.button,
                {
                  onClick: onViewDetails,
                  className: cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3",
                    "text-sm font-medium transition-all duration-200",
                    "border-interactive-primary/28 border",
                    "bg-interactive-primary/16 text-interactive-primary",
                    "focus-visible:ring-primary focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    "min-h-[44px]"
                    // Touch target size
                  ),
                  "data-state-layer": "primary",
                  whileHover: { scale: 1.02, y: -1 },
                  whileTap: { scale: 0.98 },
                  transition: { duration: 0.1 },
                  "aria-label": `View details for ${workoutName} workout`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-4 w-4" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "Details" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "shadow-primary-active absolute inset-0 -z-10 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              "aria-hidden": "true"
            }
          )
        ] })
      }
    );
  }
);
WorkoutCard.displayName = "WorkoutCard";
const DEFAULT_LIMIT = {
  card: 3,
  dashboard: 5
};
const STRENGTH_CHECKLIST_STORAGE_KEY = "dashboard.strengthChecklist.v1";
const toIsoString = (value) => {
  if (!value) {
    return typeof window !== "undefined" ? (/* @__PURE__ */ new Date()).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof window !== "undefined" ? (/* @__PURE__ */ new Date()).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
  }
  return parsed.toISOString();
};
const resolveTemplateName = (workout, fallback) => {
  const playbook = workout.playbook;
  if (playbook && typeof playbook === "object" && !Array.isArray(playbook)) {
    const pb = playbook;
    if (typeof pb.name === "string" && typeof pb.weekNumber === "number" && typeof pb.sessionNumber === "number") {
      const name = pb.name.trim();
      if (name.length > 0) {
        return `${name} - Week ${pb.weekNumber} - Session ${pb.sessionNumber}`;
      }
    }
  }
  const template = workout.template;
  if (template && typeof template === "object" && !Array.isArray(template) && typeof template.name === "string") {
    const name = template.name.trim();
    if (name.length > 0) {
      return name;
    }
  }
  return fallback;
};
const resolveWorkoutSource = (workout) => {
  const playbook = workout.playbook;
  if (playbook && typeof playbook === "object" && !Array.isArray(playbook) && typeof playbook.name === "string") {
    return {
      type: "playbook",
      name: playbook.name
    };
  }
  const template = workout.template;
  if (template && typeof template === "object" && !Array.isArray(template) && typeof template.name === "string") {
    return {
      type: "template",
      name: template.name
    };
  }
  return null;
};
const RecentWorkouts = reactExports.forwardRef(
  ({ className, limit, variant = "card" }, ref) => {
    const router = useRouter();
    const resolvedLimit = limit ?? DEFAULT_LIMIT[variant];
    const {
      data: recentWorkouts,
      isLoading,
      error
    } = useRecentWorkouts(resolvedLimit);
    const handleRepeatWorkout = reactExports.useCallback(
      (workout) => {
        if (!workout?.templateId) {
          console.error("Cannot repeat workout without templateId", workout);
          return;
        }
        analytics.featureUsed("repeat_workout", {
          templateId: workout.templateId,
          workoutId: workout.id
        });
        router.navigate({
          to: "/workout/start",
          search: { templateId: workout.templateId }
        });
      },
      [router]
    );
    const handleViewDetails = reactExports.useCallback(
      (workoutId) => {
        router.navigate({
          to: "/workout/session/$localId",
          params: { localId: String(workoutId) }
        });
      },
      [router]
    );
    const handleStartNewWorkout = reactExports.useCallback(() => {
      router.navigate({ to: "/workout/start" });
    }, [router]);
    if (variant === "dashboard") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DashboardRecentWorkoutsView,
        {
          ...className && { className },
          error,
          forwardedRef: ref,
          isLoading,
          limit: resolvedLimit,
          onRepeat: handleRepeatWorkout,
          onStartNewWorkout: handleStartNewWorkout,
          onViewDetails: handleViewDetails,
          repeatPending: false,
          repeatingWorkoutId: null,
          workouts: recentWorkouts
        }
      ) });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      CardRecentWorkoutsView,
      {
        ...className && { className },
        error,
        forwardedRef: ref,
        isLoading,
        limit: resolvedLimit,
        onRepeat: handleRepeatWorkout,
        repeatPending: false,
        repeatingWorkoutId: null,
        workouts: recentWorkouts
      }
    ) });
  }
);
RecentWorkouts.displayName = "RecentWorkouts";
const dashboardPanelClass = "glass-card glass-hairline flex h-full flex-col border border-white/8 bg-card/85 shadow-xl";
const DashboardRecentWorkoutsView = ({
  className,
  error,
  forwardedRef,
  isLoading,
  limit,
  onStartNewWorkout: _onStartNewWorkout,
  onRepeat,
  onViewDetails,
  repeatPending,
  repeatingWorkoutId,
  workouts
}) => {
  const router = useRouter();
  const [checklistState, setChecklistState] = reactExports.useState({});
  reactExports.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(
        STRENGTH_CHECKLIST_STORAGE_KEY
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        setChecklistState(parsed);
      }
    } catch {
    }
  }, []);
  const toggleChecklistStep = reactExports.useCallback((id) => {
    setChecklistState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(
          STRENGTH_CHECKLIST_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
      }
      return next;
    });
  }, []);
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { ref: forwardedRef, className: cn(dashboardPanelClass, className), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "font-display text-foreground text-xl font-bold sm:text-2xl", children: "Recent Workouts" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground w-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Unable to load recent workouts." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs sm:text-sm", children: "Please try again later." })
      ] }) })
    ] });
  }
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { ref: forwardedRef, className: cn(dashboardPanelClass, className), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "font-display text-foreground text-xl font-bold sm:text-2xl", children: "Recent Workouts" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "flex-1 space-y-3 pt-4 sm:space-y-4", children: Array.from({ length: 3 }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Skeleton,
        {
          announce: false,
          variant: "card",
          className: "h-[160px] w-full sm:h-[180px]"
        },
        index
      )) })
    ] });
  }
  if (!workouts?.length) {
    const checklistSteps = [
      {
        id: "create-template",
        title: "Create a strength template",
        description: "Build your go-to heavy day blueprint with the lifts you rely on.",
        action: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, variant: "secondary", size: "sm", className: "text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/templates/new", children: "Create template" }) })
      },
      {
        id: "log-session",
        title: "Log your first session",
        description: "Run through a heavy day and capture your top sets to unlock insights.",
        action: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "sm", className: "text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/workout/start", children: "Start session" }) })
      },
      {
        id: "set-weekly-goal",
        title: "Set your weekly strength goal",
        description: "Tell us how many heavy sessions you're targeting so we can pace progression.",
        action: /* @__PURE__ */ jsxRuntimeExports.jsx(ClientPreferencesTrigger, { inline: true, label: "Open preferences" })
      }
    ];
    const completedCount = checklistSteps.filter(
      (step) => checklistState[step.id]
    ).length;
    const allComplete = completedCount === checklistSteps.length;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { ref: forwardedRef, className: cn(dashboardPanelClass, className), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "font-display text-foreground text-xl font-bold sm:text-2xl", children: "Dial in your strength setup" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-xs sm:text-sm", children: "Complete these three steps to unlock personalised readiness insights and faster logging." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground flex items-center justify-between text-xs font-semibold tracking-wide uppercase", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            completedCount,
            " of ",
            checklistSteps.length,
            " complete"
          ] }),
          allComplete && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200", children: "🎉 Ready to lift" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-3", children: checklistSteps.map((step) => {
          const completed = Boolean(checklistState[step.id]);
          const inputId = `strength-check-${step.id}`;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "li",
            {
              className: "rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm backdrop-blur",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "label",
                  {
                    htmlFor: inputId,
                    className: "flex cursor-pointer items-start gap-3 text-left",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          id: inputId,
                          type: "checkbox",
                          checked: completed,
                          onChange: () => {
                            toggleChecklistStep(step.id);
                          },
                          className: "sr-only"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 flex items-center justify-center", children: completed ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        CircleCheck,
                        {
                          className: "h-5 w-5 text-emerald-400",
                          "aria-hidden": true
                        }
                      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Circle,
                        {
                          className: "h-5 w-5 text-white/60",
                          "aria-hidden": true
                        }
                      ) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-content-primary text-sm font-semibold", children: step.title }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-content-secondary mt-1 block text-xs", children: step.description })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-content-secondary flex flex-wrap items-center gap-2 text-xs", children: [
                  step.action,
                  completed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-200", children: "Completed" })
                ] })
              ] })
            },
            step.id
          );
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-white/15 bg-white/5 p-3 text-sm text-white/85 shadow-sm backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Need inspiration?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-white/80", children: "Pair heavy compound openers with tempo accessories and mobility finishers. Once you log a session, your recent workouts will appear here automatically." })
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { ref: forwardedRef, className: cn(dashboardPanelClass, className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "gap-3 pb-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "font-display text-foreground text-xl font-bold sm:text-2xl", children: "Recent Workouts" }),
        workouts.length >= limit && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { whileHover: { x: 2 }, whileTap: { scale: 0.97 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: "/workouts",
            className: cn(
              "inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5",
              "text-primary text-xs font-semibold tracking-wide uppercase",
              "hover:border-primary/30 hover:text-primary/80 transition-colors duration-200",
              "focus-visible:ring-primary/30 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            ),
            children: [
              "View all",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-xs sm:text-sm", children: "Jump back into your latest sessions or repeat a template instantly." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "flex-1 pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { mode: "popLayout", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3 sm:space-y-4", children: workouts.map((workout, index) => {
      const summary = buildWorkoutSummary(workout);
      const displayDate = workout.workoutDate ?? workout.createdAt;
      const isoDate = toIsoString(displayDate);
      const isRecent = isWorkoutWithinHours(
        workout.createdAt ?? workout.workoutDate
      );
      const isRepeating = repeatPending && repeatingWorkoutId === workout.id;
      const handleRepeat = () => {
        if (isRepeating) return;
        void onRepeat(workout);
      };
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
          transition: {
            duration: 0.2,
            delay: index * 0.05,
            ease: [0.4, 0, 0.2, 1]
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            WorkoutCard,
            {
              workoutName: resolveTemplateName(
                workout,
                "Unnamed Workout"
              ),
              date: isoDate,
              metrics: summary.metrics,
              isRecent,
              source: resolveWorkoutSource(workout),
              onRepeat: handleRepeat,
              onDebrief: () => {
                console.log(
                  "Dashboard Debrief button clicked for workout:",
                  workout.id
                );
                router.navigate({
                  to: "/workouts/$workoutId",
                  params: { workoutId: String(workout.id) }
                });
              },
              onViewDetails: () => onViewDetails(workout.id)
            }
          )
        },
        workout.id
      );
    }) }) }) })
  ] });
};
const CardRecentWorkoutsView = ({
  className,
  error,
  forwardedRef,
  isLoading,
  onRepeat,
  repeatPending,
  repeatingWorkoutId,
  workouts
}) => {
  const router = useRouter();
  console.log(
    "CardRecentWorkoutsView: Using custom card implementation without Debrief button"
  );
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: forwardedRef, className: cn(className), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "font-serif text-2xl font-black", children: "Recent Workouts" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-4", children: [...Array(3)].map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-muted/30 rounded-xl p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton skeleton-text h-6 w-32" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton skeleton-text h-4 w-48" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton skeleton-text h-4 w-56" })
      ] }) }, index)) })
    ] }) });
  }
  if (error || !workouts?.length) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: forwardedRef, className: cn(className), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "font-serif text-2xl font-black", children: "Recent Workouts" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/workouts", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", children: "View All" }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "py-8 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: "No recent workouts found." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/templates", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { className: "mt-4", variant: "outline", children: "Start Your First Workout" }) })
      ] })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: forwardedRef, className: cn(className), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "font-serif text-2xl font-black", children: "Recent Workouts" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/workouts", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", children: "View All" }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-4", children: workouts.map((workout) => {
      const summary = buildWorkoutSummary(workout);
      const workoutDate = workout.workoutDate ?? workout.createdAt;
      const isoDate = toIsoString(workoutDate);
      const isRecent = isWorkoutWithinHours(
        workout.createdAt ?? workout.workoutDate
      );
      const isRepeating = repeatPending && repeatingWorkoutId === workout.id;
      const handleRepeat = () => {
        if (isRepeating) return;
        void onRepeat(workout);
      };
      const handleViewDetails = () => {
        router.navigate({
          to: "/workout/session/$localId",
          params: { localId: String(workout.id) }
        });
      };
      const handleDebrief = () => {
        console.log(
          "Card Debrief button clicked for workout:",
          workout.id
        );
        router.navigate({
          to: "/workouts/$workoutId",
          params: { workoutId: String(workout.id) }
        });
      };
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        WorkoutCard,
        {
          workoutName: resolveTemplateName(workout, "Unnamed Workout"),
          date: isoDate,
          metrics: summary.metrics,
          isRecent,
          source: resolveWorkoutSource(workout),
          onRepeat: handleRepeat,
          onDebrief: handleDebrief,
          onViewDetails: handleViewDetails
        },
        workout.id
      );
    }) })
  ] }) });
};
export {
  RecentWorkouts
};
