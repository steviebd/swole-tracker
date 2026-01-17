import { b as reactExports, R as React, s as jsxRuntimeExports } from "./worker-entry-_S0z7k3x.js";
import { C as Co, u as useAuth } from "./router-CfQjAsX4-BdfYCT0U.js";
import "./session-cookie-y6_dLywe-dJqk9W7A.js";
import { c as _coercedBoolean, e as _coercedNumber, Z as ZodNumber, f as ZodBoolean, o as object, s as string, _ as _enum, a as any } from "./schemas-Dk_VZEFo.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
import "util";
function number(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean(params) {
  return _coercedBoolean(ZodBoolean, params);
}
var PostHogContext = reactExports.createContext({ client: Co });
function isDeepEqual(obj1, obj2, visited) {
  if (visited === void 0) {
    visited = /* @__PURE__ */ new WeakMap();
  }
  if (obj1 === obj2) {
    return true;
  }
  if (typeof obj1 !== "object" || obj1 === null || typeof obj2 !== "object" || obj2 === null) {
    return false;
  }
  if (visited.has(obj1) && visited.get(obj1) === obj2) {
    return true;
  }
  visited.set(obj1, obj2);
  var keys1 = Object.keys(obj1);
  var keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  for (var _i = 0, keys1_1 = keys1; _i < keys1_1.length; _i++) {
    var key = keys1_1[_i];
    if (!keys2.includes(key)) {
      return false;
    }
    if (!isDeepEqual(obj1[key], obj2[key], visited)) {
      return false;
    }
  }
  return true;
}
function PostHogProvider$1(_a) {
  var children = _a.children, client = _a.client, apiKey = _a.apiKey, options = _a.options;
  var previousInitializationRef = reactExports.useRef(null);
  var posthog = reactExports.useMemo(function() {
    if (client) {
      if (apiKey) {
        console.warn("[PostHog.js] You have provided both `client` and `apiKey` to `PostHogProvider`. `apiKey` will be ignored in favour of `client`.");
      }
      if (options) {
        console.warn("[PostHog.js] You have provided both `client` and `options` to `PostHogProvider`. `options` will be ignored in favour of `client`.");
      }
      return client;
    }
    if (apiKey) {
      return Co;
    }
    console.warn("[PostHog.js] No `apiKey` or `client` were provided to `PostHogProvider`. Using default global `window.posthog` instance. You must initialize it manually. This is not recommended behavior.");
    return Co;
  }, [client, apiKey, JSON.stringify(options)]);
  reactExports.useEffect(function() {
    if (client) {
      return;
    }
    var previousInitialization = previousInitializationRef.current;
    if (!previousInitialization) {
      if (Co.__loaded) {
        console.warn("[PostHog.js] `posthog` was already loaded elsewhere. This may cause issues.");
      }
      Co.init(apiKey, options);
      previousInitializationRef.current = {
        apiKey,
        options: options !== null && options !== void 0 ? options : {}
      };
    } else {
      if (apiKey !== previousInitialization.apiKey) {
        console.warn("[PostHog.js] You have provided a different `apiKey` to `PostHogProvider` than the one that was already initialized. This is not supported by our provider and we'll keep using the previous key. If you need to toggle between API Keys you need to control the `client` yourself and pass it in as a prop rather than an `apiKey` prop.");
      }
      if (options && !isDeepEqual(options, previousInitialization.options)) {
        Co.set_config(options);
      }
      previousInitializationRef.current = {
        apiKey,
        options: options !== null && options !== void 0 ? options : {}
      };
    }
  }, [client, apiKey, JSON.stringify(options)]);
  return React.createElement(PostHogContext.Provider, { value: { client: posthog } }, children);
}
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
var isFunction = function(f) {
  return typeof f === "function";
};
var INITIAL_STATE = {
  componentStack: null,
  exceptionEvent: null,
  error: null
};
var __POSTHOG_ERROR_MESSAGES = {
  INVALID_FALLBACK: "[PostHog.js][PostHogErrorBoundary] Invalid fallback prop, provide a valid React element or a function that returns a valid React element."
};
(function(_super) {
  __extends(PostHogErrorBoundary, _super);
  function PostHogErrorBoundary(props) {
    var _this = _super.call(this, props) || this;
    _this.state = INITIAL_STATE;
    return _this;
  }
  PostHogErrorBoundary.prototype.componentDidCatch = function(error, errorInfo) {
    var additionalProperties = this.props.additionalProperties;
    var currentProperties;
    if (isFunction(additionalProperties)) {
      currentProperties = additionalProperties(error);
    } else if (typeof additionalProperties === "object") {
      currentProperties = additionalProperties;
    }
    var client = this.context.client;
    var exceptionEvent = client.captureException(error, currentProperties);
    var componentStack = errorInfo.componentStack;
    this.setState({
      error,
      componentStack,
      exceptionEvent
    });
  };
  PostHogErrorBoundary.prototype.render = function() {
    var _a = this.props, children = _a.children, fallback = _a.fallback;
    var state = this.state;
    if (state.componentStack == null) {
      return isFunction(children) ? children() : children;
    }
    var element = isFunction(fallback) ? React.createElement(fallback, {
      error: state.error,
      componentStack: state.componentStack,
      exceptionEvent: state.exceptionEvent
    }) : fallback;
    if (React.isValidElement(element)) {
      return element;
    }
    console.warn(__POSTHOG_ERROR_MESSAGES.INVALID_FALLBACK);
    return React.createElement(React.Fragment, null);
  };
  PostHogErrorBoundary.contextType = PostHogContext;
  return PostHogErrorBoundary;
})(React.Component);
object({
  DB: any().optional(),
  WORKOS_API_KEY: string().optional(),
  WORKOS_CLIENT_ID: string().optional(),
  WORKER_SESSION_SECRET: string().min(32).optional(),
  WHOOP_CLIENT_ID: string().optional(),
  WHOOP_CLIENT_SECRET: string().optional(),
  WHOOP_REDIRECT_URI: string().url().optional(),
  WHOOP_WEBHOOK_SECRET: string().optional(),
  WHOOP_SYNC_RATE_LIMIT_PER_HOUR: number().default(10),
  AI_GATEWAY_API_KEY: string().optional(),
  AI_GATEWAY_MODEL: string().default("xai/grok-3-mini"),
  AI_GATEWAY_MODEL_HEALTH: string().default("xai/grok-3-mini"),
  AI_DEBRIEF_MODEL: string().default("xai/grok-3-mini"),
  ENCRYPTION_MASTER_KEY: string().min(32).optional(),
  RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: number().default(100),
  RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: number().default(200),
  RATE_LIMIT_API_CALLS_PER_MINUTE: number().default(60),
  RATE_LIMIT_ENABLED: boolean().default(true),
  E2E_TESTING: string().optional(),
  NODE_ENV: _enum(["development", "test", "production"]).default("development"),
  SITE_URL: string().url().default("http://localhost:8787"),
  POSTHOG_KEY: string().optional(),
  POSTHOG_HOST: string().optional()
});
function PostHogProvider({ children }) {
  const { user } = useAuth();
  const lastIdentifiedUser = reactExports.useRef(null);
  const posthogConfig = reactExports.useMemo(() => {
    {
      return null;
    }
  }, []);
  reactExports.useEffect(() => {
    if (!posthogConfig) {
      try {
        Co.reset();
      } catch (error) {
        console.warn("Failed to reset PostHog:", error);
      }
      return;
    }
    try {
      Co.init(posthogConfig.key, posthogConfig.options);
    } catch (error) {
      console.error("Failed to initialize PostHog:", error);
    }
    return () => {
      try {
        Co.reset();
      } catch (error) {
        console.warn("Failed to reset PostHog on cleanup:", error);
      }
    };
  }, [posthogConfig]);
  reactExports.useEffect(() => {
    if (!posthogConfig) {
      if (lastIdentifiedUser.current !== null) {
        try {
          Co.reset();
        } catch (error) {
          console.warn("Failed to reset PostHog on config change:", error);
        }
        lastIdentifiedUser.current = null;
      }
      return;
    }
    if (user) {
      if (lastIdentifiedUser.current !== user.id) {
        try {
          const userName = user.user_metadata?.display_name || (user.first_name || user.last_name ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : user.email);
          Co.identify(user.id, {
            email: user.email,
            name: userName,
            first_name: user.first_name,
            last_name: user.last_name
          });
          Co.capture("user_signed_in", {
            userId: user.id,
            email: user.email,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          lastIdentifiedUser.current = user.id;
        } catch (error) {
          console.error("Failed to identify user in PostHog:", error);
        }
      }
    } else {
      if (lastIdentifiedUser.current !== null) {
        try {
          Co.reset();
          lastIdentifiedUser.current = null;
        } catch (error) {
          console.warn("Failed to reset PostHog on user logout:", error);
        }
      }
    }
  }, [posthogConfig, user]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PostHogProvider$1, { client: Co, children });
}
export {
  PostHogProvider
};
