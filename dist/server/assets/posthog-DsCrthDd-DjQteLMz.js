let nodeClient = null;
async function loadPosthogCtor() {
  if (typeof window !== "undefined") return null;
  try {
    const mod = await import("./router-CfQjAsX4-BdfYCT0U.js").then((n) => n.D);
    return mod.default;
  } catch (error) {
    console.warn("Failed to load posthog-js:", error);
    return null;
  }
}
function getServerClient() {
  if (nodeClient) return nodeClient;
  const key = process.env["NEXT_PUBLIC_POSTHOG_KEY"];
  if (!key) {
    return getBrowserClient();
  }
  const rawClientPromise = (async () => {
    const PH = await loadPosthogCtor();
    if (!PH) {
      console.warn(
        "PostHog constructor not available, analytics will be disabled"
      );
      return null;
    }
    const ph = typeof PH === "function" ? PH(key, {
      ...process.env["NEXT_PUBLIC_POSTHOG_HOST"] && {
        api_host: process.env["NEXT_PUBLIC_POSTHOG_HOST"]
      },
      loaded: (ph2) => {
        ph2.register({ distinct_id: "server" });
      }
    }) : PH;
    return ph;
  })();
  const lazy = {
    capture: (event, properties) => {
      void (async () => {
        try {
          const raw = await rawClientPromise;
          if (raw) {
            raw.capture(event, properties);
          }
        } catch (error) {
          console.warn("Failed to capture PostHog event:", event, error);
        }
      })();
    },
    identify: (id, props) => {
      void (async () => {
        try {
          const raw = await rawClientPromise;
          if (raw) {
            raw.identify(id, props);
          }
        } catch (error) {
          console.warn("Failed to identify PostHog user:", id, error);
        }
      })();
    },
    shutdown: () => {
    },
    flush: () => {
    }
  };
  nodeClient = lazy;
  return nodeClient;
}
function getBrowserClient() {
  const noop = () => void 0;
  return {
    capture: noop,
    identify: noop,
    shutdown: noop,
    flush: noop
  };
}
function getServerPosthog() {
  if (typeof window !== "undefined") {
    throw new Error("getServerPosthog() must only be called on the server");
  }
  return getServerClient();
}
export {
  getServerPosthog,
  loadPosthogCtor
};
