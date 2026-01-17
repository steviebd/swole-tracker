import { c as createServerRpc } from "./createServerRpc-Bd3B-Ah9-C8t3QJ6i.js";
import { S as SessionCookie } from "./session-cookie-y6_dLywe-dJqk9W7A.js";
import { c as createServerFn, g as getRequest } from "./worker-entry-_S0z7k3x.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
const checkAuth_createServerFn_handler = createServerRpc({
  id: "4b856d41b2dc068b7b9e72366ea7c5e7158fb71c2dbeca58360d88554ae61149",
  name: "checkAuth",
  filename: "src/server/functions/auth.ts"
}, (opts, signal) => checkAuth.__executeServer(opts, signal));
const checkAuth = createServerFn({
  method: "GET"
}).handler(checkAuth_createServerFn_handler, async () => {
  const request = getRequest();
  if (!request) {
    return {
      user: null,
      isAuthenticated: false
    };
  }
  try {
    const session = await SessionCookie.get(request);
    if (session && !SessionCookie.isExpired(session)) {
      return {
        user: {
          id: session.userId
        },
        isAuthenticated: true
      };
    }
  } catch (error) {
    console.error("Failed to get session:", error);
  }
  return {
    user: null,
    isAuthenticated: false
  };
});
const getUser_createServerFn_handler = createServerRpc({
  id: "9ec5417241880a99fa9725e00d610469a46dfc9c6a12f03ebe2f021243e6f3b0",
  name: "getUser",
  filename: "src/server/functions/auth.ts"
}, (opts, signal) => getUser.__executeServer(opts, signal));
const getUser = createServerFn({
  method: "GET"
}).handler(getUser_createServerFn_handler, async () => {
  const {
    isAuthenticated,
    user
  } = await checkAuth();
  if (!isAuthenticated || !user) {
    return null;
  }
  return user;
});
export {
  checkAuth_createServerFn_handler,
  getUser_createServerFn_handler
};
