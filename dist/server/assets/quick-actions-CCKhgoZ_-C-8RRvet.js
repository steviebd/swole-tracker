import { b as reactExports, s as jsxRuntimeExports, e as useRouter } from "./worker-entry-_S0z7k3x.js";
import { c as createLucideIcon, C as Card, a as CardContent, F as Flame } from "./_app._index-CJwPGQVf-BFDyR4JM.js";
import { B as Button } from "./button-2to0siaj-D12d3OdY.js";
import { b as cn } from "./router-CfQjAsX4-BdfYCT0U.js";
import "./middleware-C0nuZrz9-3s0fDIfv.js";
import "./session-cookie-y6_dLywe-dJqk9W7A.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
import "./queryOptions-XULLYB5y.js";
import "./schemas-Dk_VZEFo.js";
import "./index-BDRuzYuQ.js";
import "util";
const __iconNode$2 = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "M18 17V9", key: "2bz60n" }],
  ["path", { d: "M13 17V5", key: "1frdt8" }],
  ["path", { d: "M8 17v-3", key: "17ska0" }]
];
const ChartColumn = createLucideIcon("chart-column", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z",
      key: "9m4mmf"
    }
  ],
  ["path", { d: "m2.5 21.5 1.4-1.4", key: "17g3f0" }],
  ["path", { d: "m20.1 3.9 1.4-1.4", key: "1qn309" }],
  [
    "path",
    {
      d: "M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z",
      key: "1t2c92"
    }
  ],
  ["path", { d: "m9.6 14.4 4.8-4.8", key: "6umqxw" }]
];
const Dumbbell = createLucideIcon("dumbbell", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
      key: "10ikf1"
    }
  ]
];
const Play = createLucideIcon("play", __iconNode);
const STORAGE_KEY = "workoutDrafts.v1";
const WORKOUT_DRAFTS_STORAGE_KEY = STORAGE_KEY;
const TRIM_TRIGGER_BYTES = 36e5;
const TARGET_BYTES = 3e6;
const WORKOUT_DRAFTS_UPDATED_EVENT = "workout-drafts:updated";
const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const notifyDraftsUpdated = () => {
  console.log("notifyDraftsUpdated called");
  if (!isBrowser()) {
    console.log("Not in browser environment");
    return;
  }
  if (typeof window.dispatchEvent !== "function") {
    console.log("window.dispatchEvent not available");
    return;
  }
  try {
    console.log("Dispatching custom event:", WORKOUT_DRAFTS_UPDATED_EVENT);
    window.dispatchEvent(
      new CustomEvent(WORKOUT_DRAFTS_UPDATED_EVENT, {
        bubbles: false
      })
    );
    console.log("Custom event dispatched successfully");
  } catch (error) {
    console.error("Error dispatching custom event:", error);
  }
};
function safeNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : void 0;
}
function readDrafts() {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        return false;
      const obj = item;
      return typeof obj["sessionId"] === "number" && typeof obj["updatedAt"] === "number" && Array.isArray(obj["exercises"]);
    }).map((item) => ({
      sessionId: item.sessionId,
      updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
      exercises: item.exercises.map(
        (exercise) => {
          const exerciseResult = {
            exerciseName: exercise.exerciseName,
            unit: exercise.unit ?? "kg",
            sets: []
          };
          if (exercise.templateExerciseId !== void 0) {
            exerciseResult.templateExerciseId = exercise.templateExerciseId;
          }
          exerciseResult.sets = Array.isArray(exercise.sets) ? exercise.sets.map((set) => {
            const setResult = {
              id: typeof set.id === "string" ? set.id : `draft-${Math.random().toString(36).slice(2)}`,
              setNumber: set.setNumber,
              sets: typeof set.sets === "number" && set.sets > 0 ? set.sets : 1,
              unit: set.unit ?? "kg"
            };
            const weight = safeNumber(set.weight);
            if (weight !== void 0) {
              setResult.weight = weight;
            }
            const reps = safeNumber(set.reps);
            if (reps !== void 0) {
              setResult.reps = reps;
            }
            const rpe = safeNumber(set.rpe);
            if (rpe !== void 0) {
              setResult.rpe = rpe;
            }
            const rest = safeNumber(set.rest);
            if (rest !== void 0) {
              setResult.rest = rest;
            }
            return setResult;
          }) : [];
          return exerciseResult;
        }
      )
    }));
  } catch {
    return [];
  }
}
function isQuotaError(error) {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === 22) return true;
  if ("name" in error && error.name === "QuotaExceededError")
    return true;
  return false;
}
function enforceBudget(drafts) {
  if (drafts.length === 0) return drafts;
  const sorted = [...drafts].sort((a, b) => b.updatedAt - a.updatedAt);
  let serialized = JSON.stringify(sorted);
  if (serialized.length <= TRIM_TRIGGER_BYTES) {
    return sorted;
  }
  while (sorted.length > 0 && serialized.length > TARGET_BYTES) {
    sorted.pop();
    serialized = JSON.stringify(sorted);
  }
  return sorted;
}
function writeDrafts(drafts) {
  console.log("writeDrafts called with", drafts.length, "drafts");
  if (!isBrowser()) {
    console.log("Not in browser environment");
    return;
  }
  if (drafts.length === 0) {
    console.log("No drafts to write, removing storage key");
    window.localStorage.removeItem(STORAGE_KEY);
    notifyDraftsUpdated();
    return;
  }
  const toPersist = enforceBudget(drafts);
  const serialized = JSON.stringify(toPersist);
  console.log("Writing to localStorage:", serialized.length, "bytes");
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
    console.log("Successfully wrote to localStorage");
    notifyDraftsUpdated();
  } catch (error) {
    console.error("Error writing to localStorage:", error);
    if (!isQuotaError(error)) {
      console.warn("Failed to persist workout drafts", error);
      return;
    }
    const trimmed = enforceBudget(
      toPersist.slice(0, Math.max(0, toPersist.length - 1))
    );
    if (trimmed.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      notifyDraftsUpdated();
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      notifyDraftsUpdated();
    } catch (err) {
      console.warn("Unable to persist workout drafts after trimming", err);
      window.localStorage.removeItem(STORAGE_KEY);
      notifyDraftsUpdated();
    }
  }
}
function removeWorkoutDraft(sessionId) {
  if (!isBrowser()) return;
  const drafts = readDrafts();
  const filtered = drafts.filter((draft) => draft.sessionId !== sessionId);
  if (filtered.length === drafts.length) return;
  writeDrafts(filtered);
  notifyDraftsUpdated();
}
function getMostRecentWorkoutDraft() {
  const drafts = readDrafts();
  if (drafts.length === 0) {
    return null;
  }
  return drafts.reduce(
    (latest, current) => current.updatedAt > latest.updatedAt ? current : latest,
    drafts[0]
  );
}
const ACTIONS = [
  {
    title: "Start Workout",
    description: "Begin a new workout session",
    icon: Play,
    gradient: "from-primary to-accent",
    href: "/_app/workout.start"
  },
  {
    title: "View Progress",
    description: "Track your strength gains and consistency",
    icon: ChartColumn,
    gradient: "from-chart-2 to-chart-1",
    href: "/_app/progress"
  },
  {
    title: "Manage Templates",
    description: "Create and edit workout templates",
    icon: Dumbbell,
    gradient: "from-chart-3 to-chart-4",
    href: "/_app/templates"
  }
];
function ContinueSessionCard({
  draft,
  onDiscard
}) {
  const router = useRouter();
  const exerciseCount = draft.exercises.length;
  const setCount = draft.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0
  );
  const updatedLabel = new Date(draft.updatedAt).toLocaleString();
  const sessionHref = `/workout/session/${draft.sessionId}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "glass-card glass-hairline bg-card/85 flex h-full flex-col justify-between overflow-hidden border border-white/8 shadow-xl transition-all duration-300", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 bg-gradient-to-r from-amber-500 to-orange-500" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex flex-1 flex-col gap-4 p-5 sm:p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary-foreground grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "h-6 w-6", "aria-hidden": true }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-foreground text-lg font-semibold", children: "Continue session" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground text-sm", children: [
            "Last updated ",
            updatedLabel
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground text-sm", children: [
        exerciseCount,
        " exercises · ",
        setCount,
        " sets saved locally"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto flex flex-col gap-3 sm:flex-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            className: "flex-1",
            onClick: () => router.navigate({ to: sessionHref }),
            children: "Resume workout"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            className: "text-destructive hover:text-destructive flex-1",
            type: "button",
            onClick: onDiscard,
            children: "Discard session"
          }
        )
      ] })
    ] })
  ] });
}
function QuickActionCard({ action }) {
  const router = useRouter();
  const Icon = action.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "group focus-visible:ring-0 focus-visible:outline-none",
      onClick: () => router.navigate({ to: action.href }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Card,
        {
          className: cn(
            "glass-card glass-hairline bg-card/85 flex h-full flex-col overflow-hidden border border-white/8 shadow-xl transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-xl",
            "group-focus-visible:ring-primary/45 group-focus-visible:ring-offset-background group-focus-visible:-translate-y-1 group-focus-visible:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-offset-2"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-1 bg-gradient-to-r", action.gradient) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex flex-1 flex-col gap-5 p-5 sm:p-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: cn(
                      "text-primary-foreground grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br transition-transform duration-300",
                      action.gradient,
                      "group-hover:scale-110"
                    ),
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-6 w-6", "aria-hidden": true })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-foreground text-lg font-semibold", children: action.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: action.description })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  className: cn(
                    "text-primary-foreground mt-auto w-full border-0",
                    "bg-gradient-to-r",
                    action.gradient,
                    "hover:opacity-90"
                  ),
                  children: "Open"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
const QuickActions = reactExports.memo(function QuickActions2() {
  const [resumeDraft, setResumeDraft] = reactExports.useState(
    null
  );
  const refreshDraftState = reactExports.useCallback(() => {
    setResumeDraft(getMostRecentWorkoutDraft());
  }, []);
  reactExports.useEffect(() => {
    refreshDraftState();
    if (typeof window === "undefined") return;
    const handleStorage = (event) => {
      if (event.key === null || event.key === WORKOUT_DRAFTS_STORAGE_KEY) {
        refreshDraftState();
      }
    };
    const handleDraftEvent = () => {
      refreshDraftState();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      WORKOUT_DRAFTS_UPDATED_EVENT,
      handleDraftEvent
    );
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        WORKOUT_DRAFTS_UPDATED_EVENT,
        handleDraftEvent
      );
    };
  }, [refreshDraftState]);
  const handleDiscard = reactExports.useCallback(() => {
    if (!resumeDraft) return;
    removeWorkoutDraft(resumeDraft.sessionId);
    refreshDraftState();
  }, [resumeDraft, refreshDraftState]);
  const actionsToRender = resumeDraft ? ACTIONS.slice(1) : ACTIONS;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": "Quick actions",
      className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
      children: [
        resumeDraft && /* @__PURE__ */ jsxRuntimeExports.jsx(ContinueSessionCard, { draft: resumeDraft, onDiscard: handleDiscard }),
        actionsToRender.map((action) => /* @__PURE__ */ jsxRuntimeExports.jsx(QuickActionCard, { action }, action.href))
      ]
    }
  );
});
export {
  QuickActions
};
