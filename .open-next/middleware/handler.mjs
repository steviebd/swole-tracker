
import {Buffer} from "node:buffer";
globalThis.Buffer = Buffer;

import {AsyncLocalStorage} from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;


const defaultDefineProperty = Object.defineProperty;
Object.defineProperty = function(o, p, a) {
  if(p=== '__import_unsupported' && Boolean(globalThis.__import_unsupported)) {
    return;
  }
  return defaultDefineProperty(o, p, a);
};

  
  
  globalThis.openNextDebug = false;globalThis.openNextVersion = "3.8.0";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var init_error = __esm({
  "node_modules/@opennextjs/aws/dist/utils/error.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}
var DOWNPLAYED_ERROR_LOGS, isDownplayedErrorLog;
var init_logger = __esm({
  "node_modules/@opennextjs/aws/dist/adapters/logger.js"() {
    init_error();
    DOWNPLAYED_ERROR_LOGS = [
      {
        clientName: "S3Client",
        commandName: "GetObjectCommand",
        errorName: "NoSuchKey"
      }
    ];
    isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
  }
});

// node_modules/@opennextjs/aws/node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "node_modules/@opennextjs/aws/node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = parse3;
    exports.serialize = serialize;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parse3(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = str.indexOf("=", index);
        if (eqIdx === -1)
          break;
        const colonIdx = str.indexOf(";", index);
        const endIdx = colonIdx === -1 ? len : colonIdx;
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const keyStartIdx = startIndex(str, index, eqIdx);
        const keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
        const key = str.slice(keyStartIdx, keyEndIdx);
        if (obj[key] === void 0) {
          let valStartIdx = startIndex(str, eqIdx + 1, endIdx);
          let valEndIdx = endIndex(str, endIdx, valStartIdx);
          const value = dec(str.slice(valStartIdx, valEndIdx));
          obj[key] = value;
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function startIndex(str, index, max) {
      do {
        const code = str.charCodeAt(index);
        if (code !== 32 && code !== 9)
          return index;
      } while (++index < max);
      return max;
    }
    function endIndex(str, index, min) {
      while (index > min) {
        const code = str.charCodeAt(--index);
        if (code !== 32 && code !== 9)
          return index + 1;
      }
      return min;
    }
    function serialize(name, val, options) {
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(name)) {
        throw new TypeError(`argument name is invalid: ${name}`);
      }
      const value = enc(val);
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${val}`);
      }
      let str = name + "=" + value;
      if (!options)
        return str;
      if (options.maxAge !== void 0) {
        if (!Number.isInteger(options.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${options.maxAge}`);
        }
        str += "; Max-Age=" + options.maxAge;
      }
      if (options.domain) {
        if (!domainValueRegExp.test(options.domain)) {
          throw new TypeError(`option domain is invalid: ${options.domain}`);
        }
        str += "; Domain=" + options.domain;
      }
      if (options.path) {
        if (!pathValueRegExp.test(options.path)) {
          throw new TypeError(`option path is invalid: ${options.path}`);
        }
        str += "; Path=" + options.path;
      }
      if (options.expires) {
        if (!isDate(options.expires) || !Number.isFinite(options.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${options.expires}`);
        }
        str += "; Expires=" + options.expires.toUTCString();
      }
      if (options.httpOnly) {
        str += "; HttpOnly";
      }
      if (options.secure) {
        str += "; Secure";
      }
      if (options.partitioned) {
        str += "; Partitioned";
      }
      if (options.priority) {
        const priority = typeof options.priority === "string" ? options.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${options.priority}`);
        }
      }
      if (options.sameSite) {
        const sameSite = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${options.sameSite}`);
        }
      }
      return str;
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});

// node_modules/@opennextjs/aws/dist/http/util.js
function parseSetCookieHeader(cookies) {
  if (!cookies) {
    return [];
  }
  if (typeof cookies === "string") {
    return cookies.split(/(?<!Expires=\w+),/i).map((c) => c.trim());
  }
  return cookies;
}
function getQueryFromIterator(it) {
  const query = {};
  for (const [key, value] of it) {
    if (key in query) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  return query;
}
var init_util = __esm({
  "node_modules/@opennextjs/aws/dist/http/util.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/utils.js
function getQueryFromSearchParams(searchParams) {
  return getQueryFromIterator(searchParams.entries());
}
var init_utils = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/utils.js"() {
    init_util();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/edge.js
var edge_exports = {};
__export(edge_exports, {
  default: () => edge_default
});
import { Buffer as Buffer2 } from "node:buffer";
var import_cookie, NULL_BODY_STATUSES, converter, edge_default;
var init_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/edge.js"() {
    import_cookie = __toESM(require_dist(), 1);
    init_util();
    init_utils();
    NULL_BODY_STATUSES = /* @__PURE__ */ new Set([101, 103, 204, 205, 304]);
    converter = {
      convertFrom: async (event) => {
        const url = new URL(event.url);
        const searchParams = url.searchParams;
        const query = getQueryFromSearchParams(searchParams);
        const body = await event.arrayBuffer();
        const headers = {};
        event.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const rawPath = url.pathname;
        const method = event.method;
        const shouldHaveBody = method !== "GET" && method !== "HEAD";
        const cookieHeader = event.headers.get("cookie");
        const cookies = cookieHeader ? import_cookie.default.parse(cookieHeader) : {};
        return {
          type: "core",
          method,
          rawPath,
          url: event.url,
          body: shouldHaveBody ? Buffer2.from(body) : void 0,
          headers,
          remoteAddress: event.headers.get("x-forwarded-for") ?? "::1",
          query,
          cookies
        };
      },
      convertTo: async (result) => {
        if ("internalEvent" in result) {
          const request = new Request(result.internalEvent.url, {
            body: result.internalEvent.body,
            method: result.internalEvent.method,
            headers: {
              ...result.internalEvent.headers,
              "x-forwarded-host": result.internalEvent.headers.host
            }
          });
          if (globalThis.__dangerous_ON_edge_converter_returns_request === true) {
            return request;
          }
          const cfCache = (result.isISR || result.internalEvent.rawPath.startsWith("/_next/image")) && process.env.DISABLE_CACHE !== "true" ? { cacheEverything: true } : {};
          return fetch(request, {
            // This is a hack to make sure that the response is cached by Cloudflare
            // See https://developers.cloudflare.com/workers/examples/cache-using-fetch/#caching-html-resources
            // @ts-expect-error - This is a Cloudflare specific option
            cf: cfCache
          });
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(result.headers)) {
          if (key === "set-cookie" && typeof value === "string") {
            const cookies = parseSetCookieHeader(value);
            for (const cookie of cookies) {
              headers.append(key, cookie);
            }
            continue;
          }
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, value);
          }
        }
        const body = NULL_BODY_STATUSES.has(result.statusCode) ? null : result.body;
        return new Response(body, {
          status: result.statusCode,
          headers
        });
      },
      name: "edge"
    };
    edge_default = converter;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js
var cloudflare_edge_exports = {};
__export(cloudflare_edge_exports, {
  default: () => cloudflare_edge_default
});
var cfPropNameMapping, handler, cloudflare_edge_default;
var init_cloudflare_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js"() {
    cfPropNameMapping = {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: [encodeURIComponent, "x-open-next-city"],
      country: "x-open-next-country",
      regionCode: "x-open-next-region",
      latitude: "x-open-next-latitude",
      longitude: "x-open-next-longitude"
    };
    handler = async (handler3, converter2) => async (request, env, ctx) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const cfProperties = request.cf;
      for (const [propName, mapping] of Object.entries(cfPropNameMapping)) {
        const propValue = cfProperties?.[propName];
        if (propValue != null) {
          const [encode, headerName] = Array.isArray(mapping) ? mapping : [null, mapping];
          internalEvent.headers[headerName] = encode ? encode(propValue) : propValue;
        }
      }
      const response = await handler3(internalEvent, {
        waitUntil: ctx.waitUntil.bind(ctx)
      });
      const result = await converter2.convertTo(response);
      return result;
    };
    cloudflare_edge_default = {
      wrapper: handler,
      name: "cloudflare-edge",
      supportStreaming: true,
      edgeRuntime: true
    };
  }
});

// node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js
var pattern_env_exports = {};
__export(pattern_env_exports, {
  default: () => pattern_env_default
});
var envLoader, pattern_env_default;
var init_pattern_env = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js"() {
    init_logger();
    envLoader = {
      name: "env",
      resolve: async (_path) => {
        try {
          const origin = JSON.parse(process.env.OPEN_NEXT_ORIGIN ?? "{}");
          for (const [key, value] of Object.entries(globalThis.openNextConfig.functions ?? {}).filter(([key2]) => key2 !== "default")) {
            if (value.patterns.some((pattern) => {
              return new RegExp(
                // transform glob pattern to regex
                `/${pattern.replace(/\*\*/g, "(.*)").replace(/\*/g, "([^/]*)").replace(/\//g, "\\/").replace(/\?/g, ".")}`
              ).test(_path);
            })) {
              debug("Using origin", key, value.patterns);
              return origin[key];
            }
          }
          if (_path.startsWith("/_next/image") && origin.imageOptimizer) {
            debug("Using origin", "imageOptimizer", _path);
            return origin.imageOptimizer;
          }
          if (origin.default) {
            debug("Using default origin", origin.default, _path);
            return origin.default;
          }
          return false;
        } catch (e) {
          error("Error while resolving origin", e);
          return false;
        }
      }
    };
    pattern_env_default = envLoader;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js
var dummy_exports = {};
__export(dummy_exports, {
  default: () => dummy_default
});
var resolver, dummy_default;
var init_dummy = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js"() {
    resolver = {
      name: "dummy"
    };
    dummy_default = resolver;
  }
});

// node_modules/@opennextjs/aws/dist/utils/stream.js
import { Readable } from "node:stream";
function toReadableStream(value, isBase64) {
  return Readable.toWeb(Readable.from(Buffer.from(value, isBase64 ? "base64" : "utf8")));
}
function emptyReadableStream() {
  if (process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
    return Readable.toWeb(Readable.from([Buffer.from("SOMETHING")]));
  }
  return Readable.toWeb(Readable.from([]));
}
var init_stream = __esm({
  "node_modules/@opennextjs/aws/dist/utils/stream.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js
var fetch_exports = {};
__export(fetch_exports, {
  default: () => fetch_default
});
var fetchProxy, fetch_default;
var init_fetch = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js"() {
    init_stream();
    fetchProxy = {
      name: "fetch-proxy",
      // @ts-ignore
      proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
          method,
          headers,
          body
        });
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        return {
          type: "core",
          headers: responseHeaders,
          statusCode: response.status,
          isBase64Encoded: true,
          body: response.body ?? emptyReadableStream()
        };
      }
    };
    fetch_default = fetchProxy;
  }
});

// .next/server/edge-runtime-webpack.js
var require_edge_runtime_webpack = __commonJS({
  ".next/server/edge-runtime-webpack.js"() {
    "use strict";
    (() => {
      "use strict";
      var a = {}, b = {};
      function c(d) {
        var e = b[d];
        if (void 0 !== e) return e.exports;
        var f = b[d] = { exports: {} }, g = true;
        try {
          a[d].call(f.exports, f, f.exports, c), g = false;
        } finally {
          g && delete b[d];
        }
        return f.exports;
      }
      c.m = a, c.amdO = {}, (() => {
        var a2 = [];
        c.O = (b2, d, e, f) => {
          if (d) {
            f = f || 0;
            for (var g = a2.length; g > 0 && a2[g - 1][2] > f; g--) a2[g] = a2[g - 1];
            a2[g] = [d, e, f];
            return;
          }
          for (var h = 1 / 0, g = 0; g < a2.length; g++) {
            for (var [d, e, f] = a2[g], i = true, j = 0; j < d.length; j++) (false & f || h >= f) && Object.keys(c.O).every((a3) => c.O[a3](d[j])) ? d.splice(j--, 1) : (i = false, f < h && (h = f));
            if (i) {
              a2.splice(g--, 1);
              var k = e();
              void 0 !== k && (b2 = k);
            }
          }
          return b2;
        };
      })(), c.n = (a2) => {
        var b2 = a2 && a2.__esModule ? () => a2.default : () => a2;
        return c.d(b2, { a: b2 }), b2;
      }, c.d = (a2, b2) => {
        for (var d in b2) c.o(b2, d) && !c.o(a2, d) && Object.defineProperty(a2, d, { enumerable: true, get: b2[d] });
      }, c.g = function() {
        if ("object" == typeof globalThis) return globalThis;
        try {
          return this || Function("return this")();
        } catch (a2) {
          if ("object" == typeof window) return window;
        }
      }(), c.o = (a2, b2) => Object.prototype.hasOwnProperty.call(a2, b2), c.r = (a2) => {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(a2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(a2, "__esModule", { value: true });
      }, (() => {
        var a2 = { 149: 0 };
        c.O.j = (b3) => 0 === a2[b3];
        var b2 = (b3, d2) => {
          var e, f, [g, h, i] = d2, j = 0;
          if (g.some((b4) => 0 !== a2[b4])) {
            for (e in h) c.o(h, e) && (c.m[e] = h[e]);
            if (i) var k = i(c);
          }
          for (b3 && b3(d2); j < g.length; j++) f = g[j], c.o(a2, f) && a2[f] && a2[f][0](), a2[f] = 0;
          return c.O(k);
        }, d = self.webpackChunk_N_E = self.webpackChunk_N_E || [];
        d.forEach(b2.bind(null, 0)), d.push = b2.bind(null, d.push.bind(d));
      })();
    })();
  }
});

// node-built-in-modules:node:buffer
var node_buffer_exports = {};
import * as node_buffer_star from "node:buffer";
var init_node_buffer = __esm({
  "node-built-in-modules:node:buffer"() {
    __reExport(node_buffer_exports, node_buffer_star);
  }
});

// node-built-in-modules:node:async_hooks
var node_async_hooks_exports = {};
import * as node_async_hooks_star from "node:async_hooks";
var init_node_async_hooks = __esm({
  "node-built-in-modules:node:async_hooks"() {
    __reExport(node_async_hooks_exports, node_async_hooks_star);
  }
});

// .next/server/src/middleware.js
var require_middleware = __commonJS({
  ".next/server/src/middleware.js"() {
    "use strict";
    (self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[550], { 39: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 44: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuthenticateWithCodeOptions = void 0, b.serializeAuthenticateWithCodeOptions = (a2) => ({ grant_type: "authorization_code", client_id: a2.clientId, client_secret: a2.clientSecret, code: a2.code, code_verifier: a2.codeVerifier, invitation_token: a2.invitationToken, ip_address: a2.ipAddress, user_agent: a2.userAgent });
    }, 125: (a) => {
      "use strict";
      a.exports = SyntaxError;
    }, 142: (a) => {
      "use strict";
      a.exports = Number.isNaN || function(a2) {
        return a2 != a2;
      };
    }, 176: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeUpdatedEventDirectoryGroup = b.deserializeDirectoryGroup = void 0, b.deserializeDirectoryGroup = (a2) => ({ id: a2.id, idpId: a2.idp_id, directoryId: a2.directory_id, organizationId: a2.organization_id, name: a2.name, createdAt: a2.created_at, updatedAt: a2.updated_at, rawAttributes: a2.raw_attributes }), b.deserializeUpdatedEventDirectoryGroup = (a2) => ({ id: a2.id, idpId: a2.idp_id, directoryId: a2.directory_id, organizationId: a2.organization_id, name: a2.name, createdAt: a2.created_at, updatedAt: a2.updated_at, rawAttributes: a2.raw_attributes, previousAttributes: a2.previous_attributes });
    }, 198: (a, b) => {
      "use strict";
      var c;
      Object.defineProperty(b, "__esModule", { value: true }), b.ResourceOp = void 0, function(a2) {
        a2.Create = "create", a2.Delete = "delete";
      }(c || (b.ResourceOp = c = {}));
    }, 216: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListConnectionsOptions = void 0, b.serializeListConnectionsOptions = (a2) => ({ connection_type: a2.connectionType, domain: a2.domain, organization_id: a2.organizationId, limit: a2.limit, before: a2.before, after: a2.after, order: a2.order });
    }, 241: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 331: (a) => {
      "use strict";
      a.exports = function() {
        if ("function" != typeof Symbol || "function" != typeof Object.getOwnPropertySymbols) return false;
        if ("symbol" == typeof Symbol.iterator) return true;
        var a2 = {}, b = Symbol("test"), c = Object(b);
        if ("string" == typeof b || "[object Symbol]" !== Object.prototype.toString.call(b) || "[object Symbol]" !== Object.prototype.toString.call(c)) return false;
        for (var d in a2[b] = 42, a2) return false;
        if ("function" == typeof Object.keys && 0 !== Object.keys(a2).length || "function" == typeof Object.getOwnPropertyNames && 0 !== Object.getOwnPropertyNames(a2).length) return false;
        var e = Object.getOwnPropertySymbols(a2);
        if (1 !== e.length || e[0] !== b || !Object.prototype.propertyIsEnumerable.call(a2, b)) return false;
        if ("function" == typeof Object.getOwnPropertyDescriptor) {
          var f = Object.getOwnPropertyDescriptor(a2, b);
          if (42 !== f.value || true !== f.enumerable) return false;
        }
        return true;
      };
    }, 430: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreateAuditLogEventOptions = void 0, b.serializeCreateAuditLogEventOptions = (a2) => ({ action: a2.action, version: a2.version, occurred_at: a2.occurredAt.toISOString(), actor: a2.actor, targets: a2.targets, context: { location: a2.context.location, user_agent: a2.context.userAgent }, metadata: a2.metadata });
    }, 432: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 455: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 486: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(9545), b), e(c(9795), b), e(c(1586), b), e(c(4951), b), e(c(6319), b), e(c(6892), b), e(c(7221), b), e(c(3426), b), e(c(5076), b), e(c(7583), b), e(c(3051), b), e(c(6882), b), e(c(5576), b);
    }, 613: function(a, b, c) {
      "use strict";
      var d = this && this.__rest || function(a2, b2) {
        var c2 = {};
        for (var d2 in a2) Object.prototype.hasOwnProperty.call(a2, d2) && 0 > b2.indexOf(d2) && (c2[d2] = a2[d2]);
        if (null != a2 && "function" == typeof Object.getOwnPropertySymbols) for (var e2 = 0, d2 = Object.getOwnPropertySymbols(a2); e2 < d2.length; e2++) 0 > b2.indexOf(d2[e2]) && Object.prototype.propertyIsEnumerable.call(a2, d2[e2]) && (c2[d2[e2]] = a2[d2[e2]]);
        return c2;
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeAuthenticationResponse = void 0;
      let e = c(5689), f = c(3210);
      b.deserializeAuthenticationResponse = (a2) => {
        let { user: b2, organization_id: c2, access_token: g, refresh_token: h, authentication_method: i, impersonator: j, oauth_tokens: k } = a2, l = d(a2, ["user", "organization_id", "access_token", "refresh_token", "authentication_method", "impersonator", "oauth_tokens"]);
        return Object.assign({ user: (0, f.deserializeUser)(b2), organizationId: c2, accessToken: g, refreshToken: h, impersonator: j, authenticationMethod: i, oauthTokens: (0, e.deserializeOauthTokens)(k) }, l);
      };
    }, 619: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeOrganizationMembership = void 0, b.deserializeOrganizationMembership = (a2) => Object.assign({ object: a2.object, id: a2.id, userId: a2.user_id, organizationId: a2.organization_id, organizationName: a2.organization_name, status: a2.status, createdAt: a2.created_at, updatedAt: a2.updated_at, role: a2.role }, a2.roles && { roles: a2.roles });
    }, 648: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeSendInvitationOptions = void 0, b.serializeSendInvitationOptions = (a2) => ({ email: a2.email, organization_id: a2.organizationId, expires_in_days: a2.expiresInDays, inviter_user_id: a2.inviterUserId, role_slug: a2.roleSlug });
    }, 785: (a, b, c) => {
      "use strict";
      var d = c(7897), e = c(1741), f = c(9518), g = Object.prototype.hasOwnProperty, h = { brackets: function(a2) {
        return a2 + "[]";
      }, comma: "comma", indices: function(a2, b2) {
        return a2 + "[" + b2 + "]";
      }, repeat: function(a2) {
        return a2;
      } }, i = Array.isArray, j = Array.prototype.push, k = function(a2, b2) {
        j.apply(a2, i(b2) ? b2 : [b2]);
      }, l = Date.prototype.toISOString, m = f.default, n = { addQueryPrefix: false, allowDots: false, allowEmptyArrays: false, arrayFormat: "indices", charset: "utf-8", charsetSentinel: false, commaRoundTrip: false, delimiter: "&", encode: true, encodeDotInKeys: false, encoder: e.encode, encodeValuesOnly: false, filter: void 0, format: m, formatter: f.formatters[m], indices: false, serializeDate: function(a2) {
        return l.call(a2);
      }, skipNulls: false, strictNullHandling: false }, o = {}, p = function a2(b2, c2, f2, g2, h2, j2, l2, m2, p2, q2, r, s, t, u, v, w, x, y) {
        for (var z, A, B = b2, C = y, D = 0, E = false; void 0 !== (C = C.get(o)) && !E; ) {
          var F = C.get(b2);
          if (D += 1, void 0 !== F) if (F === D) throw RangeError("Cyclic object value");
          else E = true;
          void 0 === C.get(o) && (D = 0);
        }
        if ("function" == typeof q2 ? B = q2(c2, B) : B instanceof Date ? B = t(B) : "comma" === f2 && i(B) && (B = e.maybeMap(B, function(a3) {
          return a3 instanceof Date ? t(a3) : a3;
        })), null === B) {
          if (j2) return p2 && !w ? p2(c2, n.encoder, x, "key", u) : c2;
          B = "";
        }
        if ("string" == typeof (z = B) || "number" == typeof z || "boolean" == typeof z || "symbol" == typeof z || "bigint" == typeof z || e.isBuffer(B)) return p2 ? [v(w ? c2 : p2(c2, n.encoder, x, "key", u)) + "=" + v(p2(B, n.encoder, x, "value", u))] : [v(c2) + "=" + v(String(B))];
        var G = [];
        if (void 0 === B) return G;
        if ("comma" === f2 && i(B)) w && p2 && (B = e.maybeMap(B, p2)), A = [{ value: B.length > 0 ? B.join(",") || null : void 0 }];
        else if (i(q2)) A = q2;
        else {
          var H = Object.keys(B);
          A = r ? H.sort(r) : H;
        }
        var I = m2 ? String(c2).replace(/\./g, "%2E") : String(c2), J = g2 && i(B) && 1 === B.length ? I + "[]" : I;
        if (h2 && i(B) && 0 === B.length) return J + "[]";
        for (var K = 0; K < A.length; ++K) {
          var L = A[K], M = "object" == typeof L && L && void 0 !== L.value ? L.value : B[L];
          if (!l2 || null !== M) {
            var N = s && m2 ? String(L).replace(/\./g, "%2E") : String(L), O = i(B) ? "function" == typeof f2 ? f2(J, N) : J : J + (s ? "." + N : "[" + N + "]");
            y.set(b2, D);
            var P = d();
            P.set(o, y), k(G, a2(M, O, f2, g2, h2, j2, l2, m2, "comma" === f2 && w && i(B) ? null : p2, q2, r, s, t, u, v, w, x, P));
          }
        }
        return G;
      }, q = function(a2) {
        if (!a2) return n;
        if (void 0 !== a2.allowEmptyArrays && "boolean" != typeof a2.allowEmptyArrays) throw TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
        if (void 0 !== a2.encodeDotInKeys && "boolean" != typeof a2.encodeDotInKeys) throw TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
        if (null !== a2.encoder && void 0 !== a2.encoder && "function" != typeof a2.encoder) throw TypeError("Encoder has to be a function.");
        var b2, c2 = a2.charset || n.charset;
        if (void 0 !== a2.charset && "utf-8" !== a2.charset && "iso-8859-1" !== a2.charset) throw TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
        var d2 = f.default;
        if (void 0 !== a2.format) {
          if (!g.call(f.formatters, a2.format)) throw TypeError("Unknown format option provided.");
          d2 = a2.format;
        }
        var e2 = f.formatters[d2], j2 = n.filter;
        if (("function" == typeof a2.filter || i(a2.filter)) && (j2 = a2.filter), b2 = a2.arrayFormat in h ? a2.arrayFormat : "indices" in a2 ? a2.indices ? "indices" : "repeat" : n.arrayFormat, "commaRoundTrip" in a2 && "boolean" != typeof a2.commaRoundTrip) throw TypeError("`commaRoundTrip` must be a boolean, or absent");
        var k2 = void 0 === a2.allowDots ? true === a2.encodeDotInKeys || n.allowDots : !!a2.allowDots;
        return { addQueryPrefix: "boolean" == typeof a2.addQueryPrefix ? a2.addQueryPrefix : n.addQueryPrefix, allowDots: k2, allowEmptyArrays: "boolean" == typeof a2.allowEmptyArrays ? !!a2.allowEmptyArrays : n.allowEmptyArrays, arrayFormat: b2, charset: c2, charsetSentinel: "boolean" == typeof a2.charsetSentinel ? a2.charsetSentinel : n.charsetSentinel, commaRoundTrip: !!a2.commaRoundTrip, delimiter: void 0 === a2.delimiter ? n.delimiter : a2.delimiter, encode: "boolean" == typeof a2.encode ? a2.encode : n.encode, encodeDotInKeys: "boolean" == typeof a2.encodeDotInKeys ? a2.encodeDotInKeys : n.encodeDotInKeys, encoder: "function" == typeof a2.encoder ? a2.encoder : n.encoder, encodeValuesOnly: "boolean" == typeof a2.encodeValuesOnly ? a2.encodeValuesOnly : n.encodeValuesOnly, filter: j2, format: d2, formatter: e2, serializeDate: "function" == typeof a2.serializeDate ? a2.serializeDate : n.serializeDate, skipNulls: "boolean" == typeof a2.skipNulls ? a2.skipNulls : n.skipNulls, sort: "function" == typeof a2.sort ? a2.sort : null, strictNullHandling: "boolean" == typeof a2.strictNullHandling ? a2.strictNullHandling : n.strictNullHandling };
      };
      a.exports = function(a2, b2) {
        var c2, e2 = a2, f2 = q(b2);
        "function" == typeof f2.filter ? e2 = (0, f2.filter)("", e2) : i(f2.filter) && (c2 = f2.filter);
        var g2 = [];
        if ("object" != typeof e2 || null === e2) return "";
        var j2 = h[f2.arrayFormat], l2 = "comma" === j2 && f2.commaRoundTrip;
        c2 || (c2 = Object.keys(e2)), f2.sort && c2.sort(f2.sort);
        for (var m2 = d(), n2 = 0; n2 < c2.length; ++n2) {
          var o2 = c2[n2], r = e2[o2];
          f2.skipNulls && null === r || k(g2, p(r, o2, j2, l2, f2.allowEmptyArrays, f2.strictNullHandling, f2.skipNulls, f2.encodeDotInKeys, f2.encode ? f2.encoder : null, f2.filter, f2.sort, f2.allowDots, f2.serializeDate, f2.format, f2.formatter, f2.encodeValuesOnly, f2.charset, m2));
        }
        var s = g2.join(f2.delimiter), t = true === f2.addQueryPrefix ? "?" : "";
        return f2.charsetSentinel && ("iso-8859-1" === f2.charset ? t += "utf8=%26%2310003%3B&" : t += "utf8=%E2%9C%93&"), s.length > 0 ? t + s : "";
      };
    }, 791: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreateOrganizationDomainOptions = void 0, b.serializeCreateOrganizationDomainOptions = (a2) => ({ domain: a2.domain, organization_id: a2.organizationId });
    }, 839: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(176), b), e(c(5792), b), e(c(2450), b), e(c(2964), b);
    }, 898: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 926: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 952: (a) => {
      "use strict";
      a.exports = URIError;
    }, 1001: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeUpdateUserOptions = void 0, b.serializeUpdateUserOptions = (a2) => ({ email: a2.email, email_verified: a2.emailVerified, first_name: a2.firstName, last_name: a2.lastName, password: a2.password, password_hash: a2.passwordHash, password_hash_type: a2.passwordHashType, external_id: a2.externalId, metadata: a2.metadata });
    }, 1048: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(2723), b), e(c(9941), b), e(c(8892), b);
    }, 1078: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuthenticateWithEmailVerificationOptions = void 0, b.serializeAuthenticateWithEmailVerificationOptions = (a2) => ({ grant_type: "urn:workos:oauth:grant-type:email-verification:code", client_id: a2.clientId, client_secret: a2.clientSecret, pending_authentication_token: a2.pendingAuthenticationToken, code: a2.code, ip_address: a2.ipAddress, user_agent: a2.userAgent });
    }, 1096: (a, b, c) => {
      "use strict";
      var d = Object.create, e = Object.defineProperty, f = Object.getOwnPropertyDescriptor, g = Object.getOwnPropertyNames, h = Object.getPrototypeOf, i = Object.prototype.hasOwnProperty, j = (a2, b2, c2, d2) => {
        if (b2 && "object" == typeof b2 || "function" == typeof b2) for (let h2 of g(b2)) i.call(a2, h2) || h2 === c2 || e(a2, h2, { get: () => b2[h2], enumerable: !(d2 = f(b2, h2)) || d2.enumerable });
        return a2;
      }, k = (a2, b2, c2) => (c2 = null != a2 ? d(h(a2)) : {}, j(!b2 && a2 && a2.__esModule ? c2 : e(c2, "default", { value: a2, enumerable: true }), a2)), l = {};
      ((a2, b2) => {
        for (var c2 in b2) e(a2, c2, { get: b2[c2], enumerable: true });
      })(l, { getIronSession: () => v, sealData: () => u, unsealData: () => t }), a.exports = j(e({}, "__esModule", { value: true }), l);
      var m = k(c(6809)), n = k(c(9233)), o = 1296e3, p = { ttl: o, cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" } };
      function q(a2, b2) {
        var c2;
        if ("headers" in b2) return void b2.headers.append("set-cookie", a2);
        let d2 = null != (c2 = b2.getHeader("set-cookie")) ? c2 : [];
        "string" == typeof d2 && (d2 = [d2]), b2.setHeader("set-cookie", [...d2, a2]);
      }
      function r(a2) {
        return "string" == typeof a2 ? { 1: a2 } : a2;
      }
      var s = (() => {
        var a2, b2, c2;
        if ("object" == typeof (null == (a2 = globalThis.crypto) ? void 0 : a2.subtle)) return globalThis.crypto;
        if ("object" == typeof (null == (c2 = null == (b2 = globalThis.crypto) ? void 0 : b2.webcrypto) ? void 0 : c2.subtle)) return globalThis.crypto.webcrypto;
        throw Error("no native implementation of WebCrypto is available in current context");
      })(), t = async (a2, { password: b2, ttl: c2 = o }) => {
        let d2 = r(b2), { sealWithoutVersion: e2, tokenVersion: f2 } = function(a3) {
          if ("~" === a3[a3.length - 2]) {
            let [b3, c3] = a3.split("~");
            return { sealWithoutVersion: b3, tokenVersion: parseInt(c3, 10) };
          }
          return { sealWithoutVersion: a3, tokenVersion: null };
        }(a2);
        try {
          let a3 = await m.unseal(s, e2, d2, { ...m.defaults, ttl: 1e3 * c2 }) || {};
          if (2 === f2) return a3;
          return { ...a3.persistent };
        } catch (a3) {
          if (a3 instanceof Error && ("Expired seal" === a3.message || "Bad hmac value" === a3.message || a3.message.startsWith("Cannot find password: ") || "Incorrect number of sealed components" === a3.message)) return {};
          throw a3;
        }
      }, u = async (a2, { password: b2, ttl: c2 = o }) => {
        let d2 = r(b2), e2 = Math.max(...Object.keys(d2).map((a3) => parseInt(a3, 10))), f2 = { id: e2.toString(), secret: d2[e2] }, g2 = await m.seal(s, a2, f2, { ...m.defaults, ttl: 1e3 * c2 });
        return `${g2}~2`;
      }, v = async (a2, b2, c2) => {
        if (!a2 || !b2 || !c2 || !c2.cookieName || !c2.password) throw Error('iron-session: Bad usage. Minimum usage is const session = await getIronSession(req, res, { cookieName: "...", password: "...". Check the usage here: https://github.com/vvo/iron-session');
        let d2 = r(c2.password);
        Object.values(r(c2.password)).forEach((a3) => {
          if (a3.length < 32) throw Error("iron-session: Bad usage. Password must be at least 32 characters long.");
        });
        let e2 = { ...p, ...c2, cookieOptions: { ...p.cookieOptions, ...c2.cookieOptions || {} } };
        0 === e2.ttl && (e2.ttl = 2147483647), c2.cookieOptions && "maxAge" in c2.cookieOptions ? void 0 === c2.cookieOptions.maxAge ? e2.ttl = 0 : e2.cookieOptions.maxAge = c2.cookieOptions.maxAge - 60 : e2.cookieOptions.maxAge = e2.ttl - 60;
        let f2 = n.default.parse("credentials" in a2 ? a2.headers.get("cookie") || "" : a2.headers.cookie || "")[e2.cookieName], g2 = void 0 === f2 ? {} : await t(f2, { password: d2, ttl: e2.ttl });
        return Object.defineProperties(g2, { save: { value: async function() {
          if ("headersSent" in b2 && true === b2.headersSent) throw Error("iron-session: Cannot set session cookie: session.save() was called after headers were sent. Make sure to call it before any res.send() or res.end()");
          let a3 = await u(g2, { password: d2, ttl: e2.ttl }), c3 = n.default.serialize(e2.cookieName, a3, e2.cookieOptions);
          if (c3.length > 4096) throw Error(`iron-session: Cookie length is too big ${c3.length}, browsers will refuse it. Try to remove some data.`);
          q(c3, b2);
        } }, destroy: { value: function() {
          Object.keys(g2).forEach((a3) => {
            delete g2[a3];
          }), q(n.default.serialize(e2.cookieName, "", { ...e2.cookieOptions, maxAge: 0 }), b2);
        } } }), g2;
      };
    }, 1100: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1139: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeIdentities = void 0, b.deserializeIdentities = (a2) => a2.map((a3) => ({ idpId: a3.idp_id, type: a3.type, provider: a3.provider }));
    }, 1150: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1170: (a, b, c) => {
      "use strict";
      var d = c(785), e = c(3727);
      a.exports = { formats: c(9518), parse: e, stringify: d };
    }, 1213: (a) => {
      (() => {
        "use strict";
        var b = { 993: (a2) => {
          var b2 = Object.prototype.hasOwnProperty, c2 = "~";
          function d2() {
          }
          function e2(a3, b3, c3) {
            this.fn = a3, this.context = b3, this.once = c3 || false;
          }
          function f(a3, b3, d3, f2, g2) {
            if ("function" != typeof d3) throw TypeError("The listener must be a function");
            var h2 = new e2(d3, f2 || a3, g2), i = c2 ? c2 + b3 : b3;
            return a3._events[i] ? a3._events[i].fn ? a3._events[i] = [a3._events[i], h2] : a3._events[i].push(h2) : (a3._events[i] = h2, a3._eventsCount++), a3;
          }
          function g(a3, b3) {
            0 == --a3._eventsCount ? a3._events = new d2() : delete a3._events[b3];
          }
          function h() {
            this._events = new d2(), this._eventsCount = 0;
          }
          Object.create && (d2.prototype = /* @__PURE__ */ Object.create(null), new d2().__proto__ || (c2 = false)), h.prototype.eventNames = function() {
            var a3, d3, e3 = [];
            if (0 === this._eventsCount) return e3;
            for (d3 in a3 = this._events) b2.call(a3, d3) && e3.push(c2 ? d3.slice(1) : d3);
            return Object.getOwnPropertySymbols ? e3.concat(Object.getOwnPropertySymbols(a3)) : e3;
          }, h.prototype.listeners = function(a3) {
            var b3 = c2 ? c2 + a3 : a3, d3 = this._events[b3];
            if (!d3) return [];
            if (d3.fn) return [d3.fn];
            for (var e3 = 0, f2 = d3.length, g2 = Array(f2); e3 < f2; e3++) g2[e3] = d3[e3].fn;
            return g2;
          }, h.prototype.listenerCount = function(a3) {
            var b3 = c2 ? c2 + a3 : a3, d3 = this._events[b3];
            return d3 ? d3.fn ? 1 : d3.length : 0;
          }, h.prototype.emit = function(a3, b3, d3, e3, f2, g2) {
            var h2 = c2 ? c2 + a3 : a3;
            if (!this._events[h2]) return false;
            var i, j, k = this._events[h2], l = arguments.length;
            if (k.fn) {
              switch (k.once && this.removeListener(a3, k.fn, void 0, true), l) {
                case 1:
                  return k.fn.call(k.context), true;
                case 2:
                  return k.fn.call(k.context, b3), true;
                case 3:
                  return k.fn.call(k.context, b3, d3), true;
                case 4:
                  return k.fn.call(k.context, b3, d3, e3), true;
                case 5:
                  return k.fn.call(k.context, b3, d3, e3, f2), true;
                case 6:
                  return k.fn.call(k.context, b3, d3, e3, f2, g2), true;
              }
              for (j = 1, i = Array(l - 1); j < l; j++) i[j - 1] = arguments[j];
              k.fn.apply(k.context, i);
            } else {
              var m, n = k.length;
              for (j = 0; j < n; j++) switch (k[j].once && this.removeListener(a3, k[j].fn, void 0, true), l) {
                case 1:
                  k[j].fn.call(k[j].context);
                  break;
                case 2:
                  k[j].fn.call(k[j].context, b3);
                  break;
                case 3:
                  k[j].fn.call(k[j].context, b3, d3);
                  break;
                case 4:
                  k[j].fn.call(k[j].context, b3, d3, e3);
                  break;
                default:
                  if (!i) for (m = 1, i = Array(l - 1); m < l; m++) i[m - 1] = arguments[m];
                  k[j].fn.apply(k[j].context, i);
              }
            }
            return true;
          }, h.prototype.on = function(a3, b3, c3) {
            return f(this, a3, b3, c3, false);
          }, h.prototype.once = function(a3, b3, c3) {
            return f(this, a3, b3, c3, true);
          }, h.prototype.removeListener = function(a3, b3, d3, e3) {
            var f2 = c2 ? c2 + a3 : a3;
            if (!this._events[f2]) return this;
            if (!b3) return g(this, f2), this;
            var h2 = this._events[f2];
            if (h2.fn) h2.fn !== b3 || e3 && !h2.once || d3 && h2.context !== d3 || g(this, f2);
            else {
              for (var i = 0, j = [], k = h2.length; i < k; i++) (h2[i].fn !== b3 || e3 && !h2[i].once || d3 && h2[i].context !== d3) && j.push(h2[i]);
              j.length ? this._events[f2] = 1 === j.length ? j[0] : j : g(this, f2);
            }
            return this;
          }, h.prototype.removeAllListeners = function(a3) {
            var b3;
            return a3 ? (b3 = c2 ? c2 + a3 : a3, this._events[b3] && g(this, b3)) : (this._events = new d2(), this._eventsCount = 0), this;
          }, h.prototype.off = h.prototype.removeListener, h.prototype.addListener = h.prototype.on, h.prefixed = c2, h.EventEmitter = h, a2.exports = h;
        }, 213: (a2) => {
          a2.exports = (a3, b2) => (b2 = b2 || (() => {
          }), a3.then((a4) => new Promise((a5) => {
            a5(b2());
          }).then(() => a4), (a4) => new Promise((a5) => {
            a5(b2());
          }).then(() => {
            throw a4;
          })));
        }, 574: (a2, b2) => {
          Object.defineProperty(b2, "__esModule", { value: true }), b2.default = function(a3, b3, c2) {
            let d2 = 0, e2 = a3.length;
            for (; e2 > 0; ) {
              let f = e2 / 2 | 0, g = d2 + f;
              0 >= c2(a3[g], b3) ? (d2 = ++g, e2 -= f + 1) : e2 = f;
            }
            return d2;
          };
        }, 821: (a2, b2, c2) => {
          Object.defineProperty(b2, "__esModule", { value: true });
          let d2 = c2(574);
          class e2 {
            constructor() {
              this._queue = [];
            }
            enqueue(a3, b3) {
              let c3 = { priority: (b3 = Object.assign({ priority: 0 }, b3)).priority, run: a3 };
              if (this.size && this._queue[this.size - 1].priority >= b3.priority) return void this._queue.push(c3);
              let e3 = d2.default(this._queue, c3, (a4, b4) => b4.priority - a4.priority);
              this._queue.splice(e3, 0, c3);
            }
            dequeue() {
              let a3 = this._queue.shift();
              return null == a3 ? void 0 : a3.run;
            }
            filter(a3) {
              return this._queue.filter((b3) => b3.priority === a3.priority).map((a4) => a4.run);
            }
            get size() {
              return this._queue.length;
            }
          }
          b2.default = e2;
        }, 816: (a2, b2, c2) => {
          let d2 = c2(213);
          class e2 extends Error {
            constructor(a3) {
              super(a3), this.name = "TimeoutError";
            }
          }
          let f = (a3, b3, c3) => new Promise((f2, g) => {
            if ("number" != typeof b3 || b3 < 0) throw TypeError("Expected `milliseconds` to be a positive number");
            if (b3 === 1 / 0) return void f2(a3);
            let h = setTimeout(() => {
              if ("function" == typeof c3) {
                try {
                  f2(c3());
                } catch (a4) {
                  g(a4);
                }
                return;
              }
              let d3 = "string" == typeof c3 ? c3 : `Promise timed out after ${b3} milliseconds`, h2 = c3 instanceof Error ? c3 : new e2(d3);
              "function" == typeof a3.cancel && a3.cancel(), g(h2);
            }, b3);
            d2(a3.then(f2, g), () => {
              clearTimeout(h);
            });
          });
          a2.exports = f, a2.exports.default = f, a2.exports.TimeoutError = e2;
        } }, c = {};
        function d(a2) {
          var e2 = c[a2];
          if (void 0 !== e2) return e2.exports;
          var f = c[a2] = { exports: {} }, g = true;
          try {
            b[a2](f, f.exports, d), g = false;
          } finally {
            g && delete c[a2];
          }
          return f.exports;
        }
        d.ab = "//";
        var e = {};
        (() => {
          Object.defineProperty(e, "__esModule", { value: true });
          let a2 = d(993), b2 = d(816), c2 = d(821), f = () => {
          }, g = new b2.TimeoutError();
          class h extends a2 {
            constructor(a3) {
              var b3, d2, e2, g2;
              if (super(), this._intervalCount = 0, this._intervalEnd = 0, this._pendingCount = 0, this._resolveEmpty = f, this._resolveIdle = f, !("number" == typeof (a3 = Object.assign({ carryoverConcurrencyCount: false, intervalCap: 1 / 0, interval: 0, concurrency: 1 / 0, autoStart: true, queueClass: c2.default }, a3)).intervalCap && a3.intervalCap >= 1)) throw TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${null != (d2 = null == (b3 = a3.intervalCap) ? void 0 : b3.toString()) ? d2 : ""}\` (${typeof a3.intervalCap})`);
              if (void 0 === a3.interval || !(Number.isFinite(a3.interval) && a3.interval >= 0)) throw TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${null != (g2 = null == (e2 = a3.interval) ? void 0 : e2.toString()) ? g2 : ""}\` (${typeof a3.interval})`);
              this._carryoverConcurrencyCount = a3.carryoverConcurrencyCount, this._isIntervalIgnored = a3.intervalCap === 1 / 0 || 0 === a3.interval, this._intervalCap = a3.intervalCap, this._interval = a3.interval, this._queue = new a3.queueClass(), this._queueClass = a3.queueClass, this.concurrency = a3.concurrency, this._timeout = a3.timeout, this._throwOnTimeout = true === a3.throwOnTimeout, this._isPaused = false === a3.autoStart;
            }
            get _doesIntervalAllowAnother() {
              return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
            }
            get _doesConcurrentAllowAnother() {
              return this._pendingCount < this._concurrency;
            }
            _next() {
              this._pendingCount--, this._tryToStartAnother(), this.emit("next");
            }
            _resolvePromises() {
              this._resolveEmpty(), this._resolveEmpty = f, 0 === this._pendingCount && (this._resolveIdle(), this._resolveIdle = f, this.emit("idle"));
            }
            _onResumeInterval() {
              this._onInterval(), this._initializeIntervalIfNeeded(), this._timeoutId = void 0;
            }
            _isIntervalPaused() {
              let a3 = Date.now();
              if (void 0 === this._intervalId) {
                let b3 = this._intervalEnd - a3;
                if (!(b3 < 0)) return void 0 === this._timeoutId && (this._timeoutId = setTimeout(() => {
                  this._onResumeInterval();
                }, b3)), true;
                this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
              }
              return false;
            }
            _tryToStartAnother() {
              if (0 === this._queue.size) return this._intervalId && clearInterval(this._intervalId), this._intervalId = void 0, this._resolvePromises(), false;
              if (!this._isPaused) {
                let a3 = !this._isIntervalPaused();
                if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
                  let b3 = this._queue.dequeue();
                  return !!b3 && (this.emit("active"), b3(), a3 && this._initializeIntervalIfNeeded(), true);
                }
              }
              return false;
            }
            _initializeIntervalIfNeeded() {
              this._isIntervalIgnored || void 0 !== this._intervalId || (this._intervalId = setInterval(() => {
                this._onInterval();
              }, this._interval), this._intervalEnd = Date.now() + this._interval);
            }
            _onInterval() {
              0 === this._intervalCount && 0 === this._pendingCount && this._intervalId && (clearInterval(this._intervalId), this._intervalId = void 0), this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0, this._processQueue();
            }
            _processQueue() {
              for (; this._tryToStartAnother(); ) ;
            }
            get concurrency() {
              return this._concurrency;
            }
            set concurrency(a3) {
              if (!("number" == typeof a3 && a3 >= 1)) throw TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${a3}\` (${typeof a3})`);
              this._concurrency = a3, this._processQueue();
            }
            async add(a3, c3 = {}) {
              return new Promise((d2, e2) => {
                let f2 = async () => {
                  this._pendingCount++, this._intervalCount++;
                  try {
                    let f3 = void 0 === this._timeout && void 0 === c3.timeout ? a3() : b2.default(Promise.resolve(a3()), void 0 === c3.timeout ? this._timeout : c3.timeout, () => {
                      (void 0 === c3.throwOnTimeout ? this._throwOnTimeout : c3.throwOnTimeout) && e2(g);
                    });
                    d2(await f3);
                  } catch (a4) {
                    e2(a4);
                  }
                  this._next();
                };
                this._queue.enqueue(f2, c3), this._tryToStartAnother(), this.emit("add");
              });
            }
            async addAll(a3, b3) {
              return Promise.all(a3.map(async (a4) => this.add(a4, b3)));
            }
            start() {
              return this._isPaused && (this._isPaused = false, this._processQueue()), this;
            }
            pause() {
              this._isPaused = true;
            }
            clear() {
              this._queue = new this._queueClass();
            }
            async onEmpty() {
              if (0 !== this._queue.size) return new Promise((a3) => {
                let b3 = this._resolveEmpty;
                this._resolveEmpty = () => {
                  b3(), a3();
                };
              });
            }
            async onIdle() {
              if (0 !== this._pendingCount || 0 !== this._queue.size) return new Promise((a3) => {
                let b3 = this._resolveIdle;
                this._resolveIdle = () => {
                  b3(), a3();
                };
              });
            }
            get size() {
              return this._queue.size;
            }
            sizeBy(a3) {
              return this._queue.filter(a3).length;
            }
            get pending() {
              return this._pendingCount;
            }
            get isPaused() {
              return this._isPaused;
            }
            get timeout() {
              return this._timeout;
            }
            set timeout(a3) {
              this._timeout = a3;
            }
          }
          e.default = h;
        })(), a.exports = e;
      })();
    }, 1250: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1273: (a, b, c) => {
      "use strict";
      var d = c(5356).Buffer, e = [];
      function f(a2, b2) {
        if (0 === b2) return false;
        var c2 = b2 & -b2, d2 = a2 + c2;
        return d2 === a2 || d2 - c2 !== a2;
      }
      function g(a2) {
        var b2 = e[a2];
        return b2 ? e[a2] = void 0 : b2 = d.alloc(a2), b2.fill(0), b2;
      }
      function h(a2) {
        var b2 = a2.length;
        b2 < 20 && (e[b2] = a2);
      }
      function i(a2, b2) {
        if (a2 < 0 || a2 > 1844674407370955e4) throw Error("Value out of range.");
        var c2 = Math.floor(a2 / 4294967296);
        b2.writeUInt32LE(a2 % 4294967296, 0), b2.writeUInt32LE(c2, 4);
      }
      a.exports = { alloc: g, free: h, readInt: function(a2) {
        var b2 = a2.length, c2 = a2[b2 - 1] < 128 ? 0 : -1, d2 = false;
        if (b2 < 7) for (var e2 = b2 - 1; e2 >= 0; e2--) c2 = 256 * c2 + a2[e2];
        else for (var e2 = b2 - 1; e2 >= 0; e2--) {
          var g2 = a2[e2];
          f(c2 *= 256, g2) && (d2 = true), c2 += g2;
        }
        return { value: c2, lossy: d2 };
      }, readUInt: function(a2) {
        var b2 = a2.length, c2 = 0, d2 = false;
        if (b2 < 7) for (var e2 = b2 - 1; e2 >= 0; e2--) c2 = 256 * c2 + a2[e2];
        else for (var e2 = b2 - 1; e2 >= 0; e2--) {
          var g2 = a2[e2];
          f(c2 *= 256, g2) && (d2 = true), c2 += g2;
        }
        return { value: c2, lossy: d2 };
      }, resize: function(a2, b2) {
        if (b2 === a2.length) return a2;
        var c2 = g(b2);
        return a2.copy(c2), h(a2), c2;
      }, writeInt64: function(a2, b2) {
        if (a2 < -9223372036854776e3 || a2 > 9223372036854775e3) throw Error("Value out of range.");
        a2 < 0 && (a2 += 18446744073709552e3), i(a2, b2);
      }, writeUInt64: i };
    }, 1313: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1337: (a) => {
      "use strict";
      a.exports = Math.round;
    }, 1338: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(6804), b), e(c(5442), b), e(c(4155), b), e(c(7787), b), e(c(4838), b), e(c(8277), b), e(c(1983), b), e(c(1775), b), e(c(1381), b);
    }, 1348: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1381: function(a, b, c) {
      "use strict";
      var d = this && this.__importDefault || function(a2) {
        return a2 && a2.__esModule ? a2 : { default: a2 };
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.UnprocessableEntityException = void 0;
      let e = d(c(3854));
      class f extends Error {
        constructor({ code: a2, errors: b2, message: c2, requestID: d2 }) {
          if (super(), this.status = 422, this.name = "UnprocessableEntityException", this.message = "Unprocessable entity", this.requestID = d2, c2 && (this.message = c2), a2 && (this.code = a2), b2) {
            let a3 = (0, e.default)("requirement", b2.length);
            for (let { code: c3 } of (this.message = `The following ${a3} must be met:
`, b2)) this.message = this.message.concat(`	${c3}
`);
          }
        }
      }
      b.UnprocessableEntityException = f;
    }, 1420: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1561: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1571: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1582: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.OrganizationDomains = void 0;
      let e = c(791), f = c(2817);
      class g {
        constructor(a2) {
          this.workos = a2;
        }
        get(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/organization_domains/${a2}`);
            return (0, f.deserializeOrganizationDomain)(b2);
          });
        }
        verify(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post(`/organization_domains/${a2}/verify`, {});
            return (0, f.deserializeOrganizationDomain)(b2);
          });
        }
        create(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/organization_domains", (0, e.serializeCreateOrganizationDomainOptions)(a2));
            return (0, f.deserializeOrganizationDomain)(b2);
          });
        }
        delete(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.delete(`/organization_domains/${a2}`);
          });
        }
      }
      b.OrganizationDomains = g;
    }, 1586: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreateResourceOptions = void 0;
      let d = c(9180);
      b.serializeCreateResourceOptions = (a2) => ({ resource_type: (0, d.isResourceInterface)(a2.resource) ? a2.resource.getResourceType() : a2.resource.resourceType, resource_id: (0, d.isResourceInterface)(a2.resource) ? a2.resource.getResourceId() : a2.resource.resourceId ? a2.resource.resourceId : "", meta: a2.meta });
    }, 1604: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1631: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1634: (a, b, c) => {
      "use strict";
      var d = c(5356).Buffer;
      Object.defineProperty(b, "__esModule", { value: true }), b.uint8ArrayToBase64 = b.base64ToUint8Array = void 0, b.base64ToUint8Array = function(a2) {
        if ("function" == typeof atob) {
          let b2 = atob(a2), c2 = new Uint8Array(b2.length);
          for (let a3 = 0; a3 < b2.length; a3++) c2[a3] = b2.charCodeAt(a3);
          return c2;
        }
        if (void 0 !== d) return new Uint8Array(d.from(a2, "base64"));
        throw Error("No base64 decoding implementation available");
      }, b.uint8ArrayToBase64 = function(a2) {
        if ("function" == typeof btoa) {
          let b2 = "";
          for (let c2 = 0; c2 < a2.byteLength; c2++) b2 += String.fromCharCode(a2[c2]);
          return btoa(b2);
        }
        if (void 0 !== d) return d.from(a2).toString("base64");
        throw Error("No base64 encoding implementation available");
      };
    }, 1647: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeConnection = void 0, b.deserializeConnection = (a2) => ({ object: a2.object, id: a2.id, organizationId: a2.organization_id, name: a2.name, connectionType: a2.connection_type, type: a2.connection_type, state: a2.state, domains: a2.domains, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 1741: (a, b, c) => {
      "use strict";
      var d = c(9518), e = Object.prototype.hasOwnProperty, f = Array.isArray, g = function() {
        for (var a2 = [], b2 = 0; b2 < 256; ++b2) a2.push("%" + ((b2 < 16 ? "0" : "") + b2.toString(16)).toUpperCase());
        return a2;
      }(), h = function(a2) {
        for (; a2.length > 1; ) {
          var b2 = a2.pop(), c2 = b2.obj[b2.prop];
          if (f(c2)) {
            for (var d2 = [], e2 = 0; e2 < c2.length; ++e2) void 0 !== c2[e2] && d2.push(c2[e2]);
            b2.obj[b2.prop] = d2;
          }
        }
      }, i = function(a2, b2) {
        for (var c2 = b2 && b2.plainObjects ? { __proto__: null } : {}, d2 = 0; d2 < a2.length; ++d2) void 0 !== a2[d2] && (c2[d2] = a2[d2]);
        return c2;
      };
      a.exports = { arrayToObject: i, assign: function(a2, b2) {
        return Object.keys(b2).reduce(function(a3, c2) {
          return a3[c2] = b2[c2], a3;
        }, a2);
      }, combine: function(a2, b2) {
        return [].concat(a2, b2);
      }, compact: function(a2) {
        for (var b2 = [{ obj: { o: a2 }, prop: "o" }], c2 = [], d2 = 0; d2 < b2.length; ++d2) for (var e2 = b2[d2], f2 = e2.obj[e2.prop], g2 = Object.keys(f2), i2 = 0; i2 < g2.length; ++i2) {
          var j = g2[i2], k = f2[j];
          "object" == typeof k && null !== k && -1 === c2.indexOf(k) && (b2.push({ obj: f2, prop: j }), c2.push(k));
        }
        return h(b2), a2;
      }, decode: function(a2, b2, c2) {
        var d2 = a2.replace(/\+/g, " ");
        if ("iso-8859-1" === c2) return d2.replace(/%[0-9a-f]{2}/gi, unescape);
        try {
          return decodeURIComponent(d2);
        } catch (a3) {
          return d2;
        }
      }, encode: function(a2, b2, c2, e2, f2) {
        if (0 === a2.length) return a2;
        var h2 = a2;
        if ("symbol" == typeof a2 ? h2 = Symbol.prototype.toString.call(a2) : "string" != typeof a2 && (h2 = String(a2)), "iso-8859-1" === c2) return escape(h2).replace(/%u[0-9a-f]{4}/gi, function(a3) {
          return "%26%23" + parseInt(a3.slice(2), 16) + "%3B";
        });
        for (var i2 = "", j = 0; j < h2.length; j += 1024) {
          for (var k = h2.length >= 1024 ? h2.slice(j, j + 1024) : h2, l = [], m = 0; m < k.length; ++m) {
            var n = k.charCodeAt(m);
            if (45 === n || 46 === n || 95 === n || 126 === n || n >= 48 && n <= 57 || n >= 65 && n <= 90 || n >= 97 && n <= 122 || f2 === d.RFC1738 && (40 === n || 41 === n)) {
              l[l.length] = k.charAt(m);
              continue;
            }
            if (n < 128) {
              l[l.length] = g[n];
              continue;
            }
            if (n < 2048) {
              l[l.length] = g[192 | n >> 6] + g[128 | 63 & n];
              continue;
            }
            if (n < 55296 || n >= 57344) {
              l[l.length] = g[224 | n >> 12] + g[128 | n >> 6 & 63] + g[128 | 63 & n];
              continue;
            }
            m += 1, n = 65536 + ((1023 & n) << 10 | 1023 & k.charCodeAt(m)), l[l.length] = g[240 | n >> 18] + g[128 | n >> 12 & 63] + g[128 | n >> 6 & 63] + g[128 | 63 & n];
          }
          i2 += l.join("");
        }
        return i2;
      }, isBuffer: function(a2) {
        return !!a2 && "object" == typeof a2 && !!(a2.constructor && a2.constructor.isBuffer && a2.constructor.isBuffer(a2));
      }, isRegExp: function(a2) {
        return "[object RegExp]" === Object.prototype.toString.call(a2);
      }, maybeMap: function(a2, b2) {
        if (f(a2)) {
          for (var c2 = [], d2 = 0; d2 < a2.length; d2 += 1) c2.push(b2(a2[d2]));
          return c2;
        }
        return b2(a2);
      }, merge: function a2(b2, c2, d2) {
        if (!c2) return b2;
        if ("object" != typeof c2 && "function" != typeof c2) {
          if (f(b2)) b2.push(c2);
          else {
            if (!b2 || "object" != typeof b2) return [b2, c2];
            (d2 && (d2.plainObjects || d2.allowPrototypes) || !e.call(Object.prototype, c2)) && (b2[c2] = true);
          }
          return b2;
        }
        if (!b2 || "object" != typeof b2) return [b2].concat(c2);
        var g2 = b2;
        return (f(b2) && !f(c2) && (g2 = i(b2, d2)), f(b2) && f(c2)) ? (c2.forEach(function(c3, f2) {
          if (e.call(b2, f2)) {
            var g3 = b2[f2];
            g3 && "object" == typeof g3 && c3 && "object" == typeof c3 ? b2[f2] = a2(g3, c3, d2) : b2.push(c3);
          } else b2[f2] = c3;
        }), b2) : Object.keys(c2).reduce(function(b3, f2) {
          var g3 = c2[f2];
          return e.call(b3, f2) ? b3[f2] = a2(b3[f2], g3, d2) : b3[f2] = g3, b3;
        }, g2);
      } };
    }, 1745: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1758: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeUpdateObjectEntity = b.serializeCreateObjectEntity = b.desrializeListObjectVersions = b.deserializeListObjects = b.deserializeObject = b.deserializeObjectMetadata = void 0, b.deserializeObjectMetadata = (a2) => ({ context: a2.context, environmentId: a2.environment_id, id: a2.id, keyId: a2.key_id, updatedAt: new Date(Date.parse(a2.updated_at)), updatedBy: a2.updated_by, versionId: a2.version_id }), b.deserializeObject = (a2) => ({ id: a2.id, name: a2.name, value: a2.value, metadata: (0, b.deserializeObjectMetadata)(a2.metadata) });
      let c = (a2) => ({ id: a2.id, name: a2.name, updatedAt: new Date(Date.parse(a2.updated_at)) });
      b.deserializeListObjects = (a2) => {
        var b2, d2;
        return { object: "list", data: a2.data.map(c), listMetadata: { after: null != (b2 = a2.list_metadata.after) ? b2 : void 0, before: null != (d2 = a2.list_metadata.before) ? d2 : void 0 } };
      }, b.desrializeListObjectVersions = (a2) => a2.data.map(d);
      let d = (a2) => ({ createdAt: new Date(Date.parse(a2.created_at)), currentVersion: a2.current_version, id: a2.id });
      b.serializeCreateObjectEntity = (a2) => ({ name: a2.name, value: a2.value, key_context: a2.context }), b.serializeUpdateObjectEntity = (a2) => ({ value: a2.value, version_check: a2.versionCheck });
    }, 1762: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeMagicAuthEvent = b.deserializeMagicAuth = void 0, b.deserializeMagicAuth = (a2) => ({ object: a2.object, id: a2.id, userId: a2.user_id, email: a2.email, expiresAt: a2.expires_at, code: a2.code, createdAt: a2.created_at, updatedAt: a2.updated_at }), b.deserializeMagicAuthEvent = (a2) => ({ object: a2.object, id: a2.id, userId: a2.user_id, email: a2.email, expiresAt: a2.expires_at, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 1763: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1775: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.UnauthorizedException = void 0;
      class c extends Error {
        constructor(a2) {
          super(), this.requestID = a2, this.status = 401, this.name = "UnauthorizedException", this.message = "Could not authorize the request. Maybe your API key is invalid?";
        }
      }
      b.UnauthorizedException = c;
    }, 1802: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Widgets = void 0;
      let e = c(8784);
      class f {
        constructor(a2) {
          this.workos = a2;
        }
        getToken(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/widgets/token", (0, e.serializeGetTokenOptions)(a2));
            return (0, e.deserializeGetTokenResponse)(b2).token;
          });
        }
      }
      b.Widgets = f;
    }, 1810: (a, b) => {
      "use strict";
      var c;
      Object.defineProperty(b, "__esModule", { value: true }), b.ConnectionType = void 0, function(a2) {
        a2.ADFSSAML = "ADFSSAML", a2.AdpOidc = "AdpOidc", a2.AppleOAuth = "AppleOAuth", a2.Auth0SAML = "Auth0SAML", a2.AzureSAML = "AzureSAML", a2.CasSAML = "CasSAML", a2.ClassLinkSAML = "ClassLinkSAML", a2.CloudflareSAML = "CloudflareSAML", a2.CyberArkSAML = "CyberArkSAML", a2.DuoSAML = "DuoSAML", a2.GenericOIDC = "GenericOIDC", a2.GenericSAML = "GenericSAML", a2.GitHubOAuth = "GitHubOAuth", a2.GoogleOAuth = "GoogleOAuth", a2.GoogleSAML = "GoogleSAML", a2.JumpCloudSAML = "JumpCloudSAML", a2.KeycloakSAML = "KeycloakSAML", a2.LastPassSAML = "LastPassSAML", a2.LoginGovOidc = "LoginGovOidc", a2.MagicLink = "MagicLink", a2.MicrosoftOAuth = "MicrosoftOAuth", a2.MiniOrangeSAML = "MiniOrangeSAML", a2.NetIqSAML = "NetIqSAML", a2.OktaSAML = "OktaSAML", a2.OneLoginSAML = "OneLoginSAML", a2.OracleSAML = "OracleSAML", a2.PingFederateSAML = "PingFederateSAML", a2.PingOneSAML = "PingOneSAML", a2.RipplingSAML = "RipplingSAML", a2.SalesforceSAML = "SalesforceSAML", a2.ShibbolethGenericSAML = "ShibbolethGenericSAML", a2.ShibbolethSAML = "ShibbolethSAML", a2.SimpleSamlPhpSAML = "SimpleSamlPhpSAML", a2.VMwareSAML = "VMwareSAML";
      }(c || (b.ConnectionType = c = {}));
    }, 1811: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 1814: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializePasswordResetEvent = b.deserializePasswordReset = void 0, b.deserializePasswordReset = (a2) => ({ object: a2.object, id: a2.id, userId: a2.user_id, email: a2.email, passwordResetToken: a2.password_reset_token, passwordResetUrl: a2.password_reset_url, expiresAt: a2.expires_at, createdAt: a2.created_at }), b.deserializePasswordResetEvent = (a2) => ({ object: a2.object, id: a2.id, userId: a2.user_id, email: a2.email, expiresAt: a2.expires_at, createdAt: a2.created_at });
    }, 1847: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuthenticateWithRefreshTokenOptions = void 0, b.serializeAuthenticateWithRefreshTokenOptions = (a2) => ({ grant_type: "refresh_token", client_id: a2.clientId, client_secret: a2.clientSecret, refresh_token: a2.refreshToken, organization_id: a2.organizationId, ip_address: a2.ipAddress, user_agent: a2.userAgent });
    }, 1886: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i2(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i2(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i2(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i2((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.FGA = void 0;
      let e = c(9875), f = c(486), g = c(9180), h = c(6647), i = c(8877), j = c(2897), k = c(2435);
      class l {
        constructor(a2) {
          this.workos = a2;
        }
        check(a2, b2 = {}) {
          return d(this, void 0, void 0, function* () {
            let { data: c2 } = yield this.workos.post("/fga/v1/check", (0, f.serializeCheckOptions)(a2), b2);
            return new e.CheckResult(c2);
          });
        }
        checkBatch(a2, b2 = {}) {
          return d(this, void 0, void 0, function* () {
            let { data: c2 } = yield this.workos.post("/fga/v1/check", (0, f.serializeCheckBatchOptions)(a2), b2);
            return c2.map((a3) => new e.CheckResult(a3));
          });
        }
        createResource(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/fga/v1/resources", (0, f.serializeCreateResourceOptions)(a2));
            return (0, f.deserializeResource)(b2);
          });
        }
        getResource(a2) {
          return d(this, void 0, void 0, function* () {
            let b2 = (0, g.isResourceInterface)(a2) ? a2.getResourceType() : a2.resourceType, c2 = (0, g.isResourceInterface)(a2) ? a2.getResourceId() : a2.resourceId, { data: d2 } = yield this.workos.get(`/fga/v1/resources/${b2}/${c2}`);
            return (0, f.deserializeResource)(d2);
          });
        }
        listResources(a2) {
          return d(this, void 0, void 0, function* () {
            return new h.AutoPaginatable(yield (0, i.fetchAndDeserialize)(this.workos, "/fga/v1/resources", f.deserializeResource, a2 ? (0, f.serializeListResourceOptions)(a2) : void 0), (a3) => (0, i.fetchAndDeserialize)(this.workos, "/fga/v1/resources", f.deserializeResource, a3), a2 ? (0, f.serializeListResourceOptions)(a2) : void 0);
          });
        }
        updateResource(a2) {
          return d(this, void 0, void 0, function* () {
            let b2 = (0, g.isResourceInterface)(a2.resource) ? a2.resource.getResourceType() : a2.resource.resourceType, c2 = (0, g.isResourceInterface)(a2.resource) ? a2.resource.getResourceId() : a2.resource.resourceId, { data: d2 } = yield this.workos.put(`/fga/v1/resources/${b2}/${c2}`, { meta: a2.meta });
            return (0, f.deserializeResource)(d2);
          });
        }
        deleteResource(a2) {
          return d(this, void 0, void 0, function* () {
            let b2 = (0, g.isResourceInterface)(a2) ? a2.getResourceType() : a2.resourceType, c2 = (0, g.isResourceInterface)(a2) ? a2.getResourceId() : a2.resourceId;
            yield this.workos.delete(`/fga/v1/resources/${b2}/${c2}`);
          });
        }
        batchWriteResources(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/fga/v1/resources/batch", (0, f.serializeBatchWriteResourcesOptions)(a2));
            return (0, f.deserializeBatchWriteResourcesResponse)(b2);
          });
        }
        writeWarrant(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/fga/v1/warrants", (0, f.serializeWriteWarrantOptions)(a2));
            return (0, f.deserializeWarrantToken)(b2);
          });
        }
        batchWriteWarrants(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/fga/v1/warrants", a2.map(f.serializeWriteWarrantOptions));
            return (0, f.deserializeWarrantToken)(b2);
          });
        }
        listWarrants(a2, b2) {
          return d(this, void 0, void 0, function* () {
            return new h.AutoPaginatable(yield (0, i.fetchAndDeserialize)(this.workos, "/fga/v1/warrants", f.deserializeWarrant, a2 ? (0, f.serializeListWarrantsOptions)(a2) : void 0, b2), (a3) => (0, i.fetchAndDeserialize)(this.workos, "/fga/v1/warrants", f.deserializeWarrant, a3, b2), a2 ? (0, f.serializeListWarrantsOptions)(a2) : void 0);
          });
        }
        query(a2, b2 = {}) {
          return d(this, void 0, void 0, function* () {
            return new j.FgaPaginatable(yield (0, k.fetchAndDeserializeFGAList)(this.workos, "/fga/v1/query", f.deserializeQueryResult, (0, f.serializeQueryOptions)(a2), b2), (a3) => (0, k.fetchAndDeserializeFGAList)(this.workos, "/fga/v1/query", f.deserializeQueryResult, a3, b2), (0, f.serializeQueryOptions)(a2));
          });
        }
      }
      b.FGA = l;
    }, 1983: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.SignatureVerificationException = void 0;
      class c extends Error {
        constructor(a2) {
          super(a2 || "Signature verification failed."), this.name = "SignatureVerificationException";
        }
      }
      b.SignatureVerificationException = c;
    }, 2040: (a) => {
      "use strict";
      a.exports = "undefined" != typeof Reflect && Reflect && Reflect.apply;
    }, 2194: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2202: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2213: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeUpdateUserPasswordOptions = void 0, b.serializeUpdateUserPasswordOptions = (a2) => ({ password: a2.password });
    }, 2218: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2219: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.WorkOS = void 0;
      let f = c(3342), g = c(4320), h = c(9876), i = c(3557), j = c(8508), k = c(8454);
      e(c(6686), b), e(c(5924), b), e(c(1338), b), e(c(4924), b), e(c(6647), b), e(c(4e3), b), e(c(7889), b), e(c(9488), b), e(c(9875), b), e(c(3017), b), e(c(8802), b), e(c(9305), b), e(c(2827), b), e(c(8746), b), e(c(7252), b), e(c(3220), b);
      class l extends k.WorkOS {
        createHttpClient(a2, b2) {
          var c2;
          return new i.FetchHttpClient(this.baseURL, Object.assign(Object.assign({}, a2.config), { headers: Object.assign(Object.assign({}, null == (c2 = a2.config) ? void 0 : c2.headers), { Authorization: `Bearer ${this.key}`, "User-Agent": b2 }) }));
        }
        createWebhookClient() {
          let a2 = new g.SubtleCryptoProvider();
          return new j.Webhooks(a2);
        }
        getCryptoProvider() {
          return new g.SubtleCryptoProvider();
        }
        createActionsClient() {
          let a2 = new g.SubtleCryptoProvider();
          return new f.Actions(a2);
        }
        createIronSessionProvider() {
          return new h.EdgeIronSessionProvider();
        }
        emitWarning(a2) {
          return console.warn(`WorkOS: ${a2}`);
        }
      }
      b.WorkOS = l;
    }, 2236: (a, b) => {
      "use strict";
      var c;
      Object.defineProperty(b, "__esModule", { value: true }), b.RefreshAndSealSessionDataFailureReason = void 0, function(a2) {
        a2.INVALID_SESSION_COOKE = "invalid_session_cookie", a2.INVALID_SESSION_COOKIE = "invalid_session_cookie", a2.NO_SESSION_COOKIE_PROVIDED = "no_session_cookie_provided", a2.INVALID_GRANT = "invalid_grant", a2.MFA_ENROLLMENT = "mfa_enrollment", a2.SSO_REQUIRED = "sso_required", a2.ORGANIZATION_NOT_AUTHORIZED = "organization_not_authorized";
      }(c || (b.RefreshAndSealSessionDataFailureReason = c = {}));
    }, 2321: (a) => {
      "use strict";
      a.exports = ReferenceError;
    }, 2382: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2414: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Mfa = void 0;
      let e = c(6537);
      class f {
        constructor(a2) {
          this.workos = a2;
        }
        deleteFactor(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.delete(`/auth/factors/${a2}`);
          });
        }
        getFactor(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/auth/factors/${a2}`);
            return (0, e.deserializeFactor)(b2);
          });
        }
        enrollFactor(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/auth/factors/enroll", Object.assign({ type: a2.type }, (() => {
              switch (a2.type) {
                case "sms":
                  return { phone_number: a2.phoneNumber };
                case "totp":
                  return { totp_issuer: a2.issuer, totp_user: a2.user };
                default:
                  return {};
              }
            })()));
            return (0, e.deserializeFactorWithSecrets)(b2);
          });
        }
        challengeFactor(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post(`/auth/factors/${a2.authenticationFactorId}/challenge`, { sms_template: "smsTemplate" in a2 ? a2.smsTemplate : void 0 });
            return (0, e.deserializeChallenge)(b2);
          });
        }
        verifyFactor(a2) {
          return d(this, void 0, void 0, function* () {
            return this.verifyChallenge(a2);
          });
        }
        verifyChallenge(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post(`/auth/challenges/${a2.authenticationChallengeId}/verify`, { code: a2.code });
            return (0, e.deserializeVerifyResponse)(b2);
          });
        }
      }
      b.Mfa = f;
    }, 2416: (a, b) => {
      "use strict";
      var c;
      Object.defineProperty(b, "__esModule", { value: true }), b.GeneratePortalLinkIntent = void 0, function(a2) {
        a2.AuditLogs = "audit_logs", a2.DomainVerification = "domain_verification", a2.DSync = "dsync", a2.LogStreams = "log_streams", a2.SSO = "sso", a2.CertificateRenewal = "certificate_renewal";
      }(c || (b.GeneratePortalLinkIntent = c = {}));
    }, 2435: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f) {
          function g(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.fetchAndDeserializeFGAList = void 0;
      let e = c(5576);
      b.fetchAndDeserializeFGAList = (a2, b2, c2, f, g) => d(void 0, void 0, void 0, function* () {
        let { data: d2 } = yield a2.get(b2, Object.assign({ query: f }, g));
        return (0, e.deserializeFGAList)(d2, c2);
      });
    }, 2450: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeDeletedEventDirectory = b.deserializeEventDirectory = b.deserializeDirectoryState = b.deserializeDirectory = void 0, b.deserializeDirectory = (a2) => ({ object: a2.object, id: a2.id, domain: a2.domain, externalKey: a2.external_key, name: a2.name, organizationId: a2.organization_id, state: (0, b.deserializeDirectoryState)(a2.state), type: a2.type, createdAt: a2.created_at, updatedAt: a2.updated_at }), b.deserializeDirectoryState = (a2) => "linked" === a2 ? "active" : "unlinked" === a2 ? "inactive" : a2, b.deserializeEventDirectory = (a2) => ({ object: a2.object, id: a2.id, externalKey: a2.external_key, type: a2.type, state: a2.state, name: a2.name, organizationId: a2.organization_id, domains: a2.domains, createdAt: a2.created_at, updatedAt: a2.updated_at }), b.deserializeDeletedEventDirectory = (a2) => ({ object: a2.object, id: a2.id, type: a2.type, state: a2.state, name: a2.name, organizationId: a2.organization_id, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 2464: (a, b, c) => {
      "use strict";
      let d;
      c.r(b), c.d(b, { default: () => eV });
      var e, f = {};
      async function g() {
        return "_ENTRIES" in globalThis && _ENTRIES.middleware_instrumentation && await _ENTRIES.middleware_instrumentation;
      }
      c.r(f), c.d(f, { config: () => eR, middleware: () => eQ });
      let h = null;
      async function i() {
        if ("phase-production-build" === process.env.NEXT_PHASE) return;
        h || (h = g());
        let a10 = await h;
        if (null == a10 ? void 0 : a10.register) try {
          await a10.register();
        } catch (a11) {
          throw a11.message = `An error occurred while loading instrumentation hook: ${a11.message}`, a11;
        }
      }
      async function j(...a10) {
        let b10 = await g();
        try {
          var c10;
          await (null == b10 || null == (c10 = b10.onRequestError) ? void 0 : c10.call(b10, ...a10));
        } catch (a11) {
          console.error("Error in instrumentation.onRequestError:", a11);
        }
      }
      let k = null;
      function l() {
        return k || (k = i()), k;
      }
      function m(a10) {
        return `The edge runtime does not support Node.js '${a10}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`;
      }
      process !== c.g.process && (process.env = c.g.process.env, c.g.process = process);
      try {
        Object.defineProperty(globalThis, "__import_unsupported", { value: function(a10) {
          let b10 = new Proxy(function() {
          }, { get(b11, c10) {
            if ("then" === c10) return {};
            throw Object.defineProperty(Error(m(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, construct() {
            throw Object.defineProperty(Error(m(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, apply(c10, d10, e2) {
            if ("function" == typeof e2[0]) return e2[0](b10);
            throw Object.defineProperty(Error(m(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          } });
          return new Proxy({}, { get: () => b10 });
        }, enumerable: false, configurable: false });
      } catch {
      }
      l();
      class n extends Error {
        constructor({ page: a10 }) {
          super(`The middleware "${a10}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
        }
      }
      class o extends Error {
        constructor() {
          super(`The request.page has been deprecated in favour of \`URLPattern\`.
  Read more: https://nextjs.org/docs/messages/middleware-request-page
  `);
        }
      }
      class p extends Error {
        constructor() {
          super(`The request.ua has been removed in favour of \`userAgent\` function.
  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
  `);
        }
      }
      let q = "_N_T_", r = { shared: "shared", reactServerComponents: "rsc", serverSideRendering: "ssr", actionBrowser: "action-browser", apiNode: "api-node", apiEdge: "api-edge", middleware: "middleware", instrument: "instrument", edgeAsset: "edge-asset", appPagesBrowser: "app-pages-browser", pagesDirBrowser: "pages-dir-browser", pagesDirEdge: "pages-dir-edge", pagesDirNode: "pages-dir-node" };
      function s(a10) {
        var b10, c10, d10, e2, f2, g2 = [], h2 = 0;
        function i2() {
          for (; h2 < a10.length && /\s/.test(a10.charAt(h2)); ) h2 += 1;
          return h2 < a10.length;
        }
        for (; h2 < a10.length; ) {
          for (b10 = h2, f2 = false; i2(); ) if ("," === (c10 = a10.charAt(h2))) {
            for (d10 = h2, h2 += 1, i2(), e2 = h2; h2 < a10.length && "=" !== (c10 = a10.charAt(h2)) && ";" !== c10 && "," !== c10; ) h2 += 1;
            h2 < a10.length && "=" === a10.charAt(h2) ? (f2 = true, h2 = e2, g2.push(a10.substring(b10, d10)), b10 = h2) : h2 = d10 + 1;
          } else h2 += 1;
          (!f2 || h2 >= a10.length) && g2.push(a10.substring(b10, a10.length));
        }
        return g2;
      }
      function t(a10) {
        let b10 = {}, c10 = [];
        if (a10) for (let [d10, e2] of a10.entries()) "set-cookie" === d10.toLowerCase() ? (c10.push(...s(e2)), b10[d10] = 1 === c10.length ? c10[0] : c10) : b10[d10] = e2;
        return b10;
      }
      function u(a10) {
        try {
          return String(new URL(String(a10)));
        } catch (b10) {
          throw Object.defineProperty(Error(`URL is malformed "${String(a10)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, { cause: b10 }), "__NEXT_ERROR_CODE", { value: "E61", enumerable: false, configurable: true });
        }
      }
      ({ ...r, GROUP: { builtinReact: [r.reactServerComponents, r.actionBrowser], serverOnly: [r.reactServerComponents, r.actionBrowser, r.instrument, r.middleware], neutralTarget: [r.apiNode, r.apiEdge], clientOnly: [r.serverSideRendering, r.appPagesBrowser], bundled: [r.reactServerComponents, r.actionBrowser, r.serverSideRendering, r.appPagesBrowser, r.shared, r.instrument, r.middleware], appPages: [r.reactServerComponents, r.serverSideRendering, r.appPagesBrowser, r.actionBrowser] } });
      let v = Symbol("response"), w = Symbol("passThrough"), x = Symbol("waitUntil");
      class y {
        constructor(a10, b10) {
          this[w] = false, this[x] = b10 ? { kind: "external", function: b10 } : { kind: "internal", promises: [] };
        }
        respondWith(a10) {
          this[v] || (this[v] = Promise.resolve(a10));
        }
        passThroughOnException() {
          this[w] = true;
        }
        waitUntil(a10) {
          if ("external" === this[x].kind) return (0, this[x].function)(a10);
          this[x].promises.push(a10);
        }
      }
      class z extends y {
        constructor(a10) {
          var b10;
          super(a10.request, null == (b10 = a10.context) ? void 0 : b10.waitUntil), this.sourcePage = a10.page;
        }
        get request() {
          throw Object.defineProperty(new n({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new n({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      function A(a10) {
        return a10.replace(/\/$/, "") || "/";
      }
      function B(a10) {
        let b10 = a10.indexOf("#"), c10 = a10.indexOf("?"), d10 = c10 > -1 && (b10 < 0 || c10 < b10);
        return d10 || b10 > -1 ? { pathname: a10.substring(0, d10 ? c10 : b10), query: d10 ? a10.substring(c10, b10 > -1 ? b10 : void 0) : "", hash: b10 > -1 ? a10.slice(b10) : "" } : { pathname: a10, query: "", hash: "" };
      }
      function C(a10, b10) {
        if (!a10.startsWith("/") || !b10) return a10;
        let { pathname: c10, query: d10, hash: e2 } = B(a10);
        return "" + b10 + c10 + d10 + e2;
      }
      function D(a10, b10) {
        if (!a10.startsWith("/") || !b10) return a10;
        let { pathname: c10, query: d10, hash: e2 } = B(a10);
        return "" + c10 + b10 + d10 + e2;
      }
      function E(a10, b10) {
        if ("string" != typeof a10) return false;
        let { pathname: c10 } = B(a10);
        return c10 === b10 || c10.startsWith(b10 + "/");
      }
      let F = /* @__PURE__ */ new WeakMap();
      function G(a10, b10) {
        let c10;
        if (!b10) return { pathname: a10 };
        let d10 = F.get(b10);
        d10 || (d10 = b10.map((a11) => a11.toLowerCase()), F.set(b10, d10));
        let e2 = a10.split("/", 2);
        if (!e2[1]) return { pathname: a10 };
        let f2 = e2[1].toLowerCase(), g2 = d10.indexOf(f2);
        return g2 < 0 ? { pathname: a10 } : (c10 = b10[g2], { pathname: a10 = a10.slice(c10.length + 1) || "/", detectedLocale: c10 });
      }
      let H = /(?!^https?:\/\/)(127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)/;
      function I(a10, b10) {
        return new URL(String(a10).replace(H, "localhost"), b10 && String(b10).replace(H, "localhost"));
      }
      let J = Symbol("NextURLInternal");
      class K {
        constructor(a10, b10, c10) {
          let d10, e2;
          "object" == typeof b10 && "pathname" in b10 || "string" == typeof b10 ? (d10 = b10, e2 = c10 || {}) : e2 = c10 || b10 || {}, this[J] = { url: I(a10, d10 ?? e2.base), options: e2, basePath: "" }, this.analyze();
        }
        analyze() {
          var a10, b10, c10, d10, e2;
          let f2 = function(a11, b11) {
            var c11, d11;
            let { basePath: e3, i18n: f3, trailingSlash: g3 } = null != (c11 = b11.nextConfig) ? c11 : {}, h3 = { pathname: a11, trailingSlash: "/" !== a11 ? a11.endsWith("/") : g3 };
            e3 && E(h3.pathname, e3) && (h3.pathname = function(a12, b12) {
              if (!E(a12, b12)) return a12;
              let c12 = a12.slice(b12.length);
              return c12.startsWith("/") ? c12 : "/" + c12;
            }(h3.pathname, e3), h3.basePath = e3);
            let i2 = h3.pathname;
            if (h3.pathname.startsWith("/_next/data/") && h3.pathname.endsWith(".json")) {
              let a12 = h3.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
              h3.buildId = a12[0], i2 = "index" !== a12[1] ? "/" + a12.slice(1).join("/") : "/", true === b11.parseData && (h3.pathname = i2);
            }
            if (f3) {
              let a12 = b11.i18nProvider ? b11.i18nProvider.analyze(h3.pathname) : G(h3.pathname, f3.locales);
              h3.locale = a12.detectedLocale, h3.pathname = null != (d11 = a12.pathname) ? d11 : h3.pathname, !a12.detectedLocale && h3.buildId && (a12 = b11.i18nProvider ? b11.i18nProvider.analyze(i2) : G(i2, f3.locales)).detectedLocale && (h3.locale = a12.detectedLocale);
            }
            return h3;
          }(this[J].url.pathname, { nextConfig: this[J].options.nextConfig, parseData: true, i18nProvider: this[J].options.i18nProvider }), g2 = function(a11, b11) {
            let c11;
            if ((null == b11 ? void 0 : b11.host) && !Array.isArray(b11.host)) c11 = b11.host.toString().split(":", 1)[0];
            else {
              if (!a11.hostname) return;
              c11 = a11.hostname;
            }
            return c11.toLowerCase();
          }(this[J].url, this[J].options.headers);
          this[J].domainLocale = this[J].options.i18nProvider ? this[J].options.i18nProvider.detectDomainLocale(g2) : function(a11, b11, c11) {
            if (a11) for (let f3 of (c11 && (c11 = c11.toLowerCase()), a11)) {
              var d11, e3;
              if (b11 === (null == (d11 = f3.domain) ? void 0 : d11.split(":", 1)[0].toLowerCase()) || c11 === f3.defaultLocale.toLowerCase() || (null == (e3 = f3.locales) ? void 0 : e3.some((a12) => a12.toLowerCase() === c11))) return f3;
            }
          }(null == (b10 = this[J].options.nextConfig) || null == (a10 = b10.i18n) ? void 0 : a10.domains, g2);
          let h2 = (null == (c10 = this[J].domainLocale) ? void 0 : c10.defaultLocale) || (null == (e2 = this[J].options.nextConfig) || null == (d10 = e2.i18n) ? void 0 : d10.defaultLocale);
          this[J].url.pathname = f2.pathname, this[J].defaultLocale = h2, this[J].basePath = f2.basePath ?? "", this[J].buildId = f2.buildId, this[J].locale = f2.locale ?? h2, this[J].trailingSlash = f2.trailingSlash;
        }
        formatPathname() {
          var a10;
          let b10;
          return b10 = function(a11, b11, c10, d10) {
            if (!b11 || b11 === c10) return a11;
            let e2 = a11.toLowerCase();
            return !d10 && (E(e2, "/api") || E(e2, "/" + b11.toLowerCase())) ? a11 : C(a11, "/" + b11);
          }((a10 = { basePath: this[J].basePath, buildId: this[J].buildId, defaultLocale: this[J].options.forceLocale ? void 0 : this[J].defaultLocale, locale: this[J].locale, pathname: this[J].url.pathname, trailingSlash: this[J].trailingSlash }).pathname, a10.locale, a10.buildId ? void 0 : a10.defaultLocale, a10.ignorePrefix), (a10.buildId || !a10.trailingSlash) && (b10 = A(b10)), a10.buildId && (b10 = D(C(b10, "/_next/data/" + a10.buildId), "/" === a10.pathname ? "index.json" : ".json")), b10 = C(b10, a10.basePath), !a10.buildId && a10.trailingSlash ? b10.endsWith("/") ? b10 : D(b10, "/") : A(b10);
        }
        formatSearch() {
          return this[J].url.search;
        }
        get buildId() {
          return this[J].buildId;
        }
        set buildId(a10) {
          this[J].buildId = a10;
        }
        get locale() {
          return this[J].locale ?? "";
        }
        set locale(a10) {
          var b10, c10;
          if (!this[J].locale || !(null == (c10 = this[J].options.nextConfig) || null == (b10 = c10.i18n) ? void 0 : b10.locales.includes(a10))) throw Object.defineProperty(TypeError(`The NextURL configuration includes no locale "${a10}"`), "__NEXT_ERROR_CODE", { value: "E597", enumerable: false, configurable: true });
          this[J].locale = a10;
        }
        get defaultLocale() {
          return this[J].defaultLocale;
        }
        get domainLocale() {
          return this[J].domainLocale;
        }
        get searchParams() {
          return this[J].url.searchParams;
        }
        get host() {
          return this[J].url.host;
        }
        set host(a10) {
          this[J].url.host = a10;
        }
        get hostname() {
          return this[J].url.hostname;
        }
        set hostname(a10) {
          this[J].url.hostname = a10;
        }
        get port() {
          return this[J].url.port;
        }
        set port(a10) {
          this[J].url.port = a10;
        }
        get protocol() {
          return this[J].url.protocol;
        }
        set protocol(a10) {
          this[J].url.protocol = a10;
        }
        get href() {
          let a10 = this.formatPathname(), b10 = this.formatSearch();
          return `${this.protocol}//${this.host}${a10}${b10}${this.hash}`;
        }
        set href(a10) {
          this[J].url = I(a10), this.analyze();
        }
        get origin() {
          return this[J].url.origin;
        }
        get pathname() {
          return this[J].url.pathname;
        }
        set pathname(a10) {
          this[J].url.pathname = a10;
        }
        get hash() {
          return this[J].url.hash;
        }
        set hash(a10) {
          this[J].url.hash = a10;
        }
        get search() {
          return this[J].url.search;
        }
        set search(a10) {
          this[J].url.search = a10;
        }
        get password() {
          return this[J].url.password;
        }
        set password(a10) {
          this[J].url.password = a10;
        }
        get username() {
          return this[J].url.username;
        }
        set username(a10) {
          this[J].url.username = a10;
        }
        get basePath() {
          return this[J].basePath;
        }
        set basePath(a10) {
          this[J].basePath = a10.startsWith("/") ? a10 : `/${a10}`;
        }
        toString() {
          return this.href;
        }
        toJSON() {
          return this.href;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { href: this.href, origin: this.origin, protocol: this.protocol, username: this.username, password: this.password, host: this.host, hostname: this.hostname, port: this.port, pathname: this.pathname, search: this.search, searchParams: this.searchParams, hash: this.hash };
        }
        clone() {
          return new K(String(this), this[J].options);
        }
      }
      var L = c(8443);
      let M = Symbol("internal request");
      class N extends Request {
        constructor(a10, b10 = {}) {
          let c10 = "string" != typeof a10 && "url" in a10 ? a10.url : String(a10);
          u(c10), a10 instanceof Request ? super(a10, b10) : super(c10, b10);
          let d10 = new K(c10, { headers: t(this.headers), nextConfig: b10.nextConfig });
          this[M] = { cookies: new L.RequestCookies(this.headers), nextUrl: d10, url: d10.toString() };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, nextUrl: this.nextUrl, url: this.url, bodyUsed: this.bodyUsed, cache: this.cache, credentials: this.credentials, destination: this.destination, headers: Object.fromEntries(this.headers), integrity: this.integrity, keepalive: this.keepalive, method: this.method, mode: this.mode, redirect: this.redirect, referrer: this.referrer, referrerPolicy: this.referrerPolicy, signal: this.signal };
        }
        get cookies() {
          return this[M].cookies;
        }
        get nextUrl() {
          return this[M].nextUrl;
        }
        get page() {
          throw new o();
        }
        get ua() {
          throw new p();
        }
        get url() {
          return this[M].url;
        }
      }
      class O {
        static get(a10, b10, c10) {
          let d10 = Reflect.get(a10, b10, c10);
          return "function" == typeof d10 ? d10.bind(a10) : d10;
        }
        static set(a10, b10, c10, d10) {
          return Reflect.set(a10, b10, c10, d10);
        }
        static has(a10, b10) {
          return Reflect.has(a10, b10);
        }
        static deleteProperty(a10, b10) {
          return Reflect.deleteProperty(a10, b10);
        }
      }
      let P = Symbol("internal response"), Q = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
      function R(a10, b10) {
        var c10;
        if (null == a10 || null == (c10 = a10.request) ? void 0 : c10.headers) {
          if (!(a10.request.headers instanceof Headers)) throw Object.defineProperty(Error("request.headers must be an instance of Headers"), "__NEXT_ERROR_CODE", { value: "E119", enumerable: false, configurable: true });
          let c11 = [];
          for (let [d10, e2] of a10.request.headers) b10.set("x-middleware-request-" + d10, e2), c11.push(d10);
          b10.set("x-middleware-override-headers", c11.join(","));
        }
      }
      class S extends Response {
        constructor(a10, b10 = {}) {
          super(a10, b10);
          let c10 = this.headers, d10 = new Proxy(new L.ResponseCookies(c10), { get(a11, d11, e2) {
            switch (d11) {
              case "delete":
              case "set":
                return (...e3) => {
                  let f2 = Reflect.apply(a11[d11], a11, e3), g2 = new Headers(c10);
                  return f2 instanceof L.ResponseCookies && c10.set("x-middleware-set-cookie", f2.getAll().map((a12) => (0, L.stringifyCookie)(a12)).join(",")), R(b10, g2), f2;
                };
              default:
                return O.get(a11, d11, e2);
            }
          } });
          this[P] = { cookies: d10, url: b10.url ? new K(b10.url, { headers: t(c10), nextConfig: b10.nextConfig }) : void 0 };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, url: this.url, body: this.body, bodyUsed: this.bodyUsed, headers: Object.fromEntries(this.headers), ok: this.ok, redirected: this.redirected, status: this.status, statusText: this.statusText, type: this.type };
        }
        get cookies() {
          return this[P].cookies;
        }
        static json(a10, b10) {
          let c10 = Response.json(a10, b10);
          return new S(c10.body, c10);
        }
        static redirect(a10, b10) {
          let c10 = "number" == typeof b10 ? b10 : (null == b10 ? void 0 : b10.status) ?? 307;
          if (!Q.has(c10)) throw Object.defineProperty(RangeError('Failed to execute "redirect" on "response": Invalid status code'), "__NEXT_ERROR_CODE", { value: "E529", enumerable: false, configurable: true });
          let d10 = "object" == typeof b10 ? b10 : {}, e2 = new Headers(null == d10 ? void 0 : d10.headers);
          return e2.set("Location", u(a10)), new S(null, { ...d10, headers: e2, status: c10 });
        }
        static rewrite(a10, b10) {
          let c10 = new Headers(null == b10 ? void 0 : b10.headers);
          return c10.set("x-middleware-rewrite", u(a10)), R(b10, c10), new S(null, { ...b10, headers: c10 });
        }
        static next(a10) {
          let b10 = new Headers(null == a10 ? void 0 : a10.headers);
          return b10.set("x-middleware-next", "1"), R(a10, b10), new S(null, { ...a10, headers: b10 });
        }
      }
      function T(a10, b10) {
        let c10 = "string" == typeof b10 ? new URL(b10) : b10, d10 = new URL(a10, b10), e2 = d10.origin === c10.origin;
        return { url: e2 ? d10.toString().slice(c10.origin.length) : d10.toString(), isRelative: e2 };
      }
      let U = "next-router-prefetch", V = ["rsc", "next-router-state-tree", U, "next-hmr-refresh", "next-router-segment-prefetch"], W = "_rsc";
      class X extends Error {
        constructor() {
          super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers");
        }
        static callable() {
          throw new X();
        }
      }
      class Y extends Headers {
        constructor(a10) {
          super(), this.headers = new Proxy(a10, { get(b10, c10, d10) {
            if ("symbol" == typeof c10) return O.get(b10, c10, d10);
            let e2 = c10.toLowerCase(), f2 = Object.keys(a10).find((a11) => a11.toLowerCase() === e2);
            if (void 0 !== f2) return O.get(b10, f2, d10);
          }, set(b10, c10, d10, e2) {
            if ("symbol" == typeof c10) return O.set(b10, c10, d10, e2);
            let f2 = c10.toLowerCase(), g2 = Object.keys(a10).find((a11) => a11.toLowerCase() === f2);
            return O.set(b10, g2 ?? c10, d10, e2);
          }, has(b10, c10) {
            if ("symbol" == typeof c10) return O.has(b10, c10);
            let d10 = c10.toLowerCase(), e2 = Object.keys(a10).find((a11) => a11.toLowerCase() === d10);
            return void 0 !== e2 && O.has(b10, e2);
          }, deleteProperty(b10, c10) {
            if ("symbol" == typeof c10) return O.deleteProperty(b10, c10);
            let d10 = c10.toLowerCase(), e2 = Object.keys(a10).find((a11) => a11.toLowerCase() === d10);
            return void 0 === e2 || O.deleteProperty(b10, e2);
          } });
        }
        static seal(a10) {
          return new Proxy(a10, { get(a11, b10, c10) {
            switch (b10) {
              case "append":
              case "delete":
              case "set":
                return X.callable;
              default:
                return O.get(a11, b10, c10);
            }
          } });
        }
        merge(a10) {
          return Array.isArray(a10) ? a10.join(", ") : a10;
        }
        static from(a10) {
          return a10 instanceof Headers ? a10 : new Y(a10);
        }
        append(a10, b10) {
          let c10 = this.headers[a10];
          "string" == typeof c10 ? this.headers[a10] = [c10, b10] : Array.isArray(c10) ? c10.push(b10) : this.headers[a10] = b10;
        }
        delete(a10) {
          delete this.headers[a10];
        }
        get(a10) {
          let b10 = this.headers[a10];
          return void 0 !== b10 ? this.merge(b10) : null;
        }
        has(a10) {
          return void 0 !== this.headers[a10];
        }
        set(a10, b10) {
          this.headers[a10] = b10;
        }
        forEach(a10, b10) {
          for (let [c10, d10] of this.entries()) a10.call(b10, d10, c10, this);
        }
        *entries() {
          for (let a10 of Object.keys(this.headers)) {
            let b10 = a10.toLowerCase(), c10 = this.get(b10);
            yield [b10, c10];
          }
        }
        *keys() {
          for (let a10 of Object.keys(this.headers)) {
            let b10 = a10.toLowerCase();
            yield b10;
          }
        }
        *values() {
          for (let a10 of Object.keys(this.headers)) {
            let b10 = this.get(a10);
            yield b10;
          }
        }
        [Symbol.iterator]() {
          return this.entries();
        }
      }
      let Z = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class $ {
        disable() {
          throw Z;
        }
        getStore() {
        }
        run() {
          throw Z;
        }
        exit() {
          throw Z;
        }
        enterWith() {
          throw Z;
        }
        static bind(a10) {
          return a10;
        }
      }
      let _ = "undefined" != typeof globalThis && globalThis.AsyncLocalStorage;
      function aa() {
        return _ ? new _() : new $();
      }
      let ab = aa();
      class ac extends Error {
        constructor() {
          super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options");
        }
        static callable() {
          throw new ac();
        }
      }
      class ad {
        static seal(a10) {
          return new Proxy(a10, { get(a11, b10, c10) {
            switch (b10) {
              case "clear":
              case "delete":
              case "set":
                return ac.callable;
              default:
                return O.get(a11, b10, c10);
            }
          } });
        }
      }
      let ae = Symbol.for("next.mutated.cookies");
      class af {
        static wrap(a10, b10) {
          let c10 = new L.ResponseCookies(new Headers());
          for (let b11 of a10.getAll()) c10.set(b11);
          let d10 = [], e2 = /* @__PURE__ */ new Set(), f2 = () => {
            let a11 = ab.getStore();
            if (a11 && (a11.pathWasRevalidated = true), d10 = c10.getAll().filter((a12) => e2.has(a12.name)), b10) {
              let a12 = [];
              for (let b11 of d10) {
                let c11 = new L.ResponseCookies(new Headers());
                c11.set(b11), a12.push(c11.toString());
              }
              b10(a12);
            }
          }, g2 = new Proxy(c10, { get(a11, b11, c11) {
            switch (b11) {
              case ae:
                return d10;
              case "delete":
                return function(...b12) {
                  e2.add("string" == typeof b12[0] ? b12[0] : b12[0].name);
                  try {
                    return a11.delete(...b12), g2;
                  } finally {
                    f2();
                  }
                };
              case "set":
                return function(...b12) {
                  e2.add("string" == typeof b12[0] ? b12[0] : b12[0].name);
                  try {
                    return a11.set(...b12), g2;
                  } finally {
                    f2();
                  }
                };
              default:
                return O.get(a11, b11, c11);
            }
          } });
          return g2;
        }
      }
      function ag(a10, b10) {
        if ("action" !== a10.phase) throw new ac();
      }
      var ah = function(a10) {
        return a10.handleRequest = "BaseServer.handleRequest", a10.run = "BaseServer.run", a10.pipe = "BaseServer.pipe", a10.getStaticHTML = "BaseServer.getStaticHTML", a10.render = "BaseServer.render", a10.renderToResponseWithComponents = "BaseServer.renderToResponseWithComponents", a10.renderToResponse = "BaseServer.renderToResponse", a10.renderToHTML = "BaseServer.renderToHTML", a10.renderError = "BaseServer.renderError", a10.renderErrorToResponse = "BaseServer.renderErrorToResponse", a10.renderErrorToHTML = "BaseServer.renderErrorToHTML", a10.render404 = "BaseServer.render404", a10;
      }(ah || {}), ai = function(a10) {
        return a10.loadDefaultErrorComponents = "LoadComponents.loadDefaultErrorComponents", a10.loadComponents = "LoadComponents.loadComponents", a10;
      }(ai || {}), aj = function(a10) {
        return a10.getRequestHandler = "NextServer.getRequestHandler", a10.getServer = "NextServer.getServer", a10.getServerRequestHandler = "NextServer.getServerRequestHandler", a10.createServer = "createServer.createServer", a10;
      }(aj || {}), ak = function(a10) {
        return a10.compression = "NextNodeServer.compression", a10.getBuildId = "NextNodeServer.getBuildId", a10.createComponentTree = "NextNodeServer.createComponentTree", a10.clientComponentLoading = "NextNodeServer.clientComponentLoading", a10.getLayoutOrPageModule = "NextNodeServer.getLayoutOrPageModule", a10.generateStaticRoutes = "NextNodeServer.generateStaticRoutes", a10.generateFsStaticRoutes = "NextNodeServer.generateFsStaticRoutes", a10.generatePublicRoutes = "NextNodeServer.generatePublicRoutes", a10.generateImageRoutes = "NextNodeServer.generateImageRoutes.route", a10.sendRenderResult = "NextNodeServer.sendRenderResult", a10.proxyRequest = "NextNodeServer.proxyRequest", a10.runApi = "NextNodeServer.runApi", a10.render = "NextNodeServer.render", a10.renderHTML = "NextNodeServer.renderHTML", a10.imageOptimizer = "NextNodeServer.imageOptimizer", a10.getPagePath = "NextNodeServer.getPagePath", a10.getRoutesManifest = "NextNodeServer.getRoutesManifest", a10.findPageComponents = "NextNodeServer.findPageComponents", a10.getFontManifest = "NextNodeServer.getFontManifest", a10.getServerComponentManifest = "NextNodeServer.getServerComponentManifest", a10.getRequestHandler = "NextNodeServer.getRequestHandler", a10.renderToHTML = "NextNodeServer.renderToHTML", a10.renderError = "NextNodeServer.renderError", a10.renderErrorToHTML = "NextNodeServer.renderErrorToHTML", a10.render404 = "NextNodeServer.render404", a10.startResponse = "NextNodeServer.startResponse", a10.route = "route", a10.onProxyReq = "onProxyReq", a10.apiResolver = "apiResolver", a10.internalFetch = "internalFetch", a10;
      }(ak || {}), al = function(a10) {
        return a10.startServer = "startServer.startServer", a10;
      }(al || {}), am = function(a10) {
        return a10.getServerSideProps = "Render.getServerSideProps", a10.getStaticProps = "Render.getStaticProps", a10.renderToString = "Render.renderToString", a10.renderDocument = "Render.renderDocument", a10.createBodyResult = "Render.createBodyResult", a10;
      }(am || {}), an = function(a10) {
        return a10.renderToString = "AppRender.renderToString", a10.renderToReadableStream = "AppRender.renderToReadableStream", a10.getBodyResult = "AppRender.getBodyResult", a10.fetch = "AppRender.fetch", a10;
      }(an || {}), ao = function(a10) {
        return a10.executeRoute = "Router.executeRoute", a10;
      }(ao || {}), ap = function(a10) {
        return a10.runHandler = "Node.runHandler", a10;
      }(ap || {}), aq = function(a10) {
        return a10.runHandler = "AppRouteRouteHandlers.runHandler", a10;
      }(aq || {}), ar = function(a10) {
        return a10.generateMetadata = "ResolveMetadata.generateMetadata", a10.generateViewport = "ResolveMetadata.generateViewport", a10;
      }(ar || {}), as = function(a10) {
        return a10.execute = "Middleware.execute", a10;
      }(as || {});
      let at = ["Middleware.execute", "BaseServer.handleRequest", "Render.getServerSideProps", "Render.getStaticProps", "AppRender.fetch", "AppRender.getBodyResult", "Render.renderDocument", "Node.runHandler", "AppRouteRouteHandlers.runHandler", "ResolveMetadata.generateMetadata", "ResolveMetadata.generateViewport", "NextNodeServer.createComponentTree", "NextNodeServer.findPageComponents", "NextNodeServer.getLayoutOrPageModule", "NextNodeServer.startResponse", "NextNodeServer.clientComponentLoading"], au = ["NextNodeServer.findPageComponents", "NextNodeServer.createComponentTree", "NextNodeServer.clientComponentLoading"];
      function av(a10) {
        return null !== a10 && "object" == typeof a10 && "then" in a10 && "function" == typeof a10.then;
      }
      let { context: aw, propagation: ax, trace: ay, SpanStatusCode: az, SpanKind: aA, ROOT_CONTEXT: aB } = d = c(3234);
      class aC extends Error {
        constructor(a10, b10) {
          super(), this.bubble = a10, this.result = b10;
        }
      }
      let aD = (a10, b10) => {
        (function(a11) {
          return "object" == typeof a11 && null !== a11 && a11 instanceof aC;
        })(b10) && b10.bubble ? a10.setAttribute("next.bubble", true) : (b10 && (a10.recordException(b10), a10.setAttribute("error.type", b10.name)), a10.setStatus({ code: az.ERROR, message: null == b10 ? void 0 : b10.message })), a10.end();
      }, aE = /* @__PURE__ */ new Map(), aF = d.createContextKey("next.rootSpanId"), aG = 0, aH = { set(a10, b10, c10) {
        a10.push({ key: b10, value: c10 });
      } };
      class aI {
        getTracerInstance() {
          return ay.getTracer("next.js", "0.0.1");
        }
        getContext() {
          return aw;
        }
        getTracePropagationData() {
          let a10 = aw.active(), b10 = [];
          return ax.inject(a10, b10, aH), b10;
        }
        getActiveScopeSpan() {
          return ay.getSpan(null == aw ? void 0 : aw.active());
        }
        withPropagatedContext(a10, b10, c10) {
          let d10 = aw.active();
          if (ay.getSpanContext(d10)) return b10();
          let e2 = ax.extract(d10, a10, c10);
          return aw.with(e2, b10);
        }
        trace(...a10) {
          var b10;
          let [c10, d10, e2] = a10, { fn: f2, options: g2 } = "function" == typeof d10 ? { fn: d10, options: {} } : { fn: e2, options: { ...d10 } }, h2 = g2.spanName ?? c10;
          if (!at.includes(c10) && "1" !== process.env.NEXT_OTEL_VERBOSE || g2.hideSpan) return f2();
          let i2 = this.getSpanContext((null == g2 ? void 0 : g2.parentSpan) ?? this.getActiveScopeSpan()), j2 = false;
          i2 ? (null == (b10 = ay.getSpanContext(i2)) ? void 0 : b10.isRemote) && (j2 = true) : (i2 = (null == aw ? void 0 : aw.active()) ?? aB, j2 = true);
          let k2 = aG++;
          return g2.attributes = { "next.span_name": h2, "next.span_type": c10, ...g2.attributes }, aw.with(i2.setValue(aF, k2), () => this.getTracerInstance().startActiveSpan(h2, g2, (a11) => {
            let b11 = "performance" in globalThis && "measure" in performance ? globalThis.performance.now() : void 0, d11 = () => {
              aE.delete(k2), b11 && process.env.NEXT_OTEL_PERFORMANCE_PREFIX && au.includes(c10 || "") && performance.measure(`${process.env.NEXT_OTEL_PERFORMANCE_PREFIX}:next-${(c10.split(".").pop() || "").replace(/[A-Z]/g, (a12) => "-" + a12.toLowerCase())}`, { start: b11, end: performance.now() });
            };
            j2 && aE.set(k2, new Map(Object.entries(g2.attributes ?? {})));
            try {
              if (f2.length > 1) return f2(a11, (b13) => aD(a11, b13));
              let b12 = f2(a11);
              if (av(b12)) return b12.then((b13) => (a11.end(), b13)).catch((b13) => {
                throw aD(a11, b13), b13;
              }).finally(d11);
              return a11.end(), d11(), b12;
            } catch (b12) {
              throw aD(a11, b12), d11(), b12;
            }
          }));
        }
        wrap(...a10) {
          let b10 = this, [c10, d10, e2] = 3 === a10.length ? a10 : [a10[0], {}, a10[1]];
          return at.includes(c10) || "1" === process.env.NEXT_OTEL_VERBOSE ? function() {
            let a11 = d10;
            "function" == typeof a11 && "function" == typeof e2 && (a11 = a11.apply(this, arguments));
            let f2 = arguments.length - 1, g2 = arguments[f2];
            if ("function" != typeof g2) return b10.trace(c10, a11, () => e2.apply(this, arguments));
            {
              let d11 = b10.getContext().bind(aw.active(), g2);
              return b10.trace(c10, a11, (a12, b11) => (arguments[f2] = function(a13) {
                return null == b11 || b11(a13), d11.apply(this, arguments);
              }, e2.apply(this, arguments)));
            }
          } : e2;
        }
        startSpan(...a10) {
          let [b10, c10] = a10, d10 = this.getSpanContext((null == c10 ? void 0 : c10.parentSpan) ?? this.getActiveScopeSpan());
          return this.getTracerInstance().startSpan(b10, c10, d10);
        }
        getSpanContext(a10) {
          return a10 ? ay.setSpan(aw.active(), a10) : void 0;
        }
        getRootSpanAttributes() {
          let a10 = aw.active().getValue(aF);
          return aE.get(a10);
        }
        setRootSpanAttribute(a10, b10) {
          let c10 = aw.active().getValue(aF), d10 = aE.get(c10);
          d10 && d10.set(a10, b10);
        }
      }
      let aJ = (() => {
        let a10 = new aI();
        return () => a10;
      })(), aK = "__prerender_bypass";
      Symbol("__next_preview_data"), Symbol(aK);
      class aL {
        constructor(a10, b10, c10, d10) {
          var e2;
          let f2 = a10 && function(a11, b11) {
            let c11 = Y.from(a11.headers);
            return { isOnDemandRevalidate: c11.get("x-prerender-revalidate") === b11.previewModeId, revalidateOnlyGenerated: c11.has("x-prerender-revalidate-if-generated") };
          }(b10, a10).isOnDemandRevalidate, g2 = null == (e2 = c10.get(aK)) ? void 0 : e2.value;
          this._isEnabled = !!(!f2 && g2 && a10 && g2 === a10.previewModeId), this._previewModeId = null == a10 ? void 0 : a10.previewModeId, this._mutableCookies = d10;
        }
        get isEnabled() {
          return this._isEnabled;
        }
        enable() {
          if (!this._previewModeId) throw Object.defineProperty(Error("Invariant: previewProps missing previewModeId this should never happen"), "__NEXT_ERROR_CODE", { value: "E93", enumerable: false, configurable: true });
          this._mutableCookies.set({ name: aK, value: this._previewModeId, httpOnly: true, sameSite: "none", secure: true, path: "/" }), this._isEnabled = true;
        }
        disable() {
          this._mutableCookies.set({ name: aK, value: "", httpOnly: true, sameSite: "none", secure: true, path: "/", expires: /* @__PURE__ */ new Date(0) }), this._isEnabled = false;
        }
      }
      function aM(a10, b10) {
        if ("x-middleware-set-cookie" in a10.headers && "string" == typeof a10.headers["x-middleware-set-cookie"]) {
          let c10 = a10.headers["x-middleware-set-cookie"], d10 = new Headers();
          for (let a11 of s(c10)) d10.append("set-cookie", a11);
          for (let a11 of new L.ResponseCookies(d10).getAll()) b10.set(a11);
        }
      }
      let aN = aa();
      var aO = c(1213), aP = c.n(aO);
      class aQ extends Error {
        constructor(a10, b10) {
          super("Invariant: " + (a10.endsWith(".") ? a10 : a10 + ".") + " This is a bug in Next.js.", b10), this.name = "InvariantError";
        }
      }
      class aR {
        constructor(a10, b10, c10) {
          this.prev = null, this.next = null, this.key = a10, this.data = b10, this.size = c10;
        }
      }
      class aS {
        constructor() {
          this.prev = null, this.next = null;
        }
      }
      class aT {
        constructor(a10, b10) {
          this.cache = /* @__PURE__ */ new Map(), this.totalSize = 0, this.maxSize = a10, this.calculateSize = b10, this.head = new aS(), this.tail = new aS(), this.head.next = this.tail, this.tail.prev = this.head;
        }
        addToHead(a10) {
          a10.prev = this.head, a10.next = this.head.next, this.head.next.prev = a10, this.head.next = a10;
        }
        removeNode(a10) {
          a10.prev.next = a10.next, a10.next.prev = a10.prev;
        }
        moveToHead(a10) {
          this.removeNode(a10), this.addToHead(a10);
        }
        removeTail() {
          let a10 = this.tail.prev;
          return this.removeNode(a10), a10;
        }
        set(a10, b10) {
          let c10 = (null == this.calculateSize ? void 0 : this.calculateSize.call(this, b10)) ?? 1;
          if (c10 > this.maxSize) return void console.warn("Single item size exceeds maxSize");
          let d10 = this.cache.get(a10);
          if (d10) d10.data = b10, this.totalSize = this.totalSize - d10.size + c10, d10.size = c10, this.moveToHead(d10);
          else {
            let d11 = new aR(a10, b10, c10);
            this.cache.set(a10, d11), this.addToHead(d11), this.totalSize += c10;
          }
          for (; this.totalSize > this.maxSize && this.cache.size > 0; ) {
            let a11 = this.removeTail();
            this.cache.delete(a11.key), this.totalSize -= a11.size;
          }
        }
        has(a10) {
          return this.cache.has(a10);
        }
        get(a10) {
          let b10 = this.cache.get(a10);
          if (b10) return this.moveToHead(b10), b10.data;
        }
        *[Symbol.iterator]() {
          let a10 = this.head.next;
          for (; a10 && a10 !== this.tail; ) {
            let b10 = a10;
            yield [b10.key, b10.data], a10 = a10.next;
          }
        }
        remove(a10) {
          let b10 = this.cache.get(a10);
          b10 && (this.removeNode(b10), this.cache.delete(a10), this.totalSize -= b10.size);
        }
        get size() {
          return this.cache.size;
        }
        get currentSize() {
          return this.totalSize;
        }
      }
      c(5356).Buffer, new aT(52428800, (a10) => a10.size), process.env.NEXT_PRIVATE_DEBUG_CACHE && console.debug.bind(console, "DefaultCacheHandler:"), process.env.NEXT_PRIVATE_DEBUG_CACHE && ((a10, ...b10) => {
        console.log(`use-cache: ${a10}`, ...b10);
      }), Symbol.for("@next/cache-handlers");
      let aU = Symbol.for("@next/cache-handlers-map"), aV = Symbol.for("@next/cache-handlers-set"), aW = globalThis;
      function aX() {
        if (aW[aU]) return aW[aU].entries();
      }
      async function aY(a10, b10) {
        if (!a10) return b10();
        let c10 = aZ(a10);
        try {
          return await b10();
        } finally {
          let b11 = function(a11, b12) {
            let c11 = new Set(a11.pendingRevalidatedTags), d10 = new Set(a11.pendingRevalidateWrites);
            return { pendingRevalidatedTags: b12.pendingRevalidatedTags.filter((a12) => !c11.has(a12)), pendingRevalidates: Object.fromEntries(Object.entries(b12.pendingRevalidates).filter(([b13]) => !(b13 in a11.pendingRevalidates))), pendingRevalidateWrites: b12.pendingRevalidateWrites.filter((a12) => !d10.has(a12)) };
          }(c10, aZ(a10));
          await a_(a10, b11);
        }
      }
      function aZ(a10) {
        return { pendingRevalidatedTags: a10.pendingRevalidatedTags ? [...a10.pendingRevalidatedTags] : [], pendingRevalidates: { ...a10.pendingRevalidates }, pendingRevalidateWrites: a10.pendingRevalidateWrites ? [...a10.pendingRevalidateWrites] : [] };
      }
      async function a$(a10, b10) {
        if (0 === a10.length) return;
        let c10 = [];
        b10 && c10.push(b10.revalidateTag(a10));
        let d10 = function() {
          if (aW[aV]) return aW[aV].values();
        }();
        if (d10) for (let b11 of d10) c10.push(b11.expireTags(...a10));
        await Promise.all(c10);
      }
      async function a_(a10, b10) {
        let c10 = (null == b10 ? void 0 : b10.pendingRevalidatedTags) ?? a10.pendingRevalidatedTags ?? [], d10 = (null == b10 ? void 0 : b10.pendingRevalidates) ?? a10.pendingRevalidates ?? {}, e2 = (null == b10 ? void 0 : b10.pendingRevalidateWrites) ?? a10.pendingRevalidateWrites ?? [];
        return Promise.all([a$(c10, a10.incrementalCache), ...Object.values(d10), ...e2]);
      }
      let a0 = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class a1 {
        disable() {
          throw a0;
        }
        getStore() {
        }
        run() {
          throw a0;
        }
        exit() {
          throw a0;
        }
        enterWith() {
          throw a0;
        }
        static bind(a10) {
          return a10;
        }
      }
      let a2 = "undefined" != typeof globalThis && globalThis.AsyncLocalStorage, a3 = a2 ? new a2() : new a1();
      class a4 {
        constructor({ waitUntil: a10, onClose: b10, onTaskError: c10 }) {
          this.workUnitStores = /* @__PURE__ */ new Set(), this.waitUntil = a10, this.onClose = b10, this.onTaskError = c10, this.callbackQueue = new (aP())(), this.callbackQueue.pause();
        }
        after(a10) {
          if (av(a10)) this.waitUntil || a5(), this.waitUntil(a10.catch((a11) => this.reportTaskError("promise", a11)));
          else if ("function" == typeof a10) this.addCallback(a10);
          else throw Object.defineProperty(Error("`after()`: Argument must be a promise or a function"), "__NEXT_ERROR_CODE", { value: "E50", enumerable: false, configurable: true });
        }
        addCallback(a10) {
          var b10;
          this.waitUntil || a5();
          let c10 = aN.getStore();
          c10 && this.workUnitStores.add(c10);
          let d10 = a3.getStore(), e2 = d10 ? d10.rootTaskSpawnPhase : null == c10 ? void 0 : c10.phase;
          this.runCallbacksOnClosePromise || (this.runCallbacksOnClosePromise = this.runCallbacksOnClose(), this.waitUntil(this.runCallbacksOnClosePromise));
          let f2 = (b10 = async () => {
            try {
              await a3.run({ rootTaskSpawnPhase: e2 }, () => a10());
            } catch (a11) {
              this.reportTaskError("function", a11);
            }
          }, a2 ? a2.bind(b10) : a1.bind(b10));
          this.callbackQueue.add(f2);
        }
        async runCallbacksOnClose() {
          return await new Promise((a10) => this.onClose(a10)), this.runCallbacks();
        }
        async runCallbacks() {
          if (0 === this.callbackQueue.size) return;
          for (let a11 of this.workUnitStores) a11.phase = "after";
          let a10 = ab.getStore();
          if (!a10) throw Object.defineProperty(new aQ("Missing workStore in AfterContext.runCallbacks"), "__NEXT_ERROR_CODE", { value: "E547", enumerable: false, configurable: true });
          return aY(a10, () => (this.callbackQueue.start(), this.callbackQueue.onIdle()));
        }
        reportTaskError(a10, b10) {
          if (console.error("promise" === a10 ? "A promise passed to `after()` rejected:" : "An error occurred in a function passed to `after()`:", b10), this.onTaskError) try {
            null == this.onTaskError || this.onTaskError.call(this, b10);
          } catch (a11) {
            console.error(Object.defineProperty(new aQ("`onTaskError` threw while handling an error thrown from an `after` task", { cause: a11 }), "__NEXT_ERROR_CODE", { value: "E569", enumerable: false, configurable: true }));
          }
        }
      }
      function a5() {
        throw Object.defineProperty(Error("`after()` will not work correctly, because `waitUntil` is not available in the current environment."), "__NEXT_ERROR_CODE", { value: "E91", enumerable: false, configurable: true });
      }
      function a6(a10) {
        let b10, c10 = { then: (d10, e2) => (b10 || (b10 = a10()), b10.then((a11) => {
          c10.value = a11;
        }).catch(() => {
        }), b10.then(d10, e2)) };
        return c10;
      }
      class a7 {
        onClose(a10) {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot subscribe to a closed CloseController"), "__NEXT_ERROR_CODE", { value: "E365", enumerable: false, configurable: true });
          this.target.addEventListener("close", a10), this.listeners++;
        }
        dispatchClose() {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot close a CloseController multiple times"), "__NEXT_ERROR_CODE", { value: "E229", enumerable: false, configurable: true });
          this.listeners > 0 && this.target.dispatchEvent(new Event("close")), this.isClosed = true;
        }
        constructor() {
          this.target = new EventTarget(), this.listeners = 0, this.isClosed = false;
        }
      }
      function a8() {
        return { previewModeId: process.env.__NEXT_PREVIEW_MODE_ID || "", previewModeSigningKey: process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY || "", previewModeEncryptionKey: process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY || "" };
      }
      let a9 = Symbol.for("@next/request-context");
      async function ba(a10, b10, c10) {
        let d10 = [], e2 = c10 && c10.size > 0;
        for (let b11 of ((a11) => {
          let b12 = ["/layout"];
          if (a11.startsWith("/")) {
            let c11 = a11.split("/");
            for (let a12 = 1; a12 < c11.length + 1; a12++) {
              let d11 = c11.slice(0, a12).join("/");
              d11 && (d11.endsWith("/page") || d11.endsWith("/route") || (d11 = `${d11}${!d11.endsWith("/") ? "/" : ""}layout`), b12.push(d11));
            }
          }
          return b12;
        })(a10)) b11 = `${q}${b11}`, d10.push(b11);
        if (b10.pathname && !e2) {
          let a11 = `${q}${b10.pathname}`;
          d10.push(a11);
        }
        return { tags: d10, expirationsByCacheKind: function(a11) {
          let b11 = /* @__PURE__ */ new Map(), c11 = aX();
          if (c11) for (let [d11, e3] of c11) "getExpiration" in e3 && b11.set(d11, a6(async () => e3.getExpiration(...a11)));
          return b11;
        }(d10) };
      }
      class bb extends N {
        constructor(a10) {
          super(a10.input, a10.init), this.sourcePage = a10.page;
        }
        get request() {
          throw Object.defineProperty(new n({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new n({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        waitUntil() {
          throw Object.defineProperty(new n({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      let bc = { keys: (a10) => Array.from(a10.keys()), get: (a10, b10) => a10.get(b10) ?? void 0 }, bd = (a10, b10) => aJ().withPropagatedContext(a10.headers, b10, bc), be = false;
      async function bf(a10) {
        var b10;
        let d10, e2;
        if (!be && (be = true, "true" === process.env.NEXT_PRIVATE_TEST_PROXY)) {
          let { interceptTestApis: a11, wrapRequestHandler: b11 } = c(7720);
          a11(), bd = b11(bd);
        }
        await l();
        let f2 = void 0 !== globalThis.__BUILD_MANIFEST;
        a10.request.url = a10.request.url.replace(/\.rsc($|\?)/, "$1");
        let g2 = a10.bypassNextUrl ? new URL(a10.request.url) : new K(a10.request.url, { headers: a10.request.headers, nextConfig: a10.request.nextConfig });
        for (let a11 of [...g2.searchParams.keys()]) {
          let b11 = g2.searchParams.getAll(a11), c10 = function(a12) {
            for (let b12 of ["nxtP", "nxtI"]) if (a12 !== b12 && a12.startsWith(b12)) return a12.substring(b12.length);
            return null;
          }(a11);
          if (c10) {
            for (let a12 of (g2.searchParams.delete(c10), b11)) g2.searchParams.append(c10, a12);
            g2.searchParams.delete(a11);
          }
        }
        let h2 = process.env.__NEXT_BUILD_ID || "";
        "buildId" in g2 && (h2 = g2.buildId || "", g2.buildId = "");
        let i2 = function(a11) {
          let b11 = new Headers();
          for (let [c10, d11] of Object.entries(a11)) for (let a12 of Array.isArray(d11) ? d11 : [d11]) void 0 !== a12 && ("number" == typeof a12 && (a12 = a12.toString()), b11.append(c10, a12));
          return b11;
        }(a10.request.headers), j2 = i2.has("x-nextjs-data"), k2 = "1" === i2.get("rsc");
        j2 && "/index" === g2.pathname && (g2.pathname = "/");
        let m2 = /* @__PURE__ */ new Map();
        if (!f2) for (let a11 of V) {
          let b11 = i2.get(a11);
          null !== b11 && (m2.set(a11, b11), i2.delete(a11));
        }
        let n2 = g2.searchParams.get(W), o2 = new bb({ page: a10.page, input: function(a11) {
          let b11 = "string" == typeof a11, c10 = b11 ? new URL(a11) : a11;
          return c10.searchParams.delete(W), b11 ? c10.toString() : c10;
        }(g2).toString(), init: { body: a10.request.body, headers: i2, method: a10.request.method, nextConfig: a10.request.nextConfig, signal: a10.request.signal } });
        j2 && Object.defineProperty(o2, "__isData", { enumerable: false, value: true }), !globalThis.__incrementalCacheShared && a10.IncrementalCache && (globalThis.__incrementalCache = new a10.IncrementalCache({ CurCacheHandler: a10.incrementalCacheHandler, minimalMode: true, fetchCacheKeyPrefix: "", dev: false, requestHeaders: a10.request.headers, getPrerenderManifest: () => ({ version: -1, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: a8() }) }));
        let p2 = a10.request.waitUntil ?? (null == (b10 = function() {
          let a11 = globalThis[a9];
          return null == a11 ? void 0 : a11.get();
        }()) ? void 0 : b10.waitUntil), q2 = new z({ request: o2, page: a10.page, context: p2 ? { waitUntil: p2 } : void 0 });
        if ((d10 = await bd(o2, () => {
          if ("/middleware" === a10.page || "/src/middleware" === a10.page) {
            let b11 = q2.waitUntil.bind(q2), c10 = new a7();
            return aJ().trace(as.execute, { spanName: `middleware ${o2.method} ${o2.nextUrl.pathname}`, attributes: { "http.target": o2.nextUrl.pathname, "http.method": o2.method } }, async () => {
              try {
                var d11, f3, g3, i3, j3, k3;
                let l2 = a8(), m3 = await ba("/", o2.nextUrl, null), n3 = (j3 = o2.nextUrl, k3 = (a11) => {
                  e2 = a11;
                }, function(a11, b12, c11, d12, e3, f4, g4, h3, i4, j4, k4, l3) {
                  function m4(a12) {
                    c11 && c11.setHeader("Set-Cookie", a12);
                  }
                  let n4 = {};
                  return { type: "request", phase: a11, implicitTags: f4, url: { pathname: d12.pathname, search: d12.search ?? "" }, rootParams: e3, get headers() {
                    return n4.headers || (n4.headers = function(a12) {
                      let b13 = Y.from(a12);
                      for (let a13 of V) b13.delete(a13);
                      return Y.seal(b13);
                    }(b12.headers)), n4.headers;
                  }, get cookies() {
                    if (!n4.cookies) {
                      let a12 = new L.RequestCookies(Y.from(b12.headers));
                      aM(b12, a12), n4.cookies = ad.seal(a12);
                    }
                    return n4.cookies;
                  }, set cookies(value) {
                    n4.cookies = value;
                  }, get mutableCookies() {
                    if (!n4.mutableCookies) {
                      let a12 = function(a13, b13) {
                        let c12 = new L.RequestCookies(Y.from(a13));
                        return af.wrap(c12, b13);
                      }(b12.headers, g4 || (c11 ? m4 : void 0));
                      aM(b12, a12), n4.mutableCookies = a12;
                    }
                    return n4.mutableCookies;
                  }, get userspaceMutableCookies() {
                    return n4.userspaceMutableCookies || (n4.userspaceMutableCookies = function(a12) {
                      let b13 = new Proxy(a12.mutableCookies, { get(c12, d13, e4) {
                        switch (d13) {
                          case "delete":
                            return function(...d14) {
                              return ag(a12, "cookies().delete"), c12.delete(...d14), b13;
                            };
                          case "set":
                            return function(...d14) {
                              return ag(a12, "cookies().set"), c12.set(...d14), b13;
                            };
                          default:
                            return O.get(c12, d13, e4);
                        }
                      } });
                      return b13;
                    }(this)), n4.userspaceMutableCookies;
                  }, get draftMode() {
                    return n4.draftMode || (n4.draftMode = new aL(i4, b12, this.cookies, this.mutableCookies)), n4.draftMode;
                  }, renderResumeDataCache: h3 ?? null, isHmrRefresh: j4, serverComponentsHmrCache: k4 || globalThis.__serverComponentsHmrCache, devFallbackParams: null };
                }("action", o2, void 0, j3, {}, m3, k3, void 0, l2, false, void 0, null)), p3 = function({ page: a11, renderOpts: b12, isPrefetchRequest: c11, buildId: d12, previouslyRevalidatedTags: e3 }) {
                  var f4;
                  let g4 = !b12.shouldWaitOnAllReady && !b12.supportsDynamicResponse && !b12.isDraftMode && !b12.isPossibleServerAction, h3 = b12.dev ?? false, i4 = h3 || g4 && (!!process.env.NEXT_DEBUG_BUILD || "1" === process.env.NEXT_SSG_FETCH_METRICS), j4 = { isStaticGeneration: g4, page: a11, route: (f4 = a11.split("/").reduce((a12, b13, c12, d13) => b13 ? "(" === b13[0] && b13.endsWith(")") || "@" === b13[0] || ("page" === b13 || "route" === b13) && c12 === d13.length - 1 ? a12 : a12 + "/" + b13 : a12, "")).startsWith("/") ? f4 : "/" + f4, incrementalCache: b12.incrementalCache || globalThis.__incrementalCache, cacheLifeProfiles: b12.cacheLifeProfiles, isRevalidate: b12.isRevalidate, isBuildTimePrerendering: b12.nextExport, hasReadableErrorStacks: b12.hasReadableErrorStacks, fetchCache: b12.fetchCache, isOnDemandRevalidate: b12.isOnDemandRevalidate, isDraftMode: b12.isDraftMode, isPrefetchRequest: c11, buildId: d12, reactLoadableManifest: (null == b12 ? void 0 : b12.reactLoadableManifest) || {}, assetPrefix: (null == b12 ? void 0 : b12.assetPrefix) || "", afterContext: function(a12) {
                    let { waitUntil: b13, onClose: c12, onAfterTaskError: d13 } = a12;
                    return new a4({ waitUntil: b13, onClose: c12, onTaskError: d13 });
                  }(b12), cacheComponentsEnabled: b12.experimental.cacheComponents, dev: h3, previouslyRevalidatedTags: e3, refreshTagsByCacheKind: function() {
                    let a12 = /* @__PURE__ */ new Map(), b13 = aX();
                    if (b13) for (let [c12, d13] of b13) "refreshTags" in d13 && a12.set(c12, a6(async () => d13.refreshTags()));
                    return a12;
                  }(), runInCleanSnapshot: a2 ? a2.snapshot() : function(a12, ...b13) {
                    return a12(...b13);
                  }, shouldTrackFetchMetrics: i4 };
                  return b12.store = j4, j4;
                }({ page: "/", renderOpts: { cacheLifeProfiles: null == (f3 = a10.request.nextConfig) || null == (d11 = f3.experimental) ? void 0 : d11.cacheLife, experimental: { isRoutePPREnabled: false, cacheComponents: false, authInterrupts: !!(null == (i3 = a10.request.nextConfig) || null == (g3 = i3.experimental) ? void 0 : g3.authInterrupts) }, supportsDynamicResponse: true, waitUntil: b11, onClose: c10.onClose.bind(c10), onAfterTaskError: void 0 }, isPrefetchRequest: "1" === o2.headers.get(U), buildId: h2 ?? "", previouslyRevalidatedTags: [] });
                return await ab.run(p3, () => aN.run(n3, a10.handler, o2, q2));
              } finally {
                setTimeout(() => {
                  c10.dispatchClose();
                }, 0);
              }
            });
          }
          return a10.handler(o2, q2);
        })) && !(d10 instanceof Response)) throw Object.defineProperty(TypeError("Expected an instance of Response to be returned"), "__NEXT_ERROR_CODE", { value: "E567", enumerable: false, configurable: true });
        d10 && e2 && d10.headers.set("set-cookie", e2);
        let r2 = null == d10 ? void 0 : d10.headers.get("x-middleware-rewrite");
        if (d10 && r2 && (k2 || !f2)) {
          let b11 = new K(r2, { forceLocale: true, headers: a10.request.headers, nextConfig: a10.request.nextConfig });
          f2 || b11.host !== o2.nextUrl.host || (b11.buildId = h2 || b11.buildId, d10.headers.set("x-middleware-rewrite", String(b11)));
          let { url: c10, isRelative: e3 } = T(b11.toString(), g2.toString());
          !f2 && j2 && d10.headers.set("x-nextjs-rewrite", c10), k2 && e3 && (g2.pathname !== b11.pathname && d10.headers.set("x-nextjs-rewritten-path", b11.pathname), g2.search !== b11.search && d10.headers.set("x-nextjs-rewritten-query", b11.search.slice(1)));
        }
        if (d10 && r2 && k2 && n2) {
          let a11 = new URL(r2);
          a11.searchParams.has(W) || (a11.searchParams.set(W, n2), d10.headers.set("x-middleware-rewrite", a11.toString()));
        }
        let s2 = null == d10 ? void 0 : d10.headers.get("Location");
        if (d10 && s2 && !f2) {
          let b11 = new K(s2, { forceLocale: false, headers: a10.request.headers, nextConfig: a10.request.nextConfig });
          d10 = new Response(d10.body, d10), b11.host === g2.host && (b11.buildId = h2 || b11.buildId, d10.headers.set("Location", b11.toString())), j2 && (d10.headers.delete("Location"), d10.headers.set("x-nextjs-redirect", T(b11.toString(), g2.toString()).url));
        }
        let t2 = d10 || S.next(), u2 = t2.headers.get("x-middleware-override-headers"), v2 = [];
        if (u2) {
          for (let [a11, b11] of m2) t2.headers.set(`x-middleware-request-${a11}`, b11), v2.push(a11);
          v2.length > 0 && t2.headers.set("x-middleware-override-headers", u2 + "," + v2.join(","));
        }
        return { response: t2, waitUntil: ("internal" === q2[x].kind ? Promise.all(q2[x].promises).then(() => {
        }) : void 0) ?? Promise.resolve(), fetchMetrics: o2.fetchMetrics };
      }
      c(4449), "undefined" == typeof URLPattern || URLPattern;
      var bg = c(7814);
      if (/* @__PURE__ */ new WeakMap(), bg.unstable_postpone, false === function(a10) {
        return a10.includes("needs to bail out of prerendering at this point because it used") && a10.includes("Learn more: https://nextjs.org/docs/messages/ppr-caught-error");
      }("Route %%% needs to bail out of prerendering at this point because it used ^^^. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error")) throw Object.defineProperty(Error("Invariant: isDynamicPostpone misidentified a postpone reason. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E296", enumerable: false, configurable: true });
      RegExp(`\\n\\s+at Suspense \\(<anonymous>\\)(?:(?!\\n\\s+at (?:body|div|main|section|article|aside|header|footer|nav|form|p|span|h1|h2|h3|h4|h5|h6) \\(<anonymous>\\))[\\s\\S])*?\\n\\s+at __next_root_layout_boundary__ \\([^\\n]*\\)`), RegExp(`\\n\\s+at __next_metadata_boundary__[\\n\\s]`), RegExp(`\\n\\s+at __next_viewport_boundary__[\\n\\s]`), RegExp(`\\n\\s+at __next_outlet_boundary__[\\n\\s]`), aa();
      let { env: bh, stdout: bi } = (null == (e = globalThis) ? void 0 : e.process) ?? {}, bj = bh && !bh.NO_COLOR && (bh.FORCE_COLOR || (null == bi ? void 0 : bi.isTTY) && !bh.CI && "dumb" !== bh.TERM), bk = (a10, b10, c10, d10) => {
        let e2 = a10.substring(0, d10) + c10, f2 = a10.substring(d10 + b10.length), g2 = f2.indexOf(b10);
        return ~g2 ? e2 + bk(f2, b10, c10, g2) : e2 + f2;
      }, bl = (a10, b10, c10 = a10) => bj ? (d10) => {
        let e2 = "" + d10, f2 = e2.indexOf(b10, a10.length);
        return ~f2 ? a10 + bk(e2, b10, c10, f2) + b10 : a10 + e2 + b10;
      } : String, bm = bl("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m");
      bl("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"), bl("\x1B[3m", "\x1B[23m"), bl("\x1B[4m", "\x1B[24m"), bl("\x1B[7m", "\x1B[27m"), bl("\x1B[8m", "\x1B[28m"), bl("\x1B[9m", "\x1B[29m"), bl("\x1B[30m", "\x1B[39m");
      let bn = bl("\x1B[31m", "\x1B[39m"), bo = bl("\x1B[32m", "\x1B[39m"), bp = bl("\x1B[33m", "\x1B[39m");
      bl("\x1B[34m", "\x1B[39m");
      let bq = bl("\x1B[35m", "\x1B[39m");
      bl("\x1B[38;2;173;127;168m", "\x1B[39m"), bl("\x1B[36m", "\x1B[39m");
      let br = bl("\x1B[37m", "\x1B[39m");
      function bs(a10, b10) {
        if (a10 instanceof Promise) throw Error(b10);
      }
      function bt(a10, b10, c10) {
        function d10(c11, d11) {
          var e3;
          for (let f3 in Object.defineProperty(c11, "_zod", { value: c11._zod ?? {}, enumerable: false }), (e3 = c11._zod).traits ?? (e3.traits = /* @__PURE__ */ new Set()), c11._zod.traits.add(a10), b10(c11, d11), g2.prototype) f3 in c11 || Object.defineProperty(c11, f3, { value: g2.prototype[f3].bind(c11) });
          c11._zod.constr = g2, c11._zod.def = d11;
        }
        let e2 = c10?.Parent ?? Object;
        class f2 extends e2 {
        }
        function g2(a11) {
          var b11;
          let e3 = c10?.Parent ? new f2() : this;
          for (let c11 of (d10(e3, a11), (b11 = e3._zod).deferred ?? (b11.deferred = []), e3._zod.deferred)) c11();
          return e3;
        }
        return Object.defineProperty(f2, "name", { value: a10 }), Object.defineProperty(g2, "init", { value: d10 }), Object.defineProperty(g2, Symbol.hasInstance, { value: (b11) => !!c10?.Parent && b11 instanceof c10.Parent || b11?._zod?.traits?.has(a10) }), Object.defineProperty(g2, "name", { value: a10 }), g2;
      }
      bl("\x1B[90m", "\x1B[39m"), bl("\x1B[40m", "\x1B[49m"), bl("\x1B[41m", "\x1B[49m"), bl("\x1B[42m", "\x1B[49m"), bl("\x1B[43m", "\x1B[49m"), bl("\x1B[44m", "\x1B[49m"), bl("\x1B[45m", "\x1B[49m"), bl("\x1B[46m", "\x1B[49m"), bl("\x1B[47m", "\x1B[49m"), br(bm("\u25CB")), bn(bm("\u2A2F")), bp(bm("\u26A0")), br(bm(" ")), bo(bm("\u2713")), bq(bm("\xBB")), new aT(1e4, (a10) => a10.length), /* @__PURE__ */ new WeakMap(), Object.freeze({ status: "aborted" }), Symbol("zod_brand");
      class bu extends Error {
        constructor() {
          super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
        }
      }
      class bv extends Error {
        constructor(a10) {
          super(`Encountered unidirectional transform during encode: ${a10}`), this.name = "ZodEncodeError";
        }
      }
      let bw = {};
      function bx(a10) {
        return a10 && Object.assign(bw, a10), bw;
      }
      let by = /^[cC][^\s-]{8,}$/, bz = /^[0-9a-z]+$/, bA = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/, bB = /^[0-9a-vA-V]{20}$/, bC = /^[A-Za-z0-9]{27}$/, bD = /^[a-zA-Z0-9_-]{21}$/, bE = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, bF = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, bG = (a10) => a10 ? RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${a10}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, bH = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, bI = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, bJ = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/, bK = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, bL = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, bM = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, bN = /^[A-Za-z0-9_-]*$/, bO = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/, bP = /^\+(?:[0-9]){6,14}[0-9]$/, bQ = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))", bR = RegExp(`^${bQ}$`);
      function bS(a10) {
        let b10 = "(?:[01]\\d|2[0-3]):[0-5]\\d";
        return "number" == typeof a10.precision ? -1 === a10.precision ? `${b10}` : 0 === a10.precision ? `${b10}:[0-5]\\d` : `${b10}:[0-5]\\d\\.\\d{${a10.precision}}` : `${b10}(?::[0-5]\\d(?:\\.\\d+)?)?`;
      }
      let bT = /^\d+$/, bU = /^-?\d+(?:\.\d+)?/i, bV = /true|false/i, bW = /^[^A-Z]*$/, bX = /^[^a-z]*$/;
      function bY(a10, b10) {
        return "bigint" == typeof b10 ? b10.toString() : b10;
      }
      function bZ(a10) {
        let b10 = +!!a10.startsWith("^"), c10 = a10.endsWith("$") ? a10.length - 1 : a10.length;
        return a10.slice(b10, c10);
      }
      let b$ = Symbol("evaluating");
      function b_(a10, b10, c10) {
        let d10;
        Object.defineProperty(a10, b10, { get() {
          if (d10 !== b$) return void 0 === d10 && (d10 = b$, d10 = c10()), d10;
        }, set(c11) {
          Object.defineProperty(a10, b10, { value: c11 });
        }, configurable: true });
      }
      let b0 = "captureStackTrace" in Error ? Error.captureStackTrace : (...a10) => {
      };
      function b1(a10) {
        return "object" == typeof a10 && null !== a10 && !Array.isArray(a10);
      }
      function b2(a10) {
        if (false === b1(a10)) return false;
        let b10 = a10.constructor;
        if (void 0 === b10) return true;
        let c10 = b10.prototype;
        return false !== b1(c10) && false !== Object.prototype.hasOwnProperty.call(c10, "isPrototypeOf");
      }
      function b3(a10) {
        return b2(a10) ? { ...a10 } : a10;
      }
      let b4 = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
      function b5(a10) {
        return a10.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function b6(a10) {
        if (!a10) return {};
        if ("string" == typeof a10) return { error: () => a10 };
        if (a10?.message !== void 0) {
          if (a10?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
          a10.error = a10.message;
        }
        return (delete a10.message, "string" == typeof a10.error) ? { ...a10, error: () => a10.error } : a10;
      }
      let b7 = { safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER], int32: [-2147483648, 2147483647], uint32: [0, 4294967295], float32: [-34028234663852886e22, 34028234663852886e22], float64: [-Number.MAX_VALUE, Number.MAX_VALUE] };
      function b8(a10, b10 = 0) {
        if (true === a10.aborted) return true;
        for (let c10 = b10; c10 < a10.issues.length; c10++) if (a10.issues[c10]?.continue !== true) return true;
        return false;
      }
      function b9(a10) {
        return "string" == typeof a10 ? a10 : a10?.message;
      }
      function ca(a10, b10, c10) {
        let d10 = { ...a10, path: a10.path ?? [] };
        return a10.message || (d10.message = b9(a10.inst?._zod.def?.error?.(a10)) ?? b9(b10?.error?.(a10)) ?? b9(c10.customError?.(a10)) ?? b9(c10.localeError?.(a10)) ?? "Invalid input"), delete d10.inst, delete d10.continue, b10?.reportInput || delete d10.input, d10;
      }
      function cb(a10) {
        return Array.isArray(a10) ? "array" : "string" == typeof a10 ? "string" : "unknown";
      }
      function cc(...a10) {
        let [b10, c10, d10] = a10;
        return "string" == typeof b10 ? { message: b10, code: "custom", input: c10, inst: d10 } : { ...b10 };
      }
      let cd = bt("$ZodCheck", (a10, b10) => {
        var c10;
        a10._zod ?? (a10._zod = {}), a10._zod.def = b10, (c10 = a10._zod).onattach ?? (c10.onattach = []);
      }), ce = { number: "number", bigint: "bigint", object: "date" }, cf = bt("$ZodCheckLessThan", (a10, b10) => {
        cd.init(a10, b10);
        let c10 = ce[typeof b10.value];
        a10._zod.onattach.push((a11) => {
          let c11 = a11._zod.bag, d10 = (b10.inclusive ? c11.maximum : c11.exclusiveMaximum) ?? 1 / 0;
          b10.value < d10 && (b10.inclusive ? c11.maximum = b10.value : c11.exclusiveMaximum = b10.value);
        }), a10._zod.check = (d10) => {
          (b10.inclusive ? d10.value <= b10.value : d10.value < b10.value) || d10.issues.push({ origin: c10, code: "too_big", maximum: b10.value, input: d10.value, inclusive: b10.inclusive, inst: a10, continue: !b10.abort });
        };
      }), cg = bt("$ZodCheckGreaterThan", (a10, b10) => {
        cd.init(a10, b10);
        let c10 = ce[typeof b10.value];
        a10._zod.onattach.push((a11) => {
          let c11 = a11._zod.bag, d10 = (b10.inclusive ? c11.minimum : c11.exclusiveMinimum) ?? -1 / 0;
          b10.value > d10 && (b10.inclusive ? c11.minimum = b10.value : c11.exclusiveMinimum = b10.value);
        }), a10._zod.check = (d10) => {
          (b10.inclusive ? d10.value >= b10.value : d10.value > b10.value) || d10.issues.push({ origin: c10, code: "too_small", minimum: b10.value, input: d10.value, inclusive: b10.inclusive, inst: a10, continue: !b10.abort });
        };
      }), ch = bt("$ZodCheckMultipleOf", (a10, b10) => {
        cd.init(a10, b10), a10._zod.onattach.push((a11) => {
          var c10;
          (c10 = a11._zod.bag).multipleOf ?? (c10.multipleOf = b10.value);
        }), a10._zod.check = (c10) => {
          if (typeof c10.value != typeof b10.value) throw Error("Cannot mix number and bigint in multiple_of check.");
          ("bigint" == typeof c10.value ? c10.value % b10.value === BigInt(0) : 0 === function(a11, b11) {
            let c11 = (a11.toString().split(".")[1] || "").length, d10 = b11.toString(), e2 = (d10.split(".")[1] || "").length;
            if (0 === e2 && /\d?e-\d?/.test(d10)) {
              let a12 = d10.match(/\d?e-(\d?)/);
              a12?.[1] && (e2 = Number.parseInt(a12[1]));
            }
            let f2 = c11 > e2 ? c11 : e2;
            return Number.parseInt(a11.toFixed(f2).replace(".", "")) % Number.parseInt(b11.toFixed(f2).replace(".", "")) / 10 ** f2;
          }(c10.value, b10.value)) || c10.issues.push({ origin: typeof c10.value, code: "not_multiple_of", divisor: b10.value, input: c10.value, inst: a10, continue: !b10.abort });
        };
      }), ci = bt("$ZodCheckNumberFormat", (a10, b10) => {
        cd.init(a10, b10), b10.format = b10.format || "float64";
        let c10 = b10.format?.includes("int"), d10 = c10 ? "int" : "number", [e2, f2] = b7[b10.format];
        a10._zod.onattach.push((a11) => {
          let d11 = a11._zod.bag;
          d11.format = b10.format, d11.minimum = e2, d11.maximum = f2, c10 && (d11.pattern = bT);
        }), a10._zod.check = (g2) => {
          let h2 = g2.value;
          if (c10) {
            if (!Number.isInteger(h2)) return void g2.issues.push({ expected: d10, format: b10.format, code: "invalid_type", continue: false, input: h2, inst: a10 });
            if (!Number.isSafeInteger(h2)) return void (h2 > 0 ? g2.issues.push({ input: h2, code: "too_big", maximum: Number.MAX_SAFE_INTEGER, note: "Integers must be within the safe integer range.", inst: a10, origin: d10, continue: !b10.abort }) : g2.issues.push({ input: h2, code: "too_small", minimum: Number.MIN_SAFE_INTEGER, note: "Integers must be within the safe integer range.", inst: a10, origin: d10, continue: !b10.abort }));
          }
          h2 < e2 && g2.issues.push({ origin: "number", input: h2, code: "too_small", minimum: e2, inclusive: true, inst: a10, continue: !b10.abort }), h2 > f2 && g2.issues.push({ origin: "number", input: h2, code: "too_big", maximum: f2, inst: a10 });
        };
      }), cj = bt("$ZodCheckMaxLength", (a10, b10) => {
        var c10;
        cd.init(a10, b10), (c10 = a10._zod.def).when ?? (c10.when = (a11) => {
          let b11 = a11.value;
          return null != b11 && void 0 !== b11.length;
        }), a10._zod.onattach.push((a11) => {
          let c11 = a11._zod.bag.maximum ?? 1 / 0;
          b10.maximum < c11 && (a11._zod.bag.maximum = b10.maximum);
        }), a10._zod.check = (c11) => {
          let d10 = c11.value;
          if (d10.length <= b10.maximum) return;
          let e2 = cb(d10);
          c11.issues.push({ origin: e2, code: "too_big", maximum: b10.maximum, inclusive: true, input: d10, inst: a10, continue: !b10.abort });
        };
      }), ck = bt("$ZodCheckMinLength", (a10, b10) => {
        var c10;
        cd.init(a10, b10), (c10 = a10._zod.def).when ?? (c10.when = (a11) => {
          let b11 = a11.value;
          return null != b11 && void 0 !== b11.length;
        }), a10._zod.onattach.push((a11) => {
          let c11 = a11._zod.bag.minimum ?? -1 / 0;
          b10.minimum > c11 && (a11._zod.bag.minimum = b10.minimum);
        }), a10._zod.check = (c11) => {
          let d10 = c11.value;
          if (d10.length >= b10.minimum) return;
          let e2 = cb(d10);
          c11.issues.push({ origin: e2, code: "too_small", minimum: b10.minimum, inclusive: true, input: d10, inst: a10, continue: !b10.abort });
        };
      }), cl = bt("$ZodCheckLengthEquals", (a10, b10) => {
        var c10;
        cd.init(a10, b10), (c10 = a10._zod.def).when ?? (c10.when = (a11) => {
          let b11 = a11.value;
          return null != b11 && void 0 !== b11.length;
        }), a10._zod.onattach.push((a11) => {
          let c11 = a11._zod.bag;
          c11.minimum = b10.length, c11.maximum = b10.length, c11.length = b10.length;
        }), a10._zod.check = (c11) => {
          let d10 = c11.value, e2 = d10.length;
          if (e2 === b10.length) return;
          let f2 = cb(d10), g2 = e2 > b10.length;
          c11.issues.push({ origin: f2, ...g2 ? { code: "too_big", maximum: b10.length } : { code: "too_small", minimum: b10.length }, inclusive: true, exact: true, input: c11.value, inst: a10, continue: !b10.abort });
        };
      }), cm = bt("$ZodCheckStringFormat", (a10, b10) => {
        var c10, d10;
        cd.init(a10, b10), a10._zod.onattach.push((a11) => {
          let c11 = a11._zod.bag;
          c11.format = b10.format, b10.pattern && (c11.patterns ?? (c11.patterns = /* @__PURE__ */ new Set()), c11.patterns.add(b10.pattern));
        }), b10.pattern ? (c10 = a10._zod).check ?? (c10.check = (c11) => {
          b10.pattern.lastIndex = 0, b10.pattern.test(c11.value) || c11.issues.push({ origin: "string", code: "invalid_format", format: b10.format, input: c11.value, ...b10.pattern ? { pattern: b10.pattern.toString() } : {}, inst: a10, continue: !b10.abort });
        }) : (d10 = a10._zod).check ?? (d10.check = () => {
        });
      }), cn = bt("$ZodCheckRegex", (a10, b10) => {
        cm.init(a10, b10), a10._zod.check = (c10) => {
          b10.pattern.lastIndex = 0, b10.pattern.test(c10.value) || c10.issues.push({ origin: "string", code: "invalid_format", format: "regex", input: c10.value, pattern: b10.pattern.toString(), inst: a10, continue: !b10.abort });
        };
      }), co = bt("$ZodCheckLowerCase", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bW), cm.init(a10, b10);
      }), cp = bt("$ZodCheckUpperCase", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bX), cm.init(a10, b10);
      }), cq = bt("$ZodCheckIncludes", (a10, b10) => {
        cd.init(a10, b10);
        let c10 = b5(b10.includes), d10 = new RegExp("number" == typeof b10.position ? `^.{${b10.position}}${c10}` : c10);
        b10.pattern = d10, a10._zod.onattach.push((a11) => {
          let b11 = a11._zod.bag;
          b11.patterns ?? (b11.patterns = /* @__PURE__ */ new Set()), b11.patterns.add(d10);
        }), a10._zod.check = (c11) => {
          c11.value.includes(b10.includes, b10.position) || c11.issues.push({ origin: "string", code: "invalid_format", format: "includes", includes: b10.includes, input: c11.value, inst: a10, continue: !b10.abort });
        };
      }), cr = bt("$ZodCheckStartsWith", (a10, b10) => {
        cd.init(a10, b10);
        let c10 = RegExp(`^${b5(b10.prefix)}.*`);
        b10.pattern ?? (b10.pattern = c10), a10._zod.onattach.push((a11) => {
          let b11 = a11._zod.bag;
          b11.patterns ?? (b11.patterns = /* @__PURE__ */ new Set()), b11.patterns.add(c10);
        }), a10._zod.check = (c11) => {
          c11.value.startsWith(b10.prefix) || c11.issues.push({ origin: "string", code: "invalid_format", format: "starts_with", prefix: b10.prefix, input: c11.value, inst: a10, continue: !b10.abort });
        };
      }), cs = bt("$ZodCheckEndsWith", (a10, b10) => {
        cd.init(a10, b10);
        let c10 = RegExp(`.*${b5(b10.suffix)}$`);
        b10.pattern ?? (b10.pattern = c10), a10._zod.onattach.push((a11) => {
          let b11 = a11._zod.bag;
          b11.patterns ?? (b11.patterns = /* @__PURE__ */ new Set()), b11.patterns.add(c10);
        }), a10._zod.check = (c11) => {
          c11.value.endsWith(b10.suffix) || c11.issues.push({ origin: "string", code: "invalid_format", format: "ends_with", suffix: b10.suffix, input: c11.value, inst: a10, continue: !b10.abort });
        };
      }), ct = bt("$ZodCheckOverwrite", (a10, b10) => {
        cd.init(a10, b10), a10._zod.check = (a11) => {
          a11.value = b10.tx(a11.value);
        };
      }), cu = (a10, b10) => {
        a10.name = "$ZodError", Object.defineProperty(a10, "_zod", { value: a10._zod, enumerable: false }), Object.defineProperty(a10, "issues", { value: b10, enumerable: false }), a10.message = JSON.stringify(b10, bY, 2), Object.defineProperty(a10, "toString", { value: () => a10.message, enumerable: false });
      }, cv = bt("$ZodError", cu), cw = bt("$ZodError", cu, { Parent: Error }), cx = (a10) => (b10, c10, d10, e2) => {
        let f2 = d10 ? Object.assign(d10, { async: false }) : { async: false }, g2 = b10._zod.run({ value: c10, issues: [] }, f2);
        if (g2 instanceof Promise) throw new bu();
        if (g2.issues.length) {
          let b11 = new (e2?.Err ?? a10)(g2.issues.map((a11) => ca(a11, f2, bx())));
          throw b0(b11, e2?.callee), b11;
        }
        return g2.value;
      }, cy = (a10) => async (b10, c10, d10, e2) => {
        let f2 = d10 ? Object.assign(d10, { async: true }) : { async: true }, g2 = b10._zod.run({ value: c10, issues: [] }, f2);
        if (g2 instanceof Promise && (g2 = await g2), g2.issues.length) {
          let b11 = new (e2?.Err ?? a10)(g2.issues.map((a11) => ca(a11, f2, bx())));
          throw b0(b11, e2?.callee), b11;
        }
        return g2.value;
      }, cz = (a10) => (b10, c10, d10) => {
        let e2 = d10 ? { ...d10, async: false } : { async: false }, f2 = b10._zod.run({ value: c10, issues: [] }, e2);
        if (f2 instanceof Promise) throw new bu();
        return f2.issues.length ? { success: false, error: new (a10 ?? cv)(f2.issues.map((a11) => ca(a11, e2, bx()))) } : { success: true, data: f2.value };
      }, cA = cz(cw), cB = (a10) => async (b10, c10, d10) => {
        let e2 = d10 ? Object.assign(d10, { async: true }) : { async: true }, f2 = b10._zod.run({ value: c10, issues: [] }, e2);
        return f2 instanceof Promise && (f2 = await f2), f2.issues.length ? { success: false, error: new a10(f2.issues.map((a11) => ca(a11, e2, bx()))) } : { success: true, data: f2.value };
      }, cC = cB(cw), cD = { major: 4, minor: 1, patch: 5 }, cE = bt("$ZodType", (a10, b10) => {
        var c10;
        a10 ?? (a10 = {}), a10._zod.def = b10, a10._zod.bag = a10._zod.bag || {}, a10._zod.version = cD;
        let d10 = [...a10._zod.def.checks ?? []];
        for (let b11 of (a10._zod.traits.has("$ZodCheck") && d10.unshift(a10), d10)) for (let c11 of b11._zod.onattach) c11(a10);
        if (0 === d10.length) (c10 = a10._zod).deferred ?? (c10.deferred = []), a10._zod.deferred?.push(() => {
          a10._zod.run = a10._zod.parse;
        });
        else {
          let b11 = (a11, b12, c12) => {
            let d11, e2 = b8(a11);
            for (let f2 of b12) {
              if (f2._zod.def.when) {
                if (!f2._zod.def.when(a11)) continue;
              } else if (e2) continue;
              let b13 = a11.issues.length, g2 = f2._zod.check(a11);
              if (g2 instanceof Promise && c12?.async === false) throw new bu();
              if (d11 || g2 instanceof Promise) d11 = (d11 ?? Promise.resolve()).then(async () => {
                await g2, a11.issues.length !== b13 && (e2 || (e2 = b8(a11, b13)));
              });
              else {
                if (a11.issues.length === b13) continue;
                e2 || (e2 = b8(a11, b13));
              }
            }
            return d11 ? d11.then(() => a11) : a11;
          }, c11 = (c12, e2, f2) => {
            if (b8(c12)) return c12.aborted = true, c12;
            let g2 = b11(e2, d10, f2);
            if (g2 instanceof Promise) {
              if (false === f2.async) throw new bu();
              return g2.then((b12) => a10._zod.parse(b12, f2));
            }
            return a10._zod.parse(g2, f2);
          };
          a10._zod.run = (e2, f2) => {
            if (f2.skipChecks) return a10._zod.parse(e2, f2);
            if ("backward" === f2.direction) {
              let b12 = a10._zod.parse({ value: e2.value, issues: [] }, { ...f2, skipChecks: true });
              return b12 instanceof Promise ? b12.then((a11) => c11(a11, e2, f2)) : c11(b12, e2, f2);
            }
            let g2 = a10._zod.parse(e2, f2);
            if (g2 instanceof Promise) {
              if (false === f2.async) throw new bu();
              return g2.then((a11) => b11(a11, d10, f2));
            }
            return b11(g2, d10, f2);
          };
        }
        a10["~standard"] = { validate: (b11) => {
          try {
            let c11 = cA(a10, b11);
            return c11.success ? { value: c11.data } : { issues: c11.error?.issues };
          } catch (c11) {
            return cC(a10, b11).then((a11) => a11.success ? { value: a11.data } : { issues: a11.error?.issues });
          }
        }, vendor: "zod", version: 1 };
      }), cF = bt("$ZodString", (a10, b10) => {
        cE.init(a10, b10), a10._zod.pattern = [...a10?._zod.bag?.patterns ?? []].pop() ?? ((a11) => {
          let b11 = a11 ? `[\\s\\S]{${a11?.minimum ?? 0},${a11?.maximum ?? ""}}` : "[\\s\\S]*";
          return RegExp(`^${b11}$`);
        })(a10._zod.bag), a10._zod.parse = (c10, d10) => {
          if (b10.coerce) try {
            c10.value = String(c10.value);
          } catch (a11) {
          }
          return "string" == typeof c10.value || c10.issues.push({ expected: "string", code: "invalid_type", input: c10.value, inst: a10 }), c10;
        };
      }), cG = bt("$ZodStringFormat", (a10, b10) => {
        cm.init(a10, b10), cF.init(a10, b10);
      }), cH = bt("$ZodGUID", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bF), cG.init(a10, b10);
      }), cI = bt("$ZodUUID", (a10, b10) => {
        if (b10.version) {
          let a11 = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[b10.version];
          if (void 0 === a11) throw Error(`Invalid UUID version: "${b10.version}"`);
          b10.pattern ?? (b10.pattern = bG(a11));
        } else b10.pattern ?? (b10.pattern = bG());
        cG.init(a10, b10);
      }), cJ = bt("$ZodEmail", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bH), cG.init(a10, b10);
      }), cK = bt("$ZodURL", (a10, b10) => {
        cG.init(a10, b10), a10._zod.check = (c10) => {
          try {
            let d10 = c10.value.trim(), e2 = new URL(d10);
            b10.hostname && (b10.hostname.lastIndex = 0, b10.hostname.test(e2.hostname) || c10.issues.push({ code: "invalid_format", format: "url", note: "Invalid hostname", pattern: bO.source, input: c10.value, inst: a10, continue: !b10.abort })), b10.protocol && (b10.protocol.lastIndex = 0, b10.protocol.test(e2.protocol.endsWith(":") ? e2.protocol.slice(0, -1) : e2.protocol) || c10.issues.push({ code: "invalid_format", format: "url", note: "Invalid protocol", pattern: b10.protocol.source, input: c10.value, inst: a10, continue: !b10.abort })), b10.normalize ? c10.value = e2.href : c10.value = d10;
            return;
          } catch (d10) {
            c10.issues.push({ code: "invalid_format", format: "url", input: c10.value, inst: a10, continue: !b10.abort });
          }
        };
      }), cL = bt("$ZodEmoji", (a10, b10) => {
        b10.pattern ?? (b10.pattern = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u")), cG.init(a10, b10);
      }), cM = bt("$ZodNanoID", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bD), cG.init(a10, b10);
      }), cN = bt("$ZodCUID", (a10, b10) => {
        b10.pattern ?? (b10.pattern = by), cG.init(a10, b10);
      }), cO = bt("$ZodCUID2", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bz), cG.init(a10, b10);
      }), cP = bt("$ZodULID", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bA), cG.init(a10, b10);
      }), cQ = bt("$ZodXID", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bB), cG.init(a10, b10);
      }), cR = bt("$ZodKSUID", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bC), cG.init(a10, b10);
      }), cS = bt("$ZodISODateTime", (a10, b10) => {
        b10.pattern ?? (b10.pattern = function(a11) {
          let b11 = bS({ precision: a11.precision }), c10 = ["Z"];
          a11.local && c10.push(""), a11.offset && c10.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
          let d10 = `${b11}(?:${c10.join("|")})`;
          return RegExp(`^${bQ}T(?:${d10})$`);
        }(b10)), cG.init(a10, b10);
      }), cT = bt("$ZodISODate", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bR), cG.init(a10, b10);
      }), cU = bt("$ZodISOTime", (a10, b10) => {
        b10.pattern ?? (b10.pattern = RegExp(`^${bS(b10)}$`)), cG.init(a10, b10);
      }), cV = bt("$ZodISODuration", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bE), cG.init(a10, b10);
      }), cW = bt("$ZodIPv4", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bI), cG.init(a10, b10), a10._zod.onattach.push((a11) => {
          a11._zod.bag.format = "ipv4";
        });
      }), cX = bt("$ZodIPv6", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bJ), cG.init(a10, b10), a10._zod.onattach.push((a11) => {
          a11._zod.bag.format = "ipv6";
        }), a10._zod.check = (c10) => {
          try {
            new URL(`http://[${c10.value}]`);
          } catch {
            c10.issues.push({ code: "invalid_format", format: "ipv6", input: c10.value, inst: a10, continue: !b10.abort });
          }
        };
      }), cY = bt("$ZodCIDRv4", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bK), cG.init(a10, b10);
      }), cZ = bt("$ZodCIDRv6", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bL), cG.init(a10, b10), a10._zod.check = (c10) => {
          let [d10, e2] = c10.value.split("/");
          try {
            if (!e2) throw Error();
            let a11 = Number(e2);
            if (`${a11}` !== e2 || a11 < 0 || a11 > 128) throw Error();
            new URL(`http://[${d10}]`);
          } catch {
            c10.issues.push({ code: "invalid_format", format: "cidrv6", input: c10.value, inst: a10, continue: !b10.abort });
          }
        };
      });
      function c$(a10) {
        if ("" === a10) return true;
        if (a10.length % 4 != 0) return false;
        try {
          return atob(a10), true;
        } catch {
          return false;
        }
      }
      let c_ = bt("$ZodBase64", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bM), cG.init(a10, b10), a10._zod.onattach.push((a11) => {
          a11._zod.bag.contentEncoding = "base64";
        }), a10._zod.check = (c10) => {
          c$(c10.value) || c10.issues.push({ code: "invalid_format", format: "base64", input: c10.value, inst: a10, continue: !b10.abort });
        };
      }), c0 = bt("$ZodBase64URL", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bN), cG.init(a10, b10), a10._zod.onattach.push((a11) => {
          a11._zod.bag.contentEncoding = "base64url";
        }), a10._zod.check = (c10) => {
          !function(a11) {
            if (!bN.test(a11)) return false;
            let b11 = a11.replace(/[-_]/g, (a12) => "-" === a12 ? "+" : "/");
            return c$(b11.padEnd(4 * Math.ceil(b11.length / 4), "="));
          }(c10.value) && c10.issues.push({ code: "invalid_format", format: "base64url", input: c10.value, inst: a10, continue: !b10.abort });
        };
      }), c1 = bt("$ZodE164", (a10, b10) => {
        b10.pattern ?? (b10.pattern = bP), cG.init(a10, b10);
      }), c2 = bt("$ZodJWT", (a10, b10) => {
        cG.init(a10, b10), a10._zod.check = (c10) => {
          !function(a11, b11 = null) {
            try {
              let c11 = a11.split(".");
              if (3 !== c11.length) return false;
              let [d10] = c11;
              if (!d10) return false;
              let e2 = JSON.parse(atob(d10));
              if ("typ" in e2 && e2?.typ !== "JWT" || !e2.alg || b11 && (!("alg" in e2) || e2.alg !== b11)) return false;
              return true;
            } catch {
              return false;
            }
          }(c10.value, b10.alg) && c10.issues.push({ code: "invalid_format", format: "jwt", input: c10.value, inst: a10, continue: !b10.abort });
        };
      }), c3 = bt("$ZodNumber", (a10, b10) => {
        cE.init(a10, b10), a10._zod.pattern = a10._zod.bag.pattern ?? bU, a10._zod.parse = (c10, d10) => {
          if (b10.coerce) try {
            c10.value = Number(c10.value);
          } catch (a11) {
          }
          let e2 = c10.value;
          if ("number" == typeof e2 && !Number.isNaN(e2) && Number.isFinite(e2)) return c10;
          let f2 = "number" == typeof e2 ? Number.isNaN(e2) ? "NaN" : Number.isFinite(e2) ? void 0 : "Infinity" : void 0;
          return c10.issues.push({ expected: "number", code: "invalid_type", input: e2, inst: a10, ...f2 ? { received: f2 } : {} }), c10;
        };
      }), c4 = bt("$ZodNumber", (a10, b10) => {
        ci.init(a10, b10), c3.init(a10, b10);
      }), c5 = bt("$ZodBoolean", (a10, b10) => {
        cE.init(a10, b10), a10._zod.pattern = bV, a10._zod.parse = (c10, d10) => {
          if (b10.coerce) try {
            c10.value = !!c10.value;
          } catch (a11) {
          }
          let e2 = c10.value;
          return "boolean" == typeof e2 || c10.issues.push({ expected: "boolean", code: "invalid_type", input: e2, inst: a10 }), c10;
        };
      }), c6 = bt("$ZodAny", (a10, b10) => {
        cE.init(a10, b10), a10._zod.parse = (a11) => a11;
      });
      function c7(a10, b10, c10) {
        a10.issues.length && b10.issues.push(...a10.issues.map((a11) => (a11.path ?? (a11.path = []), a11.path.unshift(c10), a11))), b10.value[c10] = a10.value;
      }
      let c8 = bt("$ZodArray", (a10, b10) => {
        cE.init(a10, b10), a10._zod.parse = (c10, d10) => {
          let e2 = c10.value;
          if (!Array.isArray(e2)) return c10.issues.push({ expected: "array", code: "invalid_type", input: e2, inst: a10 }), c10;
          c10.value = Array(e2.length);
          let f2 = [];
          for (let a11 = 0; a11 < e2.length; a11++) {
            let g2 = e2[a11], h2 = b10.element._zod.run({ value: g2, issues: [] }, d10);
            h2 instanceof Promise ? f2.push(h2.then((b11) => c7(b11, c10, a11))) : c7(h2, c10, a11);
          }
          return f2.length ? Promise.all(f2).then(() => c10) : c10;
        };
      });
      function c9(a10, b10, c10, d10) {
        for (let c11 of a10) if (0 === c11.issues.length) return b10.value = c11.value, b10;
        let e2 = a10.filter((a11) => !b8(a11));
        return 1 === e2.length ? (b10.value = e2[0].value, e2[0]) : (b10.issues.push({ code: "invalid_union", input: b10.value, inst: c10, errors: a10.map((a11) => a11.issues.map((a12) => ca(a12, d10, bx()))) }), b10);
      }
      let da = bt("$ZodUnion", (a10, b10) => {
        cE.init(a10, b10), b_(a10._zod, "optin", () => b10.options.some((a11) => "optional" === a11._zod.optin) ? "optional" : void 0), b_(a10._zod, "optout", () => b10.options.some((a11) => "optional" === a11._zod.optout) ? "optional" : void 0), b_(a10._zod, "values", () => {
          if (b10.options.every((a11) => a11._zod.values)) return new Set(b10.options.flatMap((a11) => Array.from(a11._zod.values)));
        }), b_(a10._zod, "pattern", () => {
          if (b10.options.every((a11) => a11._zod.pattern)) {
            let a11 = b10.options.map((a12) => a12._zod.pattern);
            return RegExp(`^(${a11.map((a12) => bZ(a12.source)).join("|")})$`);
          }
        });
        let c10 = 1 === b10.options.length, d10 = b10.options[0]._zod.run;
        a10._zod.parse = (e2, f2) => {
          if (c10) return d10(e2, f2);
          let g2 = false, h2 = [];
          for (let a11 of b10.options) {
            let b11 = a11._zod.run({ value: e2.value, issues: [] }, f2);
            if (b11 instanceof Promise) h2.push(b11), g2 = true;
            else {
              if (0 === b11.issues.length) return b11;
              h2.push(b11);
            }
          }
          return g2 ? Promise.all(h2).then((b11) => c9(b11, e2, a10, f2)) : c9(h2, e2, a10, f2);
        };
      }), db = bt("$ZodIntersection", (a10, b10) => {
        cE.init(a10, b10), a10._zod.parse = (a11, c10) => {
          let d10 = a11.value, e2 = b10.left._zod.run({ value: d10, issues: [] }, c10), f2 = b10.right._zod.run({ value: d10, issues: [] }, c10);
          return e2 instanceof Promise || f2 instanceof Promise ? Promise.all([e2, f2]).then(([b11, c11]) => dc(a11, b11, c11)) : dc(a11, e2, f2);
        };
      });
      function dc(a10, b10, c10) {
        if (b10.issues.length && a10.issues.push(...b10.issues), c10.issues.length && a10.issues.push(...c10.issues), b8(a10)) return a10;
        let d10 = function a11(b11, c11) {
          if (b11 === c11 || b11 instanceof Date && c11 instanceof Date && +b11 == +c11) return { valid: true, data: b11 };
          if (b2(b11) && b2(c11)) {
            let d11 = Object.keys(c11), e2 = Object.keys(b11).filter((a12) => -1 !== d11.indexOf(a12)), f2 = { ...b11, ...c11 };
            for (let d12 of e2) {
              let e3 = a11(b11[d12], c11[d12]);
              if (!e3.valid) return { valid: false, mergeErrorPath: [d12, ...e3.mergeErrorPath] };
              f2[d12] = e3.data;
            }
            return { valid: true, data: f2 };
          }
          if (Array.isArray(b11) && Array.isArray(c11)) {
            if (b11.length !== c11.length) return { valid: false, mergeErrorPath: [] };
            let d11 = [];
            for (let e2 = 0; e2 < b11.length; e2++) {
              let f2 = a11(b11[e2], c11[e2]);
              if (!f2.valid) return { valid: false, mergeErrorPath: [e2, ...f2.mergeErrorPath] };
              d11.push(f2.data);
            }
            return { valid: true, data: d11 };
          }
          return { valid: false, mergeErrorPath: [] };
        }(b10.value, c10.value);
        if (!d10.valid) throw Error(`Unmergable intersection. Error path: ${JSON.stringify(d10.mergeErrorPath)}`);
        return a10.value = d10.data, a10;
      }
      let dd = bt("$ZodEnum", (a10, b10) => {
        cE.init(a10, b10);
        let c10 = function(a11) {
          let b11 = Object.values(a11).filter((a12) => "number" == typeof a12);
          return Object.entries(a11).filter(([a12, c11]) => -1 === b11.indexOf(+a12)).map(([a12, b12]) => b12);
        }(b10.entries), d10 = new Set(c10);
        a10._zod.values = d10, a10._zod.pattern = RegExp(`^(${c10.filter((a11) => b4.has(typeof a11)).map((a11) => "string" == typeof a11 ? b5(a11) : a11.toString()).join("|")})$`), a10._zod.parse = (b11, e2) => {
          let f2 = b11.value;
          return d10.has(f2) || b11.issues.push({ code: "invalid_value", values: c10, input: f2, inst: a10 }), b11;
        };
      }), de = bt("$ZodTransform", (a10, b10) => {
        cE.init(a10, b10), a10._zod.parse = (c10, d10) => {
          if ("backward" === d10.direction) throw new bv(a10.constructor.name);
          let e2 = b10.transform(c10.value, c10);
          if (d10.async) return (e2 instanceof Promise ? e2 : Promise.resolve(e2)).then((a11) => (c10.value = a11, c10));
          if (e2 instanceof Promise) throw new bu();
          return c10.value = e2, c10;
        };
      });
      function df(a10, b10) {
        return a10.issues.length && void 0 === b10 ? { issues: [], value: void 0 } : a10;
      }
      let dg = bt("$ZodOptional", (a10, b10) => {
        cE.init(a10, b10), a10._zod.optin = "optional", a10._zod.optout = "optional", b_(a10._zod, "values", () => b10.innerType._zod.values ? /* @__PURE__ */ new Set([...b10.innerType._zod.values, void 0]) : void 0), b_(a10._zod, "pattern", () => {
          let a11 = b10.innerType._zod.pattern;
          return a11 ? RegExp(`^(${bZ(a11.source)})?$`) : void 0;
        }), a10._zod.parse = (a11, c10) => {
          if ("optional" === b10.innerType._zod.optin) {
            let d10 = b10.innerType._zod.run(a11, c10);
            return d10 instanceof Promise ? d10.then((b11) => df(b11, a11.value)) : df(d10, a11.value);
          }
          return void 0 === a11.value ? a11 : b10.innerType._zod.run(a11, c10);
        };
      }), dh = bt("$ZodNullable", (a10, b10) => {
        cE.init(a10, b10), b_(a10._zod, "optin", () => b10.innerType._zod.optin), b_(a10._zod, "optout", () => b10.innerType._zod.optout), b_(a10._zod, "pattern", () => {
          let a11 = b10.innerType._zod.pattern;
          return a11 ? RegExp(`^(${bZ(a11.source)}|null)$`) : void 0;
        }), b_(a10._zod, "values", () => b10.innerType._zod.values ? /* @__PURE__ */ new Set([...b10.innerType._zod.values, null]) : void 0), a10._zod.parse = (a11, c10) => null === a11.value ? a11 : b10.innerType._zod.run(a11, c10);
      }), di = bt("$ZodDefault", (a10, b10) => {
        cE.init(a10, b10), a10._zod.optin = "optional", b_(a10._zod, "values", () => b10.innerType._zod.values), a10._zod.parse = (a11, c10) => {
          if ("backward" === c10.direction) return b10.innerType._zod.run(a11, c10);
          if (void 0 === a11.value) return a11.value = b10.defaultValue, a11;
          let d10 = b10.innerType._zod.run(a11, c10);
          return d10 instanceof Promise ? d10.then((a12) => dj(a12, b10)) : dj(d10, b10);
        };
      });
      function dj(a10, b10) {
        return void 0 === a10.value && (a10.value = b10.defaultValue), a10;
      }
      let dk = bt("$ZodPrefault", (a10, b10) => {
        cE.init(a10, b10), a10._zod.optin = "optional", b_(a10._zod, "values", () => b10.innerType._zod.values), a10._zod.parse = (a11, c10) => ("backward" === c10.direction || void 0 === a11.value && (a11.value = b10.defaultValue), b10.innerType._zod.run(a11, c10));
      }), dl = bt("$ZodNonOptional", (a10, b10) => {
        cE.init(a10, b10), b_(a10._zod, "values", () => {
          let a11 = b10.innerType._zod.values;
          return a11 ? new Set([...a11].filter((a12) => void 0 !== a12)) : void 0;
        }), a10._zod.parse = (c10, d10) => {
          let e2 = b10.innerType._zod.run(c10, d10);
          return e2 instanceof Promise ? e2.then((b11) => dm(b11, a10)) : dm(e2, a10);
        };
      });
      function dm(a10, b10) {
        return a10.issues.length || void 0 !== a10.value || a10.issues.push({ code: "invalid_type", expected: "nonoptional", input: a10.value, inst: b10 }), a10;
      }
      let dn = bt("$ZodCatch", (a10, b10) => {
        cE.init(a10, b10), b_(a10._zod, "optin", () => b10.innerType._zod.optin), b_(a10._zod, "optout", () => b10.innerType._zod.optout), b_(a10._zod, "values", () => b10.innerType._zod.values), a10._zod.parse = (a11, c10) => {
          if ("backward" === c10.direction) return b10.innerType._zod.run(a11, c10);
          let d10 = b10.innerType._zod.run(a11, c10);
          return d10 instanceof Promise ? d10.then((d11) => (a11.value = d11.value, d11.issues.length && (a11.value = b10.catchValue({ ...a11, error: { issues: d11.issues.map((a12) => ca(a12, c10, bx())) }, input: a11.value }), a11.issues = []), a11)) : (a11.value = d10.value, d10.issues.length && (a11.value = b10.catchValue({ ...a11, error: { issues: d10.issues.map((a12) => ca(a12, c10, bx())) }, input: a11.value }), a11.issues = []), a11);
        };
      }), dp = bt("$ZodPipe", (a10, b10) => {
        cE.init(a10, b10), b_(a10._zod, "values", () => b10.in._zod.values), b_(a10._zod, "optin", () => b10.in._zod.optin), b_(a10._zod, "optout", () => b10.out._zod.optout), b_(a10._zod, "propValues", () => b10.in._zod.propValues), a10._zod.parse = (a11, c10) => {
          if ("backward" === c10.direction) {
            let d11 = b10.out._zod.run(a11, c10);
            return d11 instanceof Promise ? d11.then((a12) => dq(a12, b10.in, c10)) : dq(d11, b10.in, c10);
          }
          let d10 = b10.in._zod.run(a11, c10);
          return d10 instanceof Promise ? d10.then((a12) => dq(a12, b10.out, c10)) : dq(d10, b10.out, c10);
        };
      });
      function dq(a10, b10, c10) {
        return a10.issues.length ? (a10.aborted = true, a10) : b10._zod.run({ value: a10.value, issues: a10.issues }, c10);
      }
      let dr = bt("$ZodReadonly", (a10, b10) => {
        cE.init(a10, b10), b_(a10._zod, "propValues", () => b10.innerType._zod.propValues), b_(a10._zod, "values", () => b10.innerType._zod.values), b_(a10._zod, "optin", () => b10.innerType._zod.optin), b_(a10._zod, "optout", () => b10.innerType._zod.optout), a10._zod.parse = (a11, c10) => {
          if ("backward" === c10.direction) return b10.innerType._zod.run(a11, c10);
          let d10 = b10.innerType._zod.run(a11, c10);
          return d10 instanceof Promise ? d10.then(ds) : ds(d10);
        };
      });
      function ds(a10) {
        return a10.value = Object.freeze(a10.value), a10;
      }
      let dt = bt("$ZodCustom", (a10, b10) => {
        cd.init(a10, b10), cE.init(a10, b10), a10._zod.parse = (a11, b11) => a11, a10._zod.check = (c10) => {
          let d10 = c10.value, e2 = b10.fn(d10);
          if (e2 instanceof Promise) return e2.then((b11) => du(b11, c10, d10, a10));
          du(e2, c10, d10, a10);
        };
      });
      function du(a10, b10, c10, d10) {
        if (!a10) {
          let a11 = { code: "custom", input: c10, inst: d10, path: [...d10._zod.def.path ?? []], continue: !d10._zod.def.abort };
          d10._zod.def.params && (a11.params = d10._zod.def.params), b10.issues.push(cc(a11));
        }
      }
      Symbol("ZodOutput"), Symbol("ZodInput");
      class dv {
        constructor() {
          this._map = /* @__PURE__ */ new Map(), this._idmap = /* @__PURE__ */ new Map();
        }
        add(a10, ...b10) {
          let c10 = b10[0];
          if (this._map.set(a10, c10), c10 && "object" == typeof c10 && "id" in c10) {
            if (this._idmap.has(c10.id)) throw Error(`ID ${c10.id} already exists in the registry`);
            this._idmap.set(c10.id, a10);
          }
          return this;
        }
        clear() {
          return this._map = /* @__PURE__ */ new Map(), this._idmap = /* @__PURE__ */ new Map(), this;
        }
        remove(a10) {
          let b10 = this._map.get(a10);
          return b10 && "object" == typeof b10 && "id" in b10 && this._idmap.delete(b10.id), this._map.delete(a10), this;
        }
        get(a10) {
          let b10 = a10._zod.parent;
          if (b10) {
            let c10 = { ...this.get(b10) ?? {} };
            delete c10.id;
            let d10 = { ...c10, ...this._map.get(a10) };
            return Object.keys(d10).length ? d10 : void 0;
          }
          return this._map.get(a10);
        }
        has(a10) {
          return this._map.has(a10);
        }
      }
      let dw = new dv();
      function dx(a10, b10) {
        return new a10({ type: "string", format: "guid", check: "string_format", abort: false, ...b6(b10) });
      }
      function dy(a10, b10) {
        return new cf({ check: "less_than", ...b6(b10), value: a10, inclusive: false });
      }
      function dz(a10, b10) {
        return new cf({ check: "less_than", ...b6(b10), value: a10, inclusive: true });
      }
      function dA(a10, b10) {
        return new cg({ check: "greater_than", ...b6(b10), value: a10, inclusive: false });
      }
      function dB(a10, b10) {
        return new cg({ check: "greater_than", ...b6(b10), value: a10, inclusive: true });
      }
      function dC(a10, b10) {
        return new ch({ check: "multiple_of", ...b6(b10), value: a10 });
      }
      function dD(a10, b10) {
        return new cj({ check: "max_length", ...b6(b10), maximum: a10 });
      }
      function dE(a10, b10) {
        return new ck({ check: "min_length", ...b6(b10), minimum: a10 });
      }
      function dF(a10, b10) {
        return new cl({ check: "length_equals", ...b6(b10), length: a10 });
      }
      function dG(a10) {
        return new ct({ check: "overwrite", tx: a10 });
      }
      let dH = bt("ZodISODateTime", (a10, b10) => {
        cS.init(a10, b10), d1.init(a10, b10);
      }), dI = bt("ZodISODate", (a10, b10) => {
        cT.init(a10, b10), d1.init(a10, b10);
      }), dJ = bt("ZodISOTime", (a10, b10) => {
        cU.init(a10, b10), d1.init(a10, b10);
      }), dK = bt("ZodISODuration", (a10, b10) => {
        cV.init(a10, b10), d1.init(a10, b10);
      }), dL = (a10, b10) => {
        cv.init(a10, b10), a10.name = "ZodError", Object.defineProperties(a10, { format: { value: (b11) => function(a11, b12) {
          let c10 = b12 || function(a12) {
            return a12.message;
          }, d10 = { _errors: [] }, e2 = (a12) => {
            for (let b13 of a12.issues) if ("invalid_union" === b13.code && b13.errors.length) b13.errors.map((a13) => e2({ issues: a13 }));
            else if ("invalid_key" === b13.code) e2({ issues: b13.issues });
            else if ("invalid_element" === b13.code) e2({ issues: b13.issues });
            else if (0 === b13.path.length) d10._errors.push(c10(b13));
            else {
              let a13 = d10, e3 = 0;
              for (; e3 < b13.path.length; ) {
                let d11 = b13.path[e3];
                e3 === b13.path.length - 1 ? (a13[d11] = a13[d11] || { _errors: [] }, a13[d11]._errors.push(c10(b13))) : a13[d11] = a13[d11] || { _errors: [] }, a13 = a13[d11], e3++;
              }
            }
          };
          return e2(a11), d10;
        }(a10, b11) }, flatten: { value: (b11) => function(a11, b12 = (a12) => a12.message) {
          let c10 = {}, d10 = [];
          for (let e2 of a11.issues) e2.path.length > 0 ? (c10[e2.path[0]] = c10[e2.path[0]] || [], c10[e2.path[0]].push(b12(e2))) : d10.push(b12(e2));
          return { formErrors: d10, fieldErrors: c10 };
        }(a10, b11) }, addIssue: { value: (b11) => {
          a10.issues.push(b11), a10.message = JSON.stringify(a10.issues, bY, 2);
        } }, addIssues: { value: (b11) => {
          a10.issues.push(...b11), a10.message = JSON.stringify(a10.issues, bY, 2);
        } }, isEmpty: { get: () => 0 === a10.issues.length } });
      };
      bt("ZodError", dL);
      let dM = bt("ZodError", dL, { Parent: Error }), dN = cx(dM), dO = cy(dM), dP = cz(dM), dQ = cB(dM), dR = (a10, b10, c10) => {
        let d10 = c10 ? Object.assign(c10, { direction: "backward" }) : { direction: "backward" };
        return cx(dM)(a10, b10, d10);
      }, dS = (a10, b10, c10) => cx(dM)(a10, b10, c10), dT = async (a10, b10, c10) => {
        let d10 = c10 ? Object.assign(c10, { direction: "backward" }) : { direction: "backward" };
        return cy(dM)(a10, b10, d10);
      }, dU = async (a10, b10, c10) => cy(dM)(a10, b10, c10), dV = (a10, b10, c10) => {
        let d10 = c10 ? Object.assign(c10, { direction: "backward" }) : { direction: "backward" };
        return cz(dM)(a10, b10, d10);
      }, dW = (a10, b10, c10) => cz(dM)(a10, b10, c10), dX = async (a10, b10, c10) => {
        let d10 = c10 ? Object.assign(c10, { direction: "backward" }) : { direction: "backward" };
        return cB(dM)(a10, b10, d10);
      }, dY = async (a10, b10, c10) => cB(dM)(a10, b10, c10), dZ = bt("ZodType", (a10, b10) => (cE.init(a10, b10), a10.def = b10, a10.type = b10.type, Object.defineProperty(a10, "_def", { value: b10 }), a10.check = (...c10) => a10.clone({ ...b10, checks: [...b10.checks ?? [], ...c10.map((a11) => "function" == typeof a11 ? { _zod: { check: a11, def: { check: "custom" }, onattach: [] } } : a11)] }), a10.clone = (b11, c10) => function(a11, b12, c11) {
        let d10 = new a11._zod.constr(b12 ?? a11._zod.def);
        return (!b12 || c11?.parent) && (d10._zod.parent = a11), d10;
      }(a10, b11, c10), a10.brand = () => a10, a10.register = (b11, c10) => (b11.add(a10, c10), a10), a10.parse = (b11, c10) => dN(a10, b11, c10, { callee: a10.parse }), a10.safeParse = (b11, c10) => dP(a10, b11, c10), a10.parseAsync = async (b11, c10) => dO(a10, b11, c10, { callee: a10.parseAsync }), a10.safeParseAsync = async (b11, c10) => dQ(a10, b11, c10), a10.spa = a10.safeParseAsync, a10.encode = (b11, c10) => dR(a10, b11, c10), a10.decode = (b11, c10) => dS(a10, b11, c10), a10.encodeAsync = async (b11, c10) => dT(a10, b11, c10), a10.decodeAsync = async (b11, c10) => dU(a10, b11, c10), a10.safeEncode = (b11, c10) => dV(a10, b11, c10), a10.safeDecode = (b11, c10) => dW(a10, b11, c10), a10.safeEncodeAsync = async (b11, c10) => dX(a10, b11, c10), a10.safeDecodeAsync = async (b11, c10) => dY(a10, b11, c10), a10.refine = (b11, c10) => a10.check(function(a11, b12 = {}) {
        return new eG({ type: "custom", check: "custom", fn: a11, ...b6(b12) });
      }(b11, c10)), a10.superRefine = (b11) => a10.check(function(a11) {
        let b12 = function(a12, b13) {
          let c10 = new cd({ check: "custom", ...b6(void 0) });
          return c10._zod.check = a12, c10;
        }((c10) => (c10.addIssue = (a12) => {
          "string" == typeof a12 ? c10.issues.push(cc(a12, c10.value, b12._zod.def)) : (a12.fatal && (a12.continue = false), a12.code ?? (a12.code = "custom"), a12.input ?? (a12.input = c10.value), a12.inst ?? (a12.inst = b12), a12.continue ?? (a12.continue = !b12._zod.def.abort), c10.issues.push(cc(a12)));
        }, a11(c10.value, c10)));
        return b12;
      }(b11)), a10.overwrite = (b11) => a10.check(dG(b11)), a10.optional = () => ew(a10), a10.nullable = () => ey(a10), a10.nullish = () => ew(ey(a10)), a10.nonoptional = (b11) => new eB({ type: "nonoptional", innerType: a10, ...b6(b11) }), a10.array = () => function(a11, b11) {
        return new eq({ type: "array", element: a11, ...b6(void 0) });
      }(a10), a10.or = (b11) => new er({ type: "union", options: [a10, b11], ...b6(void 0) }), a10.and = (b11) => new es({ type: "intersection", left: a10, right: b11 }), a10.transform = (b11) => eE(a10, new eu({ type: "transform", transform: b11 })), a10.default = (b11) => function(a11, b12) {
        return new ez({ type: "default", innerType: a11, get defaultValue() {
          return "function" == typeof b12 ? b12() : b3(b12);
        } });
      }(a10, b11), a10.prefault = (b11) => function(a11, b12) {
        return new eA({ type: "prefault", innerType: a11, get defaultValue() {
          return "function" == typeof b12 ? b12() : b3(b12);
        } });
      }(a10, b11), a10.catch = (b11) => function(a11, b12) {
        return new eC({ type: "catch", innerType: a11, catchValue: "function" == typeof b12 ? b12 : () => b12 });
      }(a10, b11), a10.pipe = (b11) => eE(a10, b11), a10.readonly = () => new eF({ type: "readonly", innerType: a10 }), a10.describe = (b11) => {
        let c10 = a10.clone();
        return dw.add(c10, { description: b11 }), c10;
      }, Object.defineProperty(a10, "description", { get: () => dw.get(a10)?.description, configurable: true }), a10.meta = (...b11) => {
        if (0 === b11.length) return dw.get(a10);
        let c10 = a10.clone();
        return dw.add(c10, b11[0]), c10;
      }, a10.isOptional = () => a10.safeParse(void 0).success, a10.isNullable = () => a10.safeParse(null).success, a10)), d$ = bt("_ZodString", (a10, b10) => {
        cF.init(a10, b10), dZ.init(a10, b10);
        let c10 = a10._zod.bag;
        a10.format = c10.format ?? null, a10.minLength = c10.minimum ?? null, a10.maxLength = c10.maximum ?? null, a10.regex = (...b11) => a10.check(function(a11, b12) {
          return new cn({ check: "string_format", format: "regex", ...b6(b12), pattern: a11 });
        }(...b11)), a10.includes = (...b11) => a10.check(function(a11, b12) {
          return new cq({ check: "string_format", format: "includes", ...b6(b12), includes: a11 });
        }(...b11)), a10.startsWith = (...b11) => a10.check(function(a11, b12) {
          return new cr({ check: "string_format", format: "starts_with", ...b6(b12), prefix: a11 });
        }(...b11)), a10.endsWith = (...b11) => a10.check(function(a11, b12) {
          return new cs({ check: "string_format", format: "ends_with", ...b6(b12), suffix: a11 });
        }(...b11)), a10.min = (...b11) => a10.check(dE(...b11)), a10.max = (...b11) => a10.check(dD(...b11)), a10.length = (...b11) => a10.check(dF(...b11)), a10.nonempty = (...b11) => a10.check(dE(1, ...b11)), a10.lowercase = (b11) => a10.check(new co({ check: "string_format", format: "lowercase", ...b6(b11) })), a10.uppercase = (b11) => a10.check(new cp({ check: "string_format", format: "uppercase", ...b6(b11) })), a10.trim = () => a10.check(dG((a11) => a11.trim())), a10.normalize = (...b11) => a10.check(function(a11) {
          return dG((b12) => b12.normalize(a11));
        }(...b11)), a10.toLowerCase = () => a10.check(dG((a11) => a11.toLowerCase())), a10.toUpperCase = () => a10.check(dG((a11) => a11.toUpperCase()));
      }), d_ = bt("ZodString", (a10, b10) => {
        cF.init(a10, b10), d$.init(a10, b10), a10.email = (b11) => a10.check(new d2({ type: "string", format: "email", check: "string_format", abort: false, ...b6(b11) })), a10.url = (b11) => a10.check(new d5({ type: "string", format: "url", check: "string_format", abort: false, ...b6(b11) })), a10.jwt = (b11) => a10.check(new ek({ type: "string", format: "jwt", check: "string_format", abort: false, ...b6(b11) })), a10.emoji = (b11) => a10.check(new d6({ type: "string", format: "emoji", check: "string_format", abort: false, ...b6(b11) })), a10.guid = (b11) => a10.check(dx(d3, b11)), a10.uuid = (b11) => a10.check(new d4({ type: "string", format: "uuid", check: "string_format", abort: false, ...b6(b11) })), a10.uuidv4 = (b11) => a10.check(new d4({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v4", ...b6(b11) })), a10.uuidv6 = (b11) => a10.check(new d4({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v6", ...b6(b11) })), a10.uuidv7 = (b11) => a10.check(new d4({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v7", ...b6(b11) })), a10.nanoid = (b11) => a10.check(new d7({ type: "string", format: "nanoid", check: "string_format", abort: false, ...b6(b11) })), a10.guid = (b11) => a10.check(dx(d3, b11)), a10.cuid = (b11) => a10.check(new d8({ type: "string", format: "cuid", check: "string_format", abort: false, ...b6(b11) })), a10.cuid2 = (b11) => a10.check(new d9({ type: "string", format: "cuid2", check: "string_format", abort: false, ...b6(b11) })), a10.ulid = (b11) => a10.check(new ea({ type: "string", format: "ulid", check: "string_format", abort: false, ...b6(b11) })), a10.base64 = (b11) => a10.check(new eh({ type: "string", format: "base64", check: "string_format", abort: false, ...b6(b11) })), a10.base64url = (b11) => a10.check(new ei({ type: "string", format: "base64url", check: "string_format", abort: false, ...b6(b11) })), a10.xid = (b11) => a10.check(new eb({ type: "string", format: "xid", check: "string_format", abort: false, ...b6(b11) })), a10.ksuid = (b11) => a10.check(new ec({ type: "string", format: "ksuid", check: "string_format", abort: false, ...b6(b11) })), a10.ipv4 = (b11) => a10.check(new ed({ type: "string", format: "ipv4", check: "string_format", abort: false, ...b6(b11) })), a10.ipv6 = (b11) => a10.check(new ee({ type: "string", format: "ipv6", check: "string_format", abort: false, ...b6(b11) })), a10.cidrv4 = (b11) => a10.check(new ef({ type: "string", format: "cidrv4", check: "string_format", abort: false, ...b6(b11) })), a10.cidrv6 = (b11) => a10.check(new eg({ type: "string", format: "cidrv6", check: "string_format", abort: false, ...b6(b11) })), a10.e164 = (b11) => a10.check(new ej({ type: "string", format: "e164", check: "string_format", abort: false, ...b6(b11) })), a10.datetime = (b11) => a10.check(new dH({ type: "string", format: "datetime", check: "string_format", offset: false, local: false, precision: null, ...b6(b11) })), a10.date = (b11) => a10.check(new dI({ type: "string", format: "date", check: "string_format", ...b6(b11) })), a10.time = (b11) => a10.check(new dJ({ type: "string", format: "time", check: "string_format", precision: null, ...b6(b11) })), a10.duration = (b11) => a10.check(new dK({ type: "string", format: "duration", check: "string_format", ...b6(b11) }));
      });
      function d0(a10) {
        return new d_({ type: "string", ...b6(a10) });
      }
      let d1 = bt("ZodStringFormat", (a10, b10) => {
        cG.init(a10, b10), d$.init(a10, b10);
      }), d2 = bt("ZodEmail", (a10, b10) => {
        cJ.init(a10, b10), d1.init(a10, b10);
      }), d3 = bt("ZodGUID", (a10, b10) => {
        cH.init(a10, b10), d1.init(a10, b10);
      }), d4 = bt("ZodUUID", (a10, b10) => {
        cI.init(a10, b10), d1.init(a10, b10);
      }), d5 = bt("ZodURL", (a10, b10) => {
        cK.init(a10, b10), d1.init(a10, b10);
      }), d6 = bt("ZodEmoji", (a10, b10) => {
        cL.init(a10, b10), d1.init(a10, b10);
      }), d7 = bt("ZodNanoID", (a10, b10) => {
        cM.init(a10, b10), d1.init(a10, b10);
      }), d8 = bt("ZodCUID", (a10, b10) => {
        cN.init(a10, b10), d1.init(a10, b10);
      }), d9 = bt("ZodCUID2", (a10, b10) => {
        cO.init(a10, b10), d1.init(a10, b10);
      }), ea = bt("ZodULID", (a10, b10) => {
        cP.init(a10, b10), d1.init(a10, b10);
      }), eb = bt("ZodXID", (a10, b10) => {
        cQ.init(a10, b10), d1.init(a10, b10);
      }), ec = bt("ZodKSUID", (a10, b10) => {
        cR.init(a10, b10), d1.init(a10, b10);
      }), ed = bt("ZodIPv4", (a10, b10) => {
        cW.init(a10, b10), d1.init(a10, b10);
      }), ee = bt("ZodIPv6", (a10, b10) => {
        cX.init(a10, b10), d1.init(a10, b10);
      }), ef = bt("ZodCIDRv4", (a10, b10) => {
        cY.init(a10, b10), d1.init(a10, b10);
      }), eg = bt("ZodCIDRv6", (a10, b10) => {
        cZ.init(a10, b10), d1.init(a10, b10);
      }), eh = bt("ZodBase64", (a10, b10) => {
        c_.init(a10, b10), d1.init(a10, b10);
      }), ei = bt("ZodBase64URL", (a10, b10) => {
        c0.init(a10, b10), d1.init(a10, b10);
      }), ej = bt("ZodE164", (a10, b10) => {
        c1.init(a10, b10), d1.init(a10, b10);
      }), ek = bt("ZodJWT", (a10, b10) => {
        c2.init(a10, b10), d1.init(a10, b10);
      }), el = bt("ZodNumber", (a10, b10) => {
        c3.init(a10, b10), dZ.init(a10, b10), a10.gt = (b11, c11) => a10.check(dA(b11, c11)), a10.gte = (b11, c11) => a10.check(dB(b11, c11)), a10.min = (b11, c11) => a10.check(dB(b11, c11)), a10.lt = (b11, c11) => a10.check(dy(b11, c11)), a10.lte = (b11, c11) => a10.check(dz(b11, c11)), a10.max = (b11, c11) => a10.check(dz(b11, c11)), a10.int = (b11) => a10.check(en(b11)), a10.safe = (b11) => a10.check(en(b11)), a10.positive = (b11) => a10.check(dA(0, b11)), a10.nonnegative = (b11) => a10.check(dB(0, b11)), a10.negative = (b11) => a10.check(dy(0, b11)), a10.nonpositive = (b11) => a10.check(dz(0, b11)), a10.multipleOf = (b11, c11) => a10.check(dC(b11, c11)), a10.step = (b11, c11) => a10.check(dC(b11, c11)), a10.finite = () => a10;
        let c10 = a10._zod.bag;
        a10.minValue = Math.max(c10.minimum ?? -1 / 0, c10.exclusiveMinimum ?? -1 / 0) ?? null, a10.maxValue = Math.min(c10.maximum ?? 1 / 0, c10.exclusiveMaximum ?? 1 / 0) ?? null, a10.isInt = (c10.format ?? "").includes("int") || Number.isSafeInteger(c10.multipleOf ?? 0.5), a10.isFinite = true, a10.format = c10.format ?? null;
      }), em = bt("ZodNumberFormat", (a10, b10) => {
        c4.init(a10, b10), el.init(a10, b10);
      });
      function en(a10) {
        return new em({ type: "number", check: "number_format", abort: false, format: "safeint", ...b6(a10) });
      }
      let eo = bt("ZodBoolean", (a10, b10) => {
        c5.init(a10, b10), dZ.init(a10, b10);
      }), ep = bt("ZodAny", (a10, b10) => {
        c6.init(a10, b10), dZ.init(a10, b10);
      }), eq = bt("ZodArray", (a10, b10) => {
        c8.init(a10, b10), dZ.init(a10, b10), a10.element = b10.element, a10.min = (b11, c10) => a10.check(dE(b11, c10)), a10.nonempty = (b11) => a10.check(dE(1, b11)), a10.max = (b11, c10) => a10.check(dD(b11, c10)), a10.length = (b11, c10) => a10.check(dF(b11, c10)), a10.unwrap = () => a10.element;
      }), er = bt("ZodUnion", (a10, b10) => {
        da.init(a10, b10), dZ.init(a10, b10), a10.options = b10.options;
      }), es = bt("ZodIntersection", (a10, b10) => {
        db.init(a10, b10), dZ.init(a10, b10);
      }), et = bt("ZodEnum", (a10, b10) => {
        dd.init(a10, b10), dZ.init(a10, b10), a10.enum = b10.entries, a10.options = Object.values(b10.entries);
        let c10 = new Set(Object.keys(b10.entries));
        a10.extract = (a11, d10) => {
          let e2 = {};
          for (let d11 of a11) if (c10.has(d11)) e2[d11] = b10.entries[d11];
          else throw Error(`Key ${d11} not found in enum`);
          return new et({ ...b10, checks: [], ...b6(d10), entries: e2 });
        }, a10.exclude = (a11, d10) => {
          let e2 = { ...b10.entries };
          for (let b11 of a11) if (c10.has(b11)) delete e2[b11];
          else throw Error(`Key ${b11} not found in enum`);
          return new et({ ...b10, checks: [], ...b6(d10), entries: e2 });
        };
      }), eu = bt("ZodTransform", (a10, b10) => {
        de.init(a10, b10), dZ.init(a10, b10), a10._zod.parse = (c10, d10) => {
          if ("backward" === d10.direction) throw new bv(a10.constructor.name);
          c10.addIssue = (d11) => {
            "string" == typeof d11 ? c10.issues.push(cc(d11, c10.value, b10)) : (d11.fatal && (d11.continue = false), d11.code ?? (d11.code = "custom"), d11.input ?? (d11.input = c10.value), d11.inst ?? (d11.inst = a10), c10.issues.push(cc(d11)));
          };
          let e2 = b10.transform(c10.value, c10);
          return e2 instanceof Promise ? e2.then((a11) => (c10.value = a11, c10)) : (c10.value = e2, c10);
        };
      }), ev = bt("ZodOptional", (a10, b10) => {
        dg.init(a10, b10), dZ.init(a10, b10), a10.unwrap = () => a10._zod.def.innerType;
      });
      function ew(a10) {
        return new ev({ type: "optional", innerType: a10 });
      }
      let ex = bt("ZodNullable", (a10, b10) => {
        dh.init(a10, b10), dZ.init(a10, b10), a10.unwrap = () => a10._zod.def.innerType;
      });
      function ey(a10) {
        return new ex({ type: "nullable", innerType: a10 });
      }
      let ez = bt("ZodDefault", (a10, b10) => {
        di.init(a10, b10), dZ.init(a10, b10), a10.unwrap = () => a10._zod.def.innerType, a10.removeDefault = a10.unwrap;
      }), eA = bt("ZodPrefault", (a10, b10) => {
        dk.init(a10, b10), dZ.init(a10, b10), a10.unwrap = () => a10._zod.def.innerType;
      }), eB = bt("ZodNonOptional", (a10, b10) => {
        dl.init(a10, b10), dZ.init(a10, b10), a10.unwrap = () => a10._zod.def.innerType;
      }), eC = bt("ZodCatch", (a10, b10) => {
        dn.init(a10, b10), dZ.init(a10, b10), a10.unwrap = () => a10._zod.def.innerType, a10.removeCatch = a10.unwrap;
      }), eD = bt("ZodPipe", (a10, b10) => {
        dp.init(a10, b10), dZ.init(a10, b10), a10.in = b10.in, a10.out = b10.out;
      });
      function eE(a10, b10) {
        return new eD({ type: "pipe", in: a10, out: b10 });
      }
      let eF = bt("ZodReadonly", (a10, b10) => {
        dr.init(a10, b10), dZ.init(a10, b10), a10.unwrap = () => a10._zod.def.innerType;
      }), eG = bt("ZodCustom", (a10, b10) => {
        dt.init(a10, b10), dZ.init(a10, b10);
      });
      function eH(a10) {
        return new el({ type: "number", coerce: true, checks: [], ...b6(a10) });
      }
      let eI = function(a10) {
        let b10 = "object" == typeof a10.client ? a10.client : {}, c10 = "object" == typeof a10.server ? a10.server : {}, d10 = a10.shared, e2 = a10.runtimeEnv ? a10.runtimeEnv : { ...process.env, ...a10.experimental__runtimeEnv };
        return function(a11) {
          let b11 = a11.runtimeEnvStrict ?? a11.runtimeEnv ?? process.env;
          if (a11.emptyStringAsUndefined) for (let [a12, c12] of Object.entries(b11)) "" === c12 && delete b11[a12];
          if (a11.skipValidation) return b11;
          let c11 = "object" == typeof a11.client ? a11.client : {}, d11 = "object" == typeof a11.server ? a11.server : {}, e3 = "object" == typeof a11.shared ? a11.shared : {}, f2 = a11.isServer ?? ("undefined" == typeof window || "Deno" in window), g2 = f2 ? { ...d11, ...e3, ...c11 } : { ...c11, ...e3 }, h2 = a11.createFinalSchema?.(g2, f2)["~standard"].validate(b11) ?? function(a12, b12) {
            let c12 = {}, d12 = [];
            for (let e4 in a12) {
              let f3 = a12[e4]["~standard"].validate(b12[e4]);
              if (bs(f3, `Validation must be synchronous, but ${e4} returned a Promise.`), f3.issues) {
                d12.push(...f3.issues.map((a13) => ({ ...a13, message: a13.message, path: [e4, ...a13.path ?? []] })));
                continue;
              }
              c12[e4] = f3.value;
            }
            return d12.length ? { issues: d12 } : { value: c12 };
          }(g2, b11);
          bs(h2, "Validation must be synchronous");
          let i2 = a11.onValidationError ?? ((a12) => {
            throw console.error("\u274C Invalid environment variables:", a12), Error("Invalid environment variables");
          }), j2 = a11.onInvalidAccess ?? (() => {
            throw Error("\u274C Attempted to access a server-side environment variable on the client");
          });
          return h2.issues ? i2(h2.issues) : new Proxy(Object.assign((a11.extends ?? []).reduce((a12, b12) => Object.assign(a12, b12), {}), h2.value), { get(b12, c12) {
            if ("string" == typeof c12 && "__esModule" !== c12 && "$$typeof" !== c12) return f2 || a11.clientPrefix && (c12.startsWith(a11.clientPrefix) || c12 in e3) ? Reflect.get(b12, c12) : j2(c12);
          } });
        }({ ...a10, shared: d10, client: b10, server: c10, clientPrefix: "NEXT_PUBLIC_", runtimeEnv: e2 });
      }({ server: { CLOUDFLARE_ACCOUNT_ID: d0().optional(), CLOUDFLARE_API_TOKEN: d0().optional(), DB: new ep({ type: "any" }).optional(), WORKOS_API_KEY: d0().optional(), WORKOS_CLIENT_ID: d0().optional(), WORKOS_REDIRECT_URI: d0().url().optional(), WORKER_SESSION_SECRET: d0().min(32).optional(), DATABASE_URL: d0().url().optional(), NODE_ENV: function(a10, b10) {
        return new et({ type: "enum", entries: Array.isArray(a10) ? Object.fromEntries(a10.map((a11) => [a11, a11])) : a10, ...b6(void 0) });
      }(["development", "test", "production"]).default("development"), VERCEL_AI_GATEWAY_API_KEY: d0().optional(), AI_GATEWAY_API_KEY: d0().optional(), AI_GATEWAY_MODEL: d0().default("xai/grok-3-mini"), AI_GATEWAY_PROMPT: d0().default("Tell me a short, funny programming or tech joke. Keep it clean and under 100 words."), AI_GATEWAY_JOKE_MEMORY_NUMBER: eH().default(3), AI_GATEWAY_MODEL_HEALTH: d0().default("xai/grok-3-mini"), AI_DEBRIEF_MODEL: d0().default("xai/grok-3-mini"), AI_DEBRIEF_TEMPERATURE: eH().min(0).max(2).default(0.7), WHOOP_CLIENT_ID: d0().optional(), WHOOP_CLIENT_SECRET: d0().optional(), WHOOP_REDIRECT_URI: d0().url().optional(), WHOOP_SYNC_RATE_LIMIT_PER_HOUR: eH().default(10), WHOOP_WEBHOOK_SECRET: d0().optional(), RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: eH().default(100), RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: eH().default(200), RATE_LIMIT_API_CALLS_PER_MINUTE: eH().default(60), RATE_LIMIT_ENABLED: new eo({ type: "boolean", coerce: true, ...b6(void 0) }).default(true), ENCRYPTION_MASTER_KEY: d0().min(32).optional() }, client: { NEXT_PUBLIC_SITE_URL: d0().url().default("http://localhost:3000"), NEXT_PUBLIC_POSTHOG_KEY: d0().default("phc_test_dummy"), NEXT_PUBLIC_POSTHOG_HOST: d0().url().default("https://us.i.posthog.com") }, runtimeEnv: { CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN, DB: process.env.DB, WORKOS_API_KEY: process.env.WORKOS_API_KEY, WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID, WORKOS_REDIRECT_URI: process.env.WORKOS_REDIRECT_URI, WORKER_SESSION_SECRET: process.env.WORKER_SESSION_SECRET, NEXT_PUBLIC_SITE_URL: "http://localhost:8787", NEXT_PUBLIC_POSTHOG_KEY: "phc_22bpojwvy9Gh9xx6cfDD0utukztzX6mbpkmQAN4tzQ2", NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com", DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: "production", VERCEL_AI_GATEWAY_API_KEY: process.env.VERCEL_AI_GATEWAY_API_KEY, AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY, AI_GATEWAY_MODEL: process.env.AI_GATEWAY_MODEL, AI_GATEWAY_PROMPT: process.env.AI_GATEWAY_PROMPT, AI_GATEWAY_JOKE_MEMORY_NUMBER: process.env.AI_GATEWAY_JOKE_MEMORY_NUMBER, AI_GATEWAY_MODEL_HEALTH: process.env.AI_GATEWAY_MODEL_HEALTH, AI_DEBRIEF_MODEL: process.env.AI_DEBRIEF_MODEL, AI_DEBRIEF_TEMPERATURE: process.env.AI_DEBRIEF_TEMPERATURE, WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET, WHOOP_REDIRECT_URI: process.env.WHOOP_REDIRECT_URI, WHOOP_SYNC_RATE_LIMIT_PER_HOUR: process.env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR, WHOOP_WEBHOOK_SECRET: process.env.WHOOP_WEBHOOK_SECRET, RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR, RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR, RATE_LIMIT_API_CALLS_PER_MINUTE: process.env.RATE_LIMIT_API_CALLS_PER_MINUTE, RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED, ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY }, skipValidation: "preview" === process.env.VERCEL_ENV, emptyStringAsUndefined: true }), eJ = "workos_session", eK = "production" === eI.NODE_ENV;
      async function eL(a10) {
        let b10 = function() {
          let a11 = eI.WORKER_SESSION_SECRET;
          if (!a11 || a11.length < 32) throw Error("WORKER_SESSION_SECRET must be at least 32 characters long");
          return a11;
        }(), c10 = new TextEncoder(), d10 = await crypto.subtle.importKey("raw", c10.encode(b10), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", d10, c10.encode(a10)))).map((a11) => a11.toString(16).padStart(2, "0")).join("");
      }
      async function eM(a10, b10) {
        return await eL(a10) === b10;
      }
      class eN {
        static async create(a10) {
          let b10 = JSON.stringify({ ...a10, refreshToken: a10.refreshToken ?? null }), c10 = await eL(b10), d10 = `${b10}.${c10}`;
          return [`${eJ}=${encodeURIComponent(d10)}`, "Max-Age=2592000", "Path=/", "HttpOnly", eK ? "Secure" : "", "SameSite=lax"].filter(Boolean).join("; ");
        }
        static async get(a10) {
          let b10 = a10.headers.get("cookie");
          if (!b10) return null;
          let c10 = this.extractCookieValue(b10, eJ);
          if (!c10) return null;
          try {
            let a11 = decodeURIComponent(c10), b11 = a11.lastIndexOf(".");
            if (b11 <= 0 || b11 === a11.length - 1) return null;
            let d10 = a11.slice(0, b11), e2 = a11.slice(b11 + 1);
            if (!await eM(d10, e2)) return null;
            try {
              let a12 = JSON.parse(d10);
              if (!a12.userId || !a12.accessToken || !a12.expiresAt) throw Error("Invalid session data");
              let b12 = void 0 === a12.refreshToken ? null : a12.refreshToken;
              return { ...a12, refreshToken: b12 };
            } catch (a12) {
              throw Error("Invalid session data format");
            }
          } catch (a11) {
            return null;
          }
        }
        static destroy() {
          return [`${eJ}=`, "Max-Age=0", "Path=/", "HttpOnly", eK ? "Secure" : "", "SameSite=lax"].filter(Boolean).join("; ");
        }
        static extractCookieValue(a10, b10) {
          for (let c10 of a10.split(";").map((a11) => a11.trim())) if (c10.startsWith(`${b10}=`)) return c10.substring(`${b10}=`.length);
          return null;
        }
        static async hasSession(a10) {
          return null !== await this.get(a10);
        }
        static isExpired(a10) {
          let b10 = Math.floor(Date.now() / 1e3);
          return a10.expiresAt <= b10;
        }
      }
      var eO = c(2219);
      let eP = null;
      async function eQ(a10) {
        let b10 = await eN.get(a10);
        if (/^\/workout|^\/templates|^\/workouts/.exec(a10.nextUrl.pathname)) {
          if (!b10) {
            let b11 = new URL("/auth/login", a10.url);
            return b11.searchParams.set("redirectTo", a10.nextUrl.pathname), S.redirect(b11);
          }
          let c10 = Math.floor(Date.now() / 1e3), d10 = b10.expiresAt <= c10, e2 = b10.expiresAt <= c10 + 300;
          if (d10 || e2) {
            if (!b10.refreshToken) {
              let b11 = new URL("/auth/login", a10.url);
              b11.searchParams.set("redirectTo", a10.nextUrl.pathname);
              let c11 = S.redirect(b11);
              return c11.headers.set("Set-Cookie", eN.destroy()), c11;
            }
            try {
              let a11 = function() {
                if (!eP) {
                  if (!eI.WORKOS_API_KEY) throw Error("WORKOS_API_KEY is required but not provided");
                  if (!eI.WORKOS_CLIENT_ID) throw Error("WORKOS_CLIENT_ID is required but not provided");
                  eP = new eO.WorkOS(eI.WORKOS_API_KEY);
                }
                return eP;
              }(), c11 = await a11.userManagement.authenticateWithRefreshToken({ refreshToken: b10.refreshToken, clientId: eI.WORKOS_CLIENT_ID }), d11 = Math.floor(Date.now() / 1e3) + 3600, e3 = { userId: c11.user.id, organizationId: c11.organizationId, accessToken: c11.accessToken, refreshToken: c11.refreshToken ?? null, expiresAt: d11 }, f2 = S.next();
              return f2.headers.set("Set-Cookie", await eN.create(e3)), f2;
            } catch (d11) {
              console.error("Failed to refresh WorkOS session:", d11);
              let b11 = new URL("/auth/login", a10.url);
              b11.searchParams.set("redirectTo", a10.nextUrl.pathname);
              let c11 = S.redirect(b11);
              return c11.headers.set("Set-Cookie", eN.destroy()), c11;
            }
          }
        }
        return S.next();
      }
      let eR = { matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"] };
      Object.values({ NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHORIZED: 401 });
      let eS = { ...f }, eT = eS.middleware || eS.default, eU = "/src/middleware";
      if ("function" != typeof eT) throw Object.defineProperty(Error(`The Middleware "${eU}" must export a \`middleware\` or a \`default\` function`), "__NEXT_ERROR_CODE", { value: "E120", enumerable: false, configurable: true });
      function eV(a10) {
        return bf({ ...a10, page: eU, handler: async (...a11) => {
          try {
            return await eT(...a11);
          } catch (e2) {
            let b10 = a11[0], c10 = new URL(b10.url), d10 = c10.pathname + c10.search;
            throw await j(e2, { path: d10, method: b10.method, headers: Object.fromEntries(b10.headers.entries()) }, { routerKind: "Pages Router", routePath: "/middleware", routeType: "middleware", revalidateReason: void 0 }), e2;
          }
        } });
      }
    }, 2506: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i2(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i2(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i2(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i2((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Vault = void 0;
      let e = c(8142), f = c(1634), g = c(8526), h = c(1758);
      class i {
        constructor(a2) {
          this.workos = a2, this.createSecret = this.createObject, this.listSecrets = this.listObjects, this.listSecretVersions = this.listObjectVersions, this.readSecret = this.readObject, this.describeSecret = this.describeObject, this.updateSecret = this.updateObject, this.deleteSecret = this.deleteObject, this.cryptoProvider = a2.getCryptoProvider();
        }
        decode(a2) {
          let b2 = (0, f.base64ToUint8Array)(a2), c2 = new Uint8Array(b2.subarray(0, 12)), d2 = new Uint8Array(b2.subarray(12, 28)), { value: g2, nextIndex: h2 } = (0, e.decodeUInt32)(b2, 28), i2 = b2.subarray(h2, h2 + g2);
          return { iv: c2, tag: d2, keys: (0, f.uint8ArrayToBase64)(i2), ciphertext: new Uint8Array(b2.subarray(h2 + g2)) };
        }
        createObject(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/vault/v1/kv", (0, h.serializeCreateObjectEntity)(a2));
            return (0, h.deserializeObjectMetadata)(b2);
          });
        }
        listObjects(a2) {
          return d(this, void 0, void 0, function* () {
            let b2 = new URL("/vault/v1/kv", this.workos.baseURL);
            (null == a2 ? void 0 : a2.after) && b2.searchParams.set("after", a2.after), (null == a2 ? void 0 : a2.limit) && b2.searchParams.set("limit", a2.limit.toString());
            let { data: c2 } = yield this.workos.get(b2.toString());
            return (0, h.deserializeListObjects)(c2);
          });
        }
        listObjectVersions(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/vault/v1/kv/${encodeURIComponent(a2.id)}/versions`);
            return (0, h.desrializeListObjectVersions)(b2);
          });
        }
        readObject(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/vault/v1/kv/${encodeURIComponent(a2.id)}`);
            return (0, h.deserializeObject)(b2);
          });
        }
        describeObject(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/vault/v1/kv/${encodeURIComponent(a2.id)}/metadata`);
            return (0, h.deserializeObject)(b2);
          });
        }
        updateObject(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.put(`/vault/v1/kv/${encodeURIComponent(a2.id)}`, (0, h.serializeUpdateObjectEntity)(a2));
            return (0, h.deserializeObject)(b2);
          });
        }
        deleteObject(a2) {
          return d(this, void 0, void 0, function* () {
            return this.workos.delete(`/vault/v1/kv/${encodeURIComponent(a2.id)}`);
          });
        }
        createDataKey(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/vault/v1/keys/data-key", a2);
            return (0, g.deserializeCreateDataKeyResponse)(b2);
          });
        }
        decryptDataKey(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/vault/v1/keys/decrypt", a2);
            return (0, g.deserializeDecryptDataKeyResponse)(b2);
          });
        }
        encrypt(a2, b2, c2) {
          return d(this, void 0, void 0, function* () {
            let d2 = yield this.createDataKey({ context: b2 }), g2 = new TextEncoder(), h2 = (0, f.base64ToUint8Array)(d2.dataKey.key), i2 = (0, f.base64ToUint8Array)(d2.encryptedKeys), j = (0, e.encodeUInt32)(i2.length), k = c2 ? g2.encode(c2) : void 0, l = this.cryptoProvider.randomBytes(12), { ciphertext: m, iv: n, tag: o } = yield this.cryptoProvider.encrypt(g2.encode(a2), h2, l, k), p = new Uint8Array(n.length + o.length + j.length + i2.length + m.length), q = 0;
            return p.set(n, q), q += n.length, p.set(o, q), q += o.length, p.set(new Uint8Array(j), q), q += j.length, p.set(i2, q), q += i2.length, p.set(m, q), (0, f.uint8ArrayToBase64)(p);
          });
        }
        decrypt(a2, b2) {
          return d(this, void 0, void 0, function* () {
            let c2 = this.decode(a2), d2 = yield this.decryptDataKey({ keys: c2.keys }), e2 = (0, f.base64ToUint8Array)(d2.key), g2 = new TextEncoder(), h2 = b2 ? g2.encode(b2) : void 0, i2 = yield this.cryptoProvider.decrypt(c2.ciphertext, e2, c2.iv, c2.tag, h2);
            return new TextDecoder().decode(i2);
          });
        }
      }
      b.Vault = i;
    }, 2510: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2552: (a) => {
      "use strict";
      a.exports = Object.getOwnPropertyDescriptor;
    }, 2605: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2634: () => {
    }, 2661: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2712: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListSessionsOptions = void 0, b.serializeListSessionsOptions = (a2) => Object.assign({}, a2);
    }, 2723: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreateOrganizationOptions = void 0, b.serializeCreateOrganizationOptions = (a2) => ({ name: a2.name, allow_profiles_outside_organization: a2.allowProfilesOutsideOrganization, domain_data: a2.domainData, domains: a2.domains, external_id: a2.externalId, metadata: a2.metadata });
    }, 2766: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2783: (a) => {
      "use strict";
      a.exports = Math.max;
    }, 2789: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2813: (a) => {
      "use strict";
      a.exports = Math.min;
    }, 2817: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeOrganizationDomain = void 0, b.deserializeOrganizationDomain = (a2) => ({ object: a2.object, id: a2.id, domain: a2.domain, organizationId: a2.organization_id, state: a2.state, verificationToken: a2.verification_token, verificationStrategy: a2.verification_strategy, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 2827: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.GeneratePortalLinkIntent = void 0;
      var d = c(2416);
      Object.defineProperty(b, "GeneratePortalLinkIntent", { enumerable: true, get: function() {
        return d.GeneratePortalLinkIntent;
      } });
    }, 2835: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 2849: (a) => {
      "use strict";
      a.exports = Function.prototype.apply;
    }, 2891: (a, b, c) => {
      "use strict";
      var d = c(5042), e = c(2849), f = c(6317);
      a.exports = c(2040) || d.call(f, e);
    }, 2897: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.FgaPaginatable = void 0;
      let d = c(6647);
      class e extends d.AutoPaginatable {
        constructor(a2, b2, c2) {
          super(a2, b2, c2);
        }
        get warnings() {
          return this.list.warnings;
        }
      }
      b.FgaPaginatable = e;
    }, 2949: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeTotpWithSecrets = b.deserializeTotp = void 0, b.deserializeTotp = (a2) => ({ issuer: a2.issuer, user: a2.user }), b.deserializeTotpWithSecrets = (a2) => ({ issuer: a2.issuer, user: a2.user, qrCode: a2.qr_code, secret: a2.secret, uri: a2.uri });
    }, 2964: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListDirectoriesOptions = void 0, b.serializeListDirectoriesOptions = (a2) => ({ organization_id: a2.organizationId, search: a2.search, limit: a2.limit, before: a2.before, after: a2.after, order: a2.order });
    }, 2972: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 3017: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(9599), b), e(c(9539), b), e(c(6347), b), e(c(4440), b), e(c(4892), b), e(c(9735), b), e(c(9194), b);
    }, 3051: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeWarrant = void 0, b.deserializeWarrant = (a2) => ({ resourceType: a2.resource_type, resourceId: a2.resource_id, relation: a2.relation, subject: { resourceType: a2.subject.resource_type, resourceId: a2.subject.resource_id, relation: a2.subject.relation }, policy: a2.policy });
    }, 3057: (a) => {
      "use strict";
      a.exports = Math.abs;
    }, 3080: (a, b, c) => {
      "use strict";
      var d = c(4228), e = c(9713), f = c(5456), g = c(4328), h = c(8728), i = d("%WeakMap%", true), j = e("WeakMap.prototype.get", true), k = e("WeakMap.prototype.set", true), l = e("WeakMap.prototype.has", true), m = e("WeakMap.prototype.delete", true);
      a.exports = i ? function() {
        var a2, b2, c2 = { assert: function(a3) {
          if (!c2.has(a3)) throw new h("Side channel does not contain " + f(a3));
        }, delete: function(c3) {
          if (i && c3 && ("object" == typeof c3 || "function" == typeof c3)) {
            if (a2) return m(a2, c3);
          } else if (g && b2) return b2.delete(c3);
          return false;
        }, get: function(c3) {
          return i && c3 && ("object" == typeof c3 || "function" == typeof c3) && a2 ? j(a2, c3) : b2 && b2.get(c3);
        }, has: function(c3) {
          return i && c3 && ("object" == typeof c3 || "function" == typeof c3) && a2 ? l(a2, c3) : !!b2 && b2.has(c3);
        }, set: function(c3, d2) {
          i && c3 && ("object" == typeof c3 || "function" == typeof c3) ? (a2 || (a2 = new i()), k(a2, c3, d2)) : g && (b2 || (b2 = g()), b2.set(c3, d2));
        } };
        return c2;
      } : g;
    }, 3149: (a) => {
      "use strict";
      a.exports = RangeError;
    }, 3154: (a, b, c) => {
      "use strict";
      var d = c(142);
      a.exports = function(a2) {
        return d(a2) || 0 === a2 ? a2 : a2 < 0 ? -1 : 1;
      };
    }, 3167: (a, b, c) => {
      "use strict";
      a.exports = c(5779).getPrototypeOf || null;
    }, 3210: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeUser = void 0, b.deserializeUser = (a2) => {
        var b2, c;
        return { object: a2.object, id: a2.id, email: a2.email, emailVerified: a2.email_verified, firstName: a2.first_name, profilePictureUrl: a2.profile_picture_url, lastName: a2.last_name, lastSignInAt: a2.last_sign_in_at, createdAt: a2.created_at, updatedAt: a2.updated_at, externalId: null != (b2 = a2.external_id) ? b2 : null, metadata: null != (c = a2.metadata) ? c : {} };
      };
    }, 3220: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(9641), b);
    }, 3222: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 3234: (a, b, c) => {
      "use strict";
      c.r(b), c.d(b, { DiagConsoleLogger: () => I, DiagLogLevel: () => d, INVALID_SPANID: () => al, INVALID_SPAN_CONTEXT: () => an, INVALID_TRACEID: () => am, ProxyTracer: () => aF, ProxyTracerProvider: () => aH, ROOT_CONTEXT: () => G, SamplingDecision: () => g, SpanKind: () => h, SpanStatusCode: () => i, TraceFlags: () => f, ValueType: () => e, baggageEntryMetadataFromString: () => E, context: () => aO, createContextKey: () => F, createNoopMeter: () => aa, createTraceState: () => aN, default: () => a2, defaultTextMapGetter: () => ab, defaultTextMapSetter: () => ac, diag: () => aP, isSpanContextValid: () => aA, isValidSpanId: () => az, isValidTraceId: () => ay, metrics: () => aS, propagation: () => a_, trace: () => a1 });
      var d, e, f, g, h, i, j = "object" == typeof globalThis ? globalThis : "object" == typeof self ? self : "object" == typeof window ? window : "object" == typeof c.g ? c.g : {}, k = "1.9.0", l = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/, m = function(a3) {
        var b2 = /* @__PURE__ */ new Set([a3]), c2 = /* @__PURE__ */ new Set(), d2 = a3.match(l);
        if (!d2) return function() {
          return false;
        };
        var e2 = { major: +d2[1], minor: +d2[2], patch: +d2[3], prerelease: d2[4] };
        if (null != e2.prerelease) return function(b3) {
          return b3 === a3;
        };
        function f2(a4) {
          return c2.add(a4), false;
        }
        return function(a4) {
          if (b2.has(a4)) return true;
          if (c2.has(a4)) return false;
          var d3 = a4.match(l);
          if (!d3) return f2(a4);
          var g2 = { major: +d3[1], minor: +d3[2], patch: +d3[3], prerelease: d3[4] };
          if (null != g2.prerelease || e2.major !== g2.major) return f2(a4);
          if (0 === e2.major) return e2.minor === g2.minor && e2.patch <= g2.patch ? (b2.add(a4), true) : f2(a4);
          return e2.minor <= g2.minor ? (b2.add(a4), true) : f2(a4);
        };
      }(k), n = Symbol.for("opentelemetry.js.api." + k.split(".")[0]);
      function o(a3, b2, c2, d2) {
        void 0 === d2 && (d2 = false);
        var e2, f2 = j[n] = null != (e2 = j[n]) ? e2 : { version: k };
        if (!d2 && f2[a3]) {
          var g2 = Error("@opentelemetry/api: Attempted duplicate registration of API: " + a3);
          return c2.error(g2.stack || g2.message), false;
        }
        if (f2.version !== k) {
          var g2 = Error("@opentelemetry/api: Registration of version v" + f2.version + " for " + a3 + " does not match previously registered API v" + k);
          return c2.error(g2.stack || g2.message), false;
        }
        return f2[a3] = b2, c2.debug("@opentelemetry/api: Registered a global for " + a3 + " v" + k + "."), true;
      }
      function p(a3) {
        var b2, c2, d2 = null == (b2 = j[n]) ? void 0 : b2.version;
        if (d2 && m(d2)) return null == (c2 = j[n]) ? void 0 : c2[a3];
      }
      function q(a3, b2) {
        b2.debug("@opentelemetry/api: Unregistering a global for " + a3 + " v" + k + ".");
        var c2 = j[n];
        c2 && delete c2[a3];
      }
      var r = function(a3, b2) {
        var c2 = "function" == typeof Symbol && a3[Symbol.iterator];
        if (!c2) return a3;
        var d2, e2, f2 = c2.call(a3), g2 = [];
        try {
          for (; (void 0 === b2 || b2-- > 0) && !(d2 = f2.next()).done; ) g2.push(d2.value);
        } catch (a4) {
          e2 = { error: a4 };
        } finally {
          try {
            d2 && !d2.done && (c2 = f2.return) && c2.call(f2);
          } finally {
            if (e2) throw e2.error;
          }
        }
        return g2;
      }, s = function(a3, b2, c2) {
        if (c2 || 2 == arguments.length) for (var d2, e2 = 0, f2 = b2.length; e2 < f2; e2++) !d2 && e2 in b2 || (d2 || (d2 = Array.prototype.slice.call(b2, 0, e2)), d2[e2] = b2[e2]);
        return a3.concat(d2 || Array.prototype.slice.call(b2));
      }, t = function() {
        function a3(a4) {
          this._namespace = a4.namespace || "DiagComponentLogger";
        }
        return a3.prototype.debug = function() {
          for (var a4 = [], b2 = 0; b2 < arguments.length; b2++) a4[b2] = arguments[b2];
          return u("debug", this._namespace, a4);
        }, a3.prototype.error = function() {
          for (var a4 = [], b2 = 0; b2 < arguments.length; b2++) a4[b2] = arguments[b2];
          return u("error", this._namespace, a4);
        }, a3.prototype.info = function() {
          for (var a4 = [], b2 = 0; b2 < arguments.length; b2++) a4[b2] = arguments[b2];
          return u("info", this._namespace, a4);
        }, a3.prototype.warn = function() {
          for (var a4 = [], b2 = 0; b2 < arguments.length; b2++) a4[b2] = arguments[b2];
          return u("warn", this._namespace, a4);
        }, a3.prototype.verbose = function() {
          for (var a4 = [], b2 = 0; b2 < arguments.length; b2++) a4[b2] = arguments[b2];
          return u("verbose", this._namespace, a4);
        }, a3;
      }();
      function u(a3, b2, c2) {
        var d2 = p("diag");
        if (d2) return c2.unshift(b2), d2[a3].apply(d2, s([], r(c2), false));
      }
      !function(a3) {
        a3[a3.NONE = 0] = "NONE", a3[a3.ERROR = 30] = "ERROR", a3[a3.WARN = 50] = "WARN", a3[a3.INFO = 60] = "INFO", a3[a3.DEBUG = 70] = "DEBUG", a3[a3.VERBOSE = 80] = "VERBOSE", a3[a3.ALL = 9999] = "ALL";
      }(d || (d = {}));
      var v = function(a3, b2) {
        var c2 = "function" == typeof Symbol && a3[Symbol.iterator];
        if (!c2) return a3;
        var d2, e2, f2 = c2.call(a3), g2 = [];
        try {
          for (; (void 0 === b2 || b2-- > 0) && !(d2 = f2.next()).done; ) g2.push(d2.value);
        } catch (a4) {
          e2 = { error: a4 };
        } finally {
          try {
            d2 && !d2.done && (c2 = f2.return) && c2.call(f2);
          } finally {
            if (e2) throw e2.error;
          }
        }
        return g2;
      }, w = function(a3, b2, c2) {
        if (c2 || 2 == arguments.length) for (var d2, e2 = 0, f2 = b2.length; e2 < f2; e2++) !d2 && e2 in b2 || (d2 || (d2 = Array.prototype.slice.call(b2, 0, e2)), d2[e2] = b2[e2]);
        return a3.concat(d2 || Array.prototype.slice.call(b2));
      }, x = function() {
        function a3() {
          function a4(a5) {
            return function() {
              for (var b3 = [], c2 = 0; c2 < arguments.length; c2++) b3[c2] = arguments[c2];
              var d2 = p("diag");
              if (d2) return d2[a5].apply(d2, w([], v(b3), false));
            };
          }
          var b2 = this;
          b2.setLogger = function(a5, c2) {
            if (void 0 === c2 && (c2 = { logLevel: d.INFO }), a5 === b2) {
              var e2, f2, g2, h2 = Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
              return b2.error(null != (e2 = h2.stack) ? e2 : h2.message), false;
            }
            "number" == typeof c2 && (c2 = { logLevel: c2 });
            var i2 = p("diag"), j2 = function(a6, b3) {
              function c3(c4, d2) {
                var e3 = b3[c4];
                return "function" == typeof e3 && a6 >= d2 ? e3.bind(b3) : function() {
                };
              }
              return a6 < d.NONE ? a6 = d.NONE : a6 > d.ALL && (a6 = d.ALL), b3 = b3 || {}, { error: c3("error", d.ERROR), warn: c3("warn", d.WARN), info: c3("info", d.INFO), debug: c3("debug", d.DEBUG), verbose: c3("verbose", d.VERBOSE) };
            }(null != (f2 = c2.logLevel) ? f2 : d.INFO, a5);
            if (i2 && !c2.suppressOverrideMessage) {
              var k2 = null != (g2 = Error().stack) ? g2 : "<failed to generate stacktrace>";
              i2.warn("Current logger will be overwritten from " + k2), j2.warn("Current logger will overwrite one already registered from " + k2);
            }
            return o("diag", j2, b2, true);
          }, b2.disable = function() {
            q("diag", b2);
          }, b2.createComponentLogger = function(a5) {
            return new t(a5);
          }, b2.verbose = a4("verbose"), b2.debug = a4("debug"), b2.info = a4("info"), b2.warn = a4("warn"), b2.error = a4("error");
        }
        return a3.instance = function() {
          return this._instance || (this._instance = new a3()), this._instance;
        }, a3;
      }(), y = function(a3, b2) {
        var c2 = "function" == typeof Symbol && a3[Symbol.iterator];
        if (!c2) return a3;
        var d2, e2, f2 = c2.call(a3), g2 = [];
        try {
          for (; (void 0 === b2 || b2-- > 0) && !(d2 = f2.next()).done; ) g2.push(d2.value);
        } catch (a4) {
          e2 = { error: a4 };
        } finally {
          try {
            d2 && !d2.done && (c2 = f2.return) && c2.call(f2);
          } finally {
            if (e2) throw e2.error;
          }
        }
        return g2;
      }, z = function(a3) {
        var b2 = "function" == typeof Symbol && Symbol.iterator, c2 = b2 && a3[b2], d2 = 0;
        if (c2) return c2.call(a3);
        if (a3 && "number" == typeof a3.length) return { next: function() {
          return a3 && d2 >= a3.length && (a3 = void 0), { value: a3 && a3[d2++], done: !a3 };
        } };
        throw TypeError(b2 ? "Object is not iterable." : "Symbol.iterator is not defined.");
      }, A = function() {
        function a3(a4) {
          this._entries = a4 ? new Map(a4) : /* @__PURE__ */ new Map();
        }
        return a3.prototype.getEntry = function(a4) {
          var b2 = this._entries.get(a4);
          if (b2) return Object.assign({}, b2);
        }, a3.prototype.getAllEntries = function() {
          return Array.from(this._entries.entries()).map(function(a4) {
            var b2 = y(a4, 2);
            return [b2[0], b2[1]];
          });
        }, a3.prototype.setEntry = function(b2, c2) {
          var d2 = new a3(this._entries);
          return d2._entries.set(b2, c2), d2;
        }, a3.prototype.removeEntry = function(b2) {
          var c2 = new a3(this._entries);
          return c2._entries.delete(b2), c2;
        }, a3.prototype.removeEntries = function() {
          for (var b2, c2, d2 = [], e2 = 0; e2 < arguments.length; e2++) d2[e2] = arguments[e2];
          var f2 = new a3(this._entries);
          try {
            for (var g2 = z(d2), h2 = g2.next(); !h2.done; h2 = g2.next()) {
              var i2 = h2.value;
              f2._entries.delete(i2);
            }
          } catch (a4) {
            b2 = { error: a4 };
          } finally {
            try {
              h2 && !h2.done && (c2 = g2.return) && c2.call(g2);
            } finally {
              if (b2) throw b2.error;
            }
          }
          return f2;
        }, a3.prototype.clear = function() {
          return new a3();
        }, a3;
      }(), B = Symbol("BaggageEntryMetadata"), C = x.instance();
      function D(a3) {
        return void 0 === a3 && (a3 = {}), new A(new Map(Object.entries(a3)));
      }
      function E(a3) {
        return "string" != typeof a3 && (C.error("Cannot create baggage metadata from unknown type: " + typeof a3), a3 = ""), { __TYPE__: B, toString: function() {
          return a3;
        } };
      }
      function F(a3) {
        return Symbol.for(a3);
      }
      var G = new function a3(b2) {
        var c2 = this;
        c2._currentContext = b2 ? new Map(b2) : /* @__PURE__ */ new Map(), c2.getValue = function(a4) {
          return c2._currentContext.get(a4);
        }, c2.setValue = function(b3, d2) {
          var e2 = new a3(c2._currentContext);
          return e2._currentContext.set(b3, d2), e2;
        }, c2.deleteValue = function(b3) {
          var d2 = new a3(c2._currentContext);
          return d2._currentContext.delete(b3), d2;
        };
      }(), H = [{ n: "error", c: "error" }, { n: "warn", c: "warn" }, { n: "info", c: "info" }, { n: "debug", c: "debug" }, { n: "verbose", c: "trace" }], I = function() {
        for (var a3 = 0; a3 < H.length; a3++) this[H[a3].n] = /* @__PURE__ */ function(a4) {
          return function() {
            for (var b2 = [], c2 = 0; c2 < arguments.length; c2++) b2[c2] = arguments[c2];
            if (console) {
              var d2 = console[a4];
              if ("function" != typeof d2 && (d2 = console.log), "function" == typeof d2) return d2.apply(console, b2);
            }
          };
        }(H[a3].c);
      }, J = /* @__PURE__ */ function() {
        var a3 = function(b2, c2) {
          return (a3 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(a4, b3) {
            a4.__proto__ = b3;
          } || function(a4, b3) {
            for (var c3 in b3) Object.prototype.hasOwnProperty.call(b3, c3) && (a4[c3] = b3[c3]);
          })(b2, c2);
        };
        return function(b2, c2) {
          if ("function" != typeof c2 && null !== c2) throw TypeError("Class extends value " + String(c2) + " is not a constructor or null");
          function d2() {
            this.constructor = b2;
          }
          a3(b2, c2), b2.prototype = null === c2 ? Object.create(c2) : (d2.prototype = c2.prototype, new d2());
        };
      }(), K = function() {
        function a3() {
        }
        return a3.prototype.createGauge = function(a4, b2) {
          return W;
        }, a3.prototype.createHistogram = function(a4, b2) {
          return X;
        }, a3.prototype.createCounter = function(a4, b2) {
          return V;
        }, a3.prototype.createUpDownCounter = function(a4, b2) {
          return Y;
        }, a3.prototype.createObservableGauge = function(a4, b2) {
          return $;
        }, a3.prototype.createObservableCounter = function(a4, b2) {
          return Z;
        }, a3.prototype.createObservableUpDownCounter = function(a4, b2) {
          return _;
        }, a3.prototype.addBatchObservableCallback = function(a4, b2) {
        }, a3.prototype.removeBatchObservableCallback = function(a4) {
        }, a3;
      }(), L = function() {
      }, M = function(a3) {
        function b2() {
          return null !== a3 && a3.apply(this, arguments) || this;
        }
        return J(b2, a3), b2.prototype.add = function(a4, b3) {
        }, b2;
      }(L), N = function(a3) {
        function b2() {
          return null !== a3 && a3.apply(this, arguments) || this;
        }
        return J(b2, a3), b2.prototype.add = function(a4, b3) {
        }, b2;
      }(L), O = function(a3) {
        function b2() {
          return null !== a3 && a3.apply(this, arguments) || this;
        }
        return J(b2, a3), b2.prototype.record = function(a4, b3) {
        }, b2;
      }(L), P = function(a3) {
        function b2() {
          return null !== a3 && a3.apply(this, arguments) || this;
        }
        return J(b2, a3), b2.prototype.record = function(a4, b3) {
        }, b2;
      }(L), Q = function() {
        function a3() {
        }
        return a3.prototype.addCallback = function(a4) {
        }, a3.prototype.removeCallback = function(a4) {
        }, a3;
      }(), R = function(a3) {
        function b2() {
          return null !== a3 && a3.apply(this, arguments) || this;
        }
        return J(b2, a3), b2;
      }(Q), S = function(a3) {
        function b2() {
          return null !== a3 && a3.apply(this, arguments) || this;
        }
        return J(b2, a3), b2;
      }(Q), T = function(a3) {
        function b2() {
          return null !== a3 && a3.apply(this, arguments) || this;
        }
        return J(b2, a3), b2;
      }(Q), U = new K(), V = new M(), W = new O(), X = new P(), Y = new N(), Z = new R(), $ = new S(), _ = new T();
      function aa() {
        return U;
      }
      !function(a3) {
        a3[a3.INT = 0] = "INT", a3[a3.DOUBLE = 1] = "DOUBLE";
      }(e || (e = {}));
      var ab = { get: function(a3, b2) {
        if (null != a3) return a3[b2];
      }, keys: function(a3) {
        return null == a3 ? [] : Object.keys(a3);
      } }, ac = { set: function(a3, b2, c2) {
        null != a3 && (a3[b2] = c2);
      } }, ad = function(a3, b2) {
        var c2 = "function" == typeof Symbol && a3[Symbol.iterator];
        if (!c2) return a3;
        var d2, e2, f2 = c2.call(a3), g2 = [];
        try {
          for (; (void 0 === b2 || b2-- > 0) && !(d2 = f2.next()).done; ) g2.push(d2.value);
        } catch (a4) {
          e2 = { error: a4 };
        } finally {
          try {
            d2 && !d2.done && (c2 = f2.return) && c2.call(f2);
          } finally {
            if (e2) throw e2.error;
          }
        }
        return g2;
      }, ae = function(a3, b2, c2) {
        if (c2 || 2 == arguments.length) for (var d2, e2 = 0, f2 = b2.length; e2 < f2; e2++) !d2 && e2 in b2 || (d2 || (d2 = Array.prototype.slice.call(b2, 0, e2)), d2[e2] = b2[e2]);
        return a3.concat(d2 || Array.prototype.slice.call(b2));
      }, af = function() {
        function a3() {
        }
        return a3.prototype.active = function() {
          return G;
        }, a3.prototype.with = function(a4, b2, c2) {
          for (var d2 = [], e2 = 3; e2 < arguments.length; e2++) d2[e2 - 3] = arguments[e2];
          return b2.call.apply(b2, ae([c2], ad(d2), false));
        }, a3.prototype.bind = function(a4, b2) {
          return b2;
        }, a3.prototype.enable = function() {
          return this;
        }, a3.prototype.disable = function() {
          return this;
        }, a3;
      }(), ag = function(a3, b2) {
        var c2 = "function" == typeof Symbol && a3[Symbol.iterator];
        if (!c2) return a3;
        var d2, e2, f2 = c2.call(a3), g2 = [];
        try {
          for (; (void 0 === b2 || b2-- > 0) && !(d2 = f2.next()).done; ) g2.push(d2.value);
        } catch (a4) {
          e2 = { error: a4 };
        } finally {
          try {
            d2 && !d2.done && (c2 = f2.return) && c2.call(f2);
          } finally {
            if (e2) throw e2.error;
          }
        }
        return g2;
      }, ah = function(a3, b2, c2) {
        if (c2 || 2 == arguments.length) for (var d2, e2 = 0, f2 = b2.length; e2 < f2; e2++) !d2 && e2 in b2 || (d2 || (d2 = Array.prototype.slice.call(b2, 0, e2)), d2[e2] = b2[e2]);
        return a3.concat(d2 || Array.prototype.slice.call(b2));
      }, ai = "context", aj = new af(), ak = function() {
        function a3() {
        }
        return a3.getInstance = function() {
          return this._instance || (this._instance = new a3()), this._instance;
        }, a3.prototype.setGlobalContextManager = function(a4) {
          return o(ai, a4, x.instance());
        }, a3.prototype.active = function() {
          return this._getContextManager().active();
        }, a3.prototype.with = function(a4, b2, c2) {
          for (var d2, e2 = [], f2 = 3; f2 < arguments.length; f2++) e2[f2 - 3] = arguments[f2];
          return (d2 = this._getContextManager()).with.apply(d2, ah([a4, b2, c2], ag(e2), false));
        }, a3.prototype.bind = function(a4, b2) {
          return this._getContextManager().bind(a4, b2);
        }, a3.prototype._getContextManager = function() {
          return p(ai) || aj;
        }, a3.prototype.disable = function() {
          this._getContextManager().disable(), q(ai, x.instance());
        }, a3;
      }();
      !function(a3) {
        a3[a3.NONE = 0] = "NONE", a3[a3.SAMPLED = 1] = "SAMPLED";
      }(f || (f = {}));
      var al = "0000000000000000", am = "00000000000000000000000000000000", an = { traceId: am, spanId: al, traceFlags: f.NONE }, ao = function() {
        function a3(a4) {
          void 0 === a4 && (a4 = an), this._spanContext = a4;
        }
        return a3.prototype.spanContext = function() {
          return this._spanContext;
        }, a3.prototype.setAttribute = function(a4, b2) {
          return this;
        }, a3.prototype.setAttributes = function(a4) {
          return this;
        }, a3.prototype.addEvent = function(a4, b2) {
          return this;
        }, a3.prototype.addLink = function(a4) {
          return this;
        }, a3.prototype.addLinks = function(a4) {
          return this;
        }, a3.prototype.setStatus = function(a4) {
          return this;
        }, a3.prototype.updateName = function(a4) {
          return this;
        }, a3.prototype.end = function(a4) {
        }, a3.prototype.isRecording = function() {
          return false;
        }, a3.prototype.recordException = function(a4, b2) {
        }, a3;
      }(), ap = F("OpenTelemetry Context Key SPAN");
      function aq(a3) {
        return a3.getValue(ap) || void 0;
      }
      function ar() {
        return aq(ak.getInstance().active());
      }
      function as(a3, b2) {
        return a3.setValue(ap, b2);
      }
      function at(a3) {
        return a3.deleteValue(ap);
      }
      function au(a3, b2) {
        return as(a3, new ao(b2));
      }
      function av(a3) {
        var b2;
        return null == (b2 = aq(a3)) ? void 0 : b2.spanContext();
      }
      var aw = /^([0-9a-f]{32})$/i, ax = /^[0-9a-f]{16}$/i;
      function ay(a3) {
        return aw.test(a3) && a3 !== am;
      }
      function az(a3) {
        return ax.test(a3) && a3 !== al;
      }
      function aA(a3) {
        return ay(a3.traceId) && az(a3.spanId);
      }
      function aB(a3) {
        return new ao(a3);
      }
      var aC = ak.getInstance(), aD = function() {
        function a3() {
        }
        return a3.prototype.startSpan = function(a4, b2, c2) {
          if (void 0 === c2 && (c2 = aC.active()), null == b2 ? void 0 : b2.root) return new ao();
          var d2, e2 = c2 && av(c2);
          return "object" == typeof (d2 = e2) && "string" == typeof d2.spanId && "string" == typeof d2.traceId && "number" == typeof d2.traceFlags && aA(e2) ? new ao(e2) : new ao();
        }, a3.prototype.startActiveSpan = function(a4, b2, c2, d2) {
          if (!(arguments.length < 2)) {
            2 == arguments.length ? g2 = b2 : 3 == arguments.length ? (e2 = b2, g2 = c2) : (e2 = b2, f2 = c2, g2 = d2);
            var e2, f2, g2, h2 = null != f2 ? f2 : aC.active(), i2 = this.startSpan(a4, e2, h2), j2 = as(h2, i2);
            return aC.with(j2, g2, void 0, i2);
          }
        }, a3;
      }(), aE = new aD(), aF = function() {
        function a3(a4, b2, c2, d2) {
          this._provider = a4, this.name = b2, this.version = c2, this.options = d2;
        }
        return a3.prototype.startSpan = function(a4, b2, c2) {
          return this._getTracer().startSpan(a4, b2, c2);
        }, a3.prototype.startActiveSpan = function(a4, b2, c2, d2) {
          var e2 = this._getTracer();
          return Reflect.apply(e2.startActiveSpan, e2, arguments);
        }, a3.prototype._getTracer = function() {
          if (this._delegate) return this._delegate;
          var a4 = this._provider.getDelegateTracer(this.name, this.version, this.options);
          return a4 ? (this._delegate = a4, this._delegate) : aE;
        }, a3;
      }(), aG = new (function() {
        function a3() {
        }
        return a3.prototype.getTracer = function(a4, b2, c2) {
          return new aD();
        }, a3;
      }())(), aH = function() {
        function a3() {
        }
        return a3.prototype.getTracer = function(a4, b2, c2) {
          var d2;
          return null != (d2 = this.getDelegateTracer(a4, b2, c2)) ? d2 : new aF(this, a4, b2, c2);
        }, a3.prototype.getDelegate = function() {
          var a4;
          return null != (a4 = this._delegate) ? a4 : aG;
        }, a3.prototype.setDelegate = function(a4) {
          this._delegate = a4;
        }, a3.prototype.getDelegateTracer = function(a4, b2, c2) {
          var d2;
          return null == (d2 = this._delegate) ? void 0 : d2.getTracer(a4, b2, c2);
        }, a3;
      }();
      !function(a3) {
        a3[a3.NOT_RECORD = 0] = "NOT_RECORD", a3[a3.RECORD = 1] = "RECORD", a3[a3.RECORD_AND_SAMPLED = 2] = "RECORD_AND_SAMPLED";
      }(g || (g = {})), function(a3) {
        a3[a3.INTERNAL = 0] = "INTERNAL", a3[a3.SERVER = 1] = "SERVER", a3[a3.CLIENT = 2] = "CLIENT", a3[a3.PRODUCER = 3] = "PRODUCER", a3[a3.CONSUMER = 4] = "CONSUMER";
      }(h || (h = {})), function(a3) {
        a3[a3.UNSET = 0] = "UNSET", a3[a3.OK = 1] = "OK", a3[a3.ERROR = 2] = "ERROR";
      }(i || (i = {}));
      var aI = "[_0-9a-z-*/]", aJ = RegExp("^(?:[a-z]" + aI + "{0,255}|" + ("[a-z0-9]" + aI + "{0,240}@[a-z]") + aI + "{0,13})$"), aK = /^[ -~]{0,255}[!-~]$/, aL = /,|=/, aM = function() {
        function a3(a4) {
          this._internalState = /* @__PURE__ */ new Map(), a4 && this._parse(a4);
        }
        return a3.prototype.set = function(a4, b2) {
          var c2 = this._clone();
          return c2._internalState.has(a4) && c2._internalState.delete(a4), c2._internalState.set(a4, b2), c2;
        }, a3.prototype.unset = function(a4) {
          var b2 = this._clone();
          return b2._internalState.delete(a4), b2;
        }, a3.prototype.get = function(a4) {
          return this._internalState.get(a4);
        }, a3.prototype.serialize = function() {
          var a4 = this;
          return this._keys().reduce(function(b2, c2) {
            return b2.push(c2 + "=" + a4.get(c2)), b2;
          }, []).join(",");
        }, a3.prototype._parse = function(a4) {
          !(a4.length > 512) && (this._internalState = a4.split(",").reverse().reduce(function(a5, b2) {
            var c2 = b2.trim(), d2 = c2.indexOf("=");
            if (-1 !== d2) {
              var e2 = c2.slice(0, d2), f2 = c2.slice(d2 + 1, b2.length);
              aJ.test(e2) && aK.test(f2) && !aL.test(f2) && a5.set(e2, f2);
            }
            return a5;
          }, /* @__PURE__ */ new Map()), this._internalState.size > 32 && (this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, 32))));
        }, a3.prototype._keys = function() {
          return Array.from(this._internalState.keys()).reverse();
        }, a3.prototype._clone = function() {
          var b2 = new a3();
          return b2._internalState = new Map(this._internalState), b2;
        }, a3;
      }();
      function aN(a3) {
        return new aM(a3);
      }
      var aO = ak.getInstance(), aP = x.instance(), aQ = new (function() {
        function a3() {
        }
        return a3.prototype.getMeter = function(a4, b2, c2) {
          return U;
        }, a3;
      }())(), aR = "metrics", aS = function() {
        function a3() {
        }
        return a3.getInstance = function() {
          return this._instance || (this._instance = new a3()), this._instance;
        }, a3.prototype.setGlobalMeterProvider = function(a4) {
          return o(aR, a4, x.instance());
        }, a3.prototype.getMeterProvider = function() {
          return p(aR) || aQ;
        }, a3.prototype.getMeter = function(a4, b2, c2) {
          return this.getMeterProvider().getMeter(a4, b2, c2);
        }, a3.prototype.disable = function() {
          q(aR, x.instance());
        }, a3;
      }().getInstance(), aT = function() {
        function a3() {
        }
        return a3.prototype.inject = function(a4, b2) {
        }, a3.prototype.extract = function(a4, b2) {
          return a4;
        }, a3.prototype.fields = function() {
          return [];
        }, a3;
      }(), aU = F("OpenTelemetry Baggage Key");
      function aV(a3) {
        return a3.getValue(aU) || void 0;
      }
      function aW() {
        return aV(ak.getInstance().active());
      }
      function aX(a3, b2) {
        return a3.setValue(aU, b2);
      }
      function aY(a3) {
        return a3.deleteValue(aU);
      }
      var aZ = "propagation", a$ = new aT(), a_ = function() {
        function a3() {
          this.createBaggage = D, this.getBaggage = aV, this.getActiveBaggage = aW, this.setBaggage = aX, this.deleteBaggage = aY;
        }
        return a3.getInstance = function() {
          return this._instance || (this._instance = new a3()), this._instance;
        }, a3.prototype.setGlobalPropagator = function(a4) {
          return o(aZ, a4, x.instance());
        }, a3.prototype.inject = function(a4, b2, c2) {
          return void 0 === c2 && (c2 = ac), this._getGlobalPropagator().inject(a4, b2, c2);
        }, a3.prototype.extract = function(a4, b2, c2) {
          return void 0 === c2 && (c2 = ab), this._getGlobalPropagator().extract(a4, b2, c2);
        }, a3.prototype.fields = function() {
          return this._getGlobalPropagator().fields();
        }, a3.prototype.disable = function() {
          q(aZ, x.instance());
        }, a3.prototype._getGlobalPropagator = function() {
          return p(aZ) || a$;
        }, a3;
      }().getInstance(), a0 = "trace", a1 = function() {
        function a3() {
          this._proxyTracerProvider = new aH(), this.wrapSpanContext = aB, this.isSpanContextValid = aA, this.deleteSpan = at, this.getSpan = aq, this.getActiveSpan = ar, this.getSpanContext = av, this.setSpan = as, this.setSpanContext = au;
        }
        return a3.getInstance = function() {
          return this._instance || (this._instance = new a3()), this._instance;
        }, a3.prototype.setGlobalTracerProvider = function(a4) {
          var b2 = o(a0, this._proxyTracerProvider, x.instance());
          return b2 && this._proxyTracerProvider.setDelegate(a4), b2;
        }, a3.prototype.getTracerProvider = function() {
          return p(a0) || this._proxyTracerProvider;
        }, a3.prototype.getTracer = function(a4, b2) {
          return this.getTracerProvider().getTracer(a4, b2);
        }, a3.prototype.disable = function() {
          q(a0, x.instance()), this._proxyTracerProvider = new aH();
        }, a3;
      }().getInstance();
      let a2 = { context: aO, diag: aP, metrics: aS, propagation: a_, trace: a1 };
    }, 3290: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 3311: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 3318: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeSendPasswordResetEmailOptions = void 0, b.serializeSendPasswordResetEmailOptions = (a2) => ({ email: a2.email, password_reset_url: a2.passwordResetUrl });
    }, 3342: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Actions = void 0;
      let e = c(4167), f = c(4377), g = c(5149);
      class h {
        constructor(a2) {
          this.signatureProvider = new e.SignatureProvider(a2);
        }
        get computeSignature() {
          return this.signatureProvider.computeSignature.bind(this.signatureProvider);
        }
        get verifyHeader() {
          return this.signatureProvider.verifyHeader.bind(this.signatureProvider);
        }
        serializeType(a2) {
          switch (a2) {
            case "authentication":
              return "authentication_action_response";
            case "user_registration":
              return "user_registration_action_response";
            default:
              return (0, f.unreachable)(a2);
          }
        }
        signResponse(a2, b2) {
          return d(this, void 0, void 0, function* () {
            let c2, { verdict: d2, type: e2 } = a2;
            "Deny" === d2 && a2.errorMessage && (c2 = a2.errorMessage);
            let f2 = Object.assign({ timestamp: Date.now(), verdict: d2 }, "Deny" === d2 && a2.errorMessage && { error_message: c2 });
            return { object: this.serializeType(e2), payload: f2, signature: yield this.computeSignature(f2.timestamp, f2, b2) };
          });
        }
        constructAction({ payload: a2, sigHeader: b2, secret: c2, tolerance: e2 = 3e4 }) {
          return d(this, void 0, void 0, function* () {
            return yield this.verifyHeader({ payload: a2, sigHeader: b2, secret: c2, tolerance: e2 }), (0, g.deserializeAction)(a2);
          });
        }
      }
      b.Actions = h;
    }, 3346: (a, b) => {
      "use strict";
      function c(a2) {
        if (!a2 || !a2.properties) return {};
        let b2 = {};
        return Object.keys(a2.properties).forEach((c2) => {
          a2.properties && (b2[c2] = a2.properties[c2].type);
        }), b2;
      }
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeAuditLogSchema = void 0, b.deserializeAuditLogSchema = (a2) => {
        var b2;
        return { object: a2.object, version: a2.version, targets: a2.targets.map((a3) => ({ type: a3.type, metadata: a3.metadata ? c(a3.metadata) : void 0 })), actor: { metadata: c(null == (b2 = a2.actor) ? void 0 : b2.metadata) }, metadata: a2.metadata ? c(a2.metadata) : void 0, createdAt: a2.created_at };
      };
    }, 3409: (a, b) => {
      "use strict";
      function c(a2) {
        if (!a2) return {};
        let b2 = {};
        return Object.keys(a2).forEach((c2) => {
          b2[c2] = { type: a2[c2] };
        }), b2;
      }
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreateAuditLogSchemaOptions = void 0, b.serializeCreateAuditLogSchemaOptions = (a2) => {
        var b2;
        return { actor: { metadata: { type: "object", properties: c(null == (b2 = a2.actor) ? void 0 : b2.metadata) } }, targets: a2.targets.map((a3) => ({ type: a3.type, metadata: a3.metadata ? { type: "object", properties: c(a3.metadata) } : void 0 })), metadata: a2.metadata ? { type: "object", properties: c(a2.metadata) } : void 0 };
      };
    }, 3426: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeQueryResult = void 0, b.deserializeQueryResult = (a2) => ({ resourceType: a2.resource_type, resourceId: a2.resource_id, relation: a2.relation, warrant: { resourceType: a2.warrant.resource_type, resourceId: a2.warrant.resource_id, relation: a2.warrant.relation, subject: { resourceType: a2.warrant.subject.resource_type, resourceId: a2.warrant.subject.resource_id, relation: a2.warrant.subject.relation } }, isImplicit: a2.is_implicit, meta: a2.meta });
    }, 3436: (a, b, c) => {
      "use strict";
      let d = c(5401), e = c(4398), f = "function" == typeof Symbol && "function" == typeof Symbol.for ? Symbol.for("nodejs.util.inspect.custom") : null;
      function g(a2) {
        if (a2 > 2147483647) throw RangeError('The value "' + a2 + '" is invalid for option "size"');
        let b2 = new Uint8Array(a2);
        return Object.setPrototypeOf(b2, h.prototype), b2;
      }
      function h(a2, b2, c2) {
        if ("number" == typeof a2) {
          if ("string" == typeof b2) throw TypeError('The "string" argument must be of type string. Received type number');
          return k(a2);
        }
        return i(a2, b2, c2);
      }
      function i(a2, b2, c2) {
        if ("string" == typeof a2) {
          var d2 = a2, e2 = b2;
          if (("string" != typeof e2 || "" === e2) && (e2 = "utf8"), !h.isEncoding(e2)) throw TypeError("Unknown encoding: " + e2);
          let c3 = 0 | o(d2, e2), f3 = g(c3), i3 = f3.write(d2, e2);
          return i3 !== c3 && (f3 = f3.slice(0, i3)), f3;
        }
        if (ArrayBuffer.isView(a2)) {
          var f2 = a2;
          if (L(f2, Uint8Array)) {
            let a3 = new Uint8Array(f2);
            return m(a3.buffer, a3.byteOffset, a3.byteLength);
          }
          return l(f2);
        }
        if (null == a2) throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof a2);
        if (L(a2, ArrayBuffer) || a2 && L(a2.buffer, ArrayBuffer) || "undefined" != typeof SharedArrayBuffer && (L(a2, SharedArrayBuffer) || a2 && L(a2.buffer, SharedArrayBuffer))) return m(a2, b2, c2);
        if ("number" == typeof a2) throw TypeError('The "value" argument must not be of type number. Received type number');
        let i2 = a2.valueOf && a2.valueOf();
        if (null != i2 && i2 !== a2) return h.from(i2, b2, c2);
        let j2 = function(a3) {
          if (h.isBuffer(a3)) {
            let b3 = 0 | n(a3.length), c3 = g(b3);
            return 0 === c3.length || a3.copy(c3, 0, 0, b3), c3;
          }
          return void 0 !== a3.length ? "number" != typeof a3.length || function(a4) {
            return a4 != a4;
          }(a3.length) ? g(0) : l(a3) : "Buffer" === a3.type && Array.isArray(a3.data) ? l(a3.data) : void 0;
        }(a2);
        if (j2) return j2;
        if ("undefined" != typeof Symbol && null != Symbol.toPrimitive && "function" == typeof a2[Symbol.toPrimitive]) return h.from(a2[Symbol.toPrimitive]("string"), b2, c2);
        throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof a2);
      }
      function j(a2) {
        if ("number" != typeof a2) throw TypeError('"size" argument must be of type number');
        if (a2 < 0) throw RangeError('The value "' + a2 + '" is invalid for option "size"');
      }
      function k(a2) {
        return j(a2), g(a2 < 0 ? 0 : 0 | n(a2));
      }
      function l(a2) {
        let b2 = a2.length < 0 ? 0 : 0 | n(a2.length), c2 = g(b2);
        for (let d2 = 0; d2 < b2; d2 += 1) c2[d2] = 255 & a2[d2];
        return c2;
      }
      function m(a2, b2, c2) {
        let d2;
        if (b2 < 0 || a2.byteLength < b2) throw RangeError('"offset" is outside of buffer bounds');
        if (a2.byteLength < b2 + (c2 || 0)) throw RangeError('"length" is outside of buffer bounds');
        return Object.setPrototypeOf(d2 = void 0 === b2 && void 0 === c2 ? new Uint8Array(a2) : void 0 === c2 ? new Uint8Array(a2, b2) : new Uint8Array(a2, b2, c2), h.prototype), d2;
      }
      function n(a2) {
        if (a2 >= 2147483647) throw RangeError("Attempt to allocate Buffer larger than maximum size: 0x7fffffff bytes");
        return 0 | a2;
      }
      function o(a2, b2) {
        if (h.isBuffer(a2)) return a2.length;
        if (ArrayBuffer.isView(a2) || L(a2, ArrayBuffer)) return a2.byteLength;
        if ("string" != typeof a2) throw TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof a2);
        let c2 = a2.length, d2 = arguments.length > 2 && true === arguments[2];
        if (!d2 && 0 === c2) return 0;
        let e2 = false;
        for (; ; ) switch (b2) {
          case "ascii":
          case "latin1":
          case "binary":
            return c2;
          case "utf8":
          case "utf-8":
            return I(a2).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return 2 * c2;
          case "hex":
            return c2 >>> 1;
          case "base64":
            return J(a2).length;
          default:
            if (e2) return d2 ? -1 : I(a2).length;
            b2 = ("" + b2).toLowerCase(), e2 = true;
        }
      }
      function p(a2, b2, c2) {
        let e2 = false;
        if ((void 0 === b2 || b2 < 0) && (b2 = 0), b2 > this.length || ((void 0 === c2 || c2 > this.length) && (c2 = this.length), c2 <= 0 || (c2 >>>= 0) <= (b2 >>>= 0))) return "";
        for (a2 || (a2 = "utf8"); ; ) switch (a2) {
          case "hex":
            return function(a3, b3, c3) {
              let d2 = a3.length;
              (!b3 || b3 < 0) && (b3 = 0), (!c3 || c3 < 0 || c3 > d2) && (c3 = d2);
              let e3 = "";
              for (let d3 = b3; d3 < c3; ++d3) e3 += M[a3[d3]];
              return e3;
            }(this, b2, c2);
          case "utf8":
          case "utf-8":
            return t(this, b2, c2);
          case "ascii":
            return function(a3, b3, c3) {
              let d2 = "";
              c3 = Math.min(a3.length, c3);
              for (let e3 = b3; e3 < c3; ++e3) d2 += String.fromCharCode(127 & a3[e3]);
              return d2;
            }(this, b2, c2);
          case "latin1":
          case "binary":
            return function(a3, b3, c3) {
              let d2 = "";
              c3 = Math.min(a3.length, c3);
              for (let e3 = b3; e3 < c3; ++e3) d2 += String.fromCharCode(a3[e3]);
              return d2;
            }(this, b2, c2);
          case "base64":
            var f2, g2, h2;
            return f2 = this, g2 = b2, h2 = c2, 0 === g2 && h2 === f2.length ? d.fromByteArray(f2) : d.fromByteArray(f2.slice(g2, h2));
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return function(a3, b3, c3) {
              let d2 = a3.slice(b3, c3), e3 = "";
              for (let a4 = 0; a4 < d2.length - 1; a4 += 2) e3 += String.fromCharCode(d2[a4] + 256 * d2[a4 + 1]);
              return e3;
            }(this, b2, c2);
          default:
            if (e2) throw TypeError("Unknown encoding: " + a2);
            a2 = (a2 + "").toLowerCase(), e2 = true;
        }
      }
      function q(a2, b2, c2) {
        let d2 = a2[b2];
        a2[b2] = a2[c2], a2[c2] = d2;
      }
      function r(a2, b2, c2, d2, e2) {
        var f2;
        if (0 === a2.length) return -1;
        if ("string" == typeof c2 ? (d2 = c2, c2 = 0) : c2 > 2147483647 ? c2 = 2147483647 : c2 < -2147483648 && (c2 = -2147483648), (f2 = c2 *= 1) != f2 && (c2 = e2 ? 0 : a2.length - 1), c2 < 0 && (c2 = a2.length + c2), c2 >= a2.length) if (e2) return -1;
        else c2 = a2.length - 1;
        else if (c2 < 0) if (!e2) return -1;
        else c2 = 0;
        if ("string" == typeof b2 && (b2 = h.from(b2, d2)), h.isBuffer(b2)) return 0 === b2.length ? -1 : s(a2, b2, c2, d2, e2);
        if ("number" == typeof b2) {
          if (b2 &= 255, "function" == typeof Uint8Array.prototype.indexOf) if (e2) return Uint8Array.prototype.indexOf.call(a2, b2, c2);
          else return Uint8Array.prototype.lastIndexOf.call(a2, b2, c2);
          return s(a2, [b2], c2, d2, e2);
        }
        throw TypeError("val must be string, number or Buffer");
      }
      function s(a2, b2, c2, d2, e2) {
        let f2, g2 = 1, h2 = a2.length, i2 = b2.length;
        if (void 0 !== d2 && ("ucs2" === (d2 = String(d2).toLowerCase()) || "ucs-2" === d2 || "utf16le" === d2 || "utf-16le" === d2)) {
          if (a2.length < 2 || b2.length < 2) return -1;
          g2 = 2, h2 /= 2, i2 /= 2, c2 /= 2;
        }
        function j2(a3, b3) {
          return 1 === g2 ? a3[b3] : a3.readUInt16BE(b3 * g2);
        }
        if (e2) {
          let d3 = -1;
          for (f2 = c2; f2 < h2; f2++) if (j2(a2, f2) === j2(b2, -1 === d3 ? 0 : f2 - d3)) {
            if (-1 === d3 && (d3 = f2), f2 - d3 + 1 === i2) return d3 * g2;
          } else -1 !== d3 && (f2 -= f2 - d3), d3 = -1;
        } else for (c2 + i2 > h2 && (c2 = h2 - i2), f2 = c2; f2 >= 0; f2--) {
          let c3 = true;
          for (let d3 = 0; d3 < i2; d3++) if (j2(a2, f2 + d3) !== j2(b2, d3)) {
            c3 = false;
            break;
          }
          if (c3) return f2;
        }
        return -1;
      }
      function t(a2, b2, c2) {
        c2 = Math.min(a2.length, c2);
        let d2 = [], e2 = b2;
        for (; e2 < c2; ) {
          let b3 = a2[e2], f3 = null, g3 = b3 > 239 ? 4 : b3 > 223 ? 3 : b3 > 191 ? 2 : 1;
          if (e2 + g3 <= c2) {
            let c3, d3, h3, i3;
            switch (g3) {
              case 1:
                b3 < 128 && (f3 = b3);
                break;
              case 2:
                (192 & (c3 = a2[e2 + 1])) == 128 && (i3 = (31 & b3) << 6 | 63 & c3) > 127 && (f3 = i3);
                break;
              case 3:
                c3 = a2[e2 + 1], d3 = a2[e2 + 2], (192 & c3) == 128 && (192 & d3) == 128 && (i3 = (15 & b3) << 12 | (63 & c3) << 6 | 63 & d3) > 2047 && (i3 < 55296 || i3 > 57343) && (f3 = i3);
                break;
              case 4:
                c3 = a2[e2 + 1], d3 = a2[e2 + 2], h3 = a2[e2 + 3], (192 & c3) == 128 && (192 & d3) == 128 && (192 & h3) == 128 && (i3 = (15 & b3) << 18 | (63 & c3) << 12 | (63 & d3) << 6 | 63 & h3) > 65535 && i3 < 1114112 && (f3 = i3);
            }
          }
          null === f3 ? (f3 = 65533, g3 = 1) : f3 > 65535 && (f3 -= 65536, d2.push(f3 >>> 10 & 1023 | 55296), f3 = 56320 | 1023 & f3), d2.push(f3), e2 += g3;
        }
        var f2 = d2;
        let g2 = f2.length;
        if (g2 <= 4096) return String.fromCharCode.apply(String, f2);
        let h2 = "", i2 = 0;
        for (; i2 < g2; ) h2 += String.fromCharCode.apply(String, f2.slice(i2, i2 += 4096));
        return h2;
      }
      function u(a2, b2, c2) {
        if (a2 % 1 != 0 || a2 < 0) throw RangeError("offset is not uint");
        if (a2 + b2 > c2) throw RangeError("Trying to access beyond buffer length");
      }
      function v(a2, b2, c2, d2, e2, f2) {
        if (!h.isBuffer(a2)) throw TypeError('"buffer" argument must be a Buffer instance');
        if (b2 > e2 || b2 < f2) throw RangeError('"value" argument is out of bounds');
        if (c2 + d2 > a2.length) throw RangeError("Index out of range");
      }
      function w(a2, b2, c2, d2, e2) {
        E(b2, d2, e2, a2, c2, 7);
        let f2 = Number(b2 & BigInt(4294967295));
        a2[c2++] = f2, f2 >>= 8, a2[c2++] = f2, f2 >>= 8, a2[c2++] = f2, f2 >>= 8, a2[c2++] = f2;
        let g2 = Number(b2 >> BigInt(32) & BigInt(4294967295));
        return a2[c2++] = g2, g2 >>= 8, a2[c2++] = g2, g2 >>= 8, a2[c2++] = g2, g2 >>= 8, a2[c2++] = g2, c2;
      }
      function x(a2, b2, c2, d2, e2) {
        E(b2, d2, e2, a2, c2, 7);
        let f2 = Number(b2 & BigInt(4294967295));
        a2[c2 + 7] = f2, f2 >>= 8, a2[c2 + 6] = f2, f2 >>= 8, a2[c2 + 5] = f2, f2 >>= 8, a2[c2 + 4] = f2;
        let g2 = Number(b2 >> BigInt(32) & BigInt(4294967295));
        return a2[c2 + 3] = g2, g2 >>= 8, a2[c2 + 2] = g2, g2 >>= 8, a2[c2 + 1] = g2, g2 >>= 8, a2[c2] = g2, c2 + 8;
      }
      function y(a2, b2, c2, d2, e2, f2) {
        if (c2 + d2 > a2.length || c2 < 0) throw RangeError("Index out of range");
      }
      function z(a2, b2, c2, d2, f2) {
        return b2 *= 1, c2 >>>= 0, f2 || y(a2, b2, c2, 4, 34028234663852886e22, -34028234663852886e22), e.write(a2, b2, c2, d2, 23, 4), c2 + 4;
      }
      function A(a2, b2, c2, d2, f2) {
        return b2 *= 1, c2 >>>= 0, f2 || y(a2, b2, c2, 8, 17976931348623157e292, -17976931348623157e292), e.write(a2, b2, c2, d2, 52, 8), c2 + 8;
      }
      b.Buffer = h, b.SlowBuffer = function(a2) {
        return +a2 != a2 && (a2 = 0), h.alloc(+a2);
      }, b.INSPECT_MAX_BYTES = 50, b.kMaxLength = 2147483647, h.TYPED_ARRAY_SUPPORT = function() {
        try {
          let a2 = new Uint8Array(1), b2 = { foo: function() {
            return 42;
          } };
          return Object.setPrototypeOf(b2, Uint8Array.prototype), Object.setPrototypeOf(a2, b2), 42 === a2.foo();
        } catch (a2) {
          return false;
        }
      }(), h.TYPED_ARRAY_SUPPORT || "undefined" == typeof console || "function" != typeof console.error || console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."), Object.defineProperty(h.prototype, "parent", { enumerable: true, get: function() {
        if (h.isBuffer(this)) return this.buffer;
      } }), Object.defineProperty(h.prototype, "offset", { enumerable: true, get: function() {
        if (h.isBuffer(this)) return this.byteOffset;
      } }), h.poolSize = 8192, h.from = function(a2, b2, c2) {
        return i(a2, b2, c2);
      }, Object.setPrototypeOf(h.prototype, Uint8Array.prototype), Object.setPrototypeOf(h, Uint8Array), h.alloc = function(a2, b2, c2) {
        return (j(a2), a2 <= 0) ? g(a2) : void 0 !== b2 ? "string" == typeof c2 ? g(a2).fill(b2, c2) : g(a2).fill(b2) : g(a2);
      }, h.allocUnsafe = function(a2) {
        return k(a2);
      }, h.allocUnsafeSlow = function(a2) {
        return k(a2);
      }, h.isBuffer = function(a2) {
        return null != a2 && true === a2._isBuffer && a2 !== h.prototype;
      }, h.compare = function(a2, b2) {
        if (L(a2, Uint8Array) && (a2 = h.from(a2, a2.offset, a2.byteLength)), L(b2, Uint8Array) && (b2 = h.from(b2, b2.offset, b2.byteLength)), !h.isBuffer(a2) || !h.isBuffer(b2)) throw TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
        if (a2 === b2) return 0;
        let c2 = a2.length, d2 = b2.length;
        for (let e2 = 0, f2 = Math.min(c2, d2); e2 < f2; ++e2) if (a2[e2] !== b2[e2]) {
          c2 = a2[e2], d2 = b2[e2];
          break;
        }
        return c2 < d2 ? -1 : +(d2 < c2);
      }, h.isEncoding = function(a2) {
        switch (String(a2).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      }, h.concat = function(a2, b2) {
        let c2;
        if (!Array.isArray(a2)) throw TypeError('"list" argument must be an Array of Buffers');
        if (0 === a2.length) return h.alloc(0);
        if (void 0 === b2) for (c2 = 0, b2 = 0; c2 < a2.length; ++c2) b2 += a2[c2].length;
        let d2 = h.allocUnsafe(b2), e2 = 0;
        for (c2 = 0; c2 < a2.length; ++c2) {
          let b3 = a2[c2];
          if (L(b3, Uint8Array)) e2 + b3.length > d2.length ? (h.isBuffer(b3) || (b3 = h.from(b3)), b3.copy(d2, e2)) : Uint8Array.prototype.set.call(d2, b3, e2);
          else if (h.isBuffer(b3)) b3.copy(d2, e2);
          else throw TypeError('"list" argument must be an Array of Buffers');
          e2 += b3.length;
        }
        return d2;
      }, h.byteLength = o, h.prototype._isBuffer = true, h.prototype.swap16 = function() {
        let a2 = this.length;
        if (a2 % 2 != 0) throw RangeError("Buffer size must be a multiple of 16-bits");
        for (let b2 = 0; b2 < a2; b2 += 2) q(this, b2, b2 + 1);
        return this;
      }, h.prototype.swap32 = function() {
        let a2 = this.length;
        if (a2 % 4 != 0) throw RangeError("Buffer size must be a multiple of 32-bits");
        for (let b2 = 0; b2 < a2; b2 += 4) q(this, b2, b2 + 3), q(this, b2 + 1, b2 + 2);
        return this;
      }, h.prototype.swap64 = function() {
        let a2 = this.length;
        if (a2 % 8 != 0) throw RangeError("Buffer size must be a multiple of 64-bits");
        for (let b2 = 0; b2 < a2; b2 += 8) q(this, b2, b2 + 7), q(this, b2 + 1, b2 + 6), q(this, b2 + 2, b2 + 5), q(this, b2 + 3, b2 + 4);
        return this;
      }, h.prototype.toString = function() {
        let a2 = this.length;
        return 0 === a2 ? "" : 0 == arguments.length ? t(this, 0, a2) : p.apply(this, arguments);
      }, h.prototype.toLocaleString = h.prototype.toString, h.prototype.equals = function(a2) {
        if (!h.isBuffer(a2)) throw TypeError("Argument must be a Buffer");
        return this === a2 || 0 === h.compare(this, a2);
      }, h.prototype.inspect = function() {
        let a2 = "", c2 = b.INSPECT_MAX_BYTES;
        return a2 = this.toString("hex", 0, c2).replace(/(.{2})/g, "$1 ").trim(), this.length > c2 && (a2 += " ... "), "<Buffer " + a2 + ">";
      }, f && (h.prototype[f] = h.prototype.inspect), h.prototype.compare = function(a2, b2, c2, d2, e2) {
        if (L(a2, Uint8Array) && (a2 = h.from(a2, a2.offset, a2.byteLength)), !h.isBuffer(a2)) throw TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof a2);
        if (void 0 === b2 && (b2 = 0), void 0 === c2 && (c2 = a2 ? a2.length : 0), void 0 === d2 && (d2 = 0), void 0 === e2 && (e2 = this.length), b2 < 0 || c2 > a2.length || d2 < 0 || e2 > this.length) throw RangeError("out of range index");
        if (d2 >= e2 && b2 >= c2) return 0;
        if (d2 >= e2) return -1;
        if (b2 >= c2) return 1;
        if (b2 >>>= 0, c2 >>>= 0, d2 >>>= 0, e2 >>>= 0, this === a2) return 0;
        let f2 = e2 - d2, g2 = c2 - b2, i2 = Math.min(f2, g2), j2 = this.slice(d2, e2), k2 = a2.slice(b2, c2);
        for (let a3 = 0; a3 < i2; ++a3) if (j2[a3] !== k2[a3]) {
          f2 = j2[a3], g2 = k2[a3];
          break;
        }
        return f2 < g2 ? -1 : +(g2 < f2);
      }, h.prototype.includes = function(a2, b2, c2) {
        return -1 !== this.indexOf(a2, b2, c2);
      }, h.prototype.indexOf = function(a2, b2, c2) {
        return r(this, a2, b2, c2, true);
      }, h.prototype.lastIndexOf = function(a2, b2, c2) {
        return r(this, a2, b2, c2, false);
      }, h.prototype.write = function(a2, b2, c2, d2) {
        var e2, f2, g2, h2, i2, j2, k2, l2;
        if (void 0 === b2) d2 = "utf8", c2 = this.length, b2 = 0;
        else if (void 0 === c2 && "string" == typeof b2) d2 = b2, c2 = this.length, b2 = 0;
        else if (isFinite(b2)) b2 >>>= 0, isFinite(c2) ? (c2 >>>= 0, void 0 === d2 && (d2 = "utf8")) : (d2 = c2, c2 = void 0);
        else throw Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
        let m2 = this.length - b2;
        if ((void 0 === c2 || c2 > m2) && (c2 = m2), a2.length > 0 && (c2 < 0 || b2 < 0) || b2 > this.length) throw RangeError("Attempt to write outside buffer bounds");
        d2 || (d2 = "utf8");
        let n2 = false;
        for (; ; ) switch (d2) {
          case "hex":
            return function(a3, b3, c3, d3) {
              let e3;
              c3 = Number(c3) || 0;
              let f3 = a3.length - c3;
              d3 ? (d3 = Number(d3)) > f3 && (d3 = f3) : d3 = f3;
              let g3 = b3.length;
              for (d3 > g3 / 2 && (d3 = g3 / 2), e3 = 0; e3 < d3; ++e3) {
                var h3;
                let d4 = parseInt(b3.substr(2 * e3, 2), 16);
                if ((h3 = d4) != h3) break;
                a3[c3 + e3] = d4;
              }
              return e3;
            }(this, a2, b2, c2);
          case "utf8":
          case "utf-8":
            return e2 = b2, f2 = c2, K(I(a2, this.length - e2), this, e2, f2);
          case "ascii":
          case "latin1":
          case "binary":
            return g2 = b2, h2 = c2, K(function(a3) {
              let b3 = [];
              for (let c3 = 0; c3 < a3.length; ++c3) b3.push(255 & a3.charCodeAt(c3));
              return b3;
            }(a2), this, g2, h2);
          case "base64":
            return i2 = b2, j2 = c2, K(J(a2), this, i2, j2);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return k2 = b2, l2 = c2, K(function(a3, b3) {
              let c3, d3, e3 = [];
              for (let f3 = 0; f3 < a3.length && !((b3 -= 2) < 0); ++f3) d3 = (c3 = a3.charCodeAt(f3)) >> 8, e3.push(c3 % 256), e3.push(d3);
              return e3;
            }(a2, this.length - k2), this, k2, l2);
          default:
            if (n2) throw TypeError("Unknown encoding: " + d2);
            d2 = ("" + d2).toLowerCase(), n2 = true;
        }
      }, h.prototype.toJSON = function() {
        return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
      }, h.prototype.slice = function(a2, b2) {
        let c2 = this.length;
        a2 = ~~a2, b2 = void 0 === b2 ? c2 : ~~b2, a2 < 0 ? (a2 += c2) < 0 && (a2 = 0) : a2 > c2 && (a2 = c2), b2 < 0 ? (b2 += c2) < 0 && (b2 = 0) : b2 > c2 && (b2 = c2), b2 < a2 && (b2 = a2);
        let d2 = this.subarray(a2, b2);
        return Object.setPrototypeOf(d2, h.prototype), d2;
      }, h.prototype.readUintLE = h.prototype.readUIntLE = function(a2, b2, c2) {
        a2 >>>= 0, b2 >>>= 0, c2 || u(a2, b2, this.length);
        let d2 = this[a2], e2 = 1, f2 = 0;
        for (; ++f2 < b2 && (e2 *= 256); ) d2 += this[a2 + f2] * e2;
        return d2;
      }, h.prototype.readUintBE = h.prototype.readUIntBE = function(a2, b2, c2) {
        a2 >>>= 0, b2 >>>= 0, c2 || u(a2, b2, this.length);
        let d2 = this[a2 + --b2], e2 = 1;
        for (; b2 > 0 && (e2 *= 256); ) d2 += this[a2 + --b2] * e2;
        return d2;
      }, h.prototype.readUint8 = h.prototype.readUInt8 = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 1, this.length), this[a2];
      }, h.prototype.readUint16LE = h.prototype.readUInt16LE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 2, this.length), this[a2] | this[a2 + 1] << 8;
      }, h.prototype.readUint16BE = h.prototype.readUInt16BE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 2, this.length), this[a2] << 8 | this[a2 + 1];
      }, h.prototype.readUint32LE = h.prototype.readUInt32LE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 4, this.length), (this[a2] | this[a2 + 1] << 8 | this[a2 + 2] << 16) + 16777216 * this[a2 + 3];
      }, h.prototype.readUint32BE = h.prototype.readUInt32BE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 4, this.length), 16777216 * this[a2] + (this[a2 + 1] << 16 | this[a2 + 2] << 8 | this[a2 + 3]);
      }, h.prototype.readBigUInt64LE = N(function(a2) {
        F(a2 >>>= 0, "offset");
        let b2 = this[a2], c2 = this[a2 + 7];
        (void 0 === b2 || void 0 === c2) && G(a2, this.length - 8);
        let d2 = b2 + 256 * this[++a2] + 65536 * this[++a2] + 16777216 * this[++a2], e2 = this[++a2] + 256 * this[++a2] + 65536 * this[++a2] + 16777216 * c2;
        return BigInt(d2) + (BigInt(e2) << BigInt(32));
      }), h.prototype.readBigUInt64BE = N(function(a2) {
        F(a2 >>>= 0, "offset");
        let b2 = this[a2], c2 = this[a2 + 7];
        (void 0 === b2 || void 0 === c2) && G(a2, this.length - 8);
        let d2 = 16777216 * b2 + 65536 * this[++a2] + 256 * this[++a2] + this[++a2], e2 = 16777216 * this[++a2] + 65536 * this[++a2] + 256 * this[++a2] + c2;
        return (BigInt(d2) << BigInt(32)) + BigInt(e2);
      }), h.prototype.readIntLE = function(a2, b2, c2) {
        a2 >>>= 0, b2 >>>= 0, c2 || u(a2, b2, this.length);
        let d2 = this[a2], e2 = 1, f2 = 0;
        for (; ++f2 < b2 && (e2 *= 256); ) d2 += this[a2 + f2] * e2;
        return d2 >= (e2 *= 128) && (d2 -= Math.pow(2, 8 * b2)), d2;
      }, h.prototype.readIntBE = function(a2, b2, c2) {
        a2 >>>= 0, b2 >>>= 0, c2 || u(a2, b2, this.length);
        let d2 = b2, e2 = 1, f2 = this[a2 + --d2];
        for (; d2 > 0 && (e2 *= 256); ) f2 += this[a2 + --d2] * e2;
        return f2 >= (e2 *= 128) && (f2 -= Math.pow(2, 8 * b2)), f2;
      }, h.prototype.readInt8 = function(a2, b2) {
        return (a2 >>>= 0, b2 || u(a2, 1, this.length), 128 & this[a2]) ? -((255 - this[a2] + 1) * 1) : this[a2];
      }, h.prototype.readInt16LE = function(a2, b2) {
        a2 >>>= 0, b2 || u(a2, 2, this.length);
        let c2 = this[a2] | this[a2 + 1] << 8;
        return 32768 & c2 ? 4294901760 | c2 : c2;
      }, h.prototype.readInt16BE = function(a2, b2) {
        a2 >>>= 0, b2 || u(a2, 2, this.length);
        let c2 = this[a2 + 1] | this[a2] << 8;
        return 32768 & c2 ? 4294901760 | c2 : c2;
      }, h.prototype.readInt32LE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 4, this.length), this[a2] | this[a2 + 1] << 8 | this[a2 + 2] << 16 | this[a2 + 3] << 24;
      }, h.prototype.readInt32BE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 4, this.length), this[a2] << 24 | this[a2 + 1] << 16 | this[a2 + 2] << 8 | this[a2 + 3];
      }, h.prototype.readBigInt64LE = N(function(a2) {
        F(a2 >>>= 0, "offset");
        let b2 = this[a2], c2 = this[a2 + 7];
        return (void 0 === b2 || void 0 === c2) && G(a2, this.length - 8), (BigInt(this[a2 + 4] + 256 * this[a2 + 5] + 65536 * this[a2 + 6] + (c2 << 24)) << BigInt(32)) + BigInt(b2 + 256 * this[++a2] + 65536 * this[++a2] + 16777216 * this[++a2]);
      }), h.prototype.readBigInt64BE = N(function(a2) {
        F(a2 >>>= 0, "offset");
        let b2 = this[a2], c2 = this[a2 + 7];
        return (void 0 === b2 || void 0 === c2) && G(a2, this.length - 8), (BigInt((b2 << 24) + 65536 * this[++a2] + 256 * this[++a2] + this[++a2]) << BigInt(32)) + BigInt(16777216 * this[++a2] + 65536 * this[++a2] + 256 * this[++a2] + c2);
      }), h.prototype.readFloatLE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 4, this.length), e.read(this, a2, true, 23, 4);
      }, h.prototype.readFloatBE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 4, this.length), e.read(this, a2, false, 23, 4);
      }, h.prototype.readDoubleLE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 8, this.length), e.read(this, a2, true, 52, 8);
      }, h.prototype.readDoubleBE = function(a2, b2) {
        return a2 >>>= 0, b2 || u(a2, 8, this.length), e.read(this, a2, false, 52, 8);
      }, h.prototype.writeUintLE = h.prototype.writeUIntLE = function(a2, b2, c2, d2) {
        if (a2 *= 1, b2 >>>= 0, c2 >>>= 0, !d2) {
          let d3 = Math.pow(2, 8 * c2) - 1;
          v(this, a2, b2, c2, d3, 0);
        }
        let e2 = 1, f2 = 0;
        for (this[b2] = 255 & a2; ++f2 < c2 && (e2 *= 256); ) this[b2 + f2] = a2 / e2 & 255;
        return b2 + c2;
      }, h.prototype.writeUintBE = h.prototype.writeUIntBE = function(a2, b2, c2, d2) {
        if (a2 *= 1, b2 >>>= 0, c2 >>>= 0, !d2) {
          let d3 = Math.pow(2, 8 * c2) - 1;
          v(this, a2, b2, c2, d3, 0);
        }
        let e2 = c2 - 1, f2 = 1;
        for (this[b2 + e2] = 255 & a2; --e2 >= 0 && (f2 *= 256); ) this[b2 + e2] = a2 / f2 & 255;
        return b2 + c2;
      }, h.prototype.writeUint8 = h.prototype.writeUInt8 = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 1, 255, 0), this[b2] = 255 & a2, b2 + 1;
      }, h.prototype.writeUint16LE = h.prototype.writeUInt16LE = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 2, 65535, 0), this[b2] = 255 & a2, this[b2 + 1] = a2 >>> 8, b2 + 2;
      }, h.prototype.writeUint16BE = h.prototype.writeUInt16BE = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 2, 65535, 0), this[b2] = a2 >>> 8, this[b2 + 1] = 255 & a2, b2 + 2;
      }, h.prototype.writeUint32LE = h.prototype.writeUInt32LE = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 4, 4294967295, 0), this[b2 + 3] = a2 >>> 24, this[b2 + 2] = a2 >>> 16, this[b2 + 1] = a2 >>> 8, this[b2] = 255 & a2, b2 + 4;
      }, h.prototype.writeUint32BE = h.prototype.writeUInt32BE = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 4, 4294967295, 0), this[b2] = a2 >>> 24, this[b2 + 1] = a2 >>> 16, this[b2 + 2] = a2 >>> 8, this[b2 + 3] = 255 & a2, b2 + 4;
      }, h.prototype.writeBigUInt64LE = N(function(a2, b2 = 0) {
        return w(this, a2, b2, BigInt(0), BigInt("0xffffffffffffffff"));
      }), h.prototype.writeBigUInt64BE = N(function(a2, b2 = 0) {
        return x(this, a2, b2, BigInt(0), BigInt("0xffffffffffffffff"));
      }), h.prototype.writeIntLE = function(a2, b2, c2, d2) {
        if (a2 *= 1, b2 >>>= 0, !d2) {
          let d3 = Math.pow(2, 8 * c2 - 1);
          v(this, a2, b2, c2, d3 - 1, -d3);
        }
        let e2 = 0, f2 = 1, g2 = 0;
        for (this[b2] = 255 & a2; ++e2 < c2 && (f2 *= 256); ) a2 < 0 && 0 === g2 && 0 !== this[b2 + e2 - 1] && (g2 = 1), this[b2 + e2] = (a2 / f2 | 0) - g2 & 255;
        return b2 + c2;
      }, h.prototype.writeIntBE = function(a2, b2, c2, d2) {
        if (a2 *= 1, b2 >>>= 0, !d2) {
          let d3 = Math.pow(2, 8 * c2 - 1);
          v(this, a2, b2, c2, d3 - 1, -d3);
        }
        let e2 = c2 - 1, f2 = 1, g2 = 0;
        for (this[b2 + e2] = 255 & a2; --e2 >= 0 && (f2 *= 256); ) a2 < 0 && 0 === g2 && 0 !== this[b2 + e2 + 1] && (g2 = 1), this[b2 + e2] = (a2 / f2 | 0) - g2 & 255;
        return b2 + c2;
      }, h.prototype.writeInt8 = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 1, 127, -128), a2 < 0 && (a2 = 255 + a2 + 1), this[b2] = 255 & a2, b2 + 1;
      }, h.prototype.writeInt16LE = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 2, 32767, -32768), this[b2] = 255 & a2, this[b2 + 1] = a2 >>> 8, b2 + 2;
      }, h.prototype.writeInt16BE = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 2, 32767, -32768), this[b2] = a2 >>> 8, this[b2 + 1] = 255 & a2, b2 + 2;
      }, h.prototype.writeInt32LE = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 4, 2147483647, -2147483648), this[b2] = 255 & a2, this[b2 + 1] = a2 >>> 8, this[b2 + 2] = a2 >>> 16, this[b2 + 3] = a2 >>> 24, b2 + 4;
      }, h.prototype.writeInt32BE = function(a2, b2, c2) {
        return a2 *= 1, b2 >>>= 0, c2 || v(this, a2, b2, 4, 2147483647, -2147483648), a2 < 0 && (a2 = 4294967295 + a2 + 1), this[b2] = a2 >>> 24, this[b2 + 1] = a2 >>> 16, this[b2 + 2] = a2 >>> 8, this[b2 + 3] = 255 & a2, b2 + 4;
      }, h.prototype.writeBigInt64LE = N(function(a2, b2 = 0) {
        return w(this, a2, b2, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      }), h.prototype.writeBigInt64BE = N(function(a2, b2 = 0) {
        return x(this, a2, b2, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      }), h.prototype.writeFloatLE = function(a2, b2, c2) {
        return z(this, a2, b2, true, c2);
      }, h.prototype.writeFloatBE = function(a2, b2, c2) {
        return z(this, a2, b2, false, c2);
      }, h.prototype.writeDoubleLE = function(a2, b2, c2) {
        return A(this, a2, b2, true, c2);
      }, h.prototype.writeDoubleBE = function(a2, b2, c2) {
        return A(this, a2, b2, false, c2);
      }, h.prototype.copy = function(a2, b2, c2, d2) {
        if (!h.isBuffer(a2)) throw TypeError("argument should be a Buffer");
        if (c2 || (c2 = 0), d2 || 0 === d2 || (d2 = this.length), b2 >= a2.length && (b2 = a2.length), b2 || (b2 = 0), d2 > 0 && d2 < c2 && (d2 = c2), d2 === c2 || 0 === a2.length || 0 === this.length) return 0;
        if (b2 < 0) throw RangeError("targetStart out of bounds");
        if (c2 < 0 || c2 >= this.length) throw RangeError("Index out of range");
        if (d2 < 0) throw RangeError("sourceEnd out of bounds");
        d2 > this.length && (d2 = this.length), a2.length - b2 < d2 - c2 && (d2 = a2.length - b2 + c2);
        let e2 = d2 - c2;
        return this === a2 && "function" == typeof Uint8Array.prototype.copyWithin ? this.copyWithin(b2, c2, d2) : Uint8Array.prototype.set.call(a2, this.subarray(c2, d2), b2), e2;
      }, h.prototype.fill = function(a2, b2, c2, d2) {
        let e2;
        if ("string" == typeof a2) {
          if ("string" == typeof b2 ? (d2 = b2, b2 = 0, c2 = this.length) : "string" == typeof c2 && (d2 = c2, c2 = this.length), void 0 !== d2 && "string" != typeof d2) throw TypeError("encoding must be a string");
          if ("string" == typeof d2 && !h.isEncoding(d2)) throw TypeError("Unknown encoding: " + d2);
          if (1 === a2.length) {
            let b3 = a2.charCodeAt(0);
            ("utf8" === d2 && b3 < 128 || "latin1" === d2) && (a2 = b3);
          }
        } else "number" == typeof a2 ? a2 &= 255 : "boolean" == typeof a2 && (a2 = Number(a2));
        if (b2 < 0 || this.length < b2 || this.length < c2) throw RangeError("Out of range index");
        if (c2 <= b2) return this;
        if (b2 >>>= 0, c2 = void 0 === c2 ? this.length : c2 >>> 0, a2 || (a2 = 0), "number" == typeof a2) for (e2 = b2; e2 < c2; ++e2) this[e2] = a2;
        else {
          let f2 = h.isBuffer(a2) ? a2 : h.from(a2, d2), g2 = f2.length;
          if (0 === g2) throw TypeError('The value "' + a2 + '" is invalid for argument "value"');
          for (e2 = 0; e2 < c2 - b2; ++e2) this[e2 + b2] = f2[e2 % g2];
        }
        return this;
      };
      let B = {};
      function C(a2, b2, c2) {
        B[a2] = class extends c2 {
          constructor() {
            super(), Object.defineProperty(this, "message", { value: b2.apply(this, arguments), writable: true, configurable: true }), this.name = `${this.name} [${a2}]`, this.stack, delete this.name;
          }
          get code() {
            return a2;
          }
          set code(a3) {
            Object.defineProperty(this, "code", { configurable: true, enumerable: true, value: a3, writable: true });
          }
          toString() {
            return `${this.name} [${a2}]: ${this.message}`;
          }
        };
      }
      function D(a2) {
        let b2 = "", c2 = a2.length, d2 = +("-" === a2[0]);
        for (; c2 >= d2 + 4; c2 -= 3) b2 = `_${a2.slice(c2 - 3, c2)}${b2}`;
        return `${a2.slice(0, c2)}${b2}`;
      }
      function E(a2, b2, c2, d2, e2, f2) {
        if (a2 > c2 || a2 < b2) {
          let d3, e3 = "bigint" == typeof b2 ? "n" : "";
          throw d3 = f2 > 3 ? 0 === b2 || b2 === BigInt(0) ? `>= 0${e3} and < 2${e3} ** ${(f2 + 1) * 8}${e3}` : `>= -(2${e3} ** ${(f2 + 1) * 8 - 1}${e3}) and < 2 ** ${(f2 + 1) * 8 - 1}${e3}` : `>= ${b2}${e3} and <= ${c2}${e3}`, new B.ERR_OUT_OF_RANGE("value", d3, a2);
        }
        F(e2, "offset"), (void 0 === d2[e2] || void 0 === d2[e2 + f2]) && G(e2, d2.length - (f2 + 1));
      }
      function F(a2, b2) {
        if ("number" != typeof a2) throw new B.ERR_INVALID_ARG_TYPE(b2, "number", a2);
      }
      function G(a2, b2, c2) {
        if (Math.floor(a2) !== a2) throw F(a2, c2), new B.ERR_OUT_OF_RANGE(c2 || "offset", "an integer", a2);
        if (b2 < 0) throw new B.ERR_BUFFER_OUT_OF_BOUNDS();
        throw new B.ERR_OUT_OF_RANGE(c2 || "offset", `>= ${+!!c2} and <= ${b2}`, a2);
      }
      C("ERR_BUFFER_OUT_OF_BOUNDS", function(a2) {
        return a2 ? `${a2} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
      }, RangeError), C("ERR_INVALID_ARG_TYPE", function(a2, b2) {
        return `The "${a2}" argument must be of type number. Received type ${typeof b2}`;
      }, TypeError), C("ERR_OUT_OF_RANGE", function(a2, b2, c2) {
        let d2 = `The value of "${a2}" is out of range.`, e2 = c2;
        return Number.isInteger(c2) && Math.abs(c2) > 4294967296 ? e2 = D(String(c2)) : "bigint" == typeof c2 && (e2 = String(c2), (c2 > BigInt(2) ** BigInt(32) || c2 < -(BigInt(2) ** BigInt(32))) && (e2 = D(e2)), e2 += "n"), d2 += ` It must be ${b2}. Received ${e2}`;
      }, RangeError);
      let H = /[^+/0-9A-Za-z-_]/g;
      function I(a2, b2) {
        let c2;
        b2 = b2 || 1 / 0;
        let d2 = a2.length, e2 = null, f2 = [];
        for (let g2 = 0; g2 < d2; ++g2) {
          if ((c2 = a2.charCodeAt(g2)) > 55295 && c2 < 57344) {
            if (!e2) {
              if (c2 > 56319 || g2 + 1 === d2) {
                (b2 -= 3) > -1 && f2.push(239, 191, 189);
                continue;
              }
              e2 = c2;
              continue;
            }
            if (c2 < 56320) {
              (b2 -= 3) > -1 && f2.push(239, 191, 189), e2 = c2;
              continue;
            }
            c2 = (e2 - 55296 << 10 | c2 - 56320) + 65536;
          } else e2 && (b2 -= 3) > -1 && f2.push(239, 191, 189);
          if (e2 = null, c2 < 128) {
            if ((b2 -= 1) < 0) break;
            f2.push(c2);
          } else if (c2 < 2048) {
            if ((b2 -= 2) < 0) break;
            f2.push(c2 >> 6 | 192, 63 & c2 | 128);
          } else if (c2 < 65536) {
            if ((b2 -= 3) < 0) break;
            f2.push(c2 >> 12 | 224, c2 >> 6 & 63 | 128, 63 & c2 | 128);
          } else if (c2 < 1114112) {
            if ((b2 -= 4) < 0) break;
            f2.push(c2 >> 18 | 240, c2 >> 12 & 63 | 128, c2 >> 6 & 63 | 128, 63 & c2 | 128);
          } else throw Error("Invalid code point");
        }
        return f2;
      }
      function J(a2) {
        return d.toByteArray(function(a3) {
          if ((a3 = (a3 = a3.split("=")[0]).trim().replace(H, "")).length < 2) return "";
          for (; a3.length % 4 != 0; ) a3 += "=";
          return a3;
        }(a2));
      }
      function K(a2, b2, c2, d2) {
        let e2;
        for (e2 = 0; e2 < d2 && !(e2 + c2 >= b2.length) && !(e2 >= a2.length); ++e2) b2[e2 + c2] = a2[e2];
        return e2;
      }
      function L(a2, b2) {
        return a2 instanceof b2 || null != a2 && null != a2.constructor && null != a2.constructor.name && a2.constructor.name === b2.name;
      }
      let M = function() {
        let a2 = "0123456789abcdef", b2 = Array(256);
        for (let c2 = 0; c2 < 16; ++c2) {
          let d2 = 16 * c2;
          for (let e2 = 0; e2 < 16; ++e2) b2[d2 + e2] = a2[c2] + a2[e2];
        }
        return b2;
      }();
      function N(a2) {
        return "undefined" == typeof BigInt ? O : a2;
      }
      function O() {
        throw Error("BigInt not supported");
      }
    }, 3455: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.ConflictException = void 0;
      class c extends Error {
        constructor({ error: a2, message: b2, requestID: c2 }) {
          super(), this.status = 409, this.name = "ConflictException", this.requestID = c2, b2 ? this.message = b2 : a2 ? this.message = `Error: ${a2}` : this.message = "An conflict has occurred on the server.";
        }
      }
      b.ConflictException = c;
    }, 3525: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 3542: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 3557: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.FetchHttpClientResponse = b.FetchHttpClient = void 0;
      let e = c(9245), f = c(9582);
      class g extends e.HttpClient {
        constructor(a2, b2, c2) {
          if (super(a2, b2), this.baseURL = a2, this.options = b2, !c2) {
            if (!globalThis.fetch) throw Error("Fetch function not defined in the global scope and no replacement was provided.");
            c2 = globalThis.fetch;
          }
          this._fetchFn = c2.bind(globalThis);
        }
        getClientName() {
          return "fetch";
        }
        get(a2, b2) {
          return d(this, void 0, void 0, function* () {
            let c2 = e.HttpClient.getResourceURL(this.baseURL, a2, b2.params);
            return a2.startsWith("/fga/") ? yield this.fetchRequestWithRetry(c2, "GET", null, b2.headers) : yield this.fetchRequest(c2, "GET", null, b2.headers);
          });
        }
        post(a2, b2, c2) {
          return d(this, void 0, void 0, function* () {
            let d2 = e.HttpClient.getResourceURL(this.baseURL, a2, c2.params);
            return a2.startsWith("/fga/") ? yield this.fetchRequestWithRetry(d2, "POST", e.HttpClient.getBody(b2), Object.assign(Object.assign({}, e.HttpClient.getContentTypeHeader(b2)), c2.headers)) : yield this.fetchRequest(d2, "POST", e.HttpClient.getBody(b2), Object.assign(Object.assign({}, e.HttpClient.getContentTypeHeader(b2)), c2.headers));
          });
        }
        put(a2, b2, c2) {
          return d(this, void 0, void 0, function* () {
            let d2 = e.HttpClient.getResourceURL(this.baseURL, a2, c2.params);
            return a2.startsWith("/fga/") ? yield this.fetchRequestWithRetry(d2, "PUT", e.HttpClient.getBody(b2), Object.assign(Object.assign({}, e.HttpClient.getContentTypeHeader(b2)), c2.headers)) : yield this.fetchRequest(d2, "PUT", e.HttpClient.getBody(b2), Object.assign(Object.assign({}, e.HttpClient.getContentTypeHeader(b2)), c2.headers));
          });
        }
        delete(a2, b2) {
          return d(this, void 0, void 0, function* () {
            let c2 = e.HttpClient.getResourceURL(this.baseURL, a2, b2.params);
            return a2.startsWith("/fga/") ? yield this.fetchRequestWithRetry(c2, "DELETE", null, b2.headers) : yield this.fetchRequest(c2, "DELETE", null, b2.headers);
          });
        }
        fetchRequest(a2, b2, c2, g2) {
          var i, j, k, l, m;
          return d(this, void 0, void 0, function* () {
            let d2, n, o = "POST" === b2 || "PUT" === b2 || "PATCH" === b2, { "User-Agent": p } = (null == (i = this.options) ? void 0 : i.headers) || {}, q = null != (k = null == (j = this.options) ? void 0 : j.timeout) ? k : 6e4;
            d2 = new AbortController(), n = setTimeout(() => {
              null == d2 || d2.abort();
            }, q);
            try {
              let i2 = yield this._fetchFn(a2, { method: b2, headers: Object.assign(Object.assign(Object.assign({ Accept: "application/json, text/plain, */*", "Content-Type": "application/json" }, null == (l = this.options) ? void 0 : l.headers), g2), { "User-Agent": this.addClientToUserAgent((p || "workos-node").toString()) }), body: c2 || (o ? "" : void 0), signal: null == d2 ? void 0 : d2.signal });
              if (n && clearTimeout(n), !i2.ok) {
                let a3, b3 = null != (m = i2.headers.get("X-Request-ID")) ? m : "", c3 = yield i2.text();
                try {
                  a3 = JSON.parse(c3);
                } catch (a4) {
                  if (a4 instanceof SyntaxError) throw new f.ParseError({ message: a4.message, rawBody: c3, requestID: b3, rawStatus: i2.status });
                  throw a4;
                }
                throw new e.HttpClientError({ message: i2.statusText, response: { status: i2.status, headers: i2.headers, data: a3 } });
              }
              return new h(i2);
            } catch (a3) {
              if (n && clearTimeout(n), a3 instanceof Error && "AbortError" === a3.name) throw new e.HttpClientError({ message: `Request timeout after ${q}ms`, response: { status: 408, headers: {}, data: { error: "Request timeout" } } });
              throw a3;
            }
          });
        }
        fetchRequestWithRetry(a2, b2, c2, e2) {
          return d(this, void 0, void 0, function* () {
            let f2, g2 = 1, h2 = () => d(this, void 0, void 0, function* () {
              let d2 = null;
              try {
                f2 = yield this.fetchRequest(a2, b2, c2, e2);
              } catch (a3) {
                d2 = a3;
              }
              if (this.shouldRetryRequest(d2, g2)) return g2++, yield this.sleep(g2), h2();
              if (null != d2) throw d2;
              return f2;
            });
            return h2();
          });
        }
        shouldRetryRequest(a2, b2) {
          return !(b2 > this.MAX_RETRY_ATTEMPTS) && (!!(null != a2 && (a2 instanceof TypeError || a2 instanceof e.HttpClientError && this.RETRY_STATUS_CODES.includes(a2.response.status))) || false);
        }
      }
      b.FetchHttpClient = g;
      class h extends e.HttpClientResponse {
        constructor(a2) {
          super(a2.status, h._transformHeadersToObject(a2.headers)), this._res = a2;
        }
        getRawResponse() {
          return this._res;
        }
        toJSON() {
          let a2 = this._res.headers.get("content-type");
          return (null == a2 ? void 0 : a2.includes("application/json")) ? this._res.json() : null;
        }
        static _transformHeadersToObject(a2) {
          let b2 = {};
          for (let c2 of Object.entries(a2)) {
            if (!Array.isArray(c2) || 2 !== c2.length) throw Error("Response objects produced by the fetch function given to FetchHttpClient do not have an iterable headers map. Response#headers should be an iterable object.");
            b2[c2[0]] = c2[1];
          }
          return b2;
        }
      }
      b.FetchHttpClientResponse = h;
    }, 3727: (a, b, c) => {
      "use strict";
      var d = c(1741), e = Object.prototype.hasOwnProperty, f = Array.isArray, g = { allowDots: false, allowEmptyArrays: false, allowPrototypes: false, allowSparse: false, arrayLimit: 20, charset: "utf-8", charsetSentinel: false, comma: false, decodeDotInKeys: false, decoder: d.decode, delimiter: "&", depth: 5, duplicates: "combine", ignoreQueryPrefix: false, interpretNumericEntities: false, parameterLimit: 1e3, parseArrays: true, plainObjects: false, strictDepth: false, strictNullHandling: false, throwOnLimitExceeded: false }, h = function(a2, b2, c2) {
        if (a2 && "string" == typeof a2 && b2.comma && a2.indexOf(",") > -1) return a2.split(",");
        if (b2.throwOnLimitExceeded && c2 >= b2.arrayLimit) throw RangeError("Array limit exceeded. Only " + b2.arrayLimit + " element" + (1 === b2.arrayLimit ? "" : "s") + " allowed in an array.");
        return a2;
      }, i = function(a2, b2) {
        var c2 = { __proto__: null }, i2 = b2.ignoreQueryPrefix ? a2.replace(/^\?/, "") : a2;
        i2 = i2.replace(/%5B/gi, "[").replace(/%5D/gi, "]");
        var j2 = b2.parameterLimit === 1 / 0 ? void 0 : b2.parameterLimit, k2 = i2.split(b2.delimiter, b2.throwOnLimitExceeded ? j2 + 1 : j2);
        if (b2.throwOnLimitExceeded && k2.length > j2) throw RangeError("Parameter limit exceeded. Only " + j2 + " parameter" + (1 === j2 ? "" : "s") + " allowed.");
        var l2 = -1, m = b2.charset;
        if (b2.charsetSentinel) for (n = 0; n < k2.length; ++n) 0 === k2[n].indexOf("utf8=") && ("utf8=%E2%9C%93" === k2[n] ? m = "utf-8" : "utf8=%26%2310003%3B" === k2[n] && (m = "iso-8859-1"), l2 = n, n = k2.length);
        for (n = 0; n < k2.length; ++n) if (n !== l2) {
          var n, o, p, q = k2[n], r = q.indexOf("]="), s = -1 === r ? q.indexOf("=") : r + 1;
          -1 === s ? (o = b2.decoder(q, g.decoder, m, "key"), p = b2.strictNullHandling ? null : "") : (o = b2.decoder(q.slice(0, s), g.decoder, m, "key"), p = d.maybeMap(h(q.slice(s + 1), b2, f(c2[o]) ? c2[o].length : 0), function(a3) {
            return b2.decoder(a3, g.decoder, m, "value");
          })), p && b2.interpretNumericEntities && "iso-8859-1" === m && (p = String(p).replace(/&#(\d+);/g, function(a3, b3) {
            return String.fromCharCode(parseInt(b3, 10));
          })), q.indexOf("[]=") > -1 && (p = f(p) ? [p] : p);
          var t = e.call(c2, o);
          t && "combine" === b2.duplicates ? c2[o] = d.combine(c2[o], p) : t && "last" !== b2.duplicates || (c2[o] = p);
        }
        return c2;
      }, j = function(a2, b2, c2, e2) {
        var f2 = 0;
        if (a2.length > 0 && "[]" === a2[a2.length - 1]) {
          var g2 = a2.slice(0, -1).join("");
          f2 = Array.isArray(b2) && b2[g2] ? b2[g2].length : 0;
        }
        for (var i2 = e2 ? b2 : h(b2, c2, f2), j2 = a2.length - 1; j2 >= 0; --j2) {
          var k2, l2 = a2[j2];
          if ("[]" === l2 && c2.parseArrays) k2 = c2.allowEmptyArrays && ("" === i2 || c2.strictNullHandling && null === i2) ? [] : d.combine([], i2);
          else {
            k2 = c2.plainObjects ? { __proto__: null } : {};
            var m = "[" === l2.charAt(0) && "]" === l2.charAt(l2.length - 1) ? l2.slice(1, -1) : l2, n = c2.decodeDotInKeys ? m.replace(/%2E/g, ".") : m, o = parseInt(n, 10);
            c2.parseArrays || "" !== n ? !isNaN(o) && l2 !== n && String(o) === n && o >= 0 && c2.parseArrays && o <= c2.arrayLimit ? (k2 = [])[o] = i2 : "__proto__" !== n && (k2[n] = i2) : k2 = { 0: i2 };
          }
          i2 = k2;
        }
        return i2;
      }, k = function(a2, b2, c2, d2) {
        if (a2) {
          var f2 = c2.allowDots ? a2.replace(/\.([^.[]+)/g, "[$1]") : a2, g2 = /(\[[^[\]]*])/g, h2 = c2.depth > 0 && /(\[[^[\]]*])/.exec(f2), i2 = h2 ? f2.slice(0, h2.index) : f2, k2 = [];
          if (i2) {
            if (!c2.plainObjects && e.call(Object.prototype, i2) && !c2.allowPrototypes) return;
            k2.push(i2);
          }
          for (var l2 = 0; c2.depth > 0 && null !== (h2 = g2.exec(f2)) && l2 < c2.depth; ) {
            if (l2 += 1, !c2.plainObjects && e.call(Object.prototype, h2[1].slice(1, -1)) && !c2.allowPrototypes) return;
            k2.push(h2[1]);
          }
          if (h2) {
            if (true === c2.strictDepth) throw RangeError("Input depth exceeded depth option of " + c2.depth + " and strictDepth is true");
            k2.push("[" + f2.slice(h2.index) + "]");
          }
          return j(k2, b2, c2, d2);
        }
      }, l = function(a2) {
        if (!a2) return g;
        if (void 0 !== a2.allowEmptyArrays && "boolean" != typeof a2.allowEmptyArrays) throw TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
        if (void 0 !== a2.decodeDotInKeys && "boolean" != typeof a2.decodeDotInKeys) throw TypeError("`decodeDotInKeys` option can only be `true` or `false`, when provided");
        if (null !== a2.decoder && void 0 !== a2.decoder && "function" != typeof a2.decoder) throw TypeError("Decoder has to be a function.");
        if (void 0 !== a2.charset && "utf-8" !== a2.charset && "iso-8859-1" !== a2.charset) throw TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
        if (void 0 !== a2.throwOnLimitExceeded && "boolean" != typeof a2.throwOnLimitExceeded) throw TypeError("`throwOnLimitExceeded` option must be a boolean");
        var b2 = void 0 === a2.charset ? g.charset : a2.charset, c2 = void 0 === a2.duplicates ? g.duplicates : a2.duplicates;
        if ("combine" !== c2 && "first" !== c2 && "last" !== c2) throw TypeError("The duplicates option must be either combine, first, or last");
        return { allowDots: void 0 === a2.allowDots ? true === a2.decodeDotInKeys || g.allowDots : !!a2.allowDots, allowEmptyArrays: "boolean" == typeof a2.allowEmptyArrays ? !!a2.allowEmptyArrays : g.allowEmptyArrays, allowPrototypes: "boolean" == typeof a2.allowPrototypes ? a2.allowPrototypes : g.allowPrototypes, allowSparse: "boolean" == typeof a2.allowSparse ? a2.allowSparse : g.allowSparse, arrayLimit: "number" == typeof a2.arrayLimit ? a2.arrayLimit : g.arrayLimit, charset: b2, charsetSentinel: "boolean" == typeof a2.charsetSentinel ? a2.charsetSentinel : g.charsetSentinel, comma: "boolean" == typeof a2.comma ? a2.comma : g.comma, decodeDotInKeys: "boolean" == typeof a2.decodeDotInKeys ? a2.decodeDotInKeys : g.decodeDotInKeys, decoder: "function" == typeof a2.decoder ? a2.decoder : g.decoder, delimiter: "string" == typeof a2.delimiter || d.isRegExp(a2.delimiter) ? a2.delimiter : g.delimiter, depth: "number" == typeof a2.depth || false === a2.depth ? +a2.depth : g.depth, duplicates: c2, ignoreQueryPrefix: true === a2.ignoreQueryPrefix, interpretNumericEntities: "boolean" == typeof a2.interpretNumericEntities ? a2.interpretNumericEntities : g.interpretNumericEntities, parameterLimit: "number" == typeof a2.parameterLimit ? a2.parameterLimit : g.parameterLimit, parseArrays: false !== a2.parseArrays, plainObjects: "boolean" == typeof a2.plainObjects ? a2.plainObjects : g.plainObjects, strictDepth: "boolean" == typeof a2.strictDepth ? !!a2.strictDepth : g.strictDepth, strictNullHandling: "boolean" == typeof a2.strictNullHandling ? a2.strictNullHandling : g.strictNullHandling, throwOnLimitExceeded: "boolean" == typeof a2.throwOnLimitExceeded && a2.throwOnLimitExceeded };
      };
      a.exports = function(a2, b2) {
        var c2 = l(b2);
        if ("" === a2 || null == a2) return c2.plainObjects ? { __proto__: null } : {};
        for (var e2 = "string" == typeof a2 ? i(a2, c2) : a2, f2 = c2.plainObjects ? { __proto__: null } : {}, g2 = Object.keys(e2), h2 = 0; h2 < g2.length; ++h2) {
          var j2 = g2[h2], m = k(j2, e2[j2], c2, "string" == typeof a2);
          f2 = d.merge(f2, m, c2);
        }
        return true === c2.allowSparse ? f2 : d.compact(f2);
      };
    }, 3766: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i2(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i2(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i2(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i2((d2 = d2.apply(a2, b2 || [])).next());
        });
      }, e = this && this.__rest || function(a2, b2) {
        var c2 = {};
        for (var d2 in a2) Object.prototype.hasOwnProperty.call(a2, d2) && 0 > b2.indexOf(d2) && (c2[d2] = a2[d2]);
        if (null != a2 && "function" == typeof Object.getOwnPropertySymbols) for (var e2 = 0, d2 = Object.getOwnPropertySymbols(a2); e2 < d2.length; e2++) 0 > b2.indexOf(d2[e2]) && Object.prototype.propertyIsEnumerable.call(a2, d2[e2]) && (c2[d2[e2]] = a2[d2[e2]]);
        return c2;
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Organizations = void 0;
      let f = c(6647), g = c(1048), h = c(8877), i = c(9869), j = c(5229);
      class k {
        constructor(a2) {
          this.workos = a2;
        }
        listOrganizations(a2) {
          return d(this, void 0, void 0, function* () {
            return new f.AutoPaginatable(yield (0, h.fetchAndDeserialize)(this.workos, "/organizations", g.deserializeOrganization, a2), (a3) => (0, h.fetchAndDeserialize)(this.workos, "/organizations", g.deserializeOrganization, a3), a2);
          });
        }
        createOrganization(a2, b2 = {}) {
          return d(this, void 0, void 0, function* () {
            let { data: c2 } = yield this.workos.post("/organizations", (0, g.serializeCreateOrganizationOptions)(a2), b2);
            return (0, g.deserializeOrganization)(c2);
          });
        }
        deleteOrganization(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.delete(`/organizations/${a2}`);
          });
        }
        getOrganization(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/organizations/${a2}`);
            return (0, g.deserializeOrganization)(b2);
          });
        }
        getOrganizationByExternalId(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/organizations/external_id/${a2}`);
            return (0, g.deserializeOrganization)(b2);
          });
        }
        updateOrganization(a2) {
          return d(this, void 0, void 0, function* () {
            let { organization: b2 } = a2, c2 = e(a2, ["organization"]), { data: d2 } = yield this.workos.put(`/organizations/${b2}`, (0, g.serializeUpdateOrganizationOptions)(c2));
            return (0, g.deserializeOrganization)(d2);
          });
        }
        listOrganizationRoles(a2) {
          return d(this, void 0, void 0, function* () {
            let { organizationId: b2 } = a2, { data: c2 } = yield this.workos.get(`/organizations/${b2}/roles`);
            return { object: "list", data: c2.data.map((a3) => (0, i.deserializeRole)(a3)) };
          });
        }
        listOrganizationFeatureFlags(a2) {
          return d(this, void 0, void 0, function* () {
            let { organizationId: b2 } = a2, c2 = e(a2, ["organizationId"]);
            return new f.AutoPaginatable(yield (0, h.fetchAndDeserialize)(this.workos, `/organizations/${b2}/feature-flags`, j.deserializeFeatureFlag, c2), (a3) => (0, h.fetchAndDeserialize)(this.workos, `/organizations/${b2}/feature-flags`, j.deserializeFeatureFlag, a3), c2);
          });
        }
      }
      b.Organizations = k;
    }, 3854: function(a) {
      a.exports = function() {
        var a2 = [], b = [], c = {}, d = {}, e = {};
        function f(a3) {
          return "string" == typeof a3 ? RegExp("^" + a3 + "$", "i") : a3;
        }
        function g(a3, b2) {
          return a3 === b2 ? b2 : a3 === a3.toLowerCase() ? b2.toLowerCase() : a3 === a3.toUpperCase() ? b2.toUpperCase() : a3[0] === a3[0].toUpperCase() ? b2.charAt(0).toUpperCase() + b2.substr(1).toLowerCase() : b2.toLowerCase();
        }
        function h(a3, b2, d2) {
          if (!a3.length || c.hasOwnProperty(a3)) return b2;
          for (var e2 = d2.length; e2--; ) {
            var f2 = d2[e2];
            if (f2[0].test(b2)) return function(a4, b3) {
              return a4.replace(b3[0], function(c2, d3) {
                var e3, f3, h2 = (e3 = b3[1], f3 = arguments, e3.replace(/\$(\d{1,2})/g, function(a5, b4) {
                  return f3[b4] || "";
                }));
                return "" === c2 ? g(a4[d3 - 1], h2) : g(c2, h2);
              });
            }(b2, f2);
          }
          return b2;
        }
        function i(a3, b2, c2) {
          return function(d2) {
            var e2 = d2.toLowerCase();
            return b2.hasOwnProperty(e2) ? g(d2, e2) : a3.hasOwnProperty(e2) ? g(d2, a3[e2]) : h(e2, d2, c2);
          };
        }
        function j(a3, b2, c2, d2) {
          return function(d3) {
            var e2 = d3.toLowerCase();
            return !!b2.hasOwnProperty(e2) || !a3.hasOwnProperty(e2) && h(e2, e2, c2) === e2;
          };
        }
        function k(a3, b2, c2) {
          var d2 = 1 === b2 ? k.singular(a3) : k.plural(a3);
          return (c2 ? b2 + " " : "") + d2;
        }
        return k.plural = i(e, d, a2), k.isPlural = j(e, d, a2), k.singular = i(d, e, b), k.isSingular = j(d, e, b), k.addPluralRule = function(b2, c2) {
          a2.push([f(b2), c2]);
        }, k.addSingularRule = function(a3, c2) {
          b.push([f(a3), c2]);
        }, k.addUncountableRule = function(a3) {
          if ("string" == typeof a3) {
            c[a3.toLowerCase()] = true;
            return;
          }
          k.addPluralRule(a3, "$0"), k.addSingularRule(a3, "$0");
        }, k.addIrregularRule = function(a3, b2) {
          b2 = b2.toLowerCase(), e[a3 = a3.toLowerCase()] = b2, d[b2] = a3;
        }, [["I", "we"], ["me", "us"], ["he", "they"], ["she", "they"], ["them", "them"], ["myself", "ourselves"], ["yourself", "yourselves"], ["itself", "themselves"], ["herself", "themselves"], ["himself", "themselves"], ["themself", "themselves"], ["is", "are"], ["was", "were"], ["has", "have"], ["this", "these"], ["that", "those"], ["echo", "echoes"], ["dingo", "dingoes"], ["volcano", "volcanoes"], ["tornado", "tornadoes"], ["torpedo", "torpedoes"], ["genus", "genera"], ["viscus", "viscera"], ["stigma", "stigmata"], ["stoma", "stomata"], ["dogma", "dogmata"], ["lemma", "lemmata"], ["schema", "schemata"], ["anathema", "anathemata"], ["ox", "oxen"], ["axe", "axes"], ["die", "dice"], ["yes", "yeses"], ["foot", "feet"], ["eave", "eaves"], ["goose", "geese"], ["tooth", "teeth"], ["quiz", "quizzes"], ["human", "humans"], ["proof", "proofs"], ["carve", "carves"], ["valve", "valves"], ["looey", "looies"], ["thief", "thieves"], ["groove", "grooves"], ["pickaxe", "pickaxes"], ["passerby", "passersby"]].forEach(function(a3) {
          return k.addIrregularRule(a3[0], a3[1]);
        }), [[/s?$/i, "s"], [/[^\u0000-\u007F]$/i, "$0"], [/([^aeiou]ese)$/i, "$1"], [/(ax|test)is$/i, "$1es"], [/(alias|[^aou]us|t[lm]as|gas|ris)$/i, "$1es"], [/(e[mn]u)s?$/i, "$1s"], [/([^l]ias|[aeiou]las|[ejzr]as|[iu]am)$/i, "$1"], [/(alumn|syllab|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, "$1i"], [/(alumn|alg|vertebr)(?:a|ae)$/i, "$1ae"], [/(seraph|cherub)(?:im)?$/i, "$1im"], [/(her|at|gr)o$/i, "$1oes"], [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|automat|quor)(?:a|um)$/i, "$1a"], [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)(?:a|on)$/i, "$1a"], [/sis$/i, "ses"], [/(?:(kni|wi|li)fe|(ar|l|ea|eo|oa|hoo)f)$/i, "$1$2ves"], [/([^aeiouy]|qu)y$/i, "$1ies"], [/([^ch][ieo][ln])ey$/i, "$1ies"], [/(x|ch|ss|sh|zz)$/i, "$1es"], [/(matr|cod|mur|sil|vert|ind|append)(?:ix|ex)$/i, "$1ices"], [/\b((?:tit)?m|l)(?:ice|ouse)$/i, "$1ice"], [/(pe)(?:rson|ople)$/i, "$1ople"], [/(child)(?:ren)?$/i, "$1ren"], [/eaux$/i, "$0"], [/m[ae]n$/i, "men"], ["thou", "you"]].forEach(function(a3) {
          return k.addPluralRule(a3[0], a3[1]);
        }), [[/s$/i, ""], [/(ss)$/i, "$1"], [/(wi|kni|(?:after|half|high|low|mid|non|night|[^\w]|^)li)ves$/i, "$1fe"], [/(ar|(?:wo|[ae])l|[eo][ao])ves$/i, "$1f"], [/ies$/i, "y"], [/\b([pl]|zomb|(?:neck|cross)?t|coll|faer|food|gen|goon|group|lass|talk|goal|cut)ies$/i, "$1ie"], [/\b(mon|smil)ies$/i, "$1ey"], [/\b((?:tit)?m|l)ice$/i, "$1ouse"], [/(seraph|cherub)im$/i, "$1"], [/(x|ch|ss|sh|zz|tto|go|cho|alias|[^aou]us|t[lm]as|gas|(?:her|at|gr)o|[aeiou]ris)(?:es)?$/i, "$1"], [/(analy|diagno|parenthe|progno|synop|the|empha|cri|ne)(?:sis|ses)$/i, "$1sis"], [/(movie|twelve|abuse|e[mn]u)s$/i, "$1"], [/(test)(?:is|es)$/i, "$1is"], [/(alumn|syllab|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, "$1us"], [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|quor)a$/i, "$1um"], [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)a$/i, "$1on"], [/(alumn|alg|vertebr)ae$/i, "$1a"], [/(cod|mur|sil|vert|ind)ices$/i, "$1ex"], [/(matr|append)ices$/i, "$1ix"], [/(pe)(rson|ople)$/i, "$1rson"], [/(child)ren$/i, "$1"], [/(eau)x?$/i, "$1"], [/men$/i, "man"]].forEach(function(a3) {
          return k.addSingularRule(a3[0], a3[1]);
        }), ["adulthood", "advice", "agenda", "aid", "aircraft", "alcohol", "ammo", "analytics", "anime", "athletics", "audio", "bison", "blood", "bream", "buffalo", "butter", "carp", "cash", "chassis", "chess", "clothing", "cod", "commerce", "cooperation", "corps", "debris", "diabetes", "digestion", "elk", "energy", "equipment", "excretion", "expertise", "firmware", "flounder", "fun", "gallows", "garbage", "graffiti", "hardware", "headquarters", "health", "herpes", "highjinks", "homework", "housework", "information", "jeans", "justice", "kudos", "labour", "literature", "machinery", "mackerel", "mail", "media", "mews", "moose", "music", "mud", "manga", "news", "only", "personnel", "pike", "plankton", "pliers", "police", "pollution", "premises", "rain", "research", "rice", "salmon", "scissors", "series", "sewage", "shambles", "shrimp", "software", "species", "staff", "swine", "tennis", "traffic", "transportation", "trout", "tuna", "wealth", "welfare", "whiting", "wildebeest", "wildlife", "you", /pok[eé]mon$/i, /[^aeiou]ese$/i, /deer$/i, /fish$/i, /measles$/i, /o[iu]s$/i, /pox$/i, /sheep$/i].forEach(k.addUncountableRule), k;
      }();
    }, 3947: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListEventOptions = void 0, b.serializeListEventOptions = (a2) => ({ events: a2.events, organization_id: a2.organizationId, range_start: a2.rangeStart, range_end: a2.rangeEnd, limit: a2.limit, after: a2.after });
    }, 3985: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4e3: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(2382), b), e(c(8400), b), e(c(6086), b), e(c(1631), b), e(c(7893), b), e(c(1250), b);
    }, 4007: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(3947), b);
    }, 4155: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.NoApiKeyProvidedException = void 0;
      class c extends Error {
        constructor() {
          super(...arguments), this.status = 500, this.name = "NoApiKeyProvidedException", this.message = 'Missing API key. Pass it to the constructor (new WorkOS("sk_test_Sz3IQjepeSWaI4cMS4ms4sMuU")) or define it in the WORKOS_API_KEY environment variable.';
        }
      }
      b.NoApiKeyProvidedException = c;
    }, 4167: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.SignatureProvider = void 0;
      let e = c(1338);
      class f {
        constructor(a2) {
          this.cryptoProvider = a2;
        }
        verifyHeader({ payload: a2, sigHeader: b2, secret: c2, tolerance: f2 = 18e4 }) {
          return d(this, void 0, void 0, function* () {
            let [d2, g] = this.getTimestampAndSignatureHash(b2);
            if (!g || 0 === Object.keys(g).length) throw new e.SignatureVerificationException("No signature hash found with expected scheme v1");
            if (parseInt(d2, 10) < Date.now() - f2) throw new e.SignatureVerificationException("Timestamp outside the tolerance zone");
            let h = yield this.computeSignature(d2, a2, c2);
            if ((yield this.cryptoProvider.secureCompare(h, g)) === false) throw new e.SignatureVerificationException("Signature hash does not match the expected signature hash for payload");
            return true;
          });
        }
        getTimestampAndSignatureHash(a2) {
          let [b2, c2] = a2.split(",");
          if (void 0 === b2 || void 0 === c2) throw new e.SignatureVerificationException("Signature or timestamp missing");
          let { 1: d2 } = b2.split("="), { 1: f2 } = c2.split("=");
          return [d2, f2];
        }
        computeSignature(a2, b2, c2) {
          return d(this, void 0, void 0, function* () {
            b2 = JSON.stringify(b2);
            let d2 = `${a2}.${b2}`;
            return yield this.cryptoProvider.computeHMACSignatureAsync(d2, c2);
          });
        }
      }
      b.SignatureProvider = f;
    }, 4228: (a, b, c) => {
      "use strict";
      var d, e = c(5779), f = c(8102), g = c(4254), h = c(3149), i = c(2321), j = c(125), k = c(8728), l = c(952), m = c(3057), n = c(8943), o = c(2783), p = c(2813), q = c(9239), r = c(1337), s = c(3154), t = Function, u = function(a2) {
        try {
          return t('"use strict"; return (' + a2 + ").constructor;")();
        } catch (a3) {
        }
      }, v = c(4412), w = c(5544), x = function() {
        throw new k();
      }, y = v ? function() {
        try {
          return arguments.callee, x;
        } catch (a2) {
          try {
            return v(arguments, "callee").get;
          } catch (a3) {
            return x;
          }
        }
      }() : x, z = c(5950)(), A = c(9983), B = c(3167), C = c(5597), D = c(2849), E = c(6317), F = {}, G = "undefined" != typeof Uint8Array && A ? A(Uint8Array) : d, H = { __proto__: null, "%AggregateError%": "undefined" == typeof AggregateError ? d : AggregateError, "%Array%": Array, "%ArrayBuffer%": "undefined" == typeof ArrayBuffer ? d : ArrayBuffer, "%ArrayIteratorPrototype%": z && A ? A([][Symbol.iterator]()) : d, "%AsyncFromSyncIteratorPrototype%": d, "%AsyncFunction%": F, "%AsyncGenerator%": F, "%AsyncGeneratorFunction%": F, "%AsyncIteratorPrototype%": F, "%Atomics%": "undefined" == typeof Atomics ? d : Atomics, "%BigInt%": "undefined" == typeof BigInt ? d : BigInt, "%BigInt64Array%": "undefined" == typeof BigInt64Array ? d : BigInt64Array, "%BigUint64Array%": "undefined" == typeof BigUint64Array ? d : BigUint64Array, "%Boolean%": Boolean, "%DataView%": "undefined" == typeof DataView ? d : DataView, "%Date%": Date, "%decodeURI%": decodeURI, "%decodeURIComponent%": decodeURIComponent, "%encodeURI%": encodeURI, "%encodeURIComponent%": encodeURIComponent, "%Error%": f, "%eval%": eval, "%EvalError%": g, "%Float16Array%": "undefined" == typeof Float16Array ? d : Float16Array, "%Float32Array%": "undefined" == typeof Float32Array ? d : Float32Array, "%Float64Array%": "undefined" == typeof Float64Array ? d : Float64Array, "%FinalizationRegistry%": "undefined" == typeof FinalizationRegistry ? d : FinalizationRegistry, "%Function%": t, "%GeneratorFunction%": F, "%Int8Array%": "undefined" == typeof Int8Array ? d : Int8Array, "%Int16Array%": "undefined" == typeof Int16Array ? d : Int16Array, "%Int32Array%": "undefined" == typeof Int32Array ? d : Int32Array, "%isFinite%": isFinite, "%isNaN%": isNaN, "%IteratorPrototype%": z && A ? A(A([][Symbol.iterator]())) : d, "%JSON%": "object" == typeof JSON ? JSON : d, "%Map%": "undefined" == typeof Map ? d : Map, "%MapIteratorPrototype%": "undefined" != typeof Map && z && A ? A((/* @__PURE__ */ new Map())[Symbol.iterator]()) : d, "%Math%": Math, "%Number%": Number, "%Object%": e, "%Object.getOwnPropertyDescriptor%": v, "%parseFloat%": parseFloat, "%parseInt%": parseInt, "%Promise%": "undefined" == typeof Promise ? d : Promise, "%Proxy%": "undefined" == typeof Proxy ? d : Proxy, "%RangeError%": h, "%ReferenceError%": i, "%Reflect%": "undefined" == typeof Reflect ? d : Reflect, "%RegExp%": RegExp, "%Set%": "undefined" == typeof Set ? d : Set, "%SetIteratorPrototype%": "undefined" != typeof Set && z && A ? A((/* @__PURE__ */ new Set())[Symbol.iterator]()) : d, "%SharedArrayBuffer%": "undefined" == typeof SharedArrayBuffer ? d : SharedArrayBuffer, "%String%": String, "%StringIteratorPrototype%": z && A ? A(""[Symbol.iterator]()) : d, "%Symbol%": z ? Symbol : d, "%SyntaxError%": j, "%ThrowTypeError%": y, "%TypedArray%": G, "%TypeError%": k, "%Uint8Array%": "undefined" == typeof Uint8Array ? d : Uint8Array, "%Uint8ClampedArray%": "undefined" == typeof Uint8ClampedArray ? d : Uint8ClampedArray, "%Uint16Array%": "undefined" == typeof Uint16Array ? d : Uint16Array, "%Uint32Array%": "undefined" == typeof Uint32Array ? d : Uint32Array, "%URIError%": l, "%WeakMap%": "undefined" == typeof WeakMap ? d : WeakMap, "%WeakRef%": "undefined" == typeof WeakRef ? d : WeakRef, "%WeakSet%": "undefined" == typeof WeakSet ? d : WeakSet, "%Function.prototype.call%": E, "%Function.prototype.apply%": D, "%Object.defineProperty%": w, "%Object.getPrototypeOf%": B, "%Math.abs%": m, "%Math.floor%": n, "%Math.max%": o, "%Math.min%": p, "%Math.pow%": q, "%Math.round%": r, "%Math.sign%": s, "%Reflect.getPrototypeOf%": C };
      if (A) try {
        null.error;
      } catch (a2) {
        var I = A(A(a2));
        H["%Error.prototype%"] = I;
      }
      var J = function a2(b2) {
        var c2;
        if ("%AsyncFunction%" === b2) c2 = u("async function () {}");
        else if ("%GeneratorFunction%" === b2) c2 = u("function* () {}");
        else if ("%AsyncGeneratorFunction%" === b2) c2 = u("async function* () {}");
        else if ("%AsyncGenerator%" === b2) {
          var d2 = a2("%AsyncGeneratorFunction%");
          d2 && (c2 = d2.prototype);
        } else if ("%AsyncIteratorPrototype%" === b2) {
          var e2 = a2("%AsyncGenerator%");
          e2 && A && (c2 = A(e2.prototype));
        }
        return H[b2] = c2, c2;
      }, K = { __proto__: null, "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"], "%ArrayPrototype%": ["Array", "prototype"], "%ArrayProto_entries%": ["Array", "prototype", "entries"], "%ArrayProto_forEach%": ["Array", "prototype", "forEach"], "%ArrayProto_keys%": ["Array", "prototype", "keys"], "%ArrayProto_values%": ["Array", "prototype", "values"], "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"], "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"], "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"], "%BooleanPrototype%": ["Boolean", "prototype"], "%DataViewPrototype%": ["DataView", "prototype"], "%DatePrototype%": ["Date", "prototype"], "%ErrorPrototype%": ["Error", "prototype"], "%EvalErrorPrototype%": ["EvalError", "prototype"], "%Float32ArrayPrototype%": ["Float32Array", "prototype"], "%Float64ArrayPrototype%": ["Float64Array", "prototype"], "%FunctionPrototype%": ["Function", "prototype"], "%Generator%": ["GeneratorFunction", "prototype"], "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"], "%Int8ArrayPrototype%": ["Int8Array", "prototype"], "%Int16ArrayPrototype%": ["Int16Array", "prototype"], "%Int32ArrayPrototype%": ["Int32Array", "prototype"], "%JSONParse%": ["JSON", "parse"], "%JSONStringify%": ["JSON", "stringify"], "%MapPrototype%": ["Map", "prototype"], "%NumberPrototype%": ["Number", "prototype"], "%ObjectPrototype%": ["Object", "prototype"], "%ObjProto_toString%": ["Object", "prototype", "toString"], "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"], "%PromisePrototype%": ["Promise", "prototype"], "%PromiseProto_then%": ["Promise", "prototype", "then"], "%Promise_all%": ["Promise", "all"], "%Promise_reject%": ["Promise", "reject"], "%Promise_resolve%": ["Promise", "resolve"], "%RangeErrorPrototype%": ["RangeError", "prototype"], "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"], "%RegExpPrototype%": ["RegExp", "prototype"], "%SetPrototype%": ["Set", "prototype"], "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"], "%StringPrototype%": ["String", "prototype"], "%SymbolPrototype%": ["Symbol", "prototype"], "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"], "%TypedArrayPrototype%": ["TypedArray", "prototype"], "%TypeErrorPrototype%": ["TypeError", "prototype"], "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"], "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"], "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"], "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"], "%URIErrorPrototype%": ["URIError", "prototype"], "%WeakMapPrototype%": ["WeakMap", "prototype"], "%WeakSetPrototype%": ["WeakSet", "prototype"] }, L = c(5042), M = c(5898), N = L.call(E, Array.prototype.concat), O = L.call(D, Array.prototype.splice), P = L.call(E, String.prototype.replace), Q = L.call(E, String.prototype.slice), R = L.call(E, RegExp.prototype.exec), S = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, T = /\\(\\)?/g, U = function(a2) {
        var b2 = Q(a2, 0, 1), c2 = Q(a2, -1);
        if ("%" === b2 && "%" !== c2) throw new j("invalid intrinsic syntax, expected closing `%`");
        if ("%" === c2 && "%" !== b2) throw new j("invalid intrinsic syntax, expected opening `%`");
        var d2 = [];
        return P(a2, S, function(a3, b3, c3, e2) {
          d2[d2.length] = c3 ? P(e2, T, "$1") : b3 || a3;
        }), d2;
      }, V = function(a2, b2) {
        var c2, d2 = a2;
        if (M(K, d2) && (d2 = "%" + (c2 = K[d2])[0] + "%"), M(H, d2)) {
          var e2 = H[d2];
          if (e2 === F && (e2 = J(d2)), void 0 === e2 && !b2) throw new k("intrinsic " + a2 + " exists, but is not available. Please file an issue!");
          return { alias: c2, name: d2, value: e2 };
        }
        throw new j("intrinsic " + a2 + " does not exist!");
      };
      a.exports = function(a2, b2) {
        if ("string" != typeof a2 || 0 === a2.length) throw new k("intrinsic name must be a non-empty string");
        if (arguments.length > 1 && "boolean" != typeof b2) throw new k('"allowMissing" argument must be a boolean');
        if (null === R(/^%?[^%]*%?$/, a2)) throw new j("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
        var c2 = U(a2), d2 = c2.length > 0 ? c2[0] : "", e2 = V("%" + d2 + "%", b2), f2 = e2.name, g2 = e2.value, h2 = false, i2 = e2.alias;
        i2 && (d2 = i2[0], O(c2, N([0, 1], i2)));
        for (var l2 = 1, m2 = true; l2 < c2.length; l2 += 1) {
          var n2 = c2[l2], o2 = Q(n2, 0, 1), p2 = Q(n2, -1);
          if (('"' === o2 || "'" === o2 || "`" === o2 || '"' === p2 || "'" === p2 || "`" === p2) && o2 !== p2) throw new j("property names with quotes must have matching quotes");
          if ("constructor" !== n2 && m2 || (h2 = true), d2 += "." + n2, M(H, f2 = "%" + d2 + "%")) g2 = H[f2];
          else if (null != g2) {
            if (!(n2 in g2)) {
              if (!b2) throw new k("base intrinsic for " + a2 + " exists, but the property is not available.");
              return;
            }
            if (v && l2 + 1 >= c2.length) {
              var q2 = v(g2, n2);
              g2 = (m2 = !!q2) && "get" in q2 && !("originalValue" in q2.get) ? q2.get : g2[n2];
            } else m2 = M(g2, n2), g2 = g2[n2];
            m2 && !h2 && (H[f2] = g2);
          }
        }
        return g2;
      };
    }, 4230: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i2(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i2(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i2(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i2((d2 = d2.apply(a2, b2 || [])).next());
        });
      }, e = this && this.__importDefault || function(a2) {
        return a2 && a2.__esModule ? a2 : { default: a2 };
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.SSO = void 0;
      let f = e(c(1170)), g = c(8877), h = c(6647), i = c(8237);
      class j {
        constructor(a2) {
          this.workos = a2;
        }
        listConnections(a2) {
          return d(this, void 0, void 0, function* () {
            return new h.AutoPaginatable(yield (0, g.fetchAndDeserialize)(this.workos, "/connections", i.deserializeConnection, a2 ? (0, i.serializeListConnectionsOptions)(a2) : void 0), (a3) => (0, g.fetchAndDeserialize)(this.workos, "/connections", i.deserializeConnection, a3), a2 ? (0, i.serializeListConnectionsOptions)(a2) : void 0);
          });
        }
        deleteConnection(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.delete(`/connections/${a2}`);
          });
        }
        getAuthorizationUrl({ connection: a2, clientId: b2, domain: c2, domainHint: d2, loginHint: e2, organization: g2, provider: h2, providerQueryParams: i2, providerScopes: j2, redirectUri: k, state: l }) {
          let m;
          if (!c2 && !h2 && !a2 && !g2) throw Error("Incomplete arguments. Need to specify either a 'connection', 'organization', 'domain', or 'provider'.");
          c2 && this.workos.emitWarning("The `domain` parameter for `getAuthorizationURL` is deprecated. Please use `organization` instead.");
          let n = (m = { connection: a2, organization: g2, domain: c2, domain_hint: d2, login_hint: e2, provider: h2, provider_query_params: i2, provider_scopes: j2, client_id: b2, redirect_uri: k, response_type: "code", state: l }, f.default.stringify(m, { arrayFormat: "repeat", sort: (a3, b3) => a3.localeCompare(b3), format: "RFC1738" }));
          return `${this.workos.baseURL}/sso/authorize?${n}`;
        }
        getConnection(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/connections/${a2}`);
            return (0, i.deserializeConnection)(b2);
          });
        }
        getProfileAndToken({ code: a2, clientId: b2 }) {
          return d(this, void 0, void 0, function* () {
            let c2 = new URLSearchParams({ client_id: b2, client_secret: this.workos.key, grant_type: "authorization_code", code: a2 }), { data: d2 } = yield this.workos.post("/sso/token", c2);
            return (0, i.deserializeProfileAndToken)(d2);
          });
        }
        getProfile({ accessToken: a2 }) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get("/sso/profile", { accessToken: a2 });
            return (0, i.deserializeProfile)(b2);
          });
        }
      }
      b.SSO = j;
    }, 4239: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeSms = void 0, b.deserializeSms = (a2) => ({ phoneNumber: a2.phone_number });
    }, 4254: (a) => {
      "use strict";
      a.exports = EvalError;
    }, 4320: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.SubtleCryptoProvider = void 0;
      let e = c(8172);
      class f extends e.CryptoProvider {
        constructor(a2) {
          super(), this.subtleCrypto = a2 || crypto.subtle;
        }
        computeHMACSignature(a2, b2) {
          throw Error("SubleCryptoProvider cannot be used in a synchronous context.");
        }
        computeHMACSignatureAsync(a2, b2) {
          return d(this, void 0, void 0, function* () {
            let c2 = new TextEncoder(), d2 = yield this.subtleCrypto.importKey("raw", c2.encode(b2), { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]), e2 = new Uint8Array(yield this.subtleCrypto.sign("hmac", d2, c2.encode(a2))), f2 = Array(e2.length);
            for (let a3 = 0; a3 < e2.length; a3++) f2[a3] = g[e2[a3]];
            return f2.join("");
          });
        }
        secureCompare(a2, b2) {
          return d(this, void 0, void 0, function* () {
            let c2 = this.encoder.encode(a2), d2 = this.encoder.encode(b2);
            if (c2.length !== d2.length) return false;
            let e2 = { name: "HMAC", hash: "SHA-256" }, f2 = yield crypto.subtle.generateKey(e2, false, ["sign", "verify"]), g2 = yield crypto.subtle.sign(e2, f2, c2);
            return yield crypto.subtle.verify(e2, f2, g2, d2);
          });
        }
        encrypt(a2, b2, c2, e2) {
          return d(this, void 0, void 0, function* () {
            let d2 = c2 || crypto.getRandomValues(new Uint8Array(32)), f2 = yield this.subtleCrypto.importKey("raw", b2, { name: "AES-GCM" }, false, ["encrypt"]), g2 = { name: "AES-GCM", iv: d2 };
            e2 && (g2.additionalData = e2);
            let h = new Uint8Array(yield this.subtleCrypto.encrypt(g2, f2, a2)), i = h.length - 16, j = h.slice(i);
            return { ciphertext: h.slice(0, i), iv: d2, tag: j };
          });
        }
        decrypt(a2, b2, c2, e2, f2) {
          return d(this, void 0, void 0, function* () {
            let d2 = new Uint8Array(a2.length + e2.length);
            d2.set(a2, 0), d2.set(e2, a2.length);
            let g2 = yield this.subtleCrypto.importKey("raw", b2, { name: "AES-GCM" }, false, ["decrypt"]), h = { name: "AES-GCM", iv: c2 };
            return f2 && (h.additionalData = f2), new Uint8Array(yield this.subtleCrypto.decrypt(h, g2, d2));
          });
        }
        randomBytes(a2) {
          let b2 = new Uint8Array(a2);
          return crypto.getRandomValues(b2), b2;
        }
      }
      b.SubtleCryptoProvider = f;
      let g = Array(256);
      for (let a2 = 0; a2 < g.length; a2++) g[a2] = a2.toString(16).padStart(2, "0");
    }, 4328: (a, b, c) => {
      "use strict";
      var d = c(4228), e = c(9713), f = c(5456), g = c(8728), h = d("%Map%", true), i = e("Map.prototype.get", true), j = e("Map.prototype.set", true), k = e("Map.prototype.has", true), l = e("Map.prototype.delete", true), m = e("Map.prototype.size", true);
      a.exports = !!h && function() {
        var a2, b2 = { assert: function(a3) {
          if (!b2.has(a3)) throw new g("Side channel does not contain " + f(a3));
        }, delete: function(b3) {
          if (a2) {
            var c2 = l(a2, b3);
            return 0 === m(a2) && (a2 = void 0), c2;
          }
          return false;
        }, get: function(b3) {
          if (a2) return i(a2, b3);
        }, has: function(b3) {
          return !!a2 && k(a2, b3);
        }, set: function(b3, c2) {
          a2 || (a2 = new h()), j(a2, b3, c2);
        } };
        return b2;
      };
    }, 4340: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4346: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListOrganizationMembershipsOptions = void 0, b.serializeListOrganizationMembershipsOptions = (a2) => {
        var b2;
        return { user_id: a2.userId, organization_id: a2.organizationId, statuses: null == (b2 = a2.statuses) ? void 0 : b2.join(","), limit: a2.limit, before: a2.before, after: a2.after, order: a2.order };
      };
    }, 4377: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.unreachable = void 0, b.unreachable = (a2, b2 = `Entered unreachable code. Received '${a2}'.`) => {
        throw TypeError(b2);
      };
    }, 4398: (a, b) => {
      b.read = function(a2, b2, c, d, e) {
        var f, g, h = 8 * e - d - 1, i = (1 << h) - 1, j = i >> 1, k = -7, l = c ? e - 1 : 0, m = c ? -1 : 1, n = a2[b2 + l];
        for (l += m, f = n & (1 << -k) - 1, n >>= -k, k += h; k > 0; f = 256 * f + a2[b2 + l], l += m, k -= 8) ;
        for (g = f & (1 << -k) - 1, f >>= -k, k += d; k > 0; g = 256 * g + a2[b2 + l], l += m, k -= 8) ;
        if (0 === f) f = 1 - j;
        else {
          if (f === i) return g ? NaN : 1 / 0 * (n ? -1 : 1);
          g += Math.pow(2, d), f -= j;
        }
        return (n ? -1 : 1) * g * Math.pow(2, f - d);
      }, b.write = function(a2, b2, c, d, e, f) {
        var g, h, i, j = 8 * f - e - 1, k = (1 << j) - 1, l = k >> 1, m = 5960464477539062e-23 * (23 === e), n = d ? 0 : f - 1, o = d ? 1 : -1, p = +(b2 < 0 || 0 === b2 && 1 / b2 < 0);
        for (isNaN(b2 = Math.abs(b2)) || b2 === 1 / 0 ? (h = +!!isNaN(b2), g = k) : (g = Math.floor(Math.log(b2) / Math.LN2), b2 * (i = Math.pow(2, -g)) < 1 && (g--, i *= 2), g + l >= 1 ? b2 += m / i : b2 += m * Math.pow(2, 1 - l), b2 * i >= 2 && (g++, i /= 2), g + l >= k ? (h = 0, g = k) : g + l >= 1 ? (h = (b2 * i - 1) * Math.pow(2, e), g += l) : (h = b2 * Math.pow(2, l - 1) * Math.pow(2, e), g = 0)); e >= 8; a2[c + n] = 255 & h, n += o, h /= 256, e -= 8) ;
        for (g = g << e | h, j += e; j > 0; a2[c + n] = 255 & g, n += o, g /= 256, j -= 8) ;
        a2[c + n - o] |= 128 * p;
      };
    }, 4412: (a, b, c) => {
      "use strict";
      var d = c(2552);
      if (d) try {
        d([], "length");
      } catch (a2) {
        d = null;
      }
      a.exports = d;
    }, 4440: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4447: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4449: (a, b, c) => {
      var d;
      (() => {
        var e = { 226: function(e2, f2) {
          !function(g2, h) {
            "use strict";
            var i = "function", j = "undefined", k = "object", l = "string", m = "major", n = "model", o = "name", p = "type", q = "vendor", r = "version", s = "architecture", t = "console", u = "mobile", v = "tablet", w = "smarttv", x = "wearable", y = "embedded", z = "Amazon", A = "Apple", B = "ASUS", C = "BlackBerry", D = "Browser", E = "Chrome", F = "Firefox", G = "Google", H = "Huawei", I = "Microsoft", J = "Motorola", K = "Opera", L = "Samsung", M = "Sharp", N = "Sony", O = "Xiaomi", P = "Zebra", Q = "Facebook", R = "Chromium OS", S = "Mac OS", T = function(a2, b2) {
              var c2 = {};
              for (var d2 in a2) b2[d2] && b2[d2].length % 2 == 0 ? c2[d2] = b2[d2].concat(a2[d2]) : c2[d2] = a2[d2];
              return c2;
            }, U = function(a2) {
              for (var b2 = {}, c2 = 0; c2 < a2.length; c2++) b2[a2[c2].toUpperCase()] = a2[c2];
              return b2;
            }, V = function(a2, b2) {
              return typeof a2 === l && -1 !== W(b2).indexOf(W(a2));
            }, W = function(a2) {
              return a2.toLowerCase();
            }, X = function(a2, b2) {
              if (typeof a2 === l) return a2 = a2.replace(/^\s\s*/, ""), typeof b2 === j ? a2 : a2.substring(0, 350);
            }, Y = function(a2, b2) {
              for (var c2, d2, e3, f3, g3, j2, l2 = 0; l2 < b2.length && !g3; ) {
                var m2 = b2[l2], n2 = b2[l2 + 1];
                for (c2 = d2 = 0; c2 < m2.length && !g3 && m2[c2]; ) if (g3 = m2[c2++].exec(a2)) for (e3 = 0; e3 < n2.length; e3++) j2 = g3[++d2], typeof (f3 = n2[e3]) === k && f3.length > 0 ? 2 === f3.length ? typeof f3[1] == i ? this[f3[0]] = f3[1].call(this, j2) : this[f3[0]] = f3[1] : 3 === f3.length ? typeof f3[1] !== i || f3[1].exec && f3[1].test ? this[f3[0]] = j2 ? j2.replace(f3[1], f3[2]) : void 0 : this[f3[0]] = j2 ? f3[1].call(this, j2, f3[2]) : void 0 : 4 === f3.length && (this[f3[0]] = j2 ? f3[3].call(this, j2.replace(f3[1], f3[2])) : h) : this[f3] = j2 || h;
                l2 += 2;
              }
            }, Z = function(a2, b2) {
              for (var c2 in b2) if (typeof b2[c2] === k && b2[c2].length > 0) {
                for (var d2 = 0; d2 < b2[c2].length; d2++) if (V(b2[c2][d2], a2)) return "?" === c2 ? h : c2;
              } else if (V(b2[c2], a2)) return "?" === c2 ? h : c2;
              return a2;
            }, $ = { ME: "4.90", "NT 3.11": "NT3.51", "NT 4.0": "NT4.0", 2e3: "NT 5.0", XP: ["NT 5.1", "NT 5.2"], Vista: "NT 6.0", 7: "NT 6.1", 8: "NT 6.2", 8.1: "NT 6.3", 10: ["NT 6.4", "NT 10.0"], RT: "ARM" }, _ = { browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [r, [o, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [r, [o, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [o, r], [/opios[\/ ]+([\w\.]+)/i], [r, [o, K + " Mini"]], [/\bopr\/([\w\.]+)/i], [r, [o, K]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i, /(ba?idubrowser)[\/ ]?([\w\.]+)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [o, r], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [r, [o, "UC" + D]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i], [r, [o, "WeChat(Win) Desktop"]], [/micromessenger\/([\w\.]+)/i], [r, [o, "WeChat"]], [/konqueror\/([\w\.]+)/i], [r, [o, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [r, [o, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [r, [o, "Yandex"]], [/(avast|avg)\/([\w\.]+)/i], [[o, /(.+)/, "$1 Secure " + D], r], [/\bfocus\/([\w\.]+)/i], [r, [o, F + " Focus"]], [/\bopt\/([\w\.]+)/i], [r, [o, K + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [r, [o, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [r, [o, "Dolphin"]], [/coast\/([\w\.]+)/i], [r, [o, K + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [r, [o, "MIUI " + D]], [/fxios\/([-\w\.]+)/i], [r, [o, F]], [/\bqihu|(qi?ho?o?|360)browser/i], [[o, "360 " + D]], [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i], [[o, /(.+)/, "$1 " + D], r], [/(comodo_dragon)\/([\w\.]+)/i], [[o, /_/g, " "], r], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i], [o, r], [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i], [o], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[o, Q], r], [/(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(chromium|instagram)[\/ ]([-\w\.]+)/i], [o, r], [/\bgsa\/([\w\.]+) .*safari\//i], [r, [o, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [r, [o, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [r, [o, E + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[o, E + " WebView"], r], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [r, [o, "Android " + D]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [o, r], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [r, [o, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [r, o], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [o, [r, Z, { "1.0": "/8", 1.2: "/1", 1.3: "/3", "2.0": "/412", "2.0.2": "/416", "2.0.3": "/417", "2.0.4": "/419", "?": "/" }]], [/(webkit|khtml)\/([\w\.]+)/i], [o, r], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[o, "Netscape"], r], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [r, [o, F + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [o, r], [/(cobalt)\/([\w\.]+)/i], [o, [r, /master.|lts./, ""]]], cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[s, "amd64"]], [/(ia32(?=;))/i], [[s, W]], [/((?:i[346]|x)86)[;\)]/i], [[s, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[s, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[s, "armhf"]], [/windows (ce|mobile); ppc;/i], [[s, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[s, /ower/, "", W]], [/(sun4\w)[;\)]/i], [[s, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[s, W]]], device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [n, [q, L], [p, v]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [n, [q, L], [p, u]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [n, [q, A], [p, u]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [n, [q, A], [p, v]], [/(macintosh);/i], [n, [q, A]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [n, [q, M], [p, u]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [n, [q, H], [p, v]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [n, [q, H], [p, u]], [/\b(poco[\w ]+)(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[n, /_/g, " "], [q, O], [p, u]], [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[n, /_/g, " "], [q, O], [p, v]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [n, [q, "OPPO"], [p, u]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [n, [q, "Vivo"], [p, u]], [/\b(rmx[12]\d{3})(?: bui|;|\))/i], [n, [q, "Realme"], [p, u]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [n, [q, J], [p, u]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [n, [q, J], [p, v]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [n, [q, "LG"], [p, v]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [n, [q, "LG"], [p, u]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [n, [q, "Lenovo"], [p, v]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[n, /_/g, " "], [q, "Nokia"], [p, u]], [/(pixel c)\b/i], [n, [q, G], [p, v]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [n, [q, G], [p, u]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [n, [q, N], [p, u]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[n, "Xperia Tablet"], [q, N], [p, v]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [n, [q, "OnePlus"], [p, u]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [n, [q, z], [p, v]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[n, /(.+)/g, "Fire Phone $1"], [q, z], [p, u]], [/(playbook);[-\w\),; ]+(rim)/i], [n, q, [p, v]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [n, [q, C], [p, u]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [n, [q, B], [p, v]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [n, [q, B], [p, u]], [/(nexus 9)/i], [n, [q, "HTC"], [p, v]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [q, [n, /_/g, " "], [p, u]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [n, [q, "Acer"], [p, v]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [n, [q, "Meizu"], [p, u]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [q, n, [p, u]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [q, n, [p, v]], [/(surface duo)/i], [n, [q, I], [p, v]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [n, [q, "Fairphone"], [p, u]], [/(u304aa)/i], [n, [q, "AT&T"], [p, u]], [/\bsie-(\w*)/i], [n, [q, "Siemens"], [p, u]], [/\b(rct\w+) b/i], [n, [q, "RCA"], [p, v]], [/\b(venue[\d ]{2,7}) b/i], [n, [q, "Dell"], [p, v]], [/\b(q(?:mv|ta)\w+) b/i], [n, [q, "Verizon"], [p, v]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [n, [q, "Barnes & Noble"], [p, v]], [/\b(tm\d{3}\w+) b/i], [n, [q, "NuVision"], [p, v]], [/\b(k88) b/i], [n, [q, "ZTE"], [p, v]], [/\b(nx\d{3}j) b/i], [n, [q, "ZTE"], [p, u]], [/\b(gen\d{3}) b.+49h/i], [n, [q, "Swiss"], [p, u]], [/\b(zur\d{3}) b/i], [n, [q, "Swiss"], [p, v]], [/\b((zeki)?tb.*\b) b/i], [n, [q, "Zeki"], [p, v]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[q, "Dragon Touch"], n, [p, v]], [/\b(ns-?\w{0,9}) b/i], [n, [q, "Insignia"], [p, v]], [/\b((nxa|next)-?\w{0,9}) b/i], [n, [q, "NextBook"], [p, v]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[q, "Voice"], n, [p, u]], [/\b(lvtel\-)?(v1[12]) b/i], [[q, "LvTel"], n, [p, u]], [/\b(ph-1) /i], [n, [q, "Essential"], [p, u]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [n, [q, "Envizen"], [p, v]], [/\b(trio[-\w\. ]+) b/i], [n, [q, "MachSpeed"], [p, v]], [/\btu_(1491) b/i], [n, [q, "Rotor"], [p, v]], [/(shield[\w ]+) b/i], [n, [q, "Nvidia"], [p, v]], [/(sprint) (\w+)/i], [q, n, [p, u]], [/(kin\.[onetw]{3})/i], [[n, /\./g, " "], [q, I], [p, u]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [n, [q, P], [p, v]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [n, [q, P], [p, u]], [/smart-tv.+(samsung)/i], [q, [p, w]], [/hbbtv.+maple;(\d+)/i], [[n, /^/, "SmartTV"], [q, L], [p, w]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[q, "LG"], [p, w]], [/(apple) ?tv/i], [q, [n, A + " TV"], [p, w]], [/crkey/i], [[n, E + "cast"], [q, G], [p, w]], [/droid.+aft(\w)( bui|\))/i], [n, [q, z], [p, w]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [n, [q, M], [p, w]], [/(bravia[\w ]+)( bui|\))/i], [n, [q, N], [p, w]], [/(mitv-\w{5}) bui/i], [n, [q, O], [p, w]], [/Hbbtv.*(technisat) (.*);/i], [q, n, [p, w]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[q, X], [n, X], [p, w]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[p, w]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [q, n, [p, t]], [/droid.+; (shield) bui/i], [n, [q, "Nvidia"], [p, t]], [/(playstation [345portablevi]+)/i], [n, [q, N], [p, t]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [n, [q, I], [p, t]], [/((pebble))app/i], [q, n, [p, x]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [n, [q, A], [p, x]], [/droid.+; (glass) \d/i], [n, [q, G], [p, x]], [/droid.+; (wt63?0{2,3})\)/i], [n, [q, P], [p, x]], [/(quest( 2| pro)?)/i], [n, [q, Q], [p, x]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [q, [p, y]], [/(aeobc)\b/i], [n, [q, z], [p, y]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i], [n, [p, u]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [n, [p, v]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[p, v]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[p, u]], [/(android[-\w\. ]{0,9});.+buil/i], [n, [q, "Generic"]]], engine: [[/windows.+ edge\/([\w\.]+)/i], [r, [o, "EdgeHTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [r, [o, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [o, r], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [r, o]], os: [[/microsoft (windows) (vista|xp)/i], [o, r], [/(windows) nt 6\.2; (arm)/i, /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i, /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i], [o, [r, Z, $]], [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[o, "Windows"], [r, Z, $]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /ios;fbsv\/([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[r, /_/g, "."], [o, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[o, S], [r, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [r, o], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [o, r], [/\(bb(10);/i], [r, [o, C]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [r, [o, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [r, [o, F + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [r, [o, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [r, [o, "watchOS"]], [/crkey\/([\d\.]+)/i], [r, [o, E + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[o, R], r], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [o, r], [/(sunos) ?([\w\.\d]*)/i], [[o, "Solaris"], r], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [o, r]] }, aa = function(a2, b2) {
              if (typeof a2 === k && (b2 = a2, a2 = h), !(this instanceof aa)) return new aa(a2, b2).getResult();
              var c2 = typeof g2 !== j && g2.navigator ? g2.navigator : h, d2 = a2 || (c2 && c2.userAgent ? c2.userAgent : ""), e3 = c2 && c2.userAgentData ? c2.userAgentData : h, f3 = b2 ? T(_, b2) : _, t2 = c2 && c2.userAgent == d2;
              return this.getBrowser = function() {
                var a3, b3 = {};
                return b3[o] = h, b3[r] = h, Y.call(b3, d2, f3.browser), b3[m] = typeof (a3 = b3[r]) === l ? a3.replace(/[^\d\.]/g, "").split(".")[0] : h, t2 && c2 && c2.brave && typeof c2.brave.isBrave == i && (b3[o] = "Brave"), b3;
              }, this.getCPU = function() {
                var a3 = {};
                return a3[s] = h, Y.call(a3, d2, f3.cpu), a3;
              }, this.getDevice = function() {
                var a3 = {};
                return a3[q] = h, a3[n] = h, a3[p] = h, Y.call(a3, d2, f3.device), t2 && !a3[p] && e3 && e3.mobile && (a3[p] = u), t2 && "Macintosh" == a3[n] && c2 && typeof c2.standalone !== j && c2.maxTouchPoints && c2.maxTouchPoints > 2 && (a3[n] = "iPad", a3[p] = v), a3;
              }, this.getEngine = function() {
                var a3 = {};
                return a3[o] = h, a3[r] = h, Y.call(a3, d2, f3.engine), a3;
              }, this.getOS = function() {
                var a3 = {};
                return a3[o] = h, a3[r] = h, Y.call(a3, d2, f3.os), t2 && !a3[o] && e3 && "Unknown" != e3.platform && (a3[o] = e3.platform.replace(/chrome os/i, R).replace(/macos/i, S)), a3;
              }, this.getResult = function() {
                return { ua: this.getUA(), browser: this.getBrowser(), engine: this.getEngine(), os: this.getOS(), device: this.getDevice(), cpu: this.getCPU() };
              }, this.getUA = function() {
                return d2;
              }, this.setUA = function(a3) {
                return d2 = typeof a3 === l && a3.length > 350 ? X(a3, 350) : a3, this;
              }, this.setUA(d2), this;
            };
            aa.VERSION = "1.0.35", aa.BROWSER = U([o, r, m]), aa.CPU = U([s]), aa.DEVICE = U([n, q, p, t, u, w, v, x, y]), aa.ENGINE = aa.OS = U([o, r]), typeof f2 !== j ? (e2.exports && (f2 = e2.exports = aa), f2.UAParser = aa) : c.amdO ? void 0 === (d = function() {
              return aa;
            }.call(b, c, b, a)) || (a.exports = d) : typeof g2 !== j && (g2.UAParser = aa);
            var ab = typeof g2 !== j && (g2.jQuery || g2.Zepto);
            if (ab && !ab.ua) {
              var ac = new aa();
              ab.ua = ac.getResult(), ab.ua.get = function() {
                return ac.getUA();
              }, ab.ua.set = function(a2) {
                ac.setUA(a2);
                var b2 = ac.getResult();
                for (var c2 in b2) ab.ua[c2] = b2[c2];
              };
            }
          }("object" == typeof window ? window : this);
        } }, f = {};
        function g(a2) {
          var b2 = f[a2];
          if (void 0 !== b2) return b2.exports;
          var c2 = f[a2] = { exports: {} }, d2 = true;
          try {
            e[a2].call(c2.exports, c2, c2.exports, g), d2 = false;
          } finally {
            d2 && delete f[a2];
          }
          return c2.exports;
        }
        g.ab = "//", a.exports = g(226);
      })();
    }, 4509: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4517: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4567: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4619: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4666: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeProfileAndToken = void 0;
      let d = c(5689), e = c(8918);
      b.deserializeProfileAndToken = (a2) => ({ accessToken: a2.access_token, profile: (0, e.deserializeProfile)(a2.profile), oauthTokens: (0, d.deserializeOauthTokens)(a2.oauth_tokens) });
    }, 4751: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4838: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.OauthException = void 0;
      class c extends Error {
        constructor(a2, b2, c2, d, e) {
          super(), this.status = a2, this.requestID = b2, this.error = c2, this.errorDescription = d, this.rawData = e, this.name = "OauthException", c2 && d ? this.message = `Error: ${c2}
Error Description: ${d}` : c2 ? this.message = `Error: ${c2}` : this.message = "An error has occurred.";
        }
      }
      b.OauthException = c;
    }, 4892: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4924: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(8883), b), e(c(2218), b), e(c(1313), b), e(c(3290), b), e(c(1745), b), e(c(4960), b), e(c(2789), b), e(c(9661), b), e(c(6264), b), e(c(5819), b);
    }, 4942: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.AuditLogs = void 0;
      let e = c(6659);
      class f {
        constructor(a2) {
          this.workos = a2;
        }
        createEvent(a2, b2, c2 = {}) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.post("/audit_logs/events", { event: (0, e.serializeCreateAuditLogEventOptions)(b2), organization_id: a2 }, c2);
          });
        }
        createExport(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/audit_logs/exports", (0, e.serializeAuditLogExportOptions)(a2));
            return (0, e.deserializeAuditLogExport)(b2);
          });
        }
        getExport(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/audit_logs/exports/${a2}`);
            return (0, e.deserializeAuditLogExport)(b2);
          });
        }
        createSchema(a2, b2 = {}) {
          return d(this, void 0, void 0, function* () {
            let { data: c2 } = yield this.workos.post(`/audit_logs/actions/${a2.action}/schemas`, (0, e.serializeCreateAuditLogSchemaOptions)(a2), b2);
            return (0, e.deserializeAuditLogSchema)(c2);
          });
        }
      }
      b.AuditLogs = f;
    }, 4951: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeDeleteResourceOptions = void 0;
      let d = c(9180);
      b.serializeDeleteResourceOptions = (a2) => ({ resource_type: (0, d.isResourceInterface)(a2) ? a2.getResourceType() : a2.resourceType, resource_id: (0, d.isResourceInterface)(a2) ? a2.getResourceId() : a2.resourceId ? a2.resourceId : "" });
    }, 4952: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4960: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4972: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 4987: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 5042: (a, b, c) => {
      "use strict";
      var d = c(7306);
      a.exports = Function.prototype.bind || d;
    }, 5065: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeList = void 0, b.deserializeList = (a2, b2) => ({ object: "list", data: a2.data.map(b2), listMetadata: a2.list_metadata });
    }, 5073: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuthenticateWithOrganizationSelectionOptions = void 0, b.serializeAuthenticateWithOrganizationSelectionOptions = (a2) => ({ grant_type: "urn:workos:oauth:grant-type:organization-selection", client_id: a2.clientId, client_secret: a2.clientSecret, pending_authentication_token: a2.pendingAuthenticationToken, organization_id: a2.organizationId, ip_address: a2.ipAddress, user_agent: a2.userAgent });
    }, 5076: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeBatchWriteResourcesResponse = b.deserializeResource = void 0, b.deserializeResource = (a2) => ({ resourceType: a2.resource_type, resourceId: a2.resource_id, meta: a2.meta }), b.deserializeBatchWriteResourcesResponse = (a2) => a2.data.map((a3) => (0, b.deserializeResource)(a3));
    }, 5104: function(a, b) {
      "use strict";
      var c = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e, f) {
          function g(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Portal = void 0;
      class d {
        constructor(a2) {
          this.workos = a2;
        }
        generateLink({ intent: a2, organization: b2, returnUrl: d2, successUrl: e }) {
          return c(this, void 0, void 0, function* () {
            let { data: c2 } = yield this.workos.post("/portal/generate_link", { intent: a2, organization: b2, return_url: d2, success_url: e });
            return c2;
          });
        }
      }
      b.Portal = d;
    }, 5114: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeFactorWithSecrets = b.deserializeFactor = void 0;
      let d = c(2949);
      b.deserializeFactor = (a2) => ({ object: a2.object, id: a2.id, createdAt: a2.created_at, updatedAt: a2.updated_at, type: a2.type, totp: (0, d.deserializeTotp)(a2.totp), userId: a2.user_id }), b.deserializeFactorWithSecrets = (a2) => ({ object: a2.object, id: a2.id, createdAt: a2.created_at, updatedAt: a2.updated_at, type: a2.type, totp: (0, d.deserializeTotpWithSecrets)(a2.totp), userId: a2.user_id });
    }, 5149: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeAction = void 0;
      let d = c(9941), e = c(5363), f = c(619);
      b.deserializeAction = (a2) => {
        switch (a2.object) {
          case "user_registration_action_context":
            return { id: a2.id, object: a2.object, userData: ((a3) => ({ object: a3.object, email: a3.email, firstName: a3.first_name, lastName: a3.last_name }))(a2.user_data), invitation: a2.invitation ? (0, e.deserializeInvitation)(a2.invitation) : void 0, ipAddress: a2.ip_address, userAgent: a2.user_agent, deviceFingerprint: a2.device_fingerprint };
          case "authentication_action_context":
            return { id: a2.id, object: a2.object, user: (0, e.deserializeUser)(a2.user), organization: a2.organization ? (0, d.deserializeOrganization)(a2.organization) : void 0, organizationMembership: a2.organization_membership ? (0, f.deserializeOrganizationMembership)(a2.organization_membership) : void 0, ipAddress: a2.ip_address, userAgent: a2.user_agent, deviceFingerprint: a2.device_fingerprint, issuer: a2.issuer };
        }
      };
    }, 5197: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeRoleEvent = void 0, b.deserializeRoleEvent = (a2) => ({ object: "role", slug: a2.slug, permissions: a2.permissions, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 5229: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeFeatureFlag = void 0, b.deserializeFeatureFlag = (a2) => ({ object: a2.object, id: a2.id, name: a2.name, slug: a2.slug, description: a2.description, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 5356: (a) => {
      "use strict";
      a.exports = (init_node_buffer(), __toCommonJS(node_buffer_exports));
    }, 5363: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(44), b), e(c(9381), b), e(c(6553), b), e(c(9184), b), e(c(1847), b), e(c(7592), b), e(c(8376), b), e(c(613), b), e(c(8197), b), e(c(8642), b), e(c(5533), b), e(c(8909), b), e(c(5114), b), e(c(5374), b), e(c(2712), b), e(c(1762), b), e(c(1814), b), e(c(5397), b), e(c(3318), b), e(c(7513), b), e(c(9694), b), e(c(9159), b), e(c(1001), b), e(c(2213), b), e(c(3210), b);
    }, 5374: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeInvitationEvent = b.deserializeInvitation = void 0, b.deserializeInvitation = (a2) => ({ object: a2.object, id: a2.id, email: a2.email, state: a2.state, acceptedAt: a2.accepted_at, revokedAt: a2.revoked_at, expiresAt: a2.expires_at, organizationId: a2.organization_id, inviterUserId: a2.inviter_user_id, acceptedUserId: a2.accepted_user_id, token: a2.token, acceptInvitationUrl: a2.accept_invitation_url, createdAt: a2.created_at, updatedAt: a2.updated_at }), b.deserializeInvitationEvent = (a2) => ({ object: a2.object, id: a2.id, email: a2.email, state: a2.state, acceptedAt: a2.accepted_at, revokedAt: a2.revoked_at, expiresAt: a2.expires_at, organizationId: a2.organization_id, inviterUserId: a2.inviter_user_id, acceptedUserId: a2.accepted_user_id, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 5392: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), !function(a2, b2) {
        for (var c2 in b2) Object.defineProperty(a2, c2, { enumerable: true, get: b2[c2] });
      }(b, { getTestReqInfo: function() {
        return g;
      }, withRequest: function() {
        return f;
      } });
      let d = new (c(5521)).AsyncLocalStorage();
      function e(a2, b2) {
        let c2 = b2.header(a2, "next-test-proxy-port");
        if (!c2) return;
        let d2 = b2.url(a2);
        return { url: d2, proxyPort: Number(c2), testData: b2.header(a2, "next-test-data") || "" };
      }
      function f(a2, b2, c2) {
        let f2 = e(a2, b2);
        return f2 ? d.run(f2, c2) : c2();
      }
      function g(a2, b2) {
        let c2 = d.getStore();
        return c2 || (a2 && b2 ? e(a2, b2) : void 0);
      }
    }, 5397: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeResetPasswordOptions = void 0, b.serializeResetPasswordOptions = (a2) => ({ token: a2.token, new_password: a2.newPassword });
    }, 5401: (a, b) => {
      "use strict";
      b.byteLength = function(a2) {
        var b2 = i(a2), c2 = b2[0], d2 = b2[1];
        return (c2 + d2) * 3 / 4 - d2;
      }, b.toByteArray = function(a2) {
        var b2, c2, f2 = i(a2), g2 = f2[0], h2 = f2[1], j = new e((g2 + h2) * 3 / 4 - h2), k = 0, l = h2 > 0 ? g2 - 4 : g2;
        for (c2 = 0; c2 < l; c2 += 4) b2 = d[a2.charCodeAt(c2)] << 18 | d[a2.charCodeAt(c2 + 1)] << 12 | d[a2.charCodeAt(c2 + 2)] << 6 | d[a2.charCodeAt(c2 + 3)], j[k++] = b2 >> 16 & 255, j[k++] = b2 >> 8 & 255, j[k++] = 255 & b2;
        return 2 === h2 && (b2 = d[a2.charCodeAt(c2)] << 2 | d[a2.charCodeAt(c2 + 1)] >> 4, j[k++] = 255 & b2), 1 === h2 && (b2 = d[a2.charCodeAt(c2)] << 10 | d[a2.charCodeAt(c2 + 1)] << 4 | d[a2.charCodeAt(c2 + 2)] >> 2, j[k++] = b2 >> 8 & 255, j[k++] = 255 & b2), j;
      }, b.fromByteArray = function(a2) {
        for (var b2, d2 = a2.length, e2 = d2 % 3, f2 = [], g2 = 0, h2 = d2 - e2; g2 < h2; g2 += 16383) f2.push(function(a3, b3, d3) {
          for (var e3, f3 = [], g3 = b3; g3 < d3; g3 += 3) e3 = (a3[g3] << 16 & 16711680) + (a3[g3 + 1] << 8 & 65280) + (255 & a3[g3 + 2]), f3.push(c[e3 >> 18 & 63] + c[e3 >> 12 & 63] + c[e3 >> 6 & 63] + c[63 & e3]);
          return f3.join("");
        }(a2, g2, g2 + 16383 > h2 ? h2 : g2 + 16383));
        return 1 === e2 ? f2.push(c[(b2 = a2[d2 - 1]) >> 2] + c[b2 << 4 & 63] + "==") : 2 === e2 && f2.push(c[(b2 = (a2[d2 - 2] << 8) + a2[d2 - 1]) >> 10] + c[b2 >> 4 & 63] + c[b2 << 2 & 63] + "="), f2.join("");
      };
      for (var c = [], d = [], e = "undefined" != typeof Uint8Array ? Uint8Array : Array, f = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", g = 0, h = f.length; g < h; ++g) c[g] = f[g], d[f.charCodeAt(g)] = g;
      function i(a2) {
        var b2 = a2.length;
        if (b2 % 4 > 0) throw Error("Invalid string. Length must be a multiple of 4");
        var c2 = a2.indexOf("=");
        -1 === c2 && (c2 = b2);
        var d2 = c2 === b2 ? 0 : 4 - c2 % 4;
        return [c2, d2];
      }
      d[45] = 62, d[95] = 63;
    }, 5417: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 5442: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.BadRequestException = void 0;
      class c extends Error {
        constructor({ code: a2, errors: b2, message: c2, requestID: d }) {
          super(), this.status = 400, this.name = "BadRequestException", this.message = "Bad request", this.requestID = d, c2 && (this.message = c2), a2 && (this.code = a2), b2 && (this.errors = b2);
        }
      }
      b.BadRequestException = c;
    }, 5456: (a, b, c) => {
      var d = "function" == typeof Map && Map.prototype, e = Object.getOwnPropertyDescriptor && d ? Object.getOwnPropertyDescriptor(Map.prototype, "size") : null, f = d && e && "function" == typeof e.get ? e.get : null, g = d && Map.prototype.forEach, h = "function" == typeof Set && Set.prototype, i = Object.getOwnPropertyDescriptor && h ? Object.getOwnPropertyDescriptor(Set.prototype, "size") : null, j = h && i && "function" == typeof i.get ? i.get : null, k = h && Set.prototype.forEach, l = "function" == typeof WeakMap && WeakMap.prototype ? WeakMap.prototype.has : null, m = "function" == typeof WeakSet && WeakSet.prototype ? WeakSet.prototype.has : null, n = "function" == typeof WeakRef && WeakRef.prototype ? WeakRef.prototype.deref : null, o = Boolean.prototype.valueOf, p = Object.prototype.toString, q = Function.prototype.toString, r = String.prototype.match, s = String.prototype.slice, t = String.prototype.replace, u = String.prototype.toUpperCase, v = String.prototype.toLowerCase, w = RegExp.prototype.test, x = Array.prototype.concat, y = Array.prototype.join, z = Array.prototype.slice, A = Math.floor, B = "function" == typeof BigInt ? BigInt.prototype.valueOf : null, C = Object.getOwnPropertySymbols, D = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? Symbol.prototype.toString : null, E = "function" == typeof Symbol && "object" == typeof Symbol.iterator, F = "function" == typeof Symbol && Symbol.toStringTag && (typeof Symbol.toStringTag === E ? "object" : "symbol") ? Symbol.toStringTag : null, G = Object.prototype.propertyIsEnumerable, H = ("function" == typeof Reflect ? Reflect.getPrototypeOf : Object.getPrototypeOf) || ([].__proto__ === Array.prototype ? function(a2) {
        return a2.__proto__;
      } : null);
      function I(a2, b2) {
        if (a2 === 1 / 0 || a2 === -1 / 0 || a2 != a2 || a2 && a2 > -1e3 && a2 < 1e3 || w.call(/e/, b2)) return b2;
        var c2 = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
        if ("number" == typeof a2) {
          var d2 = a2 < 0 ? -A(-a2) : A(a2);
          if (d2 !== a2) {
            var e2 = String(d2), f2 = s.call(b2, e2.length + 1);
            return t.call(e2, c2, "$&_") + "." + t.call(t.call(f2, /([0-9]{3})/g, "$&_"), /_$/, "");
          }
        }
        return t.call(b2, c2, "$&_");
      }
      var J = c(2634), K = J.custom, L = S(K) ? K : null, M = { __proto__: null, double: '"', single: "'" }, N = { __proto__: null, double: /(["\\])/g, single: /(['\\])/g };
      function O(a2, b2, c2) {
        var d2 = M[c2.quoteStyle || b2];
        return d2 + a2 + d2;
      }
      function P(a2) {
        return !F || !("object" == typeof a2 && (F in a2 || void 0 !== a2[F]));
      }
      function Q(a2) {
        return "[object Array]" === V(a2) && P(a2);
      }
      function R(a2) {
        return "[object RegExp]" === V(a2) && P(a2);
      }
      function S(a2) {
        if (E) return a2 && "object" == typeof a2 && a2 instanceof Symbol;
        if ("symbol" == typeof a2) return true;
        if (!a2 || "object" != typeof a2 || !D) return false;
        try {
          return D.call(a2), true;
        } catch (a3) {
        }
        return false;
      }
      a.exports = function a2(b2, d2, e2, h2) {
        var i2, p2, u2, w2, A2, C2 = d2 || {};
        if (U(C2, "quoteStyle") && !U(M, C2.quoteStyle)) throw TypeError('option "quoteStyle" must be "single" or "double"');
        if (U(C2, "maxStringLength") && ("number" == typeof C2.maxStringLength ? C2.maxStringLength < 0 && C2.maxStringLength !== 1 / 0 : null !== C2.maxStringLength)) throw TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
        var K2 = !U(C2, "customInspect") || C2.customInspect;
        if ("boolean" != typeof K2 && "symbol" !== K2) throw TypeError("option \"customInspect\", if provided, must be `true`, `false`, or `'symbol'`");
        if (U(C2, "indent") && null !== C2.indent && "	" !== C2.indent && !(parseInt(C2.indent, 10) === C2.indent && C2.indent > 0)) throw TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
        if (U(C2, "numericSeparator") && "boolean" != typeof C2.numericSeparator) throw TypeError('option "numericSeparator", if provided, must be `true` or `false`');
        var T2 = C2.numericSeparator;
        if (void 0 === b2) return "undefined";
        if (null === b2) return "null";
        if ("boolean" == typeof b2) return b2 ? "true" : "false";
        if ("string" == typeof b2) return function a3(b3, c2) {
          if (b3.length > c2.maxStringLength) {
            var d3 = b3.length - c2.maxStringLength;
            return a3(s.call(b3, 0, c2.maxStringLength), c2) + ("... " + d3) + " more character" + (d3 > 1 ? "s" : "");
          }
          var e3 = N[c2.quoteStyle || "single"];
          return e3.lastIndex = 0, O(t.call(t.call(b3, e3, "\\$1"), /[\x00-\x1f]/g, X), "single", c2);
        }(b2, C2);
        if ("number" == typeof b2) {
          if (0 === b2) return 1 / 0 / b2 > 0 ? "0" : "-0";
          var ab = String(b2);
          return T2 ? I(b2, ab) : ab;
        }
        if ("bigint" == typeof b2) {
          var ac = String(b2) + "n";
          return T2 ? I(b2, ac) : ac;
        }
        var ad = void 0 === C2.depth ? 5 : C2.depth;
        if (void 0 === e2 && (e2 = 0), e2 >= ad && ad > 0 && "object" == typeof b2) return Q(b2) ? "[Array]" : "[Object]";
        var ae = function(a3, b3) {
          var c2;
          if ("	" === a3.indent) c2 = "	";
          else {
            if ("number" != typeof a3.indent || !(a3.indent > 0)) return null;
            c2 = y.call(Array(a3.indent + 1), " ");
          }
          return { base: c2, prev: y.call(Array(b3 + 1), c2) };
        }(C2, e2);
        if (void 0 === h2) h2 = [];
        else if (W(h2, b2) >= 0) return "[Circular]";
        function af(b3, c2, d3) {
          if (c2 && (h2 = z.call(h2)).push(c2), d3) {
            var f2 = { depth: C2.depth };
            return U(C2, "quoteStyle") && (f2.quoteStyle = C2.quoteStyle), a2(b3, f2, e2 + 1, h2);
          }
          return a2(b3, C2, e2 + 1, h2);
        }
        if ("function" == typeof b2 && !R(b2)) {
          var ag = function(a3) {
            if (a3.name) return a3.name;
            var b3 = r.call(q.call(a3), /^function\s*([\w$]+)/);
            return b3 ? b3[1] : null;
          }(b2), ah = aa(b2, af);
          return "[Function" + (ag ? ": " + ag : " (anonymous)") + "]" + (ah.length > 0 ? " { " + y.call(ah, ", ") + " }" : "");
        }
        if (S(b2)) {
          var ai = E ? t.call(String(b2), /^(Symbol\(.*\))_[^)]*$/, "$1") : D.call(b2);
          return "object" != typeof b2 || E ? ai : Y(ai);
        }
        if ((aj = b2) && "object" == typeof aj && ("undefined" != typeof HTMLElement && aj instanceof HTMLElement || "string" == typeof aj.nodeName && "function" == typeof aj.getAttribute)) {
          for (var aj, ak, al = "<" + v.call(String(b2.nodeName)), am = b2.attributes || [], an = 0; an < am.length; an++) {
            al += " " + am[an].name + "=" + O((ak = am[an].value, t.call(String(ak), /"/g, "&quot;")), "double", C2);
          }
          return al += ">", b2.childNodes && b2.childNodes.length && (al += "..."), al += "</" + v.call(String(b2.nodeName)) + ">";
        }
        if (Q(b2)) {
          if (0 === b2.length) return "[]";
          var ao = aa(b2, af);
          return ae && !function(a3) {
            for (var b3 = 0; b3 < a3.length; b3++) if (W(a3[b3], "\n") >= 0) return false;
            return true;
          }(ao) ? "[" + _(ao, ae) + "]" : "[ " + y.call(ao, ", ") + " ]";
        }
        if ("[object Error]" === V(i2 = b2) && P(i2)) {
          var ap = aa(b2, af);
          return "cause" in Error.prototype || !("cause" in b2) || G.call(b2, "cause") ? 0 === ap.length ? "[" + String(b2) + "]" : "{ [" + String(b2) + "] " + y.call(ap, ", ") + " }" : "{ [" + String(b2) + "] " + y.call(x.call("[cause]: " + af(b2.cause), ap), ", ") + " }";
        }
        if ("object" == typeof b2 && K2) {
          if (L && "function" == typeof b2[L] && J) return J(b2, { depth: ad - e2 });
          else if ("symbol" !== K2 && "function" == typeof b2.inspect) return b2.inspect();
        }
        if (function(a3) {
          if (!f || !a3 || "object" != typeof a3) return false;
          try {
            f.call(a3);
            try {
              j.call(a3);
            } catch (a4) {
              return true;
            }
            return a3 instanceof Map;
          } catch (a4) {
          }
          return false;
        }(b2)) {
          var aq = [];
          return g && g.call(b2, function(a3, c2) {
            aq.push(af(c2, b2, true) + " => " + af(a3, b2));
          }), $("Map", f.call(b2), aq, ae);
        }
        if (function(a3) {
          if (!j || !a3 || "object" != typeof a3) return false;
          try {
            j.call(a3);
            try {
              f.call(a3);
            } catch (a4) {
              return true;
            }
            return a3 instanceof Set;
          } catch (a4) {
          }
          return false;
        }(b2)) {
          var ar = [];
          return k && k.call(b2, function(a3) {
            ar.push(af(a3, b2));
          }), $("Set", j.call(b2), ar, ae);
        }
        if (function(a3) {
          if (!l || !a3 || "object" != typeof a3) return false;
          try {
            l.call(a3, l);
            try {
              m.call(a3, m);
            } catch (a4) {
              return true;
            }
            return a3 instanceof WeakMap;
          } catch (a4) {
          }
          return false;
        }(b2)) return Z("WeakMap");
        if (function(a3) {
          if (!m || !a3 || "object" != typeof a3) return false;
          try {
            m.call(a3, m);
            try {
              l.call(a3, l);
            } catch (a4) {
              return true;
            }
            return a3 instanceof WeakSet;
          } catch (a4) {
          }
          return false;
        }(b2)) return Z("WeakSet");
        if (function(a3) {
          if (!n || !a3 || "object" != typeof a3) return false;
          try {
            return n.call(a3), true;
          } catch (a4) {
          }
          return false;
        }(b2)) return Z("WeakRef");
        if ("[object Number]" === V(p2 = b2) && P(p2)) return Y(af(Number(b2)));
        if (function(a3) {
          if (!a3 || "object" != typeof a3 || !B) return false;
          try {
            return B.call(a3), true;
          } catch (a4) {
          }
          return false;
        }(b2)) return Y(af(B.call(b2)));
        if ("[object Boolean]" === V(u2 = b2) && P(u2)) return Y(o.call(b2));
        if ("[object String]" === V(w2 = b2) && P(w2)) return Y(af(String(b2)));
        if ("undefined" != typeof window && b2 === window) return "{ [object Window] }";
        if ("undefined" != typeof globalThis && b2 === globalThis || void 0 !== c.g && b2 === c.g) return "{ [object globalThis] }";
        if (!("[object Date]" === V(A2 = b2) && P(A2)) && !R(b2)) {
          var as = aa(b2, af), at = H ? H(b2) === Object.prototype : b2 instanceof Object || b2.constructor === Object, au = b2 instanceof Object ? "" : "null prototype", av = !at && F && Object(b2) === b2 && F in b2 ? s.call(V(b2), 8, -1) : au ? "Object" : "", aw = (at || "function" != typeof b2.constructor ? "" : b2.constructor.name ? b2.constructor.name + " " : "") + (av || au ? "[" + y.call(x.call([], av || [], au || []), ": ") + "] " : "");
          return 0 === as.length ? aw + "{}" : ae ? aw + "{" + _(as, ae) + "}" : aw + "{ " + y.call(as, ", ") + " }";
        }
        return String(b2);
      };
      var T = Object.prototype.hasOwnProperty || function(a2) {
        return a2 in this;
      };
      function U(a2, b2) {
        return T.call(a2, b2);
      }
      function V(a2) {
        return p.call(a2);
      }
      function W(a2, b2) {
        if (a2.indexOf) return a2.indexOf(b2);
        for (var c2 = 0, d2 = a2.length; c2 < d2; c2++) if (a2[c2] === b2) return c2;
        return -1;
      }
      function X(a2) {
        var b2 = a2.charCodeAt(0), c2 = { 8: "b", 9: "t", 10: "n", 12: "f", 13: "r" }[b2];
        return c2 ? "\\" + c2 : "\\x" + (b2 < 16 ? "0" : "") + u.call(b2.toString(16));
      }
      function Y(a2) {
        return "Object(" + a2 + ")";
      }
      function Z(a2) {
        return a2 + " { ? }";
      }
      function $(a2, b2, c2, d2) {
        return a2 + " (" + b2 + ") {" + (d2 ? _(c2, d2) : y.call(c2, ", ")) + "}";
      }
      function _(a2, b2) {
        if (0 === a2.length) return "";
        var c2 = "\n" + b2.prev + b2.base;
        return c2 + y.call(a2, "," + c2) + "\n" + b2.prev;
      }
      function aa(a2, b2) {
        var c2, d2 = Q(a2), e2 = [];
        if (d2) {
          e2.length = a2.length;
          for (var f2 = 0; f2 < a2.length; f2++) e2[f2] = U(a2, f2) ? b2(a2[f2], a2) : "";
        }
        var g2 = "function" == typeof C ? C(a2) : [];
        if (E) {
          c2 = {};
          for (var h2 = 0; h2 < g2.length; h2++) c2["$" + g2[h2]] = g2[h2];
        }
        for (var i2 in a2) if (U(a2, i2) && (!d2 || String(Number(i2)) !== i2 || !(i2 < a2.length))) if (E && c2["$" + i2] instanceof Symbol) continue;
        else w.call(/[^\w$]/, i2) ? e2.push(b2(i2, a2) + ": " + b2(a2[i2], a2)) : e2.push(i2 + ": " + b2(a2[i2], a2));
        if ("function" == typeof C) for (var j2 = 0; j2 < g2.length; j2++) G.call(a2, g2[j2]) && e2.push("[" + b2(g2[j2]) + "]: " + b2(a2[g2[j2]], a2));
        return e2;
      }
    }, 5521: (a) => {
      "use strict";
      a.exports = (init_node_async_hooks(), __toCommonJS(node_async_hooks_exports));
    }, 5533: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeEmailVerificationEvent = b.deserializeEmailVerification = void 0, b.deserializeEmailVerification = (a2) => ({ object: a2.object, id: a2.id, userId: a2.user_id, email: a2.email, expiresAt: a2.expires_at, code: a2.code, createdAt: a2.created_at, updatedAt: a2.updated_at }), b.deserializeEmailVerificationEvent = (a2) => ({ object: a2.object, id: a2.id, userId: a2.user_id, email: a2.email, expiresAt: a2.expires_at, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 5544: (a) => {
      "use strict";
      var b = Object.defineProperty || false;
      if (b) try {
        b({}, "a", { value: 1 });
      } catch (a2) {
        b = false;
      }
      a.exports = b;
    }, 5576: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeFGAList = void 0, b.deserializeFGAList = (a2, b2) => ({ object: "list", data: a2.data.map(b2), listMetadata: a2.list_metadata, warnings: a2.warnings });
    }, 5597: (a) => {
      "use strict";
      a.exports = "undefined" != typeof Reflect && Reflect.getPrototypeOf || null;
    }, 5663: (a) => {
      (() => {
        "use strict";
        "undefined" != typeof __nccwpck_require__ && (__nccwpck_require__.ab = "//");
        var b = {};
        (() => {
          b.parse = function(b2, c2) {
            if ("string" != typeof b2) throw TypeError("argument str must be a string");
            for (var e2 = {}, f = b2.split(d), g = (c2 || {}).decode || a2, h = 0; h < f.length; h++) {
              var i = f[h], j = i.indexOf("=");
              if (!(j < 0)) {
                var k = i.substr(0, j).trim(), l = i.substr(++j, i.length).trim();
                '"' == l[0] && (l = l.slice(1, -1)), void 0 == e2[k] && (e2[k] = function(a3, b3) {
                  try {
                    return b3(a3);
                  } catch (b4) {
                    return a3;
                  }
                }(l, g));
              }
            }
            return e2;
          }, b.serialize = function(a3, b2, d2) {
            var f = d2 || {}, g = f.encode || c;
            if ("function" != typeof g) throw TypeError("option encode is invalid");
            if (!e.test(a3)) throw TypeError("argument name is invalid");
            var h = g(b2);
            if (h && !e.test(h)) throw TypeError("argument val is invalid");
            var i = a3 + "=" + h;
            if (null != f.maxAge) {
              var j = f.maxAge - 0;
              if (isNaN(j) || !isFinite(j)) throw TypeError("option maxAge is invalid");
              i += "; Max-Age=" + Math.floor(j);
            }
            if (f.domain) {
              if (!e.test(f.domain)) throw TypeError("option domain is invalid");
              i += "; Domain=" + f.domain;
            }
            if (f.path) {
              if (!e.test(f.path)) throw TypeError("option path is invalid");
              i += "; Path=" + f.path;
            }
            if (f.expires) {
              if ("function" != typeof f.expires.toUTCString) throw TypeError("option expires is invalid");
              i += "; Expires=" + f.expires.toUTCString();
            }
            if (f.httpOnly && (i += "; HttpOnly"), f.secure && (i += "; Secure"), f.sameSite) switch ("string" == typeof f.sameSite ? f.sameSite.toLowerCase() : f.sameSite) {
              case true:
              case "strict":
                i += "; SameSite=Strict";
                break;
              case "lax":
                i += "; SameSite=Lax";
                break;
              case "none":
                i += "; SameSite=None";
                break;
              default:
                throw TypeError("option sameSite is invalid");
            }
            return i;
          };
          var a2 = decodeURIComponent, c = encodeURIComponent, d = /; */, e = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
        })(), a.exports = b;
      })();
    }, 5673: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreateOrganizationMembershipOptions = void 0, b.serializeCreateOrganizationMembershipOptions = (a2) => ({ organization_id: a2.organizationId, user_id: a2.userId, role_slug: a2.roleSlug, role_slugs: a2.roleSlugs });
    }, 5689: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeOauthTokens = void 0, b.deserializeOauthTokens = (a2) => a2 ? { accessToken: a2.access_token, refreshToken: a2.refresh_token, expiresAt: a2.expires_at, scopes: a2.scopes } : void 0;
    }, 5711: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 5779: (a) => {
      "use strict";
      a.exports = Object;
    }, 5792: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeUpdatedEventDirectoryUser = b.deserializeDirectoryUserWithGroups = b.deserializeDirectoryUser = void 0;
      let d = c(176);
      b.deserializeDirectoryUser = (a2) => ({ object: a2.object, id: a2.id, directoryId: a2.directory_id, organizationId: a2.organization_id, rawAttributes: a2.raw_attributes, customAttributes: a2.custom_attributes, idpId: a2.idp_id, firstName: a2.first_name, email: a2.email, emails: a2.emails, username: a2.username, lastName: a2.last_name, jobTitle: a2.job_title, state: a2.state, role: a2.role, createdAt: a2.created_at, updatedAt: a2.updated_at }), b.deserializeDirectoryUserWithGroups = (a2) => Object.assign(Object.assign({}, (0, b.deserializeDirectoryUser)(a2)), { groups: a2.groups.map(d.deserializeDirectoryGroup) }), b.deserializeUpdatedEventDirectoryUser = (a2) => ({ object: "directory_user", id: a2.id, directoryId: a2.directory_id, organizationId: a2.organization_id, rawAttributes: a2.raw_attributes, customAttributes: a2.custom_attributes, idpId: a2.idp_id, firstName: a2.first_name, email: a2.email, emails: a2.emails, username: a2.username, lastName: a2.last_name, jobTitle: a2.job_title, state: a2.state, role: a2.role, createdAt: a2.created_at, updatedAt: a2.updated_at, previousAttributes: a2.previous_attributes });
    }, 5819: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 5898: (a, b, c) => {
      "use strict";
      var d = Function.prototype.call, e = Object.prototype.hasOwnProperty;
      a.exports = c(5042).call(d, e);
    }, 5904: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeUpdateOrganizationMembershipOptions = void 0, b.serializeUpdateOrganizationMembershipOptions = (a2) => ({ role_slug: a2.roleSlug, role_slugs: a2.roleSlugs });
    }, 5924: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(1811), b), e(c(926), b), e(c(6136), b), e(c(4619), b);
    }, 5950: (a, b, c) => {
      "use strict";
      var d = "undefined" != typeof Symbol && Symbol, e = c(331);
      a.exports = function() {
        return "function" == typeof d && "function" == typeof Symbol && "symbol" == typeof d("foo") && "symbol" == typeof Symbol("bar") && e();
      };
    }, 6086: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6090: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6136: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6145: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeRevokeSessionOptions = void 0, b.serializeRevokeSessionOptions = (a2) => ({ session_id: a2.sessionId });
    }, 6208: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6253: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.CookieSession = void 0;
      let e = c(9235), f = c(4838), g = c(7252);
      class h {
        constructor(a2, b2, c2) {
          if (!c2) throw Error("cookiePassword is required");
          this.userManagement = a2, this.ironSessionProvider = a2.ironSessionProvider, this.cookiePassword = c2, this.sessionData = b2, this.jwks = this.userManagement.jwks;
        }
        authenticate() {
          return d(this, void 0, void 0, function* () {
            let a2;
            if (!this.sessionData) return { authenticated: false, reason: g.AuthenticateWithSessionCookieFailureReason.NO_SESSION_COOKIE_PROVIDED };
            try {
              a2 = yield this.ironSessionProvider.unsealData(this.sessionData, { password: this.cookiePassword });
            } catch (a3) {
              return { authenticated: false, reason: g.AuthenticateWithSessionCookieFailureReason.INVALID_SESSION_COOKIE };
            }
            if (!a2.accessToken) return { authenticated: false, reason: g.AuthenticateWithSessionCookieFailureReason.INVALID_SESSION_COOKIE };
            if (!(yield this.isValidJwt(a2.accessToken))) return { authenticated: false, reason: g.AuthenticateWithSessionCookieFailureReason.INVALID_JWT };
            let { sid: b2, org_id: c2, role: d2, roles: f2, permissions: h2, entitlements: i, feature_flags: j } = (0, e.decodeJwt)(a2.accessToken);
            return { authenticated: true, sessionId: b2, organizationId: c2, role: d2, roles: f2, permissions: h2, entitlements: i, featureFlags: j, user: a2.user, impersonator: a2.impersonator, accessToken: a2.accessToken };
          });
        }
        refresh(a2 = {}) {
          var b2, c2;
          return d(this, void 0, void 0, function* () {
            let d2 = yield this.ironSessionProvider.unsealData(this.sessionData, { password: this.cookiePassword });
            if (!d2.refreshToken || !d2.user) return { authenticated: false, reason: g.RefreshAndSealSessionDataFailureReason.INVALID_SESSION_COOKIE };
            let { org_id: h2 } = (0, e.decodeJwt)(d2.accessToken);
            try {
              let f2 = null != (b2 = a2.cookiePassword) ? b2 : this.cookiePassword, g2 = yield this.userManagement.authenticateWithRefreshToken({ clientId: this.userManagement.clientId, refreshToken: d2.refreshToken, organizationId: null != (c2 = a2.organizationId) ? c2 : h2, session: { sealSession: true, cookiePassword: f2 } });
              a2.cookiePassword && (this.cookiePassword = a2.cookiePassword), this.sessionData = g2.sealedSession;
              let { sid: i, org_id: j, role: k, roles: l, permissions: m, entitlements: n, feature_flags: o } = (0, e.decodeJwt)(g2.accessToken);
              return { authenticated: true, sealedSession: g2.sealedSession, session: g2, sessionId: i, organizationId: j, role: k, roles: l, permissions: m, entitlements: n, featureFlags: o, user: d2.user, impersonator: d2.impersonator };
            } catch (a3) {
              if (a3 instanceof f.OauthException && (a3.error === g.RefreshAndSealSessionDataFailureReason.INVALID_GRANT || a3.error === g.RefreshAndSealSessionDataFailureReason.MFA_ENROLLMENT || a3.error === g.RefreshAndSealSessionDataFailureReason.SSO_REQUIRED)) return { authenticated: false, reason: a3.error };
              throw a3;
            }
          });
        }
        getLogoutUrl({ returnTo: a2 } = {}) {
          return d(this, void 0, void 0, function* () {
            let b2 = yield this.authenticate();
            if (!b2.authenticated) {
              let { reason: a3 } = b2;
              throw Error(`Failed to extract session ID for logout URL: ${a3}`);
            }
            return this.userManagement.getLogoutUrl({ sessionId: b2.sessionId, returnTo: a2 });
          });
        }
        isValidJwt(a2) {
          return d(this, void 0, void 0, function* () {
            if (!this.jwks) throw Error("Missing client ID. Did you provide it when initializing WorkOS?");
            try {
              return yield (0, e.jwtVerify)(a2, this.jwks), true;
            } catch (a3) {
              return false;
            }
          });
        }
      }
      b.CookieSession = h;
    }, 6264: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6317: (a) => {
      "use strict";
      a.exports = Function.prototype.call;
    }, 6319: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListResourceOptions = void 0, b.serializeListResourceOptions = (a2) => ({ resource_type: a2.resourceType, search: a2.search, limit: a2.limit, before: a2.before, after: a2.after, order: a2.order });
    }, 6347: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6352: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6387: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6430: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.DirectorySync = void 0;
      let e = c(6647), f = c(839), g = c(8877);
      class h {
        constructor(a2) {
          this.workos = a2;
        }
        listDirectories(a2) {
          return d(this, void 0, void 0, function* () {
            return new e.AutoPaginatable(yield (0, g.fetchAndDeserialize)(this.workos, "/directories", f.deserializeDirectory, a2 ? (0, f.serializeListDirectoriesOptions)(a2) : void 0), (a3) => (0, g.fetchAndDeserialize)(this.workos, "/directories", f.deserializeDirectory, a3), a2 ? (0, f.serializeListDirectoriesOptions)(a2) : void 0);
          });
        }
        getDirectory(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/directories/${a2}`);
            return (0, f.deserializeDirectory)(b2);
          });
        }
        deleteDirectory(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.delete(`/directories/${a2}`);
          });
        }
        listGroups(a2) {
          return d(this, void 0, void 0, function* () {
            return new e.AutoPaginatable(yield (0, g.fetchAndDeserialize)(this.workos, "/directory_groups", f.deserializeDirectoryGroup, a2), (a3) => (0, g.fetchAndDeserialize)(this.workos, "/directory_groups", f.deserializeDirectoryGroup, a3), a2);
          });
        }
        listUsers(a2) {
          return d(this, void 0, void 0, function* () {
            return new e.AutoPaginatable(yield (0, g.fetchAndDeserialize)(this.workos, "/directory_users", f.deserializeDirectoryUserWithGroups, a2), (a3) => (0, g.fetchAndDeserialize)(this.workos, "/directory_users", f.deserializeDirectoryUserWithGroups, a3), a2);
          });
        }
        getUser(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/directory_users/${a2}`);
            return (0, f.deserializeDirectoryUserWithGroups)(b2);
          });
        }
        getGroup(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/directory_groups/${a2}`);
            return (0, f.deserializeDirectoryGroup)(b2);
          });
        }
      }
      b.DirectorySync = h;
    }, 6440: (a, b) => {
      "use strict";
      Symbol.for("react.transitional.element"), Symbol.for("react.portal"), Symbol.for("react.fragment"), Symbol.for("react.strict_mode"), Symbol.for("react.profiler"), Symbol.for("react.forward_ref"), Symbol.for("react.suspense"), Symbol.for("react.memo"), Symbol.for("react.lazy"), Symbol.iterator;
      Object.prototype.hasOwnProperty, Object.assign;
    }, 6537: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(8831), b), e(c(6655), b), e(c(9997), b);
    }, 6553: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuthenticateWithMagicAuthOptions = void 0, b.serializeAuthenticateWithMagicAuthOptions = (a2) => ({ grant_type: "urn:workos:oauth:grant-type:magic-auth:code", client_id: a2.clientId, client_secret: a2.clientSecret, code: a2.code, email: a2.email, invitation_token: a2.invitationToken, link_authorization_code: a2.linkAuthorizationCode, ip_address: a2.ipAddress, user_agent: a2.userAgent });
    }, 6569: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6647: function(a, b) {
      "use strict";
      var c = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      }, d = this && this.__await || function(a2) {
        return this instanceof d ? (this.v = a2, this) : new d(a2);
      }, e = this && this.__asyncValues || function(a2) {
        if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
        var b2, c2 = a2[Symbol.asyncIterator];
        return c2 ? c2.call(a2) : (a2 = "function" == typeof __values ? __values(a2) : a2[Symbol.iterator](), b2 = {}, d2("next"), d2("throw"), d2("return"), b2[Symbol.asyncIterator] = function() {
          return this;
        }, b2);
        function d2(c3) {
          b2[c3] = a2[c3] && function(b3) {
            return new Promise(function(d3, e2) {
              var f2, g2, h2;
              f2 = d3, g2 = e2, h2 = (b3 = a2[c3](b3)).done, Promise.resolve(b3.value).then(function(a3) {
                f2({ value: a3, done: h2 });
              }, g2);
            });
          };
        }
      }, f = this && this.__asyncDelegator || function(a2) {
        var b2, c2;
        return b2 = {}, e2("next"), e2("throw", function(a3) {
          throw a3;
        }), e2("return"), b2[Symbol.iterator] = function() {
          return this;
        }, b2;
        function e2(e3, f2) {
          b2[e3] = a2[e3] ? function(b3) {
            return (c2 = !c2) ? { value: d(a2[e3](b3)), done: false } : f2 ? f2(b3) : b3;
          } : f2;
        }
      }, g = this && this.__asyncGenerator || function(a2, b2, c2) {
        if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
        var e2, f2 = c2.apply(a2, b2 || []), g2 = [];
        return e2 = {}, h2("next"), h2("throw"), h2("return"), e2[Symbol.asyncIterator] = function() {
          return this;
        }, e2;
        function h2(a3) {
          f2[a3] && (e2[a3] = function(b3) {
            return new Promise(function(c3, d2) {
              g2.push([a3, b3, c3, d2]) > 1 || i(a3, b3);
            });
          });
        }
        function i(a3, b3) {
          try {
            var c3;
            (c3 = f2[a3](b3)).value instanceof d ? Promise.resolve(c3.value.v).then(j, k) : l(g2[0][2], c3);
          } catch (a4) {
            l(g2[0][3], a4);
          }
        }
        function j(a3) {
          i("next", a3);
        }
        function k(a3) {
          i("throw", a3);
        }
        function l(a3, b3) {
          a3(b3), g2.shift(), g2.length && i(g2[0][0], g2[0][1]);
        }
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.AutoPaginatable = void 0;
      class h {
        constructor(a2, b2, c2) {
          this.list = a2, this.apiCall = b2, this.object = "list", this.options = Object.assign({}, c2);
        }
        get data() {
          return this.list.data;
        }
        get listMetadata() {
          return this.list.listMetadata;
        }
        generatePages(a2) {
          return g(this, arguments, function* () {
            let b2 = yield d(this.apiCall(Object.assign(Object.assign({}, this.options), { limit: 100, after: a2.after })));
            yield yield d(b2.data), b2.listMetadata.after && (yield d(new Promise((a3) => setTimeout(a3, 350))), yield d(yield* f(e(this.generatePages({ after: b2.listMetadata.after })))));
          });
        }
        autoPagination() {
          var a2, b2, d2, f2;
          return c(this, void 0, void 0, function* () {
            if (this.options.limit) return this.data;
            let c2 = [];
            try {
              for (var g2, h2 = true, i = e(this.generatePages({ after: this.options.after })); !(a2 = (g2 = yield i.next()).done); h2 = true) f2 = g2.value, h2 = false, c2.push(...f2);
            } catch (a3) {
              b2 = { error: a3 };
            } finally {
              try {
                !h2 && !a2 && (d2 = i.return) && (yield d2.call(i));
              } finally {
                if (b2) throw b2.error;
              }
            }
            return c2;
          });
        }
      }
      b.AutoPaginatable = h;
    }, 6655: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeFactorWithSecrets = b.deserializeFactor = void 0;
      let d = c(4239), e = c(2949);
      b.deserializeFactor = (a2) => Object.assign(Object.assign({ object: a2.object, id: a2.id, createdAt: a2.created_at, updatedAt: a2.updated_at, type: a2.type }, a2.sms ? { sms: (0, d.deserializeSms)(a2.sms) } : {}), a2.totp ? { totp: (0, e.deserializeTotp)(a2.totp) } : {}), b.deserializeFactorWithSecrets = (a2) => Object.assign(Object.assign({ object: a2.object, id: a2.id, createdAt: a2.created_at, updatedAt: a2.updated_at, type: a2.type }, a2.sms ? { sms: (0, d.deserializeSms)(a2.sms) } : {}), a2.totp ? { totp: (0, e.deserializeTotpWithSecrets)(a2.totp) } : {});
    }, 6657: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6659: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(7656), b), e(c(7631), b), e(c(430), b), e(c(3409), b), e(c(3346), b);
    }, 6661: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6672: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeAuthenticationRadarRiskDetectedEvent = void 0, b.deserializeAuthenticationRadarRiskDetectedEvent = (a2) => ({ authMethod: a2.auth_method, action: a2.action, control: a2.control, blocklistType: a2.blocklist_type, ipAddress: a2.ip_address, userAgent: a2.user_agent, userId: a2.user_id, email: a2.email });
    }, 6686: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(4517), b), e(c(4447), b);
    }, 6734: (a, b) => {
      "use strict";
      var c;
      Object.defineProperty(b, "__esModule", { value: true }), b.CheckOp = void 0, function(a2) {
        a2.AllOf = "all_of", a2.AnyOf = "any_of";
      }(c || (b.CheckOp = c = {}));
    }, 6746: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i2(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i2(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i2(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i2((d2 = d2.apply(a2, b2 || [])).next());
        });
      }, e = this && this.__rest || function(a2, b2) {
        var c2 = {};
        for (var d2 in a2) Object.prototype.hasOwnProperty.call(a2, d2) && 0 > b2.indexOf(d2) && (c2[d2] = a2[d2]);
        if (null != a2 && "function" == typeof Object.getOwnPropertySymbols) for (var e2 = 0, d2 = Object.getOwnPropertySymbols(a2); e2 < d2.length; e2++) 0 > b2.indexOf(d2[e2]) && Object.prototype.propertyIsEnumerable.call(a2, d2[e2]) && (c2[d2[e2]] = a2[d2[e2]]);
        return c2;
      }, f = this && this.__importDefault || function(a2) {
        return a2 && a2.__esModule ? a2 : { default: a2 };
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.UserManagement = void 0;
      let g = c(9235), h = f(c(1170)), i = c(4838), j = c(8877), k = c(6647), l = c(6537), m = c(8655), n = c(2236), o = c(6145), p = c(5363), q = c(1078), r = c(5073), s = c(5673), t = c(5114), u = c(1139), v = c(5374), w = c(8071), x = c(4346), y = c(9891), z = c(619), A = c(648), B = c(5904), C = c(6253);
      class D {
        constructor(a2, b2) {
          this.workos = a2;
          let { clientId: c2 } = a2.options;
          this.clientId = c2, this.ironSessionProvider = b2;
        }
        get jwks() {
          if (this.clientId) return null != this._jwks || (this._jwks = (0, g.createRemoteJWKSet)(new URL(this.getJwksUrl(this.clientId)), { cooldownDuration: 3e5 })), this._jwks;
        }
        loadSealedSession(a2) {
          return new C.CookieSession(this, a2.sessionData, a2.cookiePassword);
        }
        getUser(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/user_management/users/${a2}`);
            return (0, p.deserializeUser)(b2);
          });
        }
        getUserByExternalId(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/user_management/users/external_id/${a2}`);
            return (0, p.deserializeUser)(b2);
          });
        }
        listUsers(a2) {
          return d(this, void 0, void 0, function* () {
            return new k.AutoPaginatable(yield (0, j.fetchAndDeserialize)(this.workos, "/user_management/users", p.deserializeUser, a2 ? (0, y.serializeListUsersOptions)(a2) : void 0), (a3) => (0, j.fetchAndDeserialize)(this.workos, "/user_management/users", p.deserializeUser, a3), a2 ? (0, y.serializeListUsersOptions)(a2) : void 0);
          });
        }
        createUser(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/user_management/users", (0, p.serializeCreateUserOptions)(a2));
            return (0, p.deserializeUser)(b2);
          });
        }
        authenticateWithMagicAuth(a2) {
          return d(this, void 0, void 0, function* () {
            let { session: b2 } = a2, c2 = e(a2, ["session"]), { data: d2 } = yield this.workos.post("/user_management/authenticate", (0, p.serializeAuthenticateWithMagicAuthOptions)(Object.assign(Object.assign({}, c2), { clientSecret: this.workos.key })));
            return this.prepareAuthenticationResponse({ authenticationResponse: (0, p.deserializeAuthenticationResponse)(d2), session: b2 });
          });
        }
        authenticateWithPassword(a2) {
          return d(this, void 0, void 0, function* () {
            let { session: b2 } = a2, c2 = e(a2, ["session"]), { data: d2 } = yield this.workos.post("/user_management/authenticate", (0, p.serializeAuthenticateWithPasswordOptions)(Object.assign(Object.assign({}, c2), { clientSecret: this.workos.key })));
            return this.prepareAuthenticationResponse({ authenticationResponse: (0, p.deserializeAuthenticationResponse)(d2), session: b2 });
          });
        }
        authenticateWithCode(a2) {
          return d(this, void 0, void 0, function* () {
            let { session: b2 } = a2, c2 = e(a2, ["session"]), { data: d2 } = yield this.workos.post("/user_management/authenticate", (0, p.serializeAuthenticateWithCodeOptions)(Object.assign(Object.assign({}, c2), { clientSecret: this.workos.key })));
            return this.prepareAuthenticationResponse({ authenticationResponse: (0, p.deserializeAuthenticationResponse)(d2), session: b2 });
          });
        }
        authenticateWithCodeAndVerifier(a2) {
          return d(this, void 0, void 0, function* () {
            let { session: b2 } = a2, c2 = e(a2, ["session"]), { data: d2 } = yield this.workos.post("/user_management/authenticate", (0, p.serializeAuthenticateWithCodeAndVerifierOptions)(c2));
            return this.prepareAuthenticationResponse({ authenticationResponse: (0, p.deserializeAuthenticationResponse)(d2), session: b2 });
          });
        }
        authenticateWithRefreshToken(a2) {
          return d(this, void 0, void 0, function* () {
            let { session: b2 } = a2, c2 = e(a2, ["session"]), { data: d2 } = yield this.workos.post("/user_management/authenticate", (0, p.serializeAuthenticateWithRefreshTokenOptions)(Object.assign(Object.assign({}, c2), { clientSecret: this.workos.key })));
            return this.prepareAuthenticationResponse({ authenticationResponse: (0, p.deserializeAuthenticationResponse)(d2), session: b2 });
          });
        }
        authenticateWithTotp(a2) {
          return d(this, void 0, void 0, function* () {
            let { session: b2 } = a2, c2 = e(a2, ["session"]), { data: d2 } = yield this.workos.post("/user_management/authenticate", (0, p.serializeAuthenticateWithTotpOptions)(Object.assign(Object.assign({}, c2), { clientSecret: this.workos.key })));
            return this.prepareAuthenticationResponse({ authenticationResponse: (0, p.deserializeAuthenticationResponse)(d2), session: b2 });
          });
        }
        authenticateWithEmailVerification(a2) {
          return d(this, void 0, void 0, function* () {
            let { session: b2 } = a2, c2 = e(a2, ["session"]), { data: d2 } = yield this.workos.post("/user_management/authenticate", (0, q.serializeAuthenticateWithEmailVerificationOptions)(Object.assign(Object.assign({}, c2), { clientSecret: this.workos.key })));
            return this.prepareAuthenticationResponse({ authenticationResponse: (0, p.deserializeAuthenticationResponse)(d2), session: b2 });
          });
        }
        authenticateWithOrganizationSelection(a2) {
          return d(this, void 0, void 0, function* () {
            let { session: b2 } = a2, c2 = e(a2, ["session"]), { data: d2 } = yield this.workos.post("/user_management/authenticate", (0, r.serializeAuthenticateWithOrganizationSelectionOptions)(Object.assign(Object.assign({}, c2), { clientSecret: this.workos.key })));
            return this.prepareAuthenticationResponse({ authenticationResponse: (0, p.deserializeAuthenticationResponse)(d2), session: b2 });
          });
        }
        authenticateWithSessionCookie({ sessionData: a2, cookiePassword: b2 = process.env.WORKOS_COOKIE_PASSWORD }) {
          return d(this, void 0, void 0, function* () {
            if (!b2) throw Error("Cookie password is required");
            if (!this.jwks) throw Error("Must provide clientId to initialize JWKS");
            if (!a2) return { authenticated: false, reason: m.AuthenticateWithSessionCookieFailureReason.NO_SESSION_COOKIE_PROVIDED };
            let c2 = yield this.ironSessionProvider.unsealData(a2, { password: b2 });
            if (!c2.accessToken) return { authenticated: false, reason: m.AuthenticateWithSessionCookieFailureReason.INVALID_SESSION_COOKIE };
            if (!(yield this.isValidJwt(c2.accessToken))) return { authenticated: false, reason: m.AuthenticateWithSessionCookieFailureReason.INVALID_JWT };
            let { sid: d2, org_id: e2, role: f2, roles: h2, permissions: i2, entitlements: j2, feature_flags: k2 } = (0, g.decodeJwt)(c2.accessToken);
            return { authenticated: true, sessionId: d2, organizationId: e2, role: f2, roles: h2, user: c2.user, permissions: i2, entitlements: j2, featureFlags: k2, accessToken: c2.accessToken };
          });
        }
        isValidJwt(a2) {
          return d(this, void 0, void 0, function* () {
            if (!this.jwks) throw Error("Must provide clientId to initialize JWKS");
            try {
              return yield (0, g.jwtVerify)(a2, this.jwks), true;
            } catch (a3) {
              return false;
            }
          });
        }
        refreshAndSealSessionData({ sessionData: a2, organizationId: b2, cookiePassword: c2 = process.env.WORKOS_COOKIE_PASSWORD }) {
          return d(this, void 0, void 0, function* () {
            if (!c2) throw Error("Cookie password is required");
            if (!a2) return { authenticated: false, reason: n.RefreshAndSealSessionDataFailureReason.NO_SESSION_COOKIE_PROVIDED };
            let d2 = yield this.ironSessionProvider.unsealData(a2, { password: c2 });
            if (!d2.refreshToken || !d2.user) return { authenticated: false, reason: n.RefreshAndSealSessionDataFailureReason.INVALID_SESSION_COOKIE };
            let { org_id: e2 } = (0, g.decodeJwt)(d2.accessToken);
            try {
              let { sealedSession: a3 } = yield this.authenticateWithRefreshToken({ clientId: this.workos.clientId, refreshToken: d2.refreshToken, organizationId: null != b2 ? b2 : e2, session: { sealSession: true, cookiePassword: c2 } });
              if (!a3) return { authenticated: false, reason: n.RefreshAndSealSessionDataFailureReason.INVALID_SESSION_COOKIE };
              return { authenticated: true, sealedSession: a3 };
            } catch (a3) {
              if (a3 instanceof i.OauthException && (a3.error === n.RefreshAndSealSessionDataFailureReason.INVALID_GRANT || a3.error === n.RefreshAndSealSessionDataFailureReason.MFA_ENROLLMENT || a3.error === n.RefreshAndSealSessionDataFailureReason.SSO_REQUIRED)) return { authenticated: false, reason: a3.error };
              throw a3;
            }
          });
        }
        prepareAuthenticationResponse({ authenticationResponse: a2, session: b2 }) {
          return d(this, void 0, void 0, function* () {
            return (null == b2 ? void 0 : b2.sealSession) ? Object.assign(Object.assign({}, a2), { sealedSession: yield this.sealSessionDataFromAuthenticationResponse({ authenticationResponse: a2, cookiePassword: b2.cookiePassword }) }) : a2;
          });
        }
        sealSessionDataFromAuthenticationResponse({ authenticationResponse: a2, cookiePassword: b2 }) {
          return d(this, void 0, void 0, function* () {
            if (!b2) throw Error("Cookie password is required");
            let { org_id: c2 } = (0, g.decodeJwt)(a2.accessToken), d2 = { organizationId: c2, user: a2.user, accessToken: a2.accessToken, refreshToken: a2.refreshToken, impersonator: a2.impersonator };
            return this.ironSessionProvider.sealData(d2, { password: b2 });
          });
        }
        getSessionFromCookie({ sessionData: a2, cookiePassword: b2 = process.env.WORKOS_COOKIE_PASSWORD }) {
          return d(this, void 0, void 0, function* () {
            if (!b2) throw Error("Cookie password is required");
            if (a2) return this.ironSessionProvider.unsealData(a2, { password: b2 });
          });
        }
        getEmailVerification(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/user_management/email_verification/${a2}`);
            return (0, p.deserializeEmailVerification)(b2);
          });
        }
        sendVerificationEmail({ userId: a2 }) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post(`/user_management/users/${a2}/email_verification/send`, {});
            return { user: (0, p.deserializeUser)(b2.user) };
          });
        }
        getMagicAuth(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/user_management/magic_auth/${a2}`);
            return (0, p.deserializeMagicAuth)(b2);
          });
        }
        createMagicAuth(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/user_management/magic_auth", (0, p.serializeCreateMagicAuthOptions)(Object.assign({}, a2)));
            return (0, p.deserializeMagicAuth)(b2);
          });
        }
        sendMagicAuthCode(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.post("/user_management/magic_auth/send", (0, p.serializeSendMagicAuthCodeOptions)(a2));
          });
        }
        verifyEmail({ code: a2, userId: b2 }) {
          return d(this, void 0, void 0, function* () {
            let { data: c2 } = yield this.workos.post(`/user_management/users/${b2}/email_verification/confirm`, { code: a2 });
            return { user: (0, p.deserializeUser)(c2.user) };
          });
        }
        getPasswordReset(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/user_management/password_reset/${a2}`);
            return (0, p.deserializePasswordReset)(b2);
          });
        }
        createPasswordReset(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/user_management/password_reset", (0, p.serializeCreatePasswordResetOptions)(Object.assign({}, a2)));
            return (0, p.deserializePasswordReset)(b2);
          });
        }
        sendPasswordResetEmail(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.post("/user_management/password_reset/send", (0, p.serializeSendPasswordResetEmailOptions)(a2));
          });
        }
        resetPassword(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/user_management/password_reset/confirm", (0, p.serializeResetPasswordOptions)(a2));
            return { user: (0, p.deserializeUser)(b2.user) };
          });
        }
        updateUser(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.put(`/user_management/users/${a2.userId}`, (0, p.serializeUpdateUserOptions)(a2));
            return (0, p.deserializeUser)(b2);
          });
        }
        enrollAuthFactor(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post(`/user_management/users/${a2.userId}/auth_factors`, (0, p.serializeEnrollAuthFactorOptions)(a2));
            return { authenticationFactor: (0, p.deserializeFactorWithSecrets)(b2.authentication_factor), authenticationChallenge: (0, l.deserializeChallenge)(b2.authentication_challenge) };
          });
        }
        listAuthFactors(a2) {
          return d(this, void 0, void 0, function* () {
            let { userId: b2 } = a2, c2 = e(a2, ["userId"]);
            return new k.AutoPaginatable(yield (0, j.fetchAndDeserialize)(this.workos, `/user_management/users/${b2}/auth_factors`, t.deserializeFactor, c2), (a3) => (0, j.fetchAndDeserialize)(this.workos, `/user_management/users/${b2}/auth_factors`, t.deserializeFactor, a3), c2);
          });
        }
        listSessions(a2, b2) {
          return d(this, void 0, void 0, function* () {
            return new k.AutoPaginatable(yield (0, j.fetchAndDeserialize)(this.workos, `/user_management/users/${a2}/sessions`, p.deserializeSession, b2 ? (0, p.serializeListSessionsOptions)(b2) : void 0), (b3) => (0, j.fetchAndDeserialize)(this.workos, `/user_management/users/${a2}/sessions`, p.deserializeSession, b3), b2 ? (0, p.serializeListSessionsOptions)(b2) : void 0);
          });
        }
        deleteUser(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.delete(`/user_management/users/${a2}`);
          });
        }
        getUserIdentities(a2) {
          return d(this, void 0, void 0, function* () {
            if (!a2) throw TypeError("Incomplete arguments. Need to specify 'userId'.");
            let { data: b2 } = yield this.workos.get(`/user_management/users/${a2}/identities`);
            return (0, u.deserializeIdentities)(b2);
          });
        }
        getOrganizationMembership(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/user_management/organization_memberships/${a2}`);
            return (0, z.deserializeOrganizationMembership)(b2);
          });
        }
        listOrganizationMemberships(a2) {
          return d(this, void 0, void 0, function* () {
            return new k.AutoPaginatable(yield (0, j.fetchAndDeserialize)(this.workos, "/user_management/organization_memberships", z.deserializeOrganizationMembership, a2 ? (0, x.serializeListOrganizationMembershipsOptions)(a2) : void 0), (a3) => (0, j.fetchAndDeserialize)(this.workos, "/user_management/organization_memberships", z.deserializeOrganizationMembership, a3), a2 ? (0, x.serializeListOrganizationMembershipsOptions)(a2) : void 0);
          });
        }
        createOrganizationMembership(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/user_management/organization_memberships", (0, s.serializeCreateOrganizationMembershipOptions)(a2));
            return (0, z.deserializeOrganizationMembership)(b2);
          });
        }
        updateOrganizationMembership(a2, b2) {
          return d(this, void 0, void 0, function* () {
            let { data: c2 } = yield this.workos.put(`/user_management/organization_memberships/${a2}`, (0, B.serializeUpdateOrganizationMembershipOptions)(b2));
            return (0, z.deserializeOrganizationMembership)(c2);
          });
        }
        deleteOrganizationMembership(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.delete(`/user_management/organization_memberships/${a2}`);
          });
        }
        deactivateOrganizationMembership(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.put(`/user_management/organization_memberships/${a2}/deactivate`, {});
            return (0, z.deserializeOrganizationMembership)(b2);
          });
        }
        reactivateOrganizationMembership(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.put(`/user_management/organization_memberships/${a2}/reactivate`, {});
            return (0, z.deserializeOrganizationMembership)(b2);
          });
        }
        getInvitation(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/user_management/invitations/${a2}`);
            return (0, v.deserializeInvitation)(b2);
          });
        }
        findInvitationByToken(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get(`/user_management/invitations/by_token/${a2}`);
            return (0, v.deserializeInvitation)(b2);
          });
        }
        listInvitations(a2) {
          return d(this, void 0, void 0, function* () {
            return new k.AutoPaginatable(yield (0, j.fetchAndDeserialize)(this.workos, "/user_management/invitations", v.deserializeInvitation, a2 ? (0, w.serializeListInvitationsOptions)(a2) : void 0), (a3) => (0, j.fetchAndDeserialize)(this.workos, "/user_management/invitations", v.deserializeInvitation, a3), a2 ? (0, w.serializeListInvitationsOptions)(a2) : void 0);
          });
        }
        sendInvitation(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post("/user_management/invitations", (0, A.serializeSendInvitationOptions)(Object.assign({}, a2)));
            return (0, v.deserializeInvitation)(b2);
          });
        }
        acceptInvitation(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post(`/user_management/invitations/${a2}/accept`, null);
            return (0, v.deserializeInvitation)(b2);
          });
        }
        revokeInvitation(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post(`/user_management/invitations/${a2}/revoke`, null);
            return (0, v.deserializeInvitation)(b2);
          });
        }
        revokeSession(a2) {
          return d(this, void 0, void 0, function* () {
            yield this.workos.post("/user_management/sessions/revoke", (0, o.serializeRevokeSessionOptions)(a2));
          });
        }
        getAuthorizationUrl({ connectionId: a2, codeChallenge: b2, codeChallengeMethod: c2, context: d2, clientId: e2, domainHint: f2, loginHint: g2, organizationId: i2, provider: j2, providerQueryParams: k2, providerScopes: l2, prompt: m2, redirectUri: n2, state: o2, screenHint: p2 }) {
          let q2;
          if (!j2 && !a2 && !i2) throw TypeError("Incomplete arguments. Need to specify either a 'connectionId', 'organizationId', or 'provider'.");
          if ("authkit" !== j2 && p2) throw TypeError("'screenHint' is only supported for 'authkit' provider");
          d2 && this.workos.emitWarning(`\`context\` is deprecated. We previously required initiate login endpoints to return the
\`context\` query parameter when getting the authorization URL. This is no longer necessary.`);
          let r2 = (q2 = { connection_id: a2, code_challenge: b2, code_challenge_method: c2, context: d2, organization_id: i2, domain_hint: f2, login_hint: g2, provider: j2, provider_query_params: k2, provider_scopes: l2, prompt: m2, client_id: e2, redirect_uri: n2, response_type: "code", state: o2, screen_hint: p2 }, h.default.stringify(q2, { arrayFormat: "repeat", sort: (a3, b3) => a3.localeCompare(b3), format: "RFC1738" }));
          return `${this.workos.baseURL}/user_management/authorize?${r2}`;
        }
        getLogoutUrl({ sessionId: a2, returnTo: b2 }) {
          if (!a2) throw TypeError("Incomplete arguments. Need to specify 'sessionId'.");
          let c2 = new URL("/user_management/sessions/logout", this.workos.baseURL);
          return c2.searchParams.set("session_id", a2), b2 && c2.searchParams.set("return_to", b2), c2.toString();
        }
        getLogoutUrlFromSessionCookie({ sessionData: a2, cookiePassword: b2 = process.env.WORKOS_COOKIE_PASSWORD }) {
          return d(this, void 0, void 0, function* () {
            let c2 = yield this.authenticateWithSessionCookie({ sessionData: a2, cookiePassword: b2 });
            if (!c2.authenticated) {
              let { reason: a3 } = c2;
              throw Error(`Failed to extract session ID for logout URL: ${a3}`);
            }
            return this.getLogoutUrl({ sessionId: c2.sessionId });
          });
        }
        getJwksUrl(a2) {
          if (!a2) throw TypeError("clientId must be a valid clientId");
          return `${this.workos.baseURL}/sso/jwks/${a2}`;
        }
      }
      b.UserManagement = D;
    }, 6804: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.GenericServerException = void 0;
      class c extends Error {
        constructor(a2, b2, c2, d) {
          super(), this.status = a2, this.rawData = c2, this.requestID = d, this.name = "GenericServerException", this.message = "The request could not be completed.", b2 && (this.message = b2);
        }
      }
      b.GenericServerException = c;
    }, 6809: (a, b, c) => {
      "use strict";
      var d = c(3436), e = (a2) => (d.Buffer.isBuffer(a2) ? a2 : d.Buffer.from(a2)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""), f = (a2) => ({ ...a2, encryption: { ...a2.encryption }, integrity: { ...a2.integrity } }), g = { "aes-128-ctr": { keyBits: 128, ivBits: 128, name: "AES-CTR" }, "aes-256-cbc": { keyBits: 256, ivBits: 128, name: "AES-CBC" }, sha256: { keyBits: 256, name: "SHA-256" } }, h = "Fe26.2", i = (a2, b2) => {
        if (b2 < 1) throw Error("Invalid random bits count");
        return ((a3, b3) => {
          let c2 = d.Buffer.allocUnsafe(b3);
          return a3.getRandomValues(c2), c2;
        })(a2, Math.ceil(b2 / 8));
      }, j = async (a2, b2, c2, e2, f2, g2) => {
        let h2 = new TextEncoder(), i2 = h2.encode(b2), j2 = await a2.subtle.importKey("raw", i2, "PBKDF2", false, ["deriveBits"]), k2 = h2.encode(c2), l2 = await a2.subtle.deriveBits({ name: "PBKDF2", hash: g2, salt: k2, iterations: e2 }, j2, 8 * f2);
        return d.Buffer.from(l2);
      }, k = async (a2, b2, c2) => {
        var d2;
        if (null == b2 || !b2.length) throw Error("Empty password");
        if (null == c2 || "object" != typeof c2) throw Error("Bad options");
        if (!(c2.algorithm in g)) throw Error(`Unknown algorithm: ${c2.algorithm}`);
        let e2 = g[c2.algorithm], f2 = {}, h2 = null != (d2 = c2.hmac) && d2, k2 = h2 ? { name: "HMAC", hash: e2.name } : { name: e2.name }, l2 = h2 ? ["sign", "verify"] : ["encrypt", "decrypt"];
        if ("string" == typeof b2) {
          if (b2.length < c2.minPasswordlength) throw Error(`Password string too short (min ${c2.minPasswordlength} characters required)`);
          let { salt: d3 = "" } = c2;
          if (!d3) {
            let { saltBits: b3 = 0 } = c2;
            if (!b3) throw Error("Missing salt and saltBits options");
            d3 = i(a2, b3).toString("hex");
          }
          let g2 = await j(a2, b2, d3, c2.iterations, e2.keyBits / 8, "SHA-1");
          f2.key = await a2.subtle.importKey("raw", g2, k2, false, l2), f2.salt = d3;
        } else {
          if (b2.length < e2.keyBits / 8) throw Error("Key buffer (password) too small");
          f2.key = await a2.subtle.importKey("raw", b2, k2, false, l2), f2.salt = "";
        }
        return c2.iv ? f2.iv = c2.iv : "ivBits" in e2 && (f2.iv = i(a2, e2.ivBits)), f2;
      }, l = async (a2, b2, c2, e2) => {
        let f2 = await k(a2, b2, c2), h2 = new TextEncoder().encode(e2), i2 = await a2.subtle.encrypt({ name: g[c2.algorithm].name, iv: f2.iv }, f2.key, h2);
        return { encrypted: d.Buffer.from(i2), key: f2 };
      }, m = async (a2, b2, c2, e2) => {
        let f2 = await k(a2, b2, c2), h2 = await a2.subtle.decrypt({ name: g[c2.algorithm].name, iv: f2.iv }, f2.key, d.Buffer.isBuffer(e2) ? e2 : d.Buffer.from(e2));
        return new TextDecoder().decode(h2);
      }, n = async (a2, b2, c2, f2) => {
        let g2 = await k(a2, b2, { ...c2, hmac: true }), h2 = new TextEncoder().encode(f2), i2 = await a2.subtle.sign({ name: "HMAC" }, g2.key, h2);
        return { digest: e(d.Buffer.from(i2)), salt: g2.salt };
      }, o = (a2) => "object" != typeof a2 || d.Buffer.isBuffer(a2) ? { encryption: a2, integrity: a2 } : "secret" in a2 ? { id: a2.id, encryption: a2.secret, integrity: a2.secret } : { id: a2.id, encryption: a2.encryption, integrity: a2.integrity }, p = async (a2, b2, c2, d2) => {
        if (!c2) throw Error("Empty password");
        let g2 = f(d2), i2 = Date.now() + (g2.localtimeOffsetMsec || 0), j2 = JSON.stringify(b2), k2 = o(c2), { id: m2 = "" } = k2;
        if (m2 && !/^\w+$/.test(m2)) throw Error("Invalid password id");
        let { encrypted: p2, key: q2 } = await l(a2, k2.encryption, g2.encryption, j2), r = e(p2), s = e(q2.iv), t = g2.ttl ? i2 + g2.ttl : "", u = `${h}*${m2}*${q2.salt}*${s}*${r}*${t}`, v = await n(a2, k2.integrity, g2.integrity, u);
        return `${u}*${v.salt}*${v.digest}`;
      }, q = async (a2, b2, c2, e2) => {
        let g2;
        if (!c2) throw Error("Empty password");
        let i2 = f(e2), j2 = Date.now() + (i2.localtimeOffsetMsec || 0), k2 = b2.split("*");
        if (8 !== k2.length) throw Error("Incorrect number of sealed components");
        let l2 = k2[0], p2 = k2[1], q2 = k2[2], r = k2[3], s = k2[4], t = k2[5], u = k2[6], v = k2[7], w = `${l2}*${p2}*${q2}*${r}*${s}*${t}`;
        if (h !== l2) throw Error("Wrong mac prefix");
        if (t) {
          if (!/^\d+$/.exec(t)) throw Error("Invalid expiration");
          if (parseInt(t, 10) <= j2 - 1e3 * i2.timestampSkewSec) throw Error("Expired seal");
        }
        if (void 0 === c2 || "string" == typeof c2 && 0 === c2.length) throw Error("Empty password");
        if ("object" != typeof c2 || d.Buffer.isBuffer(c2)) g2 = c2;
        else {
          if (!((p2 || "default") in c2)) throw Error(`Cannot find password: ${p2}`);
          g2 = c2[p2 || "default"];
        }
        g2 = o(g2);
        let x = i2.integrity;
        if (x.salt = u, !((a3, b3) => {
          let c3 = +(a3.length !== b3.length);
          c3 && (b3 = a3);
          for (let d2 = 0; d2 < a3.length; d2 += 1) c3 |= a3.charCodeAt(d2) ^ b3.charCodeAt(d2);
          return 0 === c3;
        })((await n(a2, g2.integrity, x, w)).digest, v)) throw Error("Bad hmac value");
        let y = d.Buffer.from(s, "base64"), z = i2.encryption;
        z.salt = q2, z.iv = d.Buffer.from(r, "base64");
        let A = await m(a2, g2.encryption, z, y);
        return A ? JSON.parse(A) : null;
      };
      Object.defineProperty(b, "Buffer", { enumerable: true, get: function() {
        return d.Buffer;
      } }), b.algorithms = g, b.base64urlEncode = e, b.clone = f, b.decrypt = m, b.defaults = { encryption: { saltBits: 256, algorithm: "aes-256-cbc", iterations: 1, minPasswordlength: 32 }, integrity: { saltBits: 256, algorithm: "sha256", iterations: 1, minPasswordlength: 32 }, ttl: 0, timestampSkewSec: 60, localtimeOffsetMsec: 0 }, b.encrypt = l, b.generateKey = k, b.hmacWithPassword = n, b.macFormatVersion = "2", b.macPrefix = h, b.randomBits = i, b.seal = p, b.unseal = q;
    }, 6882: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeWriteWarrantOptions = void 0;
      let d = c(9180);
      b.serializeWriteWarrantOptions = (a2) => ({ op: a2.op, resource_type: (0, d.isResourceInterface)(a2.resource) ? a2.resource.getResourceType() : a2.resource.resourceType, resource_id: (0, d.isResourceInterface)(a2.resource) ? a2.resource.getResourceId() : a2.resource.resourceId ? a2.resource.resourceId : "", relation: a2.relation, subject: (0, d.isSubject)(a2.subject) ? { resource_type: a2.subject.resourceType, resource_id: a2.subject.resourceId } : { resource_type: a2.subject.getResourceType(), resource_id: a2.subject.getResourceId() }, policy: a2.policy });
    }, 6892: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListWarrantsOptions = void 0, b.serializeListWarrantsOptions = (a2) => ({ resource_type: a2.resourceType, resource_id: a2.resourceId, relation: a2.relation, subject_type: a2.subjectType, subject_id: a2.subjectId, subject_relation: a2.subjectRelation, limit: a2.limit, after: a2.after });
    }, 6904: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 6939: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(8153), b), e(c(5065), b);
    }, 7122: (a, b, c) => {
      "use strict";
      var d = c(5456), e = c(8728), f = function(a2, b2, c2) {
        for (var d2, e2 = a2; null != (d2 = e2.next); e2 = d2) if (d2.key === b2) return e2.next = d2.next, c2 || (d2.next = a2.next, a2.next = d2), d2;
      }, g = function(a2, b2) {
        if (a2) {
          var c2 = f(a2, b2);
          return c2 && c2.value;
        }
      }, h = function(a2, b2, c2) {
        var d2 = f(a2, b2);
        d2 ? d2.value = c2 : a2.next = { key: b2, next: a2.next, value: c2 };
      }, i = function(a2, b2) {
        if (a2) return f(a2, b2, true);
      };
      a.exports = function() {
        var a2, b2 = { assert: function(a3) {
          if (!b2.has(a3)) throw new e("Side channel does not contain " + d(a3));
        }, delete: function(b3) {
          var c2 = a2 && a2.next, d2 = i(a2, b3);
          return d2 && c2 && c2 === d2 && (a2 = void 0), !!d2;
        }, get: function(b3) {
          return g(a2, b3);
        }, has: function(b3) {
          var c2;
          return !!(c2 = a2) && !!f(c2, b3);
        }, set: function(b3, c2) {
          a2 || (a2 = { next: void 0 }), h(a2, b3, c2);
        } };
        return b2;
      };
    }, 7137: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 7221: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeQueryOptions = void 0, b.serializeQueryOptions = (a2) => ({ q: a2.q, context: JSON.stringify(a2.context), limit: a2.limit, before: a2.before, after: a2.after, order: a2.order });
    }, 7252: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(2202), b), e(c(6387), b), e(c(9109), b), e(c(3525), b), e(c(1604), b), e(c(1348), b), e(c(6090), b), e(c(9176), b), e(c(8655), b), e(c(2766), b), e(c(9062), b), e(c(3542), b), e(c(5711), b), e(c(8757), b), e(c(8295), b), e(c(4509), b), e(c(2510), b), e(c(7137), b), e(c(6569), b), e(c(4952), b), e(c(1100), b), e(c(4751), b), e(c(432), b), e(c(1420), b), e(c(2194), b), e(c(455), b), e(c(9082), b), e(c(6352), b), e(c(1571), b), e(c(2605), b), e(c(7849), b), e(c(6657), b), e(c(8628), b), e(c(2236), b), e(c(5417), b), e(c(6145), b), e(c(4340), b), e(c(39), b), e(c(9687), b), e(c(4987), b), e(c(1763), b), e(c(1150), b), e(c(3311), b), e(c(3985), b), e(c(9760), b), e(c(9664), b);
    }, 7275: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 7306: (a) => {
      "use strict";
      var b = Object.prototype.toString, c = Math.max, d = function(a2, b2) {
        for (var c2 = [], d2 = 0; d2 < a2.length; d2 += 1) c2[d2] = a2[d2];
        for (var e2 = 0; e2 < b2.length; e2 += 1) c2[e2 + a2.length] = b2[e2];
        return c2;
      }, e = function(a2, b2) {
        for (var c2 = [], d2 = b2 || 0, e2 = 0; d2 < a2.length; d2 += 1, e2 += 1) c2[e2] = a2[d2];
        return c2;
      }, f = function(a2, b2) {
        for (var c2 = "", d2 = 0; d2 < a2.length; d2 += 1) c2 += a2[d2], d2 + 1 < a2.length && (c2 += b2);
        return c2;
      };
      a.exports = function(a2) {
        var g, h = this;
        if ("function" != typeof h || "[object Function]" !== b.apply(h)) throw TypeError("Function.prototype.bind called on incompatible " + h);
        for (var i = e(arguments, 1), j = c(0, h.length - i.length), k = [], l = 0; l < j; l++) k[l] = "$" + l;
        if (g = __next_eval__(function() {
          return Function("binder", "return function (" + f(k, ",") + "){ return binder.apply(this,arguments); }");
        })(function() {
          if (this instanceof g) {
            var b2 = h.apply(this, d(i, arguments));
            return Object(b2) === b2 ? b2 : this;
          }
          return h.apply(a2, d(i, arguments));
        }), h.prototype) {
          var m = function() {
          };
          m.prototype = h.prototype, g.prototype = new m(), m.prototype = null;
        }
        return g;
      };
    }, 7313: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Events = void 0;
      let e = c(6939), f = c(4007);
      class g {
        constructor(a2) {
          this.workos = a2;
        }
        listEvents(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.get("/events", { query: a2 ? (0, f.serializeListEventOptions)(a2) : void 0 });
            return (0, e.deserializeList)(b2, e.deserializeEvent);
          });
        }
      }
      b.Events = g;
    }, 7419: (a) => {
      "use strict";
      a.exports = { extract: function(a2, b, c, d) {
        if (c < 0 || c > 32) throw Error("Bad value for bitLength.");
        if (void 0 === d) d = 0;
        else if (0 !== d && 1 !== d) throw Error("Bad value for defaultBit.");
        var e = 255 * d, f = 0, g = b + c, h = Math.floor(b / 8), i = Math.floor(g / 8), j = g % 8;
        for (0 !== j && (f = k(i) & (1 << j) - 1); i > h; ) f = f << 8 | k(--i);
        return f >>> b % 8;
        function k(b2) {
          var c2 = a2[b2];
          return void 0 === c2 ? e : c2;
        }
      }, inject: function(a2, b, c, d) {
        if (c < 0 || c > 32) throw Error("Bad value for bitLength.");
        var e = Math.floor((b + c - 1) / 8);
        if (b < 0 || e >= a2.length) throw Error("Index out of range.");
        for (var f = Math.floor(b / 8), g = b % 8; c > 0; ) 1 & d ? a2[f] |= 1 << g : a2[f] &= ~(1 << g), d >>= 1, c--, 0 == (g = (g + 1) % 8) && f++;
      }, getSign: function(a2) {
        return a2[a2.length - 1] >>> 7;
      }, highOrder: function(a2, b) {
        for (var c = b.length, d = (1 ^ a2) * 255; c > 0 && b[c - 1] === d; ) c--;
        if (0 === c) return -1;
        for (var e = b[c - 1], f = 8 * c - 1, g = 7; g > 0 && (e >> g & 1) !== a2; g--) f--;
        return f;
      } };
    }, 7429: (a, b) => {
      "use strict";
      var c;
      Object.defineProperty(b, "__esModule", { value: true }), b.WarrantOp = void 0, function(a2) {
        a2.Create = "create", a2.Delete = "delete";
      }(c || (b.WarrantOp = c = {}));
    }, 7513: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeSession = void 0, b.deserializeSession = (a2) => ({ object: "session", id: a2.id, userId: a2.user_id, ipAddress: a2.ip_address, userAgent: a2.user_agent, organizationId: a2.organization_id, impersonator: a2.impersonator, authMethod: a2.auth_method, status: a2.status, expiresAt: a2.expires_at, endedAt: a2.ended_at, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 7583: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeWarrantToken = void 0, b.deserializeWarrantToken = (a2) => ({ warrantToken: a2.warrant_token });
    }, 7592: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuthenticateWithTotpOptions = void 0, b.serializeAuthenticateWithTotpOptions = (a2) => ({ grant_type: "urn:workos:oauth:grant-type:mfa-totp", client_id: a2.clientId, client_secret: a2.clientSecret, code: a2.code, authentication_challenge_id: a2.authenticationChallengeId, pending_authentication_token: a2.pendingAuthenticationToken, ip_address: a2.ipAddress, user_agent: a2.userAgent });
    }, 7631: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuditLogExportOptions = void 0, b.serializeAuditLogExportOptions = (a2) => ({ actions: a2.actions, actors: a2.actors, actor_names: a2.actorNames, actor_ids: a2.actorIds, organization_id: a2.organizationId, range_end: a2.rangeEnd.toISOString(), range_start: a2.rangeStart.toISOString(), targets: a2.targets });
    }, 7656: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeAuditLogExport = void 0, b.deserializeAuditLogExport = (a2) => ({ object: a2.object, id: a2.id, state: a2.state, url: a2.url, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 7720: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), !function(a2, b2) {
        for (var c2 in b2) Object.defineProperty(a2, c2, { enumerable: true, get: b2[c2] });
      }(b, { interceptTestApis: function() {
        return f;
      }, wrapRequestHandler: function() {
        return g;
      } });
      let d = c(5392), e = c(9165);
      function f() {
        return (0, e.interceptFetch)(c.g.fetch);
      }
      function g(a2) {
        return (b2, c2) => (0, d.withRequest)(b2, e.reader, () => a2(b2, c2));
      }
    }, 7755: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializePasswordlessSession = void 0, b.deserializePasswordlessSession = (a2) => ({ id: a2.id, email: a2.email, expiresAt: a2.expires_at, link: a2.link, object: a2.object });
    }, 7787: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.NotFoundException = void 0;
      class c extends Error {
        constructor({ code: a2, message: b2, path: c2, requestID: d }) {
          super(), this.status = 404, this.name = "NotFoundException", this.code = a2, this.message = null != b2 ? b2 : `The requested path '${c2}' could not be found.`, this.requestID = d;
        }
      }
      b.NotFoundException = c;
    }, 7814: (a, b, c) => {
      "use strict";
      a.exports = c(6440);
    }, 7849: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 7889: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.getPrimaryEmail = void 0, b.getPrimaryEmail = function(a2) {
        var b2;
        let c = null == (b2 = a2.emails) ? void 0 : b2.find((a3) => a3.primary);
        return null == c ? void 0 : c.value;
      };
    }, 7893: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 7897: (a, b, c) => {
      "use strict";
      var d = c(8728), e = c(5456), f = c(7122), g = c(4328), h = c(3080) || g || f;
      a.exports = function() {
        var a2, b2 = { assert: function(a3) {
          if (!b2.has(a3)) throw new d("Side channel does not contain " + e(a3));
        }, delete: function(b3) {
          return !!a2 && a2.delete(b3);
        }, get: function(b3) {
          return a2 && a2.get(b3);
        }, has: function(b3) {
          return !!a2 && a2.has(b3);
        }, set: function(b3, c2) {
          a2 || (a2 = h()), a2.set(b3, c2);
        } };
        return b2;
      };
    }, 7920: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 8071: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListInvitationsOptions = void 0, b.serializeListInvitationsOptions = (a2) => ({ email: a2.email, organization_id: a2.organizationId, limit: a2.limit, before: a2.before, after: a2.after, order: a2.order });
    }, 8102: (a) => {
      "use strict";
      a.exports = Error;
    }, 8121: (a, b, c) => {
      "use strict";
      var d, e = c(9489), f = c(4412);
      try {
        d = [].__proto__ === Array.prototype;
      } catch (a2) {
        if (!a2 || "object" != typeof a2 || !("code" in a2) || "ERR_PROTO_ACCESS" !== a2.code) throw a2;
      }
      var g = !!d && f && f(Object.prototype, "__proto__"), h = Object, i = h.getPrototypeOf;
      a.exports = g && "function" == typeof g.get ? e([g.get]) : "function" == typeof i && function(a2) {
        return i(null == a2 ? a2 : h(a2));
      };
    }, 8142: (a, b, c) => {
      "use strict";
      var d = c(7419), e = c(1273);
      function f(a2, b2) {
        b2 ? (f2 = d.getSign(a2), g2 = d.highOrder(1 ^ d.getSign(a2), a2) + 2) : (f2 = 0, g2 = d.highOrder(1, a2) + 1 || 1);
        for (var c2, f2, g2, h2 = Math.ceil(g2 / 7), i2 = e.alloc(h2), j2 = 0; j2 < h2; j2++) {
          var k2 = d.extract(a2, 7 * j2, 7, f2);
          i2[j2] = 128 | k2;
        }
        return i2[h2 - 1] &= 127, i2;
      }
      function g(a2, b2, c2) {
        for (var f2, g2, h2 = function(a3, b3) {
          for (var c3 = 0; a3[b3 + c3] >= 128; ) c3++;
          if (b3 + ++c3 > a3.length) throw Error("Bogus encoding");
          return c3;
        }(a2, b2 = void 0 === b2 ? 0 : b2), i2 = Math.ceil(7 * h2 / 8), j2 = e.alloc(i2), k2 = 0; h2 > 0; ) d.inject(j2, k2, 7, a2[b2]), k2 += 7, b2++, h2--;
        if (c2) {
          var l = j2[i2 - 1], m = k2 % 8;
          if (0 !== m) {
            var n = 32 - m;
            l = j2[i2 - 1] = l << n >> n & 255;
          }
          g2 = 255 * (f2 = l >> 7);
        } else f2 = 0, g2 = 0;
        for (; i2 > 1 && j2[i2 - 1] === g2 && (!c2 || j2[i2 - 2] >> 7 === f2); ) i2--;
        return { value: j2 = e.resize(j2, i2), nextIndex: b2 };
      }
      function h(a2) {
        return f(a2, true);
      }
      function i(a2, b2) {
        return g(a2, b2, true);
      }
      function j(a2) {
        return f(a2, false);
      }
      function k(a2, b2) {
        return g(a2, b2, false);
      }
      a.exports = { decodeInt32: function(a2, b2) {
        var c2 = i(a2, b2), d2 = e.readInt(c2.value).value;
        if (e.free(c2.value), d2 < -2147483648 || d2 > 2147483647) throw Error("Result out of range");
        return { value: d2, nextIndex: c2.nextIndex };
      }, decodeInt64: function(a2, b2) {
        var c2 = i(a2, b2), d2 = e.readInt(c2.value), f2 = d2.value;
        if (e.free(c2.value), f2 < -9223372036854776e3 || f2 > 9223372036854775e3) throw Error("Result out of range");
        return { value: f2, nextIndex: c2.nextIndex, lossy: d2.lossy };
      }, decodeIntBuffer: i, decodeUInt32: function(a2, b2) {
        var c2 = k(a2, b2), d2 = e.readUInt(c2.value).value;
        if (e.free(c2.value), d2 > 4294967295) throw Error("Result out of range");
        return { value: d2, nextIndex: c2.nextIndex };
      }, decodeUInt64: function(a2, b2) {
        var c2 = k(a2, b2), d2 = e.readUInt(c2.value), f2 = d2.value;
        if (e.free(c2.value), f2 > 1844674407370955e4) throw Error("Result out of range");
        return { value: f2, nextIndex: c2.nextIndex, lossy: d2.lossy };
      }, decodeUIntBuffer: k, encodeInt32: function(a2) {
        var b2 = e.alloc(4);
        b2.writeInt32LE(a2, 0);
        var c2 = h(b2);
        return e.free(b2), c2;
      }, encodeInt64: function(a2) {
        var b2 = e.alloc(8);
        e.writeInt64(a2, b2);
        var c2 = h(b2);
        return e.free(b2), c2;
      }, encodeIntBuffer: h, encodeUInt32: function(a2) {
        var b2 = e.alloc(4);
        b2.writeUInt32LE(a2, 0);
        var c2 = j(b2);
        return e.free(b2), c2;
      }, encodeUInt64: function(a2) {
        var b2 = e.alloc(8);
        e.writeUInt64(a2, b2);
        var c2 = j(b2);
        return e.free(b2), c2;
      }, encodeUIntBuffer: j };
    }, 8153: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeEvent = void 0;
      let d = c(839), e = c(1048), f = c(8237), g = c(5363), h = c(2817), i = c(619), j = c(5197), k = c(7513), l = c(6672);
      b.deserializeEvent = (a2) => {
        let b2 = { id: a2.id, createdAt: a2.created_at };
        switch (a2.event) {
          case "authentication.email_verification_succeeded":
          case "authentication.magic_auth_failed":
          case "authentication.magic_auth_succeeded":
          case "authentication.mfa_succeeded":
          case "authentication.oauth_failed":
          case "authentication.oauth_succeeded":
          case "authentication.password_failed":
          case "authentication.password_succeeded":
          case "authentication.sso_failed":
          case "authentication.sso_succeeded":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, g.deserializeAuthenticationEvent)(a2.data) });
          case "authentication.radar_risk_detected":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, l.deserializeAuthenticationRadarRiskDetectedEvent)(a2.data) });
          case "connection.activated":
          case "connection.deactivated":
          case "connection.deleted":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, f.deserializeConnection)(a2.data) });
          case "dsync.activated":
          case "dsync.deactivated":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, d.deserializeEventDirectory)(a2.data) });
          case "dsync.deleted":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, d.deserializeDeletedEventDirectory)(a2.data) });
          case "dsync.group.created":
          case "dsync.group.deleted":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, d.deserializeDirectoryGroup)(a2.data) });
          case "dsync.group.updated":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, d.deserializeUpdatedEventDirectoryGroup)(a2.data) });
          case "dsync.group.user_added":
          case "dsync.group.user_removed":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: { directoryId: a2.data.directory_id, user: (0, d.deserializeDirectoryUser)(a2.data.user), group: (0, d.deserializeDirectoryGroup)(a2.data.group) } });
          case "dsync.user.created":
          case "dsync.user.deleted":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, d.deserializeDirectoryUser)(a2.data) });
          case "dsync.user.updated":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, d.deserializeUpdatedEventDirectoryUser)(a2.data) });
          case "email_verification.created":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, g.deserializeEmailVerificationEvent)(a2.data) });
          case "invitation.accepted":
          case "invitation.created":
          case "invitation.revoked":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, g.deserializeInvitationEvent)(a2.data) });
          case "magic_auth.created":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, g.deserializeMagicAuthEvent)(a2.data) });
          case "password_reset.created":
          case "password_reset.succeeded":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, g.deserializePasswordResetEvent)(a2.data) });
          case "user.created":
          case "user.updated":
          case "user.deleted":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, g.deserializeUser)(a2.data) });
          case "organization_membership.added":
          case "organization_membership.created":
          case "organization_membership.deleted":
          case "organization_membership.updated":
          case "organization_membership.removed":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, i.deserializeOrganizationMembership)(a2.data) });
          case "role.created":
          case "role.deleted":
          case "role.updated":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, j.deserializeRoleEvent)(a2.data) });
          case "session.created":
          case "session.revoked":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, k.deserializeSession)(a2.data) });
          case "organization.created":
          case "organization.updated":
          case "organization.deleted":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, e.deserializeOrganization)(a2.data) });
          case "organization_domain.verified":
          case "organization_domain.verification_failed":
          case "organization_domain.created":
          case "organization_domain.updated":
          case "organization_domain.deleted":
            return Object.assign(Object.assign({}, b2), { event: a2.event, data: (0, h.deserializeOrganizationDomain)(a2.data) });
        }
      };
    }, 8172: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.CryptoProvider = void 0;
      class c {
        constructor() {
          this.encoder = new TextEncoder();
        }
      }
      b.CryptoProvider = c;
    }, 8197: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreateMagicAuthOptions = void 0, b.serializeCreateMagicAuthOptions = (a2) => ({ email: a2.email, invitation_token: a2.invitationToken });
    }, 8237: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(1647), b), e(c(216), b), e(c(4666), b), e(c(8918), b);
    }, 8277: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.RateLimitExceededException = void 0;
      let d = c(6804);
      class e extends d.GenericServerException {
        constructor(a2, b2, c2) {
          super(429, a2, {}, b2), this.retryAfter = c2, this.name = "RateLimitExceededException";
        }
      }
      b.RateLimitExceededException = e;
    }, 8295: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 8376: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeAuthenticationEvent = void 0, b.deserializeAuthenticationEvent = (a2) => ({ email: a2.email, error: a2.error, ipAddress: a2.ip_address, status: a2.status, type: a2.type, userAgent: a2.user_agent, userId: a2.user_id });
    }, 8383: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 8400: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 8443: (a) => {
      "use strict";
      var b = Object.defineProperty, c = Object.getOwnPropertyDescriptor, d = Object.getOwnPropertyNames, e = Object.prototype.hasOwnProperty, f = {};
      function g(a2) {
        var b2;
        let c2 = ["path" in a2 && a2.path && `Path=${a2.path}`, "expires" in a2 && (a2.expires || 0 === a2.expires) && `Expires=${("number" == typeof a2.expires ? new Date(a2.expires) : a2.expires).toUTCString()}`, "maxAge" in a2 && "number" == typeof a2.maxAge && `Max-Age=${a2.maxAge}`, "domain" in a2 && a2.domain && `Domain=${a2.domain}`, "secure" in a2 && a2.secure && "Secure", "httpOnly" in a2 && a2.httpOnly && "HttpOnly", "sameSite" in a2 && a2.sameSite && `SameSite=${a2.sameSite}`, "partitioned" in a2 && a2.partitioned && "Partitioned", "priority" in a2 && a2.priority && `Priority=${a2.priority}`].filter(Boolean), d2 = `${a2.name}=${encodeURIComponent(null != (b2 = a2.value) ? b2 : "")}`;
        return 0 === c2.length ? d2 : `${d2}; ${c2.join("; ")}`;
      }
      function h(a2) {
        let b2 = /* @__PURE__ */ new Map();
        for (let c2 of a2.split(/; */)) {
          if (!c2) continue;
          let a3 = c2.indexOf("=");
          if (-1 === a3) {
            b2.set(c2, "true");
            continue;
          }
          let [d2, e2] = [c2.slice(0, a3), c2.slice(a3 + 1)];
          try {
            b2.set(d2, decodeURIComponent(null != e2 ? e2 : "true"));
          } catch {
          }
        }
        return b2;
      }
      function i(a2) {
        if (!a2) return;
        let [[b2, c2], ...d2] = h(a2), { domain: e2, expires: f2, httponly: g2, maxage: i2, path: l2, samesite: m2, secure: n, partitioned: o, priority: p } = Object.fromEntries(d2.map(([a3, b3]) => [a3.toLowerCase().replace(/-/g, ""), b3]));
        {
          var q, r, s = { name: b2, value: decodeURIComponent(c2), domain: e2, ...f2 && { expires: new Date(f2) }, ...g2 && { httpOnly: true }, ..."string" == typeof i2 && { maxAge: Number(i2) }, path: l2, ...m2 && { sameSite: j.includes(q = (q = m2).toLowerCase()) ? q : void 0 }, ...n && { secure: true }, ...p && { priority: k.includes(r = (r = p).toLowerCase()) ? r : void 0 }, ...o && { partitioned: true } };
          let a3 = {};
          for (let b3 in s) s[b3] && (a3[b3] = s[b3]);
          return a3;
        }
      }
      ((a2, c2) => {
        for (var d2 in c2) b(a2, d2, { get: c2[d2], enumerable: true });
      })(f, { RequestCookies: () => l, ResponseCookies: () => m, parseCookie: () => h, parseSetCookie: () => i, stringifyCookie: () => g }), a.exports = ((a2, f2, g2, h2) => {
        if (f2 && "object" == typeof f2 || "function" == typeof f2) for (let i2 of d(f2)) e.call(a2, i2) || i2 === g2 || b(a2, i2, { get: () => f2[i2], enumerable: !(h2 = c(f2, i2)) || h2.enumerable });
        return a2;
      })(b({}, "__esModule", { value: true }), f);
      var j = ["strict", "lax", "none"], k = ["low", "medium", "high"], l = class {
        constructor(a2) {
          this._parsed = /* @__PURE__ */ new Map(), this._headers = a2;
          let b2 = a2.get("cookie");
          if (b2) for (let [a3, c2] of h(b2)) this._parsed.set(a3, { name: a3, value: c2 });
        }
        [Symbol.iterator]() {
          return this._parsed[Symbol.iterator]();
        }
        get size() {
          return this._parsed.size;
        }
        get(...a2) {
          let b2 = "string" == typeof a2[0] ? a2[0] : a2[0].name;
          return this._parsed.get(b2);
        }
        getAll(...a2) {
          var b2;
          let c2 = Array.from(this._parsed);
          if (!a2.length) return c2.map(([a3, b3]) => b3);
          let d2 = "string" == typeof a2[0] ? a2[0] : null == (b2 = a2[0]) ? void 0 : b2.name;
          return c2.filter(([a3]) => a3 === d2).map(([a3, b3]) => b3);
        }
        has(a2) {
          return this._parsed.has(a2);
        }
        set(...a2) {
          let [b2, c2] = 1 === a2.length ? [a2[0].name, a2[0].value] : a2, d2 = this._parsed;
          return d2.set(b2, { name: b2, value: c2 }), this._headers.set("cookie", Array.from(d2).map(([a3, b3]) => g(b3)).join("; ")), this;
        }
        delete(a2) {
          let b2 = this._parsed, c2 = Array.isArray(a2) ? a2.map((a3) => b2.delete(a3)) : b2.delete(a2);
          return this._headers.set("cookie", Array.from(b2).map(([a3, b3]) => g(b3)).join("; ")), c2;
        }
        clear() {
          return this.delete(Array.from(this._parsed.keys())), this;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map((a2) => `${a2.name}=${encodeURIComponent(a2.value)}`).join("; ");
        }
      }, m = class {
        constructor(a2) {
          var b2, c2, d2;
          this._parsed = /* @__PURE__ */ new Map(), this._headers = a2;
          let e2 = null != (d2 = null != (c2 = null == (b2 = a2.getSetCookie) ? void 0 : b2.call(a2)) ? c2 : a2.get("set-cookie")) ? d2 : [];
          for (let a3 of Array.isArray(e2) ? e2 : function(a4) {
            if (!a4) return [];
            var b3, c3, d3, e3, f2, g2 = [], h2 = 0;
            function i2() {
              for (; h2 < a4.length && /\s/.test(a4.charAt(h2)); ) h2 += 1;
              return h2 < a4.length;
            }
            for (; h2 < a4.length; ) {
              for (b3 = h2, f2 = false; i2(); ) if ("," === (c3 = a4.charAt(h2))) {
                for (d3 = h2, h2 += 1, i2(), e3 = h2; h2 < a4.length && "=" !== (c3 = a4.charAt(h2)) && ";" !== c3 && "," !== c3; ) h2 += 1;
                h2 < a4.length && "=" === a4.charAt(h2) ? (f2 = true, h2 = e3, g2.push(a4.substring(b3, d3)), b3 = h2) : h2 = d3 + 1;
              } else h2 += 1;
              (!f2 || h2 >= a4.length) && g2.push(a4.substring(b3, a4.length));
            }
            return g2;
          }(e2)) {
            let b3 = i(a3);
            b3 && this._parsed.set(b3.name, b3);
          }
        }
        get(...a2) {
          let b2 = "string" == typeof a2[0] ? a2[0] : a2[0].name;
          return this._parsed.get(b2);
        }
        getAll(...a2) {
          var b2;
          let c2 = Array.from(this._parsed.values());
          if (!a2.length) return c2;
          let d2 = "string" == typeof a2[0] ? a2[0] : null == (b2 = a2[0]) ? void 0 : b2.name;
          return c2.filter((a3) => a3.name === d2);
        }
        has(a2) {
          return this._parsed.has(a2);
        }
        set(...a2) {
          let [b2, c2, d2] = 1 === a2.length ? [a2[0].name, a2[0].value, a2[0]] : a2, e2 = this._parsed;
          return e2.set(b2, function(a3 = { name: "", value: "" }) {
            return "number" == typeof a3.expires && (a3.expires = new Date(a3.expires)), a3.maxAge && (a3.expires = new Date(Date.now() + 1e3 * a3.maxAge)), (null === a3.path || void 0 === a3.path) && (a3.path = "/"), a3;
          }({ name: b2, value: c2, ...d2 })), function(a3, b3) {
            for (let [, c3] of (b3.delete("set-cookie"), a3)) {
              let a4 = g(c3);
              b3.append("set-cookie", a4);
            }
          }(e2, this._headers), this;
        }
        delete(...a2) {
          let [b2, c2] = "string" == typeof a2[0] ? [a2[0]] : [a2[0].name, a2[0]];
          return this.set({ ...c2, name: b2, value: "", expires: /* @__PURE__ */ new Date(0) });
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map(g).join("; ");
        }
      };
    }, 8454: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i2(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h2(a3) {
            try {
              i2(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i2(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h2);
          }
          i2((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.WorkOS = void 0;
      let e = c(1338), f = c(6430), g = c(7313), h = c(3766), i = c(1582), j = c(9052), k = c(5104), l = c(4230), m = c(8508), n = c(2414), o = c(4942), p = c(6746), q = c(1886), r = c(5442), s = c(9245), t = c(4320), u = c(3557), v = c(1802), w = c(3342), x = c(2506), y = c(3455), z = c(9582), A = "7.70.0", B = "Idempotency-Key", C = "Warrant-Token";
      class D {
        constructor(a2, b2 = {}) {
          if (this.key = a2, this.options = b2, this.auditLogs = new o.AuditLogs(this), this.directorySync = new f.DirectorySync(this), this.organizations = new h.Organizations(this), this.organizationDomains = new i.OrganizationDomains(this), this.passwordless = new j.Passwordless(this), this.portal = new k.Portal(this), this.sso = new l.SSO(this), this.mfa = new n.Mfa(this), this.events = new g.Events(this), this.fga = new q.FGA(this), this.widgets = new v.Widgets(this), this.vault = new x.Vault(this), !a2 && (this.key = "undefined" != typeof process ? null == process ? void 0 : process.env.WORKOS_API_KEY : void 0, !this.key)) throw new e.NoApiKeyProvidedException();
          void 0 === this.options.https && (this.options.https = true), this.clientId = this.options.clientId, this.clientId || "undefined" == typeof process || (this.clientId = null == process ? void 0 : process.env.WORKOS_CLIENT_ID);
          let c2 = this.options.https ? "https" : "http", d2 = this.options.apiHostname || "api.workos.com", m2 = this.options.port;
          this.baseURL = `${c2}://${d2}`, m2 && (this.baseURL = this.baseURL + `:${m2}`);
          let r2 = `workos-node/${A}`;
          if (b2.appInfo) {
            let { name: a3, version: c3 } = b2.appInfo;
            r2 += ` ${a3}: ${c3}`;
          }
          this.webhooks = this.createWebhookClient(), this.actions = this.createActionsClient(), this.userManagement = new p.UserManagement(this, this.createIronSessionProvider()), this.client = this.createHttpClient(b2, r2);
        }
        createWebhookClient() {
          return new m.Webhooks(this.getCryptoProvider());
        }
        createActionsClient() {
          return new w.Actions(this.getCryptoProvider());
        }
        getCryptoProvider() {
          return new t.SubtleCryptoProvider();
        }
        createHttpClient(a2, b2) {
          var c2;
          return new u.FetchHttpClient(this.baseURL, Object.assign(Object.assign({}, a2.config), { timeout: a2.timeout, headers: Object.assign(Object.assign({}, null == (c2 = a2.config) ? void 0 : c2.headers), { Authorization: `Bearer ${this.key}`, "User-Agent": b2 }) }));
        }
        createIronSessionProvider() {
          throw Error("IronSessionProvider not implemented. Use WorkOSNode or WorkOSWorker instead.");
        }
        get version() {
          return A;
        }
        post(a2, b2, c2 = {}) {
          return d(this, void 0, void 0, function* () {
            let d2, e2 = {};
            c2.idempotencyKey && (e2[B] = c2.idempotencyKey), c2.warrantToken && (e2[C] = c2.warrantToken);
            try {
              d2 = yield this.client.post(a2, b2, { params: c2.query, headers: e2 });
            } catch (b3) {
              throw this.handleHttpError({ path: a2, error: b3 }), b3;
            }
            try {
              return { data: yield d2.toJSON() };
            } catch (a3) {
              throw yield this.handleParseError(a3, d2), a3;
            }
          });
        }
        get(a2, b2 = {}) {
          return d(this, void 0, void 0, function* () {
            let c2, d2 = {};
            b2.accessToken && (d2.Authorization = `Bearer ${b2.accessToken}`), b2.warrantToken && (d2[C] = b2.warrantToken);
            try {
              c2 = yield this.client.get(a2, { params: b2.query, headers: d2 });
            } catch (b3) {
              throw this.handleHttpError({ path: a2, error: b3 }), b3;
            }
            try {
              return { data: yield c2.toJSON() };
            } catch (a3) {
              throw yield this.handleParseError(a3, c2), a3;
            }
          });
        }
        put(a2, b2, c2 = {}) {
          return d(this, void 0, void 0, function* () {
            let d2, e2 = {};
            c2.idempotencyKey && (e2[B] = c2.idempotencyKey);
            try {
              d2 = yield this.client.put(a2, b2, { params: c2.query, headers: e2 });
            } catch (b3) {
              throw this.handleHttpError({ path: a2, error: b3 }), b3;
            }
            try {
              return { data: yield d2.toJSON() };
            } catch (a3) {
              throw yield this.handleParseError(a3, d2), a3;
            }
          });
        }
        delete(a2, b2) {
          return d(this, void 0, void 0, function* () {
            try {
              yield this.client.delete(a2, { params: b2 });
            } catch (b3) {
              throw this.handleHttpError({ path: a2, error: b3 }), b3;
            }
          });
        }
        emitWarning(a2) {
          console.warn(`WorkOS: ${a2}`);
        }
        handleParseError(a2, b2) {
          var c2;
          return d(this, void 0, void 0, function* () {
            if (a2 instanceof SyntaxError) {
              let d2 = b2.getRawResponse(), e2 = null != (c2 = d2.headers.get("X-Request-ID")) ? c2 : "", f2 = d2.status, g2 = yield d2.text();
              throw new z.ParseError({ message: a2.message, rawBody: g2, rawStatus: f2, requestID: e2 });
            }
          });
        }
        handleHttpError({ path: a2, error: b2 }) {
          var c2;
          if (!(b2 instanceof s.HttpClientError)) throw Error(`Unexpected error: ${b2}`, { cause: b2 });
          let { response: d2 } = b2;
          if (d2) {
            let { status: b3, data: f2, headers: g2 } = d2, h2 = null != (c2 = g2["X-Request-ID"]) ? c2 : "", { code: i2, error_description: j2, error: k2, errors: l2, message: m2 } = f2;
            switch (b3) {
              case 401:
                throw new e.UnauthorizedException(h2);
              case 409:
                throw new y.ConflictException({ requestID: h2, message: m2, error: k2 });
              case 422:
                throw new e.UnprocessableEntityException({ code: i2, errors: l2, message: m2, requestID: h2 });
              case 404:
                throw new e.NotFoundException({ code: i2, message: m2, path: a2, requestID: h2 });
              case 429: {
                let a3 = g2.get("Retry-After");
                throw new e.RateLimitExceededException(f2.message, h2, a3 ? Number(a3) : null);
              }
              default:
                if (k2 || j2) throw new e.OauthException(b3, h2, k2, j2, f2);
                if (i2 && l2) throw new r.BadRequestException({ code: i2, errors: l2, message: m2, requestID: h2 });
                throw new e.GenericServerException(b3, f2.message, f2, h2);
            }
          }
        }
      }
      b.WorkOS = D;
    }, 8508: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Webhooks = void 0;
      let e = c(6939), f = c(4167);
      class g {
        constructor(a2) {
          this.signatureProvider = new f.SignatureProvider(a2);
        }
        get verifyHeader() {
          return this.signatureProvider.verifyHeader.bind(this.signatureProvider);
        }
        get computeSignature() {
          return this.signatureProvider.computeSignature.bind(this.signatureProvider);
        }
        get getTimestampAndSignatureHash() {
          return this.signatureProvider.getTimestampAndSignatureHash.bind(this.signatureProvider);
        }
        constructEvent({ payload: a2, sigHeader: b2, secret: c2, tolerance: f2 = 18e4 }) {
          return d(this, void 0, void 0, function* () {
            return yield this.verifyHeader({ payload: a2, sigHeader: b2, secret: c2, tolerance: f2 }), (0, e.deserializeEvent)(a2);
          });
        }
      }
      b.Webhooks = g;
    }, 8526: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeDecryptDataKeyResponse = b.deserializeCreateDataKeyResponse = void 0, b.deserializeCreateDataKeyResponse = (a2) => ({ context: a2.context, dataKey: { key: a2.data_key, id: a2.id }, encryptedKeys: a2.encrypted_keys }), b.deserializeDecryptDataKeyResponse = (a2) => ({ key: a2.data_key, id: a2.id });
    }, 8596: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.CheckResult = void 0;
      let d = c(9545);
      class e {
        constructor(a2) {
          this.result = a2.result, this.isImplicit = a2.is_implicit, this.warrantToken = a2.warrant_token, this.debugInfo = a2.debug_info ? { processingTime: a2.debug_info.processing_time, decisionTree: (0, d.deserializeDecisionTreeNode)(a2.debug_info.decision_tree) } : void 0, this.warnings = a2.warnings;
        }
        isAuthorized() {
          return "authorized" === this.result;
        }
      }
      b.CheckResult = e;
    }, 8628: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 8642: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreatePasswordResetOptions = void 0, b.serializeCreatePasswordResetOptions = (a2) => ({ email: a2.email });
    }, 8655: (a, b) => {
      "use strict";
      var c;
      Object.defineProperty(b, "__esModule", { value: true }), b.AuthenticateWithSessionCookieFailureReason = void 0, function(a2) {
        a2.INVALID_JWT = "invalid_jwt", a2.INVALID_SESSION_COOKIE = "invalid_session_cookie", a2.NO_SESSION_COOKIE_PROVIDED = "no_session_cookie_provided";
      }(c || (b.AuthenticateWithSessionCookieFailureReason = c = {}));
    }, 8707: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 8728: (a) => {
      "use strict";
      a.exports = TypeError;
    }, 8746: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(2835), b), e(c(1810), b), e(c(8383), b), e(c(2972), b), e(c(6208), b), e(c(2661), b), e(c(898), b), e(c(3222), b);
    }, 8757: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 8784: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeGetTokenResponse = b.serializeGetTokenOptions = void 0, b.serializeGetTokenOptions = (a2) => ({ organization_id: a2.organizationId, user_id: a2.userId, scopes: a2.scopes }), b.deserializeGetTokenResponse = (a2) => ({ token: a2.token });
    }, 8802: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(8707), b), e(c(8827), b);
    }, 8827: (a, b) => {
      "use strict";
      var c, d;
      Object.defineProperty(b, "__esModule", { value: true }), b.OrganizationDomainVerificationStrategy = b.OrganizationDomainState = void 0, function(a2) {
        a2.LegacyVerified = "legacy_verified", a2.Verified = "verified", a2.Pending = "pending", a2.Failed = "failed";
      }(c || (b.OrganizationDomainState = c = {})), function(a2) {
        a2.Dns = "dns", a2.Manual = "manual";
      }(d || (b.OrganizationDomainVerificationStrategy = d = {}));
    }, 8831: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeChallenge = void 0, b.deserializeChallenge = (a2) => ({ object: a2.object, id: a2.id, createdAt: a2.created_at, updatedAt: a2.updated_at, expiresAt: a2.expires_at, code: a2.code, authenticationFactorId: a2.authentication_factor_id });
    }, 8877: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f) {
          function g(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.fetchAndDeserialize = void 0;
      let e = c(6939);
      b.fetchAndDeserialize = (a2, b2, c2, f, g) => d(void 0, void 0, void 0, function* () {
        let { data: d2 } = yield a2.get(b2, Object.assign({ query: Object.assign(Object.assign({}, f), { order: (null == f ? void 0 : f.order) || "desc" }) }, g));
        return (0, e.deserializeList)(d2, c2);
      });
    }, 8883: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 8892: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeUpdateOrganizationOptions = void 0, b.serializeUpdateOrganizationOptions = (a2) => ({ name: a2.name, allow_profiles_outside_organization: a2.allowProfilesOutsideOrganization, domain_data: a2.domainData, domains: a2.domains, stripe_customer_id: a2.stripeCustomerId, external_id: a2.externalId, metadata: a2.metadata });
    }, 8909: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeEnrollAuthFactorOptions = void 0, b.serializeEnrollAuthFactorOptions = (a2) => ({ type: a2.type, totp_issuer: a2.totpIssuer, totp_user: a2.totpUser, totp_secret: a2.totpSecret });
    }, 8918: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeProfile = void 0, b.deserializeProfile = (a2) => ({ id: a2.id, idpId: a2.idp_id, organizationId: a2.organization_id, connectionId: a2.connection_id, connectionType: a2.connection_type, email: a2.email, firstName: a2.first_name, lastName: a2.last_name, role: a2.role, groups: a2.groups, customAttributes: a2.custom_attributes, rawAttributes: a2.raw_attributes });
    }, 8943: (a) => {
      "use strict";
      a.exports = Math.floor;
    }, 9052: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      }, e = this && this.__rest || function(a2, b2) {
        var c2 = {};
        for (var d2 in a2) Object.prototype.hasOwnProperty.call(a2, d2) && 0 > b2.indexOf(d2) && (c2[d2] = a2[d2]);
        if (null != a2 && "function" == typeof Object.getOwnPropertySymbols) for (var e2 = 0, d2 = Object.getOwnPropertySymbols(a2); e2 < d2.length; e2++) 0 > b2.indexOf(d2[e2]) && Object.prototype.propertyIsEnumerable.call(a2, d2[e2]) && (c2[d2[e2]] = a2[d2[e2]]);
        return c2;
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.Passwordless = void 0;
      let f = c(7755);
      class g {
        constructor(a2) {
          this.workos = a2;
        }
        createSession(a2) {
          var { redirectURI: b2, expiresIn: c2 } = a2, g2 = e(a2, ["redirectURI", "expiresIn"]);
          return d(this, void 0, void 0, function* () {
            let { data: a3 } = yield this.workos.post("/passwordless/sessions", Object.assign(Object.assign({}, g2), { redirect_uri: b2, expires_in: c2 }));
            return (0, f.deserializePasswordlessSession)(a3);
          });
        }
        sendSession(a2) {
          return d(this, void 0, void 0, function* () {
            let { data: b2 } = yield this.workos.post(`/passwordless/sessions/${a2}/send`, {});
            return b2;
          });
        }
      }
      b.Passwordless = g;
    }, 9062: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9082: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9109: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9159: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeSendMagicAuthCodeOptions = void 0, b.serializeSendMagicAuthCodeOptions = (a2) => ({ email: a2.email });
    }, 9165: (a, b, c) => {
      "use strict";
      var d = c(5356).Buffer;
      Object.defineProperty(b, "__esModule", { value: true }), !function(a2, b2) {
        for (var c2 in b2) Object.defineProperty(a2, c2, { enumerable: true, get: b2[c2] });
      }(b, { handleFetch: function() {
        return h;
      }, interceptFetch: function() {
        return i;
      }, reader: function() {
        return f;
      } });
      let e = c(5392), f = { url: (a2) => a2.url, header: (a2, b2) => a2.headers.get(b2) };
      async function g(a2, b2) {
        let { url: c2, method: e2, headers: f2, body: g2, cache: h2, credentials: i2, integrity: j, mode: k, redirect: l, referrer: m, referrerPolicy: n } = b2;
        return { testData: a2, api: "fetch", request: { url: c2, method: e2, headers: [...Array.from(f2), ["next-test-stack", function() {
          let a3 = (Error().stack ?? "").split("\n");
          for (let b3 = 1; b3 < a3.length; b3++) if (a3[b3].length > 0) {
            a3 = a3.slice(b3);
            break;
          }
          return (a3 = (a3 = (a3 = a3.filter((a4) => !a4.includes("/next/dist/"))).slice(0, 5)).map((a4) => a4.replace("webpack-internal:///(rsc)/", "").trim())).join("    ");
        }()]], body: g2 ? d.from(await b2.arrayBuffer()).toString("base64") : null, cache: h2, credentials: i2, integrity: j, mode: k, redirect: l, referrer: m, referrerPolicy: n } };
      }
      async function h(a2, b2) {
        let c2 = (0, e.getTestReqInfo)(b2, f);
        if (!c2) return a2(b2);
        let { testData: h2, proxyPort: i2 } = c2, j = await g(h2, b2), k = await a2(`http://localhost:${i2}`, { method: "POST", body: JSON.stringify(j), next: { internal: true } });
        if (!k.ok) throw Object.defineProperty(Error(`Proxy request failed: ${k.status}`), "__NEXT_ERROR_CODE", { value: "E146", enumerable: false, configurable: true });
        let l = await k.json(), { api: m } = l;
        switch (m) {
          case "continue":
            return a2(b2);
          case "abort":
          case "unhandled":
            throw Object.defineProperty(Error(`Proxy request aborted [${b2.method} ${b2.url}]`), "__NEXT_ERROR_CODE", { value: "E145", enumerable: false, configurable: true });
          case "fetch":
            let { status: n, headers: o, body: p } = l.response;
            return new Response(p ? d.from(p, "base64") : null, { status: n, headers: new Headers(o) });
          default:
            return m;
        }
      }
      function i(a2) {
        return c.g.fetch = function(b2, c2) {
          var d2;
          return (null == c2 || null == (d2 = c2.next) ? void 0 : d2.internal) ? a2(b2, c2) : h(a2, new Request(b2, c2));
        }, () => {
          c.g.fetch = a2;
        };
      }
    }, 9176: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9180: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.isResourceInterface = b.isSubject = void 0, b.isSubject = function(a2) {
        return Object.prototype.hasOwnProperty.call(a2, "resourceType") && Object.prototype.hasOwnProperty.call(a2, "resourceId");
      }, b.isResourceInterface = function(a2) {
        return !!a2 && "object" == typeof a2 && "getResouceType" in a2 && "getResourceId" in a2;
      };
    }, 9184: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuthenticateWithPasswordOptions = void 0, b.serializeAuthenticateWithPasswordOptions = (a2) => ({ grant_type: "password", client_id: a2.clientId, client_secret: a2.clientSecret, email: a2.email, password: a2.password, invitation_token: a2.invitationToken, ip_address: a2.ipAddress, user_agent: a2.userAgent });
    }, 9194: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9233: (a, b) => {
      "use strict";
      b.parse = function(a2, b2) {
        if ("string" != typeof a2) throw TypeError("argument str must be a string");
        for (var c2 = {}, d2 = (b2 || {}).decode || e, f2 = 0; f2 < a2.length; ) {
          var g = a2.indexOf("=", f2);
          if (-1 === g) break;
          var h = a2.indexOf(";", f2);
          if (-1 === h) h = a2.length;
          else if (h < g) {
            f2 = a2.lastIndexOf(";", g - 1) + 1;
            continue;
          }
          var i = a2.slice(f2, g).trim();
          if (void 0 === c2[i]) {
            var j = a2.slice(g + 1, h).trim();
            34 === j.charCodeAt(0) && (j = j.slice(1, -1)), c2[i] = function(a3, b3) {
              try {
                return b3(a3);
              } catch (b4) {
                return a3;
              }
            }(j, d2);
          }
          f2 = h + 1;
        }
        return c2;
      }, b.serialize = function(a2, b2, e2) {
        var g = e2 || {}, h = g.encode || f;
        if ("function" != typeof h) throw TypeError("option encode is invalid");
        if (!d.test(a2)) throw TypeError("argument name is invalid");
        var i = h(b2);
        if (i && !d.test(i)) throw TypeError("argument val is invalid");
        var j = a2 + "=" + i;
        if (null != g.maxAge) {
          var k = g.maxAge - 0;
          if (isNaN(k) || !isFinite(k)) throw TypeError("option maxAge is invalid");
          j += "; Max-Age=" + Math.floor(k);
        }
        if (g.domain) {
          if (!d.test(g.domain)) throw TypeError("option domain is invalid");
          j += "; Domain=" + g.domain;
        }
        if (g.path) {
          if (!d.test(g.path)) throw TypeError("option path is invalid");
          j += "; Path=" + g.path;
        }
        if (g.expires) {
          var l, m = g.expires;
          if (l = m, "[object Date]" !== c.call(l) && !(l instanceof Date) || isNaN(m.valueOf())) throw TypeError("option expires is invalid");
          j += "; Expires=" + m.toUTCString();
        }
        if (g.httpOnly && (j += "; HttpOnly"), g.secure && (j += "; Secure"), g.priority) switch ("string" == typeof g.priority ? g.priority.toLowerCase() : g.priority) {
          case "low":
            j += "; Priority=Low";
            break;
          case "medium":
            j += "; Priority=Medium";
            break;
          case "high":
            j += "; Priority=High";
            break;
          default:
            throw TypeError("option priority is invalid");
        }
        if (g.sameSite) switch ("string" == typeof g.sameSite ? g.sameSite.toLowerCase() : g.sameSite) {
          case true:
          case "strict":
            j += "; SameSite=Strict";
            break;
          case "lax":
            j += "; SameSite=Lax";
            break;
          case "none":
            j += "; SameSite=None";
            break;
          default:
            throw TypeError("option sameSite is invalid");
        }
        return j;
      };
      var c = Object.prototype.toString, d = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
      function e(a2) {
        return -1 !== a2.indexOf("%") ? decodeURIComponent(a2) : a2;
      }
      function f(a2) {
        return encodeURIComponent(a2);
      }
    }, 9235: (a, b, c) => {
      "use strict";
      let d, e, f;
      c.r(b), c.d(b, { CompactEncrypt: () => bh, CompactSign: () => bk, EmbeddedJWK: () => bu, EncryptJWT: () => bq, FlattenedEncrypt: () => a1, FlattenedSign: () => bj, GeneralEncrypt: () => a3, GeneralSign: () => bm, SignJWT: () => bp, UnsecuredJWT: () => bE, base64url: () => h, calculateJwkThumbprint: () => bs, calculateJwkThumbprintUri: () => bt, compactDecrypt: () => aV, compactVerify: () => a8, createLocalJWKSet: () => bz, createRemoteJWKSet: () => bD, cryptoRuntime: () => bO, decodeJwt: () => bI, decodeProtectedHeader: () => bH, errors: () => g, experimental_jwksCache: () => bB, exportJWK: () => a$, exportPKCS8: () => aZ, exportSPKI: () => aY, flattenedDecrypt: () => aU, flattenedVerify: () => a7, generalDecrypt: () => aW, generalVerify: () => a9, generateKeyPair: () => bM, generateSecret: () => bN, importJWK: () => aJ, importPKCS8: () => aI, importSPKI: () => aG, importX509: () => aH, jwtDecrypt: () => bg, jwtVerify: () => bf });
      var g = {};
      c.r(g), c.d(g, { JOSEAlgNotAllowed: () => z, JOSEError: () => w, JOSENotSupported: () => A, JWEDecryptionFailed: () => B, JWEInvalid: () => C, JWKInvalid: () => F, JWKSInvalid: () => G, JWKSMultipleMatchingKeys: () => I, JWKSNoMatchingKey: () => H, JWKSTimeout: () => J, JWSInvalid: () => D, JWSSignatureVerificationFailed: () => K, JWTClaimValidationFailed: () => x, JWTExpired: () => y, JWTInvalid: () => E });
      var h = {};
      c.r(h), c.d(h, { decode: () => bG, encode: () => bF });
      let i = crypto, j = async (a10, b2) => {
        let c2 = `SHA-${a10.slice(-3)}`;
        return new Uint8Array(await i.subtle.digest(c2, b2));
      }, k = new TextEncoder(), l = new TextDecoder();
      function m(...a10) {
        let b2 = new Uint8Array(a10.reduce((a11, { length: b3 }) => a11 + b3, 0)), c2 = 0;
        for (let d2 of a10) b2.set(d2, c2), c2 += d2.length;
        return b2;
      }
      function n(a10, b2, c2) {
        if (b2 < 0 || b2 >= 4294967296) throw RangeError(`value must be >= 0 and <= ${4294967296 - 1}. Received ${b2}`);
        a10.set([b2 >>> 24, b2 >>> 16, b2 >>> 8, 255 & b2], c2);
      }
      function o(a10) {
        let b2 = Math.floor(a10 / 4294967296), c2 = new Uint8Array(8);
        return n(c2, b2, 0), n(c2, a10 % 4294967296, 4), c2;
      }
      function p(a10) {
        let b2 = new Uint8Array(4);
        return n(b2, a10), b2;
      }
      function q(a10) {
        return m(p(a10.length), a10);
      }
      async function r(a10, b2, c2) {
        let d2 = Math.ceil((b2 >> 3) / 32), e2 = new Uint8Array(32 * d2);
        for (let b3 = 0; b3 < d2; b3++) {
          let d3 = new Uint8Array(4 + a10.length + c2.length);
          d3.set(p(b3 + 1)), d3.set(a10, 4), d3.set(c2, 4 + a10.length), e2.set(await j("sha256", d3), 32 * b3);
        }
        return e2.slice(0, b2 >> 3);
      }
      let s = (a10) => {
        let b2 = a10;
        "string" == typeof b2 && (b2 = k.encode(b2));
        let c2 = [];
        for (let a11 = 0; a11 < b2.length; a11 += 32768) c2.push(String.fromCharCode.apply(null, b2.subarray(a11, a11 + 32768)));
        return btoa(c2.join(""));
      }, t = (a10) => s(a10).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"), u = (a10) => {
        let b2 = atob(a10), c2 = new Uint8Array(b2.length);
        for (let a11 = 0; a11 < b2.length; a11++) c2[a11] = b2.charCodeAt(a11);
        return c2;
      }, v = (a10) => {
        let b2 = a10;
        b2 instanceof Uint8Array && (b2 = l.decode(b2)), b2 = b2.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
        try {
          return u(b2);
        } catch {
          throw TypeError("The input to be decoded is not correctly encoded.");
        }
      };
      class w extends Error {
        static get code() {
          return "ERR_JOSE_GENERIC";
        }
        constructor(a10) {
          super(a10), this.code = "ERR_JOSE_GENERIC", this.name = this.constructor.name, Error.captureStackTrace?.(this, this.constructor);
        }
      }
      class x extends w {
        static get code() {
          return "ERR_JWT_CLAIM_VALIDATION_FAILED";
        }
        constructor(a10, b2, c2 = "unspecified", d2 = "unspecified") {
          super(a10), this.code = "ERR_JWT_CLAIM_VALIDATION_FAILED", this.claim = c2, this.reason = d2, this.payload = b2;
        }
      }
      class y extends w {
        static get code() {
          return "ERR_JWT_EXPIRED";
        }
        constructor(a10, b2, c2 = "unspecified", d2 = "unspecified") {
          super(a10), this.code = "ERR_JWT_EXPIRED", this.claim = c2, this.reason = d2, this.payload = b2;
        }
      }
      class z extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
        }
        static get code() {
          return "ERR_JOSE_ALG_NOT_ALLOWED";
        }
      }
      class A extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JOSE_NOT_SUPPORTED";
        }
        static get code() {
          return "ERR_JOSE_NOT_SUPPORTED";
        }
      }
      class B extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWE_DECRYPTION_FAILED", this.message = "decryption operation failed";
        }
        static get code() {
          return "ERR_JWE_DECRYPTION_FAILED";
        }
      }
      class C extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWE_INVALID";
        }
        static get code() {
          return "ERR_JWE_INVALID";
        }
      }
      class D extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWS_INVALID";
        }
        static get code() {
          return "ERR_JWS_INVALID";
        }
      }
      class E extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWT_INVALID";
        }
        static get code() {
          return "ERR_JWT_INVALID";
        }
      }
      class F extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWK_INVALID";
        }
        static get code() {
          return "ERR_JWK_INVALID";
        }
      }
      class G extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_INVALID";
        }
        static get code() {
          return "ERR_JWKS_INVALID";
        }
      }
      class H extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_NO_MATCHING_KEY", this.message = "no applicable key found in the JSON Web Key Set";
        }
        static get code() {
          return "ERR_JWKS_NO_MATCHING_KEY";
        }
      }
      class I extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS", this.message = "multiple matching keys found in the JSON Web Key Set";
        }
        static get code() {
          return "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
        }
      }
      Symbol.asyncIterator;
      class J extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_TIMEOUT", this.message = "request timed out";
        }
        static get code() {
          return "ERR_JWKS_TIMEOUT";
        }
      }
      class K extends w {
        constructor() {
          super(...arguments), this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED", this.message = "signature verification failed";
        }
        static get code() {
          return "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
        }
      }
      let L = i.getRandomValues.bind(i);
      function M(a10) {
        switch (a10) {
          case "A128GCM":
          case "A128GCMKW":
          case "A192GCM":
          case "A192GCMKW":
          case "A256GCM":
          case "A256GCMKW":
            return 96;
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return 128;
          default:
            throw new A(`Unsupported JWE Algorithm: ${a10}`);
        }
      }
      let N = (a10, b2) => {
        if (b2.length << 3 !== M(a10)) throw new C("Invalid Initialization Vector length");
      }, O = (a10, b2) => {
        let c2 = a10.byteLength << 3;
        if (c2 !== b2) throw new C(`Invalid Content Encryption Key length. Expected ${b2} bits, got ${c2} bits`);
      };
      function P(a10, b2 = "algorithm.name") {
        return TypeError(`CryptoKey does not support this operation, its ${b2} must be ${a10}`);
      }
      function Q(a10, b2) {
        return a10.name === b2;
      }
      function R(a10) {
        return parseInt(a10.name.slice(4), 10);
      }
      function S(a10, b2) {
        if (b2.length && !b2.some((b3) => a10.usages.includes(b3))) {
          let a11 = "CryptoKey does not support this operation, its usages must include ";
          if (b2.length > 2) {
            let c2 = b2.pop();
            a11 += `one of ${b2.join(", ")}, or ${c2}.`;
          } else 2 === b2.length ? a11 += `one of ${b2[0]} or ${b2[1]}.` : a11 += `${b2[0]}.`;
          throw TypeError(a11);
        }
      }
      function T(a10, b2, ...c2) {
        switch (b2) {
          case "A128GCM":
          case "A192GCM":
          case "A256GCM": {
            if (!Q(a10.algorithm, "AES-GCM")) throw P("AES-GCM");
            let c3 = parseInt(b2.slice(1, 4), 10);
            if (a10.algorithm.length !== c3) throw P(c3, "algorithm.length");
            break;
          }
          case "A128KW":
          case "A192KW":
          case "A256KW": {
            if (!Q(a10.algorithm, "AES-KW")) throw P("AES-KW");
            let c3 = parseInt(b2.slice(1, 4), 10);
            if (a10.algorithm.length !== c3) throw P(c3, "algorithm.length");
            break;
          }
          case "ECDH":
            switch (a10.algorithm.name) {
              case "ECDH":
              case "X25519":
              case "X448":
                break;
              default:
                throw P("ECDH, X25519, or X448");
            }
            break;
          case "PBES2-HS256+A128KW":
          case "PBES2-HS384+A192KW":
          case "PBES2-HS512+A256KW":
            if (!Q(a10.algorithm, "PBKDF2")) throw P("PBKDF2");
            break;
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512": {
            if (!Q(a10.algorithm, "RSA-OAEP")) throw P("RSA-OAEP");
            let c3 = parseInt(b2.slice(9), 10) || 1;
            if (R(a10.algorithm.hash) !== c3) throw P(`SHA-${c3}`, "algorithm.hash");
            break;
          }
          default:
            throw TypeError("CryptoKey does not support this operation");
        }
        S(a10, c2);
      }
      function U(a10, b2, ...c2) {
        if (c2.length > 2) {
          let b3 = c2.pop();
          a10 += `one of type ${c2.join(", ")}, or ${b3}.`;
        } else 2 === c2.length ? a10 += `one of type ${c2[0]} or ${c2[1]}.` : a10 += `of type ${c2[0]}.`;
        return null == b2 ? a10 += ` Received ${b2}` : "function" == typeof b2 && b2.name ? a10 += ` Received function ${b2.name}` : "object" == typeof b2 && null != b2 && b2.constructor?.name && (a10 += ` Received an instance of ${b2.constructor.name}`), a10;
      }
      let V = (a10, ...b2) => U("Key must be ", a10, ...b2);
      function W(a10, b2, ...c2) {
        return U(`Key for the ${a10} algorithm must be `, b2, ...c2);
      }
      let X = (a10) => a10 instanceof CryptoKey || a10?.[Symbol.toStringTag] === "KeyObject", Y = ["CryptoKey"];
      async function Z(a10, b2, c2, d2, e2, f2) {
        let g2, h2;
        if (!(b2 instanceof Uint8Array)) throw TypeError(V(b2, "Uint8Array"));
        let j2 = parseInt(a10.slice(1, 4), 10), k2 = await i.subtle.importKey("raw", b2.subarray(j2 >> 3), "AES-CBC", false, ["decrypt"]), l2 = await i.subtle.importKey("raw", b2.subarray(0, j2 >> 3), { hash: `SHA-${j2 << 1}`, name: "HMAC" }, false, ["sign"]), n2 = m(f2, d2, c2, o(f2.length << 3)), p2 = new Uint8Array((await i.subtle.sign("HMAC", l2, n2)).slice(0, j2 >> 3));
        try {
          g2 = ((a11, b3) => {
            if (!(a11 instanceof Uint8Array)) throw TypeError("First argument must be a buffer");
            if (!(b3 instanceof Uint8Array)) throw TypeError("Second argument must be a buffer");
            if (a11.length !== b3.length) throw TypeError("Input buffers must have the same length");
            let c3 = a11.length, d3 = 0, e3 = -1;
            for (; ++e3 < c3; ) d3 |= a11[e3] ^ b3[e3];
            return 0 === d3;
          })(e2, p2);
        } catch {
        }
        if (!g2) throw new B();
        try {
          h2 = new Uint8Array(await i.subtle.decrypt({ iv: d2, name: "AES-CBC" }, k2, c2));
        } catch {
        }
        if (!h2) throw new B();
        return h2;
      }
      async function $(a10, b2, c2, d2, e2, f2) {
        let g2;
        b2 instanceof Uint8Array ? g2 = await i.subtle.importKey("raw", b2, "AES-GCM", false, ["decrypt"]) : (T(b2, a10, "decrypt"), g2 = b2);
        try {
          return new Uint8Array(await i.subtle.decrypt({ additionalData: f2, iv: d2, name: "AES-GCM", tagLength: 128 }, g2, m(c2, e2)));
        } catch {
          throw new B();
        }
      }
      let _ = async (a10, b2, c2, d2, e2, f2) => {
        if (!(b2 instanceof CryptoKey) && !(b2 instanceof Uint8Array)) throw TypeError(V(b2, ...Y, "Uint8Array"));
        if (!d2) throw new C("JWE Initialization Vector missing");
        if (!e2) throw new C("JWE Authentication Tag missing");
        switch (N(a10, d2), a10) {
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return b2 instanceof Uint8Array && O(b2, parseInt(a10.slice(-3), 10)), Z(a10, b2, c2, d2, e2, f2);
          case "A128GCM":
          case "A192GCM":
          case "A256GCM":
            return b2 instanceof Uint8Array && O(b2, parseInt(a10.slice(1, 4), 10)), $(a10, b2, c2, d2, e2, f2);
          default:
            throw new A("Unsupported JWE Content Encryption Algorithm");
        }
      }, aa = (...a10) => {
        let b2, c2 = a10.filter(Boolean);
        if (0 === c2.length || 1 === c2.length) return true;
        for (let a11 of c2) {
          let c3 = Object.keys(a11);
          if (!b2 || 0 === b2.size) {
            b2 = new Set(c3);
            continue;
          }
          for (let a12 of c3) {
            if (b2.has(a12)) return false;
            b2.add(a12);
          }
        }
        return true;
      };
      function ab(a10) {
        if ("object" != typeof a10 || null === a10 || "[object Object]" !== Object.prototype.toString.call(a10)) return false;
        if (null === Object.getPrototypeOf(a10)) return true;
        let b2 = a10;
        for (; null !== Object.getPrototypeOf(b2); ) b2 = Object.getPrototypeOf(b2);
        return Object.getPrototypeOf(a10) === b2;
      }
      let ac = [{ hash: "SHA-256", name: "HMAC" }, true, ["sign"]];
      function ad(a10, b2) {
        if (a10.algorithm.length !== parseInt(b2.slice(1, 4), 10)) throw TypeError(`Invalid key size for alg: ${b2}`);
      }
      function ae(a10, b2, c2) {
        if (a10 instanceof CryptoKey) return T(a10, b2, c2), a10;
        if (a10 instanceof Uint8Array) return i.subtle.importKey("raw", a10, "AES-KW", true, [c2]);
        throw TypeError(V(a10, ...Y, "Uint8Array"));
      }
      let af = async (a10, b2, c2) => {
        let d2 = await ae(b2, a10, "wrapKey");
        ad(d2, a10);
        let e2 = await i.subtle.importKey("raw", c2, ...ac);
        return new Uint8Array(await i.subtle.wrapKey("raw", e2, d2, "AES-KW"));
      }, ag = async (a10, b2, c2) => {
        let d2 = await ae(b2, a10, "unwrapKey");
        ad(d2, a10);
        let e2 = await i.subtle.unwrapKey("raw", c2, d2, "AES-KW", ...ac);
        return new Uint8Array(await i.subtle.exportKey("raw", e2));
      };
      async function ah(a10, b2, c2, d2, e2 = new Uint8Array(0), f2 = new Uint8Array(0)) {
        let g2;
        if (!(a10 instanceof CryptoKey)) throw TypeError(V(a10, ...Y));
        if (T(a10, "ECDH"), !(b2 instanceof CryptoKey)) throw TypeError(V(b2, ...Y));
        T(b2, "ECDH", "deriveBits");
        let h2 = m(q(k.encode(c2)), q(e2), q(f2), p(d2));
        return g2 = "X25519" === a10.algorithm.name ? 256 : "X448" === a10.algorithm.name ? 448 : Math.ceil(parseInt(a10.algorithm.namedCurve.substr(-3), 10) / 8) << 3, r(new Uint8Array(await i.subtle.deriveBits({ name: a10.algorithm.name, public: a10 }, b2, g2)), d2, h2);
      }
      async function ai(a10) {
        if (!(a10 instanceof CryptoKey)) throw TypeError(V(a10, ...Y));
        return i.subtle.generateKey(a10.algorithm, true, ["deriveBits"]);
      }
      function aj(a10) {
        if (!(a10 instanceof CryptoKey)) throw TypeError(V(a10, ...Y));
        return ["P-256", "P-384", "P-521"].includes(a10.algorithm.namedCurve) || "X25519" === a10.algorithm.name || "X448" === a10.algorithm.name;
      }
      async function ak(a10, b2, c2, d2) {
        if (!(a10 instanceof Uint8Array) || a10.length < 8) throw new C("PBES2 Salt Input must be 8 or more octets");
        let e2 = m(k.encode(b2), new Uint8Array([0]), a10), f2 = parseInt(b2.slice(13, 16), 10), g2 = { hash: `SHA-${b2.slice(8, 11)}`, iterations: c2, name: "PBKDF2", salt: e2 }, h2 = await function(a11, b3) {
          if (a11 instanceof Uint8Array) return i.subtle.importKey("raw", a11, "PBKDF2", false, ["deriveBits"]);
          if (a11 instanceof CryptoKey) return T(a11, b3, "deriveBits", "deriveKey"), a11;
          throw TypeError(V(a11, ...Y, "Uint8Array"));
        }(d2, b2);
        if (h2.usages.includes("deriveBits")) return new Uint8Array(await i.subtle.deriveBits(g2, h2, f2));
        if (h2.usages.includes("deriveKey")) return i.subtle.deriveKey(g2, h2, { length: f2, name: "AES-KW" }, false, ["wrapKey", "unwrapKey"]);
        throw TypeError('PBKDF2 key "usages" must include "deriveBits" or "deriveKey"');
      }
      let al = async (a10, b2, c2, d2 = 2048, e2 = L(new Uint8Array(16))) => {
        let f2 = await ak(e2, a10, d2, b2);
        return { encryptedKey: await af(a10.slice(-6), f2, c2), p2c: d2, p2s: t(e2) };
      }, am = async (a10, b2, c2, d2, e2) => {
        let f2 = await ak(e2, a10, d2, b2);
        return ag(a10.slice(-6), f2, c2);
      };
      function an(a10) {
        switch (a10) {
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            return "RSA-OAEP";
          default:
            throw new A(`alg ${a10} is not supported either by JOSE or your javascript runtime`);
        }
      }
      let ao = (a10, b2) => {
        if (a10.startsWith("RS") || a10.startsWith("PS")) {
          let { modulusLength: c2 } = b2.algorithm;
          if ("number" != typeof c2 || c2 < 2048) throw TypeError(`${a10} requires key modulusLength to be 2048 bits or larger`);
        }
      }, ap = async (a10, b2, c2) => {
        if (!(b2 instanceof CryptoKey)) throw TypeError(V(b2, ...Y));
        if (T(b2, a10, "encrypt", "wrapKey"), ao(a10, b2), b2.usages.includes("encrypt")) return new Uint8Array(await i.subtle.encrypt(an(a10), b2, c2));
        if (b2.usages.includes("wrapKey")) {
          let d2 = await i.subtle.importKey("raw", c2, ...ac);
          return new Uint8Array(await i.subtle.wrapKey("raw", d2, b2, an(a10)));
        }
        throw TypeError('RSA-OAEP key "usages" must include "encrypt" or "wrapKey" for this operation');
      }, aq = async (a10, b2, c2) => {
        if (!(b2 instanceof CryptoKey)) throw TypeError(V(b2, ...Y));
        if (T(b2, a10, "decrypt", "unwrapKey"), ao(a10, b2), b2.usages.includes("decrypt")) return new Uint8Array(await i.subtle.decrypt(an(a10), b2, c2));
        if (b2.usages.includes("unwrapKey")) {
          let d2 = await i.subtle.unwrapKey("raw", c2, b2, an(a10), ...ac);
          return new Uint8Array(await i.subtle.exportKey("raw", d2));
        }
        throw TypeError('RSA-OAEP key "usages" must include "decrypt" or "unwrapKey" for this operation');
      }, ar = async (a10) => {
        if (!a10.alg) throw TypeError('"alg" argument is required when "jwk.alg" is not present');
        let { algorithm: b2, keyUsages: c2 } = function(a11) {
          let b3, c3;
          switch (a11.kty) {
            case "RSA":
              switch (a11.alg) {
                case "PS256":
                case "PS384":
                case "PS512":
                  b3 = { name: "RSA-PSS", hash: `SHA-${a11.alg.slice(-3)}` }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "RS256":
                case "RS384":
                case "RS512":
                  b3 = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${a11.alg.slice(-3)}` }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "RSA-OAEP":
                case "RSA-OAEP-256":
                case "RSA-OAEP-384":
                case "RSA-OAEP-512":
                  b3 = { name: "RSA-OAEP", hash: `SHA-${parseInt(a11.alg.slice(-3), 10) || 1}` }, c3 = a11.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
                  break;
                default:
                  throw new A('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "EC":
              switch (a11.alg) {
                case "ES256":
                  b3 = { name: "ECDSA", namedCurve: "P-256" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ES384":
                  b3 = { name: "ECDSA", namedCurve: "P-384" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ES512":
                  b3 = { name: "ECDSA", namedCurve: "P-521" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ECDH-ES":
                case "ECDH-ES+A128KW":
                case "ECDH-ES+A192KW":
                case "ECDH-ES+A256KW":
                  b3 = { name: "ECDH", namedCurve: a11.crv }, c3 = a11.d ? ["deriveBits"] : [];
                  break;
                default:
                  throw new A('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "OKP":
              switch (a11.alg) {
                case "EdDSA":
                  b3 = { name: a11.crv }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ECDH-ES":
                case "ECDH-ES+A128KW":
                case "ECDH-ES+A192KW":
                case "ECDH-ES+A256KW":
                  b3 = { name: a11.crv }, c3 = a11.d ? ["deriveBits"] : [];
                  break;
                default:
                  throw new A('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            default:
              throw new A('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
          }
          return { algorithm: b3, keyUsages: c3 };
        }(a10), d2 = [b2, a10.ext ?? false, a10.key_ops ?? c2], e2 = { ...a10 };
        return delete e2.alg, delete e2.use, i.subtle.importKey("jwk", e2, ...d2);
      }, as = (a10) => v(a10), at = (a10) => a10?.[Symbol.toStringTag] === "KeyObject", au = async (a10, b2, c2, d2) => {
        let e2 = a10.get(b2);
        if (e2?.[d2]) return e2[d2];
        let f2 = await ar({ ...c2, alg: d2 });
        return e2 ? e2[d2] = f2 : a10.set(b2, { [d2]: f2 }), f2;
      }, av = { normalizePublicKey: (a10, b2) => {
        if (at(a10)) {
          let c2 = a10.export({ format: "jwk" });
          return (delete c2.d, delete c2.dp, delete c2.dq, delete c2.p, delete c2.q, delete c2.qi, c2.k) ? as(c2.k) : (e || (e = /* @__PURE__ */ new WeakMap()), au(e, a10, c2, b2));
        }
        return a10;
      }, normalizePrivateKey: (a10, b2) => {
        if (at(a10)) {
          let c2 = a10.export({ format: "jwk" });
          return c2.k ? as(c2.k) : (d || (d = /* @__PURE__ */ new WeakMap()), au(d, a10, c2, b2));
        }
        return a10;
      } };
      function aw(a10) {
        switch (a10) {
          case "A128GCM":
            return 128;
          case "A192GCM":
            return 192;
          case "A256GCM":
          case "A128CBC-HS256":
            return 256;
          case "A192CBC-HS384":
            return 384;
          case "A256CBC-HS512":
            return 512;
          default:
            throw new A(`Unsupported JWE Algorithm: ${a10}`);
        }
      }
      let ax = (a10) => L(new Uint8Array(aw(a10) >> 3)), ay = (a10, b2) => {
        let c2 = (a10.match(/.{1,64}/g) || []).join("\n");
        return `-----BEGIN ${b2}-----
${c2}
-----END ${b2}-----`;
      }, az = async (a10, b2, c2) => {
        if (!(c2 instanceof CryptoKey)) throw TypeError(V(c2, ...Y));
        if (!c2.extractable) throw TypeError("CryptoKey is not extractable");
        if (c2.type !== a10) throw TypeError(`key is not a ${a10} key`);
        return ay(s(new Uint8Array(await i.subtle.exportKey(b2, c2))), `${a10.toUpperCase()} KEY`);
      }, aA = (a10, b2, c2 = 0) => {
        0 === c2 && (b2.unshift(b2.length), b2.unshift(6));
        let d2 = a10.indexOf(b2[0], c2);
        if (-1 === d2) return false;
        let e2 = a10.subarray(d2, d2 + b2.length);
        return e2.length === b2.length && (e2.every((a11, c3) => a11 === b2[c3]) || aA(a10, b2, d2 + 1));
      }, aB = (a10) => {
        switch (true) {
          case aA(a10, [42, 134, 72, 206, 61, 3, 1, 7]):
            return "P-256";
          case aA(a10, [43, 129, 4, 0, 34]):
            return "P-384";
          case aA(a10, [43, 129, 4, 0, 35]):
            return "P-521";
          case aA(a10, [43, 101, 110]):
            return "X25519";
          case aA(a10, [43, 101, 111]):
            return "X448";
          case aA(a10, [43, 101, 112]):
            return "Ed25519";
          case aA(a10, [43, 101, 113]):
            return "Ed448";
          default:
            throw new A("Invalid or unsupported EC Key Curve or OKP Key Sub Type");
        }
      }, aC = async (a10, b2, c2, d2, e2) => {
        let f2, g2, h2 = new Uint8Array(atob(c2.replace(a10, "")).split("").map((a11) => a11.charCodeAt(0))), j2 = "spki" === b2;
        switch (d2) {
          case "PS256":
          case "PS384":
          case "PS512":
            f2 = { name: "RSA-PSS", hash: `SHA-${d2.slice(-3)}` }, g2 = j2 ? ["verify"] : ["sign"];
            break;
          case "RS256":
          case "RS384":
          case "RS512":
            f2 = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${d2.slice(-3)}` }, g2 = j2 ? ["verify"] : ["sign"];
            break;
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            f2 = { name: "RSA-OAEP", hash: `SHA-${parseInt(d2.slice(-3), 10) || 1}` }, g2 = j2 ? ["encrypt", "wrapKey"] : ["decrypt", "unwrapKey"];
            break;
          case "ES256":
            f2 = { name: "ECDSA", namedCurve: "P-256" }, g2 = j2 ? ["verify"] : ["sign"];
            break;
          case "ES384":
            f2 = { name: "ECDSA", namedCurve: "P-384" }, g2 = j2 ? ["verify"] : ["sign"];
            break;
          case "ES512":
            f2 = { name: "ECDSA", namedCurve: "P-521" }, g2 = j2 ? ["verify"] : ["sign"];
            break;
          case "ECDH-ES":
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            let a11 = aB(h2);
            f2 = a11.startsWith("P-") ? { name: "ECDH", namedCurve: a11 } : { name: a11 }, g2 = j2 ? [] : ["deriveBits"];
            break;
          }
          case "EdDSA":
            f2 = { name: aB(h2) }, g2 = j2 ? ["verify"] : ["sign"];
            break;
          default:
            throw new A('Invalid or unsupported "alg" (Algorithm) value');
        }
        return i.subtle.importKey(b2, h2, f2, e2?.extractable ?? false, g2);
      }, aD = (a10, b2, c2) => aC(/(?:-----(?:BEGIN|END) PUBLIC KEY-----|\s)/g, "spki", a10, b2, c2);
      function aE(a10) {
        let b2 = [], c2 = 0;
        for (; c2 < a10.length; ) {
          let d2 = aF(a10.subarray(c2));
          b2.push(d2), c2 += d2.byteLength;
        }
        return b2;
      }
      function aF(a10) {
        let b2 = 0, c2 = 31 & a10[0];
        if (b2++, 31 === c2) {
          for (c2 = 0; a10[b2] >= 128; ) c2 = 128 * c2 + a10[b2] - 128, b2++;
          c2 = 128 * c2 + a10[b2] - 128, b2++;
        }
        let d2 = 0;
        if (a10[b2] < 128) d2 = a10[b2], b2++;
        else if (128 === d2) {
          for (d2 = 0; 0 !== a10[b2 + d2] || 0 !== a10[b2 + d2 + 1]; ) {
            if (d2 > a10.byteLength) throw TypeError("invalid indefinite form length");
            d2++;
          }
          let c3 = b2 + d2 + 2;
          return { byteLength: c3, contents: a10.subarray(b2, b2 + d2), raw: a10.subarray(0, c3) };
        } else {
          let c3 = 127 & a10[b2];
          b2++, d2 = 0;
          for (let e3 = 0; e3 < c3; e3++) d2 = 256 * d2 + a10[b2], b2++;
        }
        let e2 = b2 + d2;
        return { byteLength: e2, contents: a10.subarray(b2, e2), raw: a10.subarray(0, e2) };
      }
      async function aG(a10, b2, c2) {
        if ("string" != typeof a10 || 0 !== a10.indexOf("-----BEGIN PUBLIC KEY-----")) throw TypeError('"spki" must be SPKI formatted string');
        return aD(a10, b2, c2);
      }
      async function aH(a10, b2, c2) {
        let d2;
        if ("string" != typeof a10 || 0 !== a10.indexOf("-----BEGIN CERTIFICATE-----")) throw TypeError('"x509" must be X.509 formatted string');
        try {
          d2 = ay(function(a11) {
            let b3 = aE(aE(aF(a11).contents)[0].contents);
            return s(b3[160 === b3[0].raw[0] ? 6 : 5].raw);
          }(u(a10.replace(/(?:-----(?:BEGIN|END) CERTIFICATE-----|\s)/g, ""))), "PUBLIC KEY");
        } catch (a11) {
          throw TypeError("Failed to parse the X.509 certificate", { cause: a11 });
        }
        return aD(d2, b2, c2);
      }
      async function aI(a10, b2, c2) {
        if ("string" != typeof a10 || 0 !== a10.indexOf("-----BEGIN PRIVATE KEY-----")) throw TypeError('"pkcs8" must be PKCS#8 formatted string');
        return aC(/(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g, "pkcs8", a10, b2, c2);
      }
      async function aJ(a10, b2) {
        if (!ab(a10)) throw TypeError("JWK must be an object");
        switch (b2 || (b2 = a10.alg), a10.kty) {
          case "oct":
            if ("string" != typeof a10.k || !a10.k) throw TypeError('missing "k" (Key Value) Parameter value');
            return v(a10.k);
          case "RSA":
            if (void 0 !== a10.oth) throw new A('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
          case "EC":
          case "OKP":
            return ar({ ...a10, alg: b2 });
          default:
            throw new A('Unsupported "kty" (Key Type) Parameter value');
        }
      }
      let aK = (a10) => a10?.[Symbol.toStringTag], aL = (a10, b2, c2) => {
        a10.startsWith("HS") || "dir" === a10 || a10.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(a10) ? ((a11, b3) => {
          if (!(b3 instanceof Uint8Array)) {
            if (!X(b3)) throw TypeError(W(a11, b3, ...Y, "Uint8Array"));
            if ("secret" !== b3.type) throw TypeError(`${aK(b3)} instances for symmetric algorithms must be of type "secret"`);
          }
        })(a10, b2) : ((a11, b3, c3) => {
          if (!X(b3)) throw TypeError(W(a11, b3, ...Y));
          if ("secret" === b3.type) throw TypeError(`${aK(b3)} instances for asymmetric algorithms must not be of type "secret"`);
          if ("sign" === c3 && "public" === b3.type) throw TypeError(`${aK(b3)} instances for asymmetric algorithm signing must be of type "private"`);
          if ("decrypt" === c3 && "public" === b3.type) throw TypeError(`${aK(b3)} instances for asymmetric algorithm decryption must be of type "private"`);
          if (b3.algorithm && "verify" === c3 && "private" === b3.type) throw TypeError(`${aK(b3)} instances for asymmetric algorithm verifying must be of type "public"`);
          if (b3.algorithm && "encrypt" === c3 && "private" === b3.type) throw TypeError(`${aK(b3)} instances for asymmetric algorithm encryption must be of type "public"`);
        })(a10, b2, c2);
      };
      async function aM(a10, b2, c2, d2, e2) {
        if (!(c2 instanceof Uint8Array)) throw TypeError(V(c2, "Uint8Array"));
        let f2 = parseInt(a10.slice(1, 4), 10), g2 = await i.subtle.importKey("raw", c2.subarray(f2 >> 3), "AES-CBC", false, ["encrypt"]), h2 = await i.subtle.importKey("raw", c2.subarray(0, f2 >> 3), { hash: `SHA-${f2 << 1}`, name: "HMAC" }, false, ["sign"]), j2 = new Uint8Array(await i.subtle.encrypt({ iv: d2, name: "AES-CBC" }, g2, b2)), k2 = m(e2, d2, j2, o(e2.length << 3));
        return { ciphertext: j2, tag: new Uint8Array((await i.subtle.sign("HMAC", h2, k2)).slice(0, f2 >> 3)), iv: d2 };
      }
      async function aN(a10, b2, c2, d2, e2) {
        let f2;
        c2 instanceof Uint8Array ? f2 = await i.subtle.importKey("raw", c2, "AES-GCM", false, ["encrypt"]) : (T(c2, a10, "encrypt"), f2 = c2);
        let g2 = new Uint8Array(await i.subtle.encrypt({ additionalData: e2, iv: d2, name: "AES-GCM", tagLength: 128 }, f2, b2)), h2 = g2.slice(-16);
        return { ciphertext: g2.slice(0, -16), tag: h2, iv: d2 };
      }
      let aO = async (a10, b2, c2, d2, e2) => {
        if (!(c2 instanceof CryptoKey) && !(c2 instanceof Uint8Array)) throw TypeError(V(c2, ...Y, "Uint8Array"));
        switch (d2 ? N(a10, d2) : d2 = L(new Uint8Array(M(a10) >> 3)), a10) {
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return c2 instanceof Uint8Array && O(c2, parseInt(a10.slice(-3), 10)), aM(a10, b2, c2, d2, e2);
          case "A128GCM":
          case "A192GCM":
          case "A256GCM":
            return c2 instanceof Uint8Array && O(c2, parseInt(a10.slice(1, 4), 10)), aN(a10, b2, c2, d2, e2);
          default:
            throw new A("Unsupported JWE Content Encryption Algorithm");
        }
      };
      async function aP(a10, b2, c2, d2) {
        let e2 = a10.slice(0, 7), f2 = await aO(e2, c2, b2, d2, new Uint8Array(0));
        return { encryptedKey: f2.ciphertext, iv: t(f2.iv), tag: t(f2.tag) };
      }
      async function aQ(a10, b2, c2, d2, e2) {
        return _(a10.slice(0, 7), b2, c2, d2, e2, new Uint8Array(0));
      }
      async function aR(a10, b2, c2, d2, e2) {
        switch (aL(a10, b2, "decrypt"), b2 = await av.normalizePrivateKey?.(b2, a10) || b2, a10) {
          case "dir":
            if (void 0 !== c2) throw new C("Encountered unexpected JWE Encrypted Key");
            return b2;
          case "ECDH-ES":
            if (void 0 !== c2) throw new C("Encountered unexpected JWE Encrypted Key");
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            let e3, f2;
            if (!ab(d2.epk)) throw new C('JOSE Header "epk" (Ephemeral Public Key) missing or invalid');
            if (!aj(b2)) throw new A("ECDH with the provided key is not allowed or not supported by your javascript runtime");
            let g2 = await aJ(d2.epk, a10);
            if (void 0 !== d2.apu) {
              if ("string" != typeof d2.apu) throw new C('JOSE Header "apu" (Agreement PartyUInfo) invalid');
              try {
                e3 = v(d2.apu);
              } catch {
                throw new C("Failed to base64url decode the apu");
              }
            }
            if (void 0 !== d2.apv) {
              if ("string" != typeof d2.apv) throw new C('JOSE Header "apv" (Agreement PartyVInfo) invalid');
              try {
                f2 = v(d2.apv);
              } catch {
                throw new C("Failed to base64url decode the apv");
              }
            }
            let h2 = await ah(g2, b2, "ECDH-ES" === a10 ? d2.enc : a10, "ECDH-ES" === a10 ? aw(d2.enc) : parseInt(a10.slice(-5, -2), 10), e3, f2);
            if ("ECDH-ES" === a10) return h2;
            if (void 0 === c2) throw new C("JWE Encrypted Key missing");
            return ag(a10.slice(-6), h2, c2);
          }
          case "RSA1_5":
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            if (void 0 === c2) throw new C("JWE Encrypted Key missing");
            return aq(a10, b2, c2);
          case "PBES2-HS256+A128KW":
          case "PBES2-HS384+A192KW":
          case "PBES2-HS512+A256KW": {
            let f2;
            if (void 0 === c2) throw new C("JWE Encrypted Key missing");
            if ("number" != typeof d2.p2c) throw new C('JOSE Header "p2c" (PBES2 Count) missing or invalid');
            let g2 = e2?.maxPBES2Count || 1e4;
            if (d2.p2c > g2) throw new C('JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds');
            if ("string" != typeof d2.p2s) throw new C('JOSE Header "p2s" (PBES2 Salt) missing or invalid');
            try {
              f2 = v(d2.p2s);
            } catch {
              throw new C("Failed to base64url decode the p2s");
            }
            return am(a10, b2, c2, d2.p2c, f2);
          }
          case "A128KW":
          case "A192KW":
          case "A256KW":
            if (void 0 === c2) throw new C("JWE Encrypted Key missing");
            return ag(a10, b2, c2);
          case "A128GCMKW":
          case "A192GCMKW":
          case "A256GCMKW": {
            let e3, f2;
            if (void 0 === c2) throw new C("JWE Encrypted Key missing");
            if ("string" != typeof d2.iv) throw new C('JOSE Header "iv" (Initialization Vector) missing or invalid');
            if ("string" != typeof d2.tag) throw new C('JOSE Header "tag" (Authentication Tag) missing or invalid');
            try {
              e3 = v(d2.iv);
            } catch {
              throw new C("Failed to base64url decode the iv");
            }
            try {
              f2 = v(d2.tag);
            } catch {
              throw new C("Failed to base64url decode the tag");
            }
            return aQ(a10, b2, c2, e3, f2);
          }
          default:
            throw new A('Invalid or unsupported "alg" (JWE Algorithm) header value');
        }
      }
      let aS = function(a10, b2, c2, d2, e2) {
        let f2;
        if (void 0 !== e2.crit && d2?.crit === void 0) throw new a10('"crit" (Critical) Header Parameter MUST be integrity protected');
        if (!d2 || void 0 === d2.crit) return /* @__PURE__ */ new Set();
        if (!Array.isArray(d2.crit) || 0 === d2.crit.length || d2.crit.some((a11) => "string" != typeof a11 || 0 === a11.length)) throw new a10('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
        for (let g2 of (f2 = void 0 !== c2 ? new Map([...Object.entries(c2), ...b2.entries()]) : b2, d2.crit)) {
          if (!f2.has(g2)) throw new A(`Extension Header Parameter "${g2}" is not recognized`);
          if (void 0 === e2[g2]) throw new a10(`Extension Header Parameter "${g2}" is missing`);
          if (f2.get(g2) && void 0 === d2[g2]) throw new a10(`Extension Header Parameter "${g2}" MUST be integrity protected`);
        }
        return new Set(d2.crit);
      }, aT = (a10, b2) => {
        if (void 0 !== b2 && (!Array.isArray(b2) || b2.some((a11) => "string" != typeof a11))) throw TypeError(`"${a10}" option must be an array of strings`);
        if (b2) return new Set(b2);
      };
      async function aU(a10, b2, c2) {
        let d2, e2, f2, g2, h2, i2, j2;
        if (!ab(a10)) throw new C("Flattened JWE must be an object");
        if (void 0 === a10.protected && void 0 === a10.header && void 0 === a10.unprotected) throw new C("JOSE Header missing");
        if (void 0 !== a10.iv && "string" != typeof a10.iv) throw new C("JWE Initialization Vector incorrect type");
        if ("string" != typeof a10.ciphertext) throw new C("JWE Ciphertext missing or incorrect type");
        if (void 0 !== a10.tag && "string" != typeof a10.tag) throw new C("JWE Authentication Tag incorrect type");
        if (void 0 !== a10.protected && "string" != typeof a10.protected) throw new C("JWE Protected Header incorrect type");
        if (void 0 !== a10.encrypted_key && "string" != typeof a10.encrypted_key) throw new C("JWE Encrypted Key incorrect type");
        if (void 0 !== a10.aad && "string" != typeof a10.aad) throw new C("JWE AAD incorrect type");
        if (void 0 !== a10.header && !ab(a10.header)) throw new C("JWE Shared Unprotected Header incorrect type");
        if (void 0 !== a10.unprotected && !ab(a10.unprotected)) throw new C("JWE Per-Recipient Unprotected Header incorrect type");
        if (a10.protected) try {
          let b3 = v(a10.protected);
          d2 = JSON.parse(l.decode(b3));
        } catch {
          throw new C("JWE Protected Header is invalid");
        }
        if (!aa(d2, a10.header, a10.unprotected)) throw new C("JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint");
        let n2 = { ...d2, ...a10.header, ...a10.unprotected };
        if (aS(C, /* @__PURE__ */ new Map(), c2?.crit, d2, n2), void 0 !== n2.zip) throw new A('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
        let { alg: o2, enc: p2 } = n2;
        if ("string" != typeof o2 || !o2) throw new C("missing JWE Algorithm (alg) in JWE Header");
        if ("string" != typeof p2 || !p2) throw new C("missing JWE Encryption Algorithm (enc) in JWE Header");
        let q2 = c2 && aT("keyManagementAlgorithms", c2.keyManagementAlgorithms), r2 = c2 && aT("contentEncryptionAlgorithms", c2.contentEncryptionAlgorithms);
        if (q2 && !q2.has(o2) || !q2 && o2.startsWith("PBES2")) throw new z('"alg" (Algorithm) Header Parameter value not allowed');
        if (r2 && !r2.has(p2)) throw new z('"enc" (Encryption Algorithm) Header Parameter value not allowed');
        if (void 0 !== a10.encrypted_key) try {
          e2 = v(a10.encrypted_key);
        } catch {
          throw new C("Failed to base64url decode the encrypted_key");
        }
        let s2 = false;
        "function" == typeof b2 && (b2 = await b2(d2, a10), s2 = true);
        try {
          f2 = await aR(o2, b2, e2, n2, c2);
        } catch (a11) {
          if (a11 instanceof TypeError || a11 instanceof C || a11 instanceof A) throw a11;
          f2 = ax(p2);
        }
        if (void 0 !== a10.iv) try {
          g2 = v(a10.iv);
        } catch {
          throw new C("Failed to base64url decode the iv");
        }
        if (void 0 !== a10.tag) try {
          h2 = v(a10.tag);
        } catch {
          throw new C("Failed to base64url decode the tag");
        }
        let t2 = k.encode(a10.protected ?? "");
        i2 = void 0 !== a10.aad ? m(t2, k.encode("."), k.encode(a10.aad)) : t2;
        try {
          j2 = v(a10.ciphertext);
        } catch {
          throw new C("Failed to base64url decode the ciphertext");
        }
        let u2 = { plaintext: await _(p2, f2, j2, g2, h2, i2) };
        if (void 0 !== a10.protected && (u2.protectedHeader = d2), void 0 !== a10.aad) try {
          u2.additionalAuthenticatedData = v(a10.aad);
        } catch {
          throw new C("Failed to base64url decode the aad");
        }
        return (void 0 !== a10.unprotected && (u2.sharedUnprotectedHeader = a10.unprotected), void 0 !== a10.header && (u2.unprotectedHeader = a10.header), s2) ? { ...u2, key: b2 } : u2;
      }
      async function aV(a10, b2, c2) {
        if (a10 instanceof Uint8Array && (a10 = l.decode(a10)), "string" != typeof a10) throw new C("Compact JWE must be a string or Uint8Array");
        let { 0: d2, 1: e2, 2: f2, 3: g2, 4: h2, length: i2 } = a10.split(".");
        if (5 !== i2) throw new C("Invalid Compact JWE");
        let j2 = await aU({ ciphertext: g2, iv: f2 || void 0, protected: d2, tag: h2 || void 0, encrypted_key: e2 || void 0 }, b2, c2), k2 = { plaintext: j2.plaintext, protectedHeader: j2.protectedHeader };
        return "function" == typeof b2 ? { ...k2, key: j2.key } : k2;
      }
      async function aW(a10, b2, c2) {
        if (!ab(a10)) throw new C("General JWE must be an object");
        if (!Array.isArray(a10.recipients) || !a10.recipients.every(ab)) throw new C("JWE Recipients missing or incorrect type");
        if (!a10.recipients.length) throw new C("JWE Recipients has no members");
        for (let d2 of a10.recipients) try {
          return await aU({ aad: a10.aad, ciphertext: a10.ciphertext, encrypted_key: d2.encrypted_key, header: d2.header, iv: a10.iv, protected: a10.protected, tag: a10.tag, unprotected: a10.unprotected }, b2, c2);
        } catch {
        }
        throw new B();
      }
      let aX = async (a10) => {
        if (a10 instanceof Uint8Array) return { kty: "oct", k: t(a10) };
        if (!(a10 instanceof CryptoKey)) throw TypeError(V(a10, ...Y, "Uint8Array"));
        if (!a10.extractable) throw TypeError("non-extractable CryptoKey cannot be exported as a JWK");
        let { ext: b2, key_ops: c2, alg: d2, use: e2, ...f2 } = await i.subtle.exportKey("jwk", a10);
        return f2;
      };
      async function aY(a10) {
        return az("public", "spki", a10);
      }
      async function aZ(a10) {
        return az("private", "pkcs8", a10);
      }
      async function a$(a10) {
        return aX(a10);
      }
      async function a_(a10, b2, c2, d2, e2 = {}) {
        let f2, g2, h2;
        switch (aL(a10, c2, "encrypt"), c2 = await av.normalizePublicKey?.(c2, a10) || c2, a10) {
          case "dir":
            h2 = c2;
            break;
          case "ECDH-ES":
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            if (!aj(c2)) throw new A("ECDH with the provided key is not allowed or not supported by your javascript runtime");
            let { apu: i2, apv: j2 } = e2, { epk: k2 } = e2;
            k2 || (k2 = (await ai(c2)).privateKey);
            let { x: l2, y: m2, crv: n2, kty: o2 } = await a$(k2), p2 = await ah(c2, k2, "ECDH-ES" === a10 ? b2 : a10, "ECDH-ES" === a10 ? aw(b2) : parseInt(a10.slice(-5, -2), 10), i2, j2);
            if (g2 = { epk: { x: l2, crv: n2, kty: o2 } }, "EC" === o2 && (g2.epk.y = m2), i2 && (g2.apu = t(i2)), j2 && (g2.apv = t(j2)), "ECDH-ES" === a10) {
              h2 = p2;
              break;
            }
            h2 = d2 || ax(b2);
            let q2 = a10.slice(-6);
            f2 = await af(q2, p2, h2);
            break;
          }
          case "RSA1_5":
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            h2 = d2 || ax(b2), f2 = await ap(a10, c2, h2);
            break;
          case "PBES2-HS256+A128KW":
          case "PBES2-HS384+A192KW":
          case "PBES2-HS512+A256KW": {
            h2 = d2 || ax(b2);
            let { p2c: i2, p2s: j2 } = e2;
            ({ encryptedKey: f2, ...g2 } = await al(a10, c2, h2, i2, j2));
            break;
          }
          case "A128KW":
          case "A192KW":
          case "A256KW":
            h2 = d2 || ax(b2), f2 = await af(a10, c2, h2);
            break;
          case "A128GCMKW":
          case "A192GCMKW":
          case "A256GCMKW": {
            h2 = d2 || ax(b2);
            let { iv: i2 } = e2;
            ({ encryptedKey: f2, ...g2 } = await aP(a10, c2, h2, i2));
            break;
          }
          default:
            throw new A('Invalid or unsupported "alg" (JWE Algorithm) header value');
        }
        return { cek: h2, encryptedKey: f2, parameters: g2 };
      }
      let a0 = Symbol();
      class a1 {
        constructor(a10) {
          if (!(a10 instanceof Uint8Array)) throw TypeError("plaintext must be an instance of Uint8Array");
          this._plaintext = a10;
        }
        setKeyManagementParameters(a10) {
          if (this._keyManagementParameters) throw TypeError("setKeyManagementParameters can only be called once");
          return this._keyManagementParameters = a10, this;
        }
        setProtectedHeader(a10) {
          if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this._protectedHeader = a10, this;
        }
        setSharedUnprotectedHeader(a10) {
          if (this._sharedUnprotectedHeader) throw TypeError("setSharedUnprotectedHeader can only be called once");
          return this._sharedUnprotectedHeader = a10, this;
        }
        setUnprotectedHeader(a10) {
          if (this._unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
          return this._unprotectedHeader = a10, this;
        }
        setAdditionalAuthenticatedData(a10) {
          return this._aad = a10, this;
        }
        setContentEncryptionKey(a10) {
          if (this._cek) throw TypeError("setContentEncryptionKey can only be called once");
          return this._cek = a10, this;
        }
        setInitializationVector(a10) {
          if (this._iv) throw TypeError("setInitializationVector can only be called once");
          return this._iv = a10, this;
        }
        async encrypt(a10, b2) {
          let c2, d2, e2, f2, g2;
          if (!this._protectedHeader && !this._unprotectedHeader && !this._sharedUnprotectedHeader) throw new C("either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()");
          if (!aa(this._protectedHeader, this._unprotectedHeader, this._sharedUnprotectedHeader)) throw new C("JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint");
          let h2 = { ...this._protectedHeader, ...this._unprotectedHeader, ...this._sharedUnprotectedHeader };
          if (aS(C, /* @__PURE__ */ new Map(), b2?.crit, this._protectedHeader, h2), void 0 !== h2.zip) throw new A('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
          let { alg: i2, enc: j2 } = h2;
          if ("string" != typeof i2 || !i2) throw new C('JWE "alg" (Algorithm) Header Parameter missing or invalid');
          if ("string" != typeof j2 || !j2) throw new C('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
          if (this._cek && ("dir" === i2 || "ECDH-ES" === i2)) throw TypeError(`setContentEncryptionKey cannot be called with JWE "alg" (Algorithm) Header ${i2}`);
          {
            let e3;
            ({ cek: d2, encryptedKey: c2, parameters: e3 } = await a_(i2, j2, a10, this._cek, this._keyManagementParameters)), e3 && (b2 && a0 in b2 ? this._unprotectedHeader ? this._unprotectedHeader = { ...this._unprotectedHeader, ...e3 } : this.setUnprotectedHeader(e3) : this._protectedHeader ? this._protectedHeader = { ...this._protectedHeader, ...e3 } : this.setProtectedHeader(e3));
          }
          f2 = this._protectedHeader ? k.encode(t(JSON.stringify(this._protectedHeader))) : k.encode(""), this._aad ? (g2 = t(this._aad), e2 = m(f2, k.encode("."), k.encode(g2))) : e2 = f2;
          let { ciphertext: n2, tag: o2, iv: p2 } = await aO(j2, this._plaintext, d2, this._iv, e2), q2 = { ciphertext: t(n2) };
          return p2 && (q2.iv = t(p2)), o2 && (q2.tag = t(o2)), c2 && (q2.encrypted_key = t(c2)), g2 && (q2.aad = g2), this._protectedHeader && (q2.protected = l.decode(f2)), this._sharedUnprotectedHeader && (q2.unprotected = this._sharedUnprotectedHeader), this._unprotectedHeader && (q2.header = this._unprotectedHeader), q2;
        }
      }
      class a2 {
        constructor(a10, b2, c2) {
          this.parent = a10, this.key = b2, this.options = c2;
        }
        setUnprotectedHeader(a10) {
          if (this.unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
          return this.unprotectedHeader = a10, this;
        }
        addRecipient(...a10) {
          return this.parent.addRecipient(...a10);
        }
        encrypt(...a10) {
          return this.parent.encrypt(...a10);
        }
        done() {
          return this.parent;
        }
      }
      class a3 {
        constructor(a10) {
          this._recipients = [], this._plaintext = a10;
        }
        addRecipient(a10, b2) {
          let c2 = new a2(this, a10, { crit: b2?.crit });
          return this._recipients.push(c2), c2;
        }
        setProtectedHeader(a10) {
          if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this._protectedHeader = a10, this;
        }
        setSharedUnprotectedHeader(a10) {
          if (this._unprotectedHeader) throw TypeError("setSharedUnprotectedHeader can only be called once");
          return this._unprotectedHeader = a10, this;
        }
        setAdditionalAuthenticatedData(a10) {
          return this._aad = a10, this;
        }
        async encrypt() {
          let a10;
          if (!this._recipients.length) throw new C("at least one recipient must be added");
          if (1 === this._recipients.length) {
            let [a11] = this._recipients, b3 = await new a1(this._plaintext).setAdditionalAuthenticatedData(this._aad).setProtectedHeader(this._protectedHeader).setSharedUnprotectedHeader(this._unprotectedHeader).setUnprotectedHeader(a11.unprotectedHeader).encrypt(a11.key, { ...a11.options }), c3 = { ciphertext: b3.ciphertext, iv: b3.iv, recipients: [{}], tag: b3.tag };
            return b3.aad && (c3.aad = b3.aad), b3.protected && (c3.protected = b3.protected), b3.unprotected && (c3.unprotected = b3.unprotected), b3.encrypted_key && (c3.recipients[0].encrypted_key = b3.encrypted_key), b3.header && (c3.recipients[0].header = b3.header), c3;
          }
          for (let b3 = 0; b3 < this._recipients.length; b3++) {
            let c3 = this._recipients[b3];
            if (!aa(this._protectedHeader, this._unprotectedHeader, c3.unprotectedHeader)) throw new C("JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint");
            let d2 = { ...this._protectedHeader, ...this._unprotectedHeader, ...c3.unprotectedHeader }, { alg: e2 } = d2;
            if ("string" != typeof e2 || !e2) throw new C('JWE "alg" (Algorithm) Header Parameter missing or invalid');
            if ("dir" === e2 || "ECDH-ES" === e2) throw new C('"dir" and "ECDH-ES" alg may only be used with a single recipient');
            if ("string" != typeof d2.enc || !d2.enc) throw new C('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
            if (a10) {
              if (a10 !== d2.enc) throw new C('JWE "enc" (Encryption Algorithm) Header Parameter must be the same for all recipients');
            } else a10 = d2.enc;
            if (aS(C, /* @__PURE__ */ new Map(), c3.options.crit, this._protectedHeader, d2), void 0 !== d2.zip) throw new A('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
          }
          let b2 = ax(a10), c2 = { ciphertext: "", iv: "", recipients: [], tag: "" };
          for (let d2 = 0; d2 < this._recipients.length; d2++) {
            let e2 = this._recipients[d2], f2 = {};
            c2.recipients.push(f2);
            let g2 = { ...this._protectedHeader, ...this._unprotectedHeader, ...e2.unprotectedHeader }.alg.startsWith("PBES2") ? 2048 + d2 : void 0;
            if (0 === d2) {
              let a11 = await new a1(this._plaintext).setAdditionalAuthenticatedData(this._aad).setContentEncryptionKey(b2).setProtectedHeader(this._protectedHeader).setSharedUnprotectedHeader(this._unprotectedHeader).setUnprotectedHeader(e2.unprotectedHeader).setKeyManagementParameters({ p2c: g2 }).encrypt(e2.key, { ...e2.options, [a0]: true });
              c2.ciphertext = a11.ciphertext, c2.iv = a11.iv, c2.tag = a11.tag, a11.aad && (c2.aad = a11.aad), a11.protected && (c2.protected = a11.protected), a11.unprotected && (c2.unprotected = a11.unprotected), f2.encrypted_key = a11.encrypted_key, a11.header && (f2.header = a11.header);
              continue;
            }
            let { encryptedKey: h2, parameters: i2 } = await a_(e2.unprotectedHeader?.alg || this._protectedHeader?.alg || this._unprotectedHeader?.alg, a10, e2.key, b2, { p2c: g2 });
            f2.encrypted_key = t(h2), (e2.unprotectedHeader || i2) && (f2.header = { ...e2.unprotectedHeader, ...i2 });
          }
          return c2;
        }
      }
      function a4(a10, b2) {
        let c2 = `SHA-${a10.slice(-3)}`;
        switch (a10) {
          case "HS256":
          case "HS384":
          case "HS512":
            return { hash: c2, name: "HMAC" };
          case "PS256":
          case "PS384":
          case "PS512":
            return { hash: c2, name: "RSA-PSS", saltLength: a10.slice(-3) >> 3 };
          case "RS256":
          case "RS384":
          case "RS512":
            return { hash: c2, name: "RSASSA-PKCS1-v1_5" };
          case "ES256":
          case "ES384":
          case "ES512":
            return { hash: c2, name: "ECDSA", namedCurve: b2.namedCurve };
          case "EdDSA":
            return { name: b2.name };
          default:
            throw new A(`alg ${a10} is not supported either by JOSE or your javascript runtime`);
        }
      }
      async function a5(a10, b2, c2) {
        if ("sign" === c2 && (b2 = await av.normalizePrivateKey(b2, a10)), "verify" === c2 && (b2 = await av.normalizePublicKey(b2, a10)), b2 instanceof CryptoKey) return !function(a11, b3, ...c3) {
          switch (b3) {
            case "HS256":
            case "HS384":
            case "HS512": {
              if (!Q(a11.algorithm, "HMAC")) throw P("HMAC");
              let c4 = parseInt(b3.slice(2), 10);
              if (R(a11.algorithm.hash) !== c4) throw P(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "RS256":
            case "RS384":
            case "RS512": {
              if (!Q(a11.algorithm, "RSASSA-PKCS1-v1_5")) throw P("RSASSA-PKCS1-v1_5");
              let c4 = parseInt(b3.slice(2), 10);
              if (R(a11.algorithm.hash) !== c4) throw P(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "PS256":
            case "PS384":
            case "PS512": {
              if (!Q(a11.algorithm, "RSA-PSS")) throw P("RSA-PSS");
              let c4 = parseInt(b3.slice(2), 10);
              if (R(a11.algorithm.hash) !== c4) throw P(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "EdDSA":
              if ("Ed25519" !== a11.algorithm.name && "Ed448" !== a11.algorithm.name) throw P("Ed25519 or Ed448");
              break;
            case "ES256":
            case "ES384":
            case "ES512": {
              if (!Q(a11.algorithm, "ECDSA")) throw P("ECDSA");
              let c4 = function(a12) {
                switch (a12) {
                  case "ES256":
                    return "P-256";
                  case "ES384":
                    return "P-384";
                  case "ES512":
                    return "P-521";
                  default:
                    throw Error("unreachable");
                }
              }(b3);
              if (a11.algorithm.namedCurve !== c4) throw P(c4, "algorithm.namedCurve");
              break;
            }
            default:
              throw TypeError("CryptoKey does not support this operation");
          }
          S(a11, c3);
        }(b2, a10, c2), b2;
        if (b2 instanceof Uint8Array) {
          if (!a10.startsWith("HS")) throw TypeError(V(b2, ...Y));
          return i.subtle.importKey("raw", b2, { hash: `SHA-${a10.slice(-3)}`, name: "HMAC" }, false, [c2]);
        }
        throw TypeError(V(b2, ...Y, "Uint8Array"));
      }
      let a6 = async (a10, b2, c2, d2) => {
        let e2 = await a5(a10, b2, "verify");
        ao(a10, e2);
        let f2 = a4(a10, e2.algorithm);
        try {
          return await i.subtle.verify(f2, e2, c2, d2);
        } catch {
          return false;
        }
      };
      async function a7(a10, b2, c2) {
        let d2, e2;
        if (!ab(a10)) throw new D("Flattened JWS must be an object");
        if (void 0 === a10.protected && void 0 === a10.header) throw new D('Flattened JWS must have either of the "protected" or "header" members');
        if (void 0 !== a10.protected && "string" != typeof a10.protected) throw new D("JWS Protected Header incorrect type");
        if (void 0 === a10.payload) throw new D("JWS Payload missing");
        if ("string" != typeof a10.signature) throw new D("JWS Signature missing or incorrect type");
        if (void 0 !== a10.header && !ab(a10.header)) throw new D("JWS Unprotected Header incorrect type");
        let f2 = {};
        if (a10.protected) try {
          let b3 = v(a10.protected);
          f2 = JSON.parse(l.decode(b3));
        } catch {
          throw new D("JWS Protected Header is invalid");
        }
        if (!aa(f2, a10.header)) throw new D("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
        let g2 = { ...f2, ...a10.header }, h2 = aS(D, /* @__PURE__ */ new Map([["b64", true]]), c2?.crit, f2, g2), i2 = true;
        if (h2.has("b64") && "boolean" != typeof (i2 = f2.b64)) throw new D('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
        let { alg: j2 } = g2;
        if ("string" != typeof j2 || !j2) throw new D('JWS "alg" (Algorithm) Header Parameter missing or invalid');
        let n2 = c2 && aT("algorithms", c2.algorithms);
        if (n2 && !n2.has(j2)) throw new z('"alg" (Algorithm) Header Parameter value not allowed');
        if (i2) {
          if ("string" != typeof a10.payload) throw new D("JWS Payload must be a string");
        } else if ("string" != typeof a10.payload && !(a10.payload instanceof Uint8Array)) throw new D("JWS Payload must be a string or an Uint8Array instance");
        let o2 = false;
        "function" == typeof b2 && (b2 = await b2(f2, a10), o2 = true), aL(j2, b2, "verify");
        let p2 = m(k.encode(a10.protected ?? ""), k.encode("."), "string" == typeof a10.payload ? k.encode(a10.payload) : a10.payload);
        try {
          d2 = v(a10.signature);
        } catch {
          throw new D("Failed to base64url decode the signature");
        }
        if (!await a6(j2, b2, d2, p2)) throw new K();
        if (i2) try {
          e2 = v(a10.payload);
        } catch {
          throw new D("Failed to base64url decode the payload");
        }
        else e2 = "string" == typeof a10.payload ? k.encode(a10.payload) : a10.payload;
        let q2 = { payload: e2 };
        return (void 0 !== a10.protected && (q2.protectedHeader = f2), void 0 !== a10.header && (q2.unprotectedHeader = a10.header), o2) ? { ...q2, key: b2 } : q2;
      }
      async function a8(a10, b2, c2) {
        if (a10 instanceof Uint8Array && (a10 = l.decode(a10)), "string" != typeof a10) throw new D("Compact JWS must be a string or Uint8Array");
        let { 0: d2, 1: e2, 2: f2, length: g2 } = a10.split(".");
        if (3 !== g2) throw new D("Invalid Compact JWS");
        let h2 = await a7({ payload: e2, protected: d2, signature: f2 }, b2, c2), i2 = { payload: h2.payload, protectedHeader: h2.protectedHeader };
        return "function" == typeof b2 ? { ...i2, key: h2.key } : i2;
      }
      async function a9(a10, b2, c2) {
        if (!ab(a10)) throw new D("General JWS must be an object");
        if (!Array.isArray(a10.signatures) || !a10.signatures.every(ab)) throw new D("JWS Signatures missing or incorrect type");
        for (let d2 of a10.signatures) try {
          return await a7({ header: d2.header, payload: a10.payload, protected: d2.protected, signature: d2.signature }, b2, c2);
        } catch {
        }
        throw new K();
      }
      let ba = (a10) => Math.floor(a10.getTime() / 1e3), bb = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i, bc = (a10) => {
        let b2, c2 = bb.exec(a10);
        if (!c2 || c2[4] && c2[1]) throw TypeError("Invalid time period format");
        let d2 = parseFloat(c2[2]);
        switch (c2[3].toLowerCase()) {
          case "sec":
          case "secs":
          case "second":
          case "seconds":
          case "s":
            b2 = Math.round(d2);
            break;
          case "minute":
          case "minutes":
          case "min":
          case "mins":
          case "m":
            b2 = Math.round(60 * d2);
            break;
          case "hour":
          case "hours":
          case "hr":
          case "hrs":
          case "h":
            b2 = Math.round(3600 * d2);
            break;
          case "day":
          case "days":
          case "d":
            b2 = Math.round(86400 * d2);
            break;
          case "week":
          case "weeks":
          case "w":
            b2 = Math.round(604800 * d2);
            break;
          default:
            b2 = Math.round(31557600 * d2);
        }
        return "-" === c2[1] || "ago" === c2[4] ? -b2 : b2;
      }, bd = (a10) => a10.toLowerCase().replace(/^application\//, ""), be = (a10, b2, c2 = {}) => {
        let d2, e2;
        try {
          d2 = JSON.parse(l.decode(b2));
        } catch {
        }
        if (!ab(d2)) throw new E("JWT Claims Set must be a top-level JSON object");
        let { typ: f2 } = c2;
        if (f2 && ("string" != typeof a10.typ || bd(a10.typ) !== bd(f2))) throw new x('unexpected "typ" JWT header value', d2, "typ", "check_failed");
        let { requiredClaims: g2 = [], issuer: h2, subject: i2, audience: j2, maxTokenAge: k2 } = c2, m2 = [...g2];
        for (let a11 of (void 0 !== k2 && m2.push("iat"), void 0 !== j2 && m2.push("aud"), void 0 !== i2 && m2.push("sub"), void 0 !== h2 && m2.push("iss"), new Set(m2.reverse()))) if (!(a11 in d2)) throw new x(`missing required "${a11}" claim`, d2, a11, "missing");
        if (h2 && !(Array.isArray(h2) ? h2 : [h2]).includes(d2.iss)) throw new x('unexpected "iss" claim value', d2, "iss", "check_failed");
        if (i2 && d2.sub !== i2) throw new x('unexpected "sub" claim value', d2, "sub", "check_failed");
        if (j2 && !((a11, b3) => "string" == typeof a11 ? b3.includes(a11) : !!Array.isArray(a11) && b3.some(Set.prototype.has.bind(new Set(a11))))(d2.aud, "string" == typeof j2 ? [j2] : j2)) throw new x('unexpected "aud" claim value', d2, "aud", "check_failed");
        switch (typeof c2.clockTolerance) {
          case "string":
            e2 = bc(c2.clockTolerance);
            break;
          case "number":
            e2 = c2.clockTolerance;
            break;
          case "undefined":
            e2 = 0;
            break;
          default:
            throw TypeError("Invalid clockTolerance option type");
        }
        let { currentDate: n2 } = c2, o2 = ba(n2 || /* @__PURE__ */ new Date());
        if ((void 0 !== d2.iat || k2) && "number" != typeof d2.iat) throw new x('"iat" claim must be a number', d2, "iat", "invalid");
        if (void 0 !== d2.nbf) {
          if ("number" != typeof d2.nbf) throw new x('"nbf" claim must be a number', d2, "nbf", "invalid");
          if (d2.nbf > o2 + e2) throw new x('"nbf" claim timestamp check failed', d2, "nbf", "check_failed");
        }
        if (void 0 !== d2.exp) {
          if ("number" != typeof d2.exp) throw new x('"exp" claim must be a number', d2, "exp", "invalid");
          if (d2.exp <= o2 - e2) throw new y('"exp" claim timestamp check failed', d2, "exp", "check_failed");
        }
        if (k2) {
          let a11 = o2 - d2.iat;
          if (a11 - e2 > ("number" == typeof k2 ? k2 : bc(k2))) throw new y('"iat" claim timestamp check failed (too far in the past)', d2, "iat", "check_failed");
          if (a11 < 0 - e2) throw new x('"iat" claim timestamp check failed (it should be in the past)', d2, "iat", "check_failed");
        }
        return d2;
      };
      async function bf(a10, b2, c2) {
        let d2 = await a8(a10, b2, c2);
        if (d2.protectedHeader.crit?.includes("b64") && false === d2.protectedHeader.b64) throw new E("JWTs MUST NOT use unencoded payload");
        let e2 = { payload: be(d2.protectedHeader, d2.payload, c2), protectedHeader: d2.protectedHeader };
        return "function" == typeof b2 ? { ...e2, key: d2.key } : e2;
      }
      async function bg(a10, b2, c2) {
        let d2 = await aV(a10, b2, c2), e2 = be(d2.protectedHeader, d2.plaintext, c2), { protectedHeader: f2 } = d2;
        if (void 0 !== f2.iss && f2.iss !== e2.iss) throw new x('replicated "iss" claim header parameter mismatch', e2, "iss", "mismatch");
        if (void 0 !== f2.sub && f2.sub !== e2.sub) throw new x('replicated "sub" claim header parameter mismatch', e2, "sub", "mismatch");
        if (void 0 !== f2.aud && JSON.stringify(f2.aud) !== JSON.stringify(e2.aud)) throw new x('replicated "aud" claim header parameter mismatch', e2, "aud", "mismatch");
        let g2 = { payload: e2, protectedHeader: f2 };
        return "function" == typeof b2 ? { ...g2, key: d2.key } : g2;
      }
      class bh {
        constructor(a10) {
          this._flattened = new a1(a10);
        }
        setContentEncryptionKey(a10) {
          return this._flattened.setContentEncryptionKey(a10), this;
        }
        setInitializationVector(a10) {
          return this._flattened.setInitializationVector(a10), this;
        }
        setProtectedHeader(a10) {
          return this._flattened.setProtectedHeader(a10), this;
        }
        setKeyManagementParameters(a10) {
          return this._flattened.setKeyManagementParameters(a10), this;
        }
        async encrypt(a10, b2) {
          let c2 = await this._flattened.encrypt(a10, b2);
          return [c2.protected, c2.encrypted_key, c2.iv, c2.ciphertext, c2.tag].join(".");
        }
      }
      let bi = async (a10, b2, c2) => {
        let d2 = await a5(a10, b2, "sign");
        return ao(a10, d2), new Uint8Array(await i.subtle.sign(a4(a10, d2.algorithm), d2, c2));
      };
      class bj {
        constructor(a10) {
          if (!(a10 instanceof Uint8Array)) throw TypeError("payload must be an instance of Uint8Array");
          this._payload = a10;
        }
        setProtectedHeader(a10) {
          if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this._protectedHeader = a10, this;
        }
        setUnprotectedHeader(a10) {
          if (this._unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
          return this._unprotectedHeader = a10, this;
        }
        async sign(a10, b2) {
          let c2;
          if (!this._protectedHeader && !this._unprotectedHeader) throw new D("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
          if (!aa(this._protectedHeader, this._unprotectedHeader)) throw new D("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
          let d2 = { ...this._protectedHeader, ...this._unprotectedHeader }, e2 = aS(D, /* @__PURE__ */ new Map([["b64", true]]), b2?.crit, this._protectedHeader, d2), f2 = true;
          if (e2.has("b64") && "boolean" != typeof (f2 = this._protectedHeader.b64)) throw new D('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
          let { alg: g2 } = d2;
          if ("string" != typeof g2 || !g2) throw new D('JWS "alg" (Algorithm) Header Parameter missing or invalid');
          aL(g2, a10, "sign");
          let h2 = this._payload;
          f2 && (h2 = k.encode(t(h2)));
          let i2 = m(c2 = this._protectedHeader ? k.encode(t(JSON.stringify(this._protectedHeader))) : k.encode(""), k.encode("."), h2), j2 = { signature: t(await bi(g2, a10, i2)), payload: "" };
          return f2 && (j2.payload = l.decode(h2)), this._unprotectedHeader && (j2.header = this._unprotectedHeader), this._protectedHeader && (j2.protected = l.decode(c2)), j2;
        }
      }
      class bk {
        constructor(a10) {
          this._flattened = new bj(a10);
        }
        setProtectedHeader(a10) {
          return this._flattened.setProtectedHeader(a10), this;
        }
        async sign(a10, b2) {
          let c2 = await this._flattened.sign(a10, b2);
          if (void 0 === c2.payload) throw TypeError("use the flattened module for creating JWS with b64: false");
          return `${c2.protected}.${c2.payload}.${c2.signature}`;
        }
      }
      class bl {
        constructor(a10, b2, c2) {
          this.parent = a10, this.key = b2, this.options = c2;
        }
        setProtectedHeader(a10) {
          if (this.protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this.protectedHeader = a10, this;
        }
        setUnprotectedHeader(a10) {
          if (this.unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
          return this.unprotectedHeader = a10, this;
        }
        addSignature(...a10) {
          return this.parent.addSignature(...a10);
        }
        sign(...a10) {
          return this.parent.sign(...a10);
        }
        done() {
          return this.parent;
        }
      }
      class bm {
        constructor(a10) {
          this._signatures = [], this._payload = a10;
        }
        addSignature(a10, b2) {
          let c2 = new bl(this, a10, b2);
          return this._signatures.push(c2), c2;
        }
        async sign() {
          if (!this._signatures.length) throw new D("at least one signature must be added");
          let a10 = { signatures: [], payload: "" };
          for (let b2 = 0; b2 < this._signatures.length; b2++) {
            let c2 = this._signatures[b2], d2 = new bj(this._payload);
            d2.setProtectedHeader(c2.protectedHeader), d2.setUnprotectedHeader(c2.unprotectedHeader);
            let { payload: e2, ...f2 } = await d2.sign(c2.key, c2.options);
            if (0 === b2) a10.payload = e2;
            else if (a10.payload !== e2) throw new D("inconsistent use of JWS Unencoded Payload (RFC7797)");
            a10.signatures.push(f2);
          }
          return a10;
        }
      }
      function bn(a10, b2) {
        if (!Number.isFinite(b2)) throw TypeError(`Invalid ${a10} input`);
        return b2;
      }
      class bo {
        constructor(a10 = {}) {
          if (!ab(a10)) throw TypeError("JWT Claims Set MUST be an object");
          this._payload = a10;
        }
        setIssuer(a10) {
          return this._payload = { ...this._payload, iss: a10 }, this;
        }
        setSubject(a10) {
          return this._payload = { ...this._payload, sub: a10 }, this;
        }
        setAudience(a10) {
          return this._payload = { ...this._payload, aud: a10 }, this;
        }
        setJti(a10) {
          return this._payload = { ...this._payload, jti: a10 }, this;
        }
        setNotBefore(a10) {
          return "number" == typeof a10 ? this._payload = { ...this._payload, nbf: bn("setNotBefore", a10) } : a10 instanceof Date ? this._payload = { ...this._payload, nbf: bn("setNotBefore", ba(a10)) } : this._payload = { ...this._payload, nbf: ba(/* @__PURE__ */ new Date()) + bc(a10) }, this;
        }
        setExpirationTime(a10) {
          return "number" == typeof a10 ? this._payload = { ...this._payload, exp: bn("setExpirationTime", a10) } : a10 instanceof Date ? this._payload = { ...this._payload, exp: bn("setExpirationTime", ba(a10)) } : this._payload = { ...this._payload, exp: ba(/* @__PURE__ */ new Date()) + bc(a10) }, this;
        }
        setIssuedAt(a10) {
          return void 0 === a10 ? this._payload = { ...this._payload, iat: ba(/* @__PURE__ */ new Date()) } : a10 instanceof Date ? this._payload = { ...this._payload, iat: bn("setIssuedAt", ba(a10)) } : "string" == typeof a10 ? this._payload = { ...this._payload, iat: bn("setIssuedAt", ba(/* @__PURE__ */ new Date()) + bc(a10)) } : this._payload = { ...this._payload, iat: bn("setIssuedAt", a10) }, this;
        }
      }
      class bp extends bo {
        setProtectedHeader(a10) {
          return this._protectedHeader = a10, this;
        }
        async sign(a10, b2) {
          let c2 = new bk(k.encode(JSON.stringify(this._payload)));
          if (c2.setProtectedHeader(this._protectedHeader), Array.isArray(this._protectedHeader?.crit) && this._protectedHeader.crit.includes("b64") && false === this._protectedHeader.b64) throw new E("JWTs MUST NOT use unencoded payload");
          return c2.sign(a10, b2);
        }
      }
      class bq extends bo {
        setProtectedHeader(a10) {
          if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this._protectedHeader = a10, this;
        }
        setKeyManagementParameters(a10) {
          if (this._keyManagementParameters) throw TypeError("setKeyManagementParameters can only be called once");
          return this._keyManagementParameters = a10, this;
        }
        setContentEncryptionKey(a10) {
          if (this._cek) throw TypeError("setContentEncryptionKey can only be called once");
          return this._cek = a10, this;
        }
        setInitializationVector(a10) {
          if (this._iv) throw TypeError("setInitializationVector can only be called once");
          return this._iv = a10, this;
        }
        replicateIssuerAsHeader() {
          return this._replicateIssuerAsHeader = true, this;
        }
        replicateSubjectAsHeader() {
          return this._replicateSubjectAsHeader = true, this;
        }
        replicateAudienceAsHeader() {
          return this._replicateAudienceAsHeader = true, this;
        }
        async encrypt(a10, b2) {
          let c2 = new bh(k.encode(JSON.stringify(this._payload)));
          return this._replicateIssuerAsHeader && (this._protectedHeader = { ...this._protectedHeader, iss: this._payload.iss }), this._replicateSubjectAsHeader && (this._protectedHeader = { ...this._protectedHeader, sub: this._payload.sub }), this._replicateAudienceAsHeader && (this._protectedHeader = { ...this._protectedHeader, aud: this._payload.aud }), c2.setProtectedHeader(this._protectedHeader), this._iv && c2.setInitializationVector(this._iv), this._cek && c2.setContentEncryptionKey(this._cek), this._keyManagementParameters && c2.setKeyManagementParameters(this._keyManagementParameters), c2.encrypt(a10, b2);
        }
      }
      let br = (a10, b2) => {
        if ("string" != typeof a10 || !a10) throw new F(`${b2} missing or invalid`);
      };
      async function bs(a10, b2) {
        let c2;
        if (!ab(a10)) throw TypeError("JWK must be an object");
        if (b2 ?? (b2 = "sha256"), "sha256" !== b2 && "sha384" !== b2 && "sha512" !== b2) throw TypeError('digestAlgorithm must one of "sha256", "sha384", or "sha512"');
        switch (a10.kty) {
          case "EC":
            br(a10.crv, '"crv" (Curve) Parameter'), br(a10.x, '"x" (X Coordinate) Parameter'), br(a10.y, '"y" (Y Coordinate) Parameter'), c2 = { crv: a10.crv, kty: a10.kty, x: a10.x, y: a10.y };
            break;
          case "OKP":
            br(a10.crv, '"crv" (Subtype of Key Pair) Parameter'), br(a10.x, '"x" (Public Key) Parameter'), c2 = { crv: a10.crv, kty: a10.kty, x: a10.x };
            break;
          case "RSA":
            br(a10.e, '"e" (Exponent) Parameter'), br(a10.n, '"n" (Modulus) Parameter'), c2 = { e: a10.e, kty: a10.kty, n: a10.n };
            break;
          case "oct":
            br(a10.k, '"k" (Key Value) Parameter'), c2 = { k: a10.k, kty: a10.kty };
            break;
          default:
            throw new A('"kty" (Key Type) Parameter missing or unsupported');
        }
        let d2 = k.encode(JSON.stringify(c2));
        return t(await j(b2, d2));
      }
      async function bt(a10, b2) {
        b2 ?? (b2 = "sha256");
        let c2 = await bs(a10, b2);
        return `urn:ietf:params:oauth:jwk-thumbprint:sha-${b2.slice(-3)}:${c2}`;
      }
      async function bu(a10, b2) {
        let c2 = { ...a10, ...b2?.header };
        if (!ab(c2.jwk)) throw new D('"jwk" (JSON Web Key) Header Parameter must be a JSON object');
        let d2 = await aJ({ ...c2.jwk, ext: true }, c2.alg);
        if (d2 instanceof Uint8Array || "public" !== d2.type) throw new D('"jwk" (JSON Web Key) Header Parameter must be a public key');
        return d2;
      }
      function bv(a10) {
        return ab(a10);
      }
      function bw(a10) {
        return "function" == typeof structuredClone ? structuredClone(a10) : JSON.parse(JSON.stringify(a10));
      }
      class bx {
        constructor(a10) {
          if (this._cached = /* @__PURE__ */ new WeakMap(), !function(a11) {
            return a11 && "object" == typeof a11 && Array.isArray(a11.keys) && a11.keys.every(bv);
          }(a10)) throw new G("JSON Web Key Set malformed");
          this._jwks = bw(a10);
        }
        async getKey(a10, b2) {
          let { alg: c2, kid: d2 } = { ...a10, ...b2?.header }, e2 = function(a11) {
            switch ("string" == typeof a11 && a11.slice(0, 2)) {
              case "RS":
              case "PS":
                return "RSA";
              case "ES":
                return "EC";
              case "Ed":
                return "OKP";
              default:
                throw new A('Unsupported "alg" value for a JSON Web Key Set');
            }
          }(c2), f2 = this._jwks.keys.filter((a11) => {
            let b3 = e2 === a11.kty;
            if (b3 && "string" == typeof d2 && (b3 = d2 === a11.kid), b3 && "string" == typeof a11.alg && (b3 = c2 === a11.alg), b3 && "string" == typeof a11.use && (b3 = "sig" === a11.use), b3 && Array.isArray(a11.key_ops) && (b3 = a11.key_ops.includes("verify")), b3 && "EdDSA" === c2 && (b3 = "Ed25519" === a11.crv || "Ed448" === a11.crv), b3) switch (c2) {
              case "ES256":
                b3 = "P-256" === a11.crv;
                break;
              case "ES256K":
                b3 = "secp256k1" === a11.crv;
                break;
              case "ES384":
                b3 = "P-384" === a11.crv;
                break;
              case "ES512":
                b3 = "P-521" === a11.crv;
            }
            return b3;
          }), { 0: g2, length: h2 } = f2;
          if (0 === h2) throw new H();
          if (1 !== h2) {
            let a11 = new I(), { _cached: b3 } = this;
            throw a11[Symbol.asyncIterator] = async function* () {
              for (let a12 of f2) try {
                yield await by(b3, a12, c2);
              } catch {
              }
            }, a11;
          }
          return by(this._cached, g2, c2);
        }
      }
      async function by(a10, b2, c2) {
        let d2 = a10.get(b2) || a10.set(b2, {}).get(b2);
        if (void 0 === d2[c2]) {
          let a11 = await aJ({ ...b2, ext: true }, c2);
          if (a11 instanceof Uint8Array || "public" !== a11.type) throw new G("JSON Web Key Set members must be public keys");
          d2[c2] = a11;
        }
        return d2[c2];
      }
      function bz(a10) {
        let b2 = new bx(a10), c2 = async (a11, c3) => b2.getKey(a11, c3);
        return Object.defineProperties(c2, { jwks: { value: () => bw(b2._jwks), enumerable: true, configurable: false, writable: false } }), c2;
      }
      let bA = async (a10, b2, c2) => {
        let d2, e2, f2 = false;
        "function" == typeof AbortController && (d2 = new AbortController(), e2 = setTimeout(() => {
          f2 = true, d2.abort();
        }, b2));
        let g2 = await fetch(a10.href, { signal: d2 ? d2.signal : void 0, redirect: "manual", headers: c2.headers }).catch((a11) => {
          if (f2) throw new J();
          throw a11;
        });
        if (void 0 !== e2 && clearTimeout(e2), 200 !== g2.status) throw new w("Expected 200 OK from the JSON Web Key Set HTTP response");
        try {
          return await g2.json();
        } catch {
          throw new w("Failed to parse the JSON Web Key Set HTTP response as JSON");
        }
      };
      "undefined" != typeof navigator && navigator.userAgent?.startsWith?.("Mozilla/5.0 ") || (f = "jose/v5.6.3");
      let bB = Symbol();
      class bC {
        constructor(a10, b2) {
          if (!(a10 instanceof URL)) throw TypeError("url must be an instance of URL");
          this._url = new URL(a10.href), this._options = { agent: b2?.agent, headers: b2?.headers }, this._timeoutDuration = "number" == typeof b2?.timeoutDuration ? b2?.timeoutDuration : 5e3, this._cooldownDuration = "number" == typeof b2?.cooldownDuration ? b2?.cooldownDuration : 3e4, this._cacheMaxAge = "number" == typeof b2?.cacheMaxAge ? b2?.cacheMaxAge : 6e5, b2?.[bB] !== void 0 && (this._cache = b2?.[bB], function(a11, b3) {
            return !("object" != typeof a11 || null === a11 || !("uat" in a11) || "number" != typeof a11.uat || Date.now() - a11.uat >= b3) && "jwks" in a11 && !!ab(a11.jwks) && !!Array.isArray(a11.jwks.keys) && !!Array.prototype.every.call(a11.jwks.keys, ab);
          }(b2?.[bB], this._cacheMaxAge) && (this._jwksTimestamp = this._cache.uat, this._local = bz(this._cache.jwks)));
        }
        coolingDown() {
          return "number" == typeof this._jwksTimestamp && Date.now() < this._jwksTimestamp + this._cooldownDuration;
        }
        fresh() {
          return "number" == typeof this._jwksTimestamp && Date.now() < this._jwksTimestamp + this._cacheMaxAge;
        }
        async getKey(a10, b2) {
          this._local && this.fresh() || await this.reload();
          try {
            return await this._local(a10, b2);
          } catch (c2) {
            if (c2 instanceof H && false === this.coolingDown()) return await this.reload(), this._local(a10, b2);
            throw c2;
          }
        }
        async reload() {
          this._pendingFetch && ("undefined" != typeof WebSocketPair || "undefined" != typeof navigator && "Cloudflare-Workers" === navigator.userAgent) && (this._pendingFetch = void 0);
          let a10 = new Headers(this._options.headers);
          f && !a10.has("User-Agent") && (a10.set("User-Agent", f), this._options.headers = Object.fromEntries(a10.entries())), this._pendingFetch || (this._pendingFetch = bA(this._url, this._timeoutDuration, this._options).then((a11) => {
            this._local = bz(a11), this._cache && (this._cache.uat = Date.now(), this._cache.jwks = a11), this._jwksTimestamp = Date.now(), this._pendingFetch = void 0;
          }).catch((a11) => {
            throw this._pendingFetch = void 0, a11;
          })), await this._pendingFetch;
        }
      }
      function bD(a10, b2) {
        let c2 = new bC(a10, b2), d2 = async (a11, b3) => c2.getKey(a11, b3);
        return Object.defineProperties(d2, { coolingDown: { get: () => c2.coolingDown(), enumerable: true, configurable: false }, fresh: { get: () => c2.fresh(), enumerable: true, configurable: false }, reload: { value: () => c2.reload(), enumerable: true, configurable: false, writable: false }, reloading: { get: () => !!c2._pendingFetch, enumerable: true, configurable: false }, jwks: { value: () => c2._local?.jwks(), enumerable: true, configurable: false, writable: false } }), d2;
      }
      class bE extends bo {
        encode() {
          let a10 = t(JSON.stringify({ alg: "none" })), b2 = t(JSON.stringify(this._payload));
          return `${a10}.${b2}.`;
        }
        static decode(a10, b2) {
          let c2;
          if ("string" != typeof a10) throw new E("Unsecured JWT must be a string");
          let { 0: d2, 1: e2, 2: f2, length: g2 } = a10.split(".");
          if (3 !== g2 || "" !== f2) throw new E("Invalid Unsecured JWT");
          try {
            if (c2 = JSON.parse(l.decode(v(d2))), "none" !== c2.alg) throw Error();
          } catch {
            throw new E("Invalid Unsecured JWT");
          }
          return { payload: be(c2, v(e2), b2), header: c2 };
        }
      }
      let bF = t, bG = v;
      function bH(a10) {
        let b2;
        if ("string" == typeof a10) {
          let c2 = a10.split(".");
          (3 === c2.length || 5 === c2.length) && ([b2] = c2);
        } else if ("object" == typeof a10 && a10) if ("protected" in a10) b2 = a10.protected;
        else throw TypeError("Token does not contain a Protected Header");
        try {
          if ("string" != typeof b2 || !b2) throw Error();
          let a11 = JSON.parse(l.decode(bG(b2)));
          if (!ab(a11)) throw Error();
          return a11;
        } catch {
          throw TypeError("Invalid Token or Protected Header formatting");
        }
      }
      function bI(a10) {
        let b2, c2;
        if ("string" != typeof a10) throw new E("JWTs must use Compact JWS serialization, JWT must be a string");
        let { 1: d2, length: e2 } = a10.split(".");
        if (5 === e2) throw new E("Only JWTs using Compact JWS serialization can be decoded");
        if (3 !== e2) throw new E("Invalid JWT");
        if (!d2) throw new E("JWTs must contain a payload");
        try {
          b2 = bG(d2);
        } catch {
          throw new E("Failed to base64url decode the payload");
        }
        try {
          c2 = JSON.parse(l.decode(b2));
        } catch {
          throw new E("Failed to parse the decoded payload as JSON");
        }
        if (!ab(c2)) throw new E("Invalid JWT Claims Set");
        return c2;
      }
      async function bJ(a10, b2) {
        let c2, d2, e2;
        switch (a10) {
          case "HS256":
          case "HS384":
          case "HS512":
            c2 = parseInt(a10.slice(-3), 10), d2 = { name: "HMAC", hash: `SHA-${c2}`, length: c2 }, e2 = ["sign", "verify"];
            break;
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return L(new Uint8Array((c2 = parseInt(a10.slice(-3), 10)) >> 3));
          case "A128KW":
          case "A192KW":
          case "A256KW":
            d2 = { name: "AES-KW", length: c2 = parseInt(a10.slice(1, 4), 10) }, e2 = ["wrapKey", "unwrapKey"];
            break;
          case "A128GCMKW":
          case "A192GCMKW":
          case "A256GCMKW":
          case "A128GCM":
          case "A192GCM":
          case "A256GCM":
            d2 = { name: "AES-GCM", length: c2 = parseInt(a10.slice(1, 4), 10) }, e2 = ["encrypt", "decrypt"];
            break;
          default:
            throw new A('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
        }
        return i.subtle.generateKey(d2, b2?.extractable ?? false, e2);
      }
      function bK(a10) {
        let b2 = a10?.modulusLength ?? 2048;
        if ("number" != typeof b2 || b2 < 2048) throw new A("Invalid or unsupported modulusLength option provided, 2048 bits or larger keys must be used");
        return b2;
      }
      async function bL(a10, b2) {
        let c2, d2;
        switch (a10) {
          case "PS256":
          case "PS384":
          case "PS512":
            c2 = { name: "RSA-PSS", hash: `SHA-${a10.slice(-3)}`, publicExponent: new Uint8Array([1, 0, 1]), modulusLength: bK(b2) }, d2 = ["sign", "verify"];
            break;
          case "RS256":
          case "RS384":
          case "RS512":
            c2 = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${a10.slice(-3)}`, publicExponent: new Uint8Array([1, 0, 1]), modulusLength: bK(b2) }, d2 = ["sign", "verify"];
            break;
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            c2 = { name: "RSA-OAEP", hash: `SHA-${parseInt(a10.slice(-3), 10) || 1}`, publicExponent: new Uint8Array([1, 0, 1]), modulusLength: bK(b2) }, d2 = ["decrypt", "unwrapKey", "encrypt", "wrapKey"];
            break;
          case "ES256":
            c2 = { name: "ECDSA", namedCurve: "P-256" }, d2 = ["sign", "verify"];
            break;
          case "ES384":
            c2 = { name: "ECDSA", namedCurve: "P-384" }, d2 = ["sign", "verify"];
            break;
          case "ES512":
            c2 = { name: "ECDSA", namedCurve: "P-521" }, d2 = ["sign", "verify"];
            break;
          case "EdDSA": {
            d2 = ["sign", "verify"];
            let a11 = b2?.crv ?? "Ed25519";
            switch (a11) {
              case "Ed25519":
              case "Ed448":
                c2 = { name: a11 };
                break;
              default:
                throw new A("Invalid or unsupported crv option provided");
            }
            break;
          }
          case "ECDH-ES":
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            d2 = ["deriveKey", "deriveBits"];
            let a11 = b2?.crv ?? "P-256";
            switch (a11) {
              case "P-256":
              case "P-384":
              case "P-521":
                c2 = { name: "ECDH", namedCurve: a11 };
                break;
              case "X25519":
              case "X448":
                c2 = { name: a11 };
                break;
              default:
                throw new A("Invalid or unsupported crv option provided, supported values are P-256, P-384, P-521, X25519, and X448");
            }
            break;
          }
          default:
            throw new A('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
        }
        return i.subtle.generateKey(c2, b2?.extractable ?? false, d2);
      }
      async function bM(a10, b2) {
        return bL(a10, b2);
      }
      async function bN(a10, b2) {
        return bJ(a10, b2);
      }
      let bO = "WebCryptoAPI";
    }, 9239: (a) => {
      "use strict";
      a.exports = Math.pow;
    }, 9245: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.HttpClientError = b.HttpClientResponse = b.HttpClient = void 0;
      class c {
        constructor(a2, b2) {
          this.baseURL = a2, this.options = b2, this.MAX_RETRY_ATTEMPTS = 3, this.BACKOFF_MULTIPLIER = 1.5, this.MINIMUM_SLEEP_TIME_IN_MILLISECONDS = 500, this.RETRY_STATUS_CODES = [500, 502, 504], this.sleep = (a3) => new Promise((b3) => setTimeout(b3, this.getSleepTimeInMilliseconds(a3)));
        }
        getClientName() {
          throw Error("getClientName not implemented");
        }
        addClientToUserAgent(a2) {
          return a2.indexOf(" ") > -1 ? a2.replace(/\b\s/, `/${this.getClientName()} `) : a2 += `/${this.getClientName()}`;
        }
        static getResourceURL(a2, b2, d2) {
          return new URL([b2, c.getQueryString(d2)].filter(Boolean).join("?"), a2).toString();
        }
        static getQueryString(a2) {
          if (!a2) return;
          let b2 = {};
          return Object.entries(a2).forEach(([a3, c2]) => {
            "" !== c2 && void 0 !== c2 && (b2[a3] = c2);
          }), new URLSearchParams(b2).toString();
        }
        static getContentTypeHeader(a2) {
          if (a2 instanceof URLSearchParams) return { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" };
        }
        static getBody(a2) {
          return null === a2 || a2 instanceof URLSearchParams ? a2 : JSON.stringify(a2);
        }
        getSleepTimeInMilliseconds(a2) {
          return this.MINIMUM_SLEEP_TIME_IN_MILLISECONDS * Math.pow(this.BACKOFF_MULTIPLIER, a2) * (Math.random() + 0.5);
        }
      }
      b.HttpClient = c;
      class d {
        constructor(a2, b2) {
          this._statusCode = a2, this._headers = b2;
        }
        getStatusCode() {
          return this._statusCode;
        }
        getHeaders() {
          return this._headers;
        }
      }
      b.HttpClientResponse = d;
      class e extends Error {
        constructor({ message: a2, response: b2 }) {
          super(a2), this.name = "HttpClientError", this.message = "The request could not be completed.", this.message = a2, this.response = b2;
        }
      }
      b.HttpClientError = e;
    }, 9305: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(241), b), e(c(6661), b), e(c(1561), b);
    }, 9381: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeAuthenticateWithCodeAndVerifierOptions = void 0, b.serializeAuthenticateWithCodeAndVerifierOptions = (a2) => ({ grant_type: "authorization_code", client_id: a2.clientId, code: a2.code, code_verifier: a2.codeVerifier, invitation_token: a2.invitationToken, ip_address: a2.ipAddress, user_agent: a2.userAgent });
    }, 9488: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(6904), b);
    }, 9489: (a, b, c) => {
      "use strict";
      var d = c(5042), e = c(8728), f = c(6317), g = c(2891);
      a.exports = function(a2) {
        if (a2.length < 1 || "function" != typeof a2[0]) throw new e("a function is required");
        return g(d, f, a2);
      };
    }, 9518: (a) => {
      "use strict";
      var b = String.prototype.replace, c = /%20/g, d = { RFC1738: "RFC1738", RFC3986: "RFC3986" };
      a.exports = { default: d.RFC3986, formatters: { RFC1738: function(a2) {
        return b.call(a2, c, "+");
      }, RFC3986: function(a2) {
        return String(a2);
      } }, RFC1738: d.RFC1738, RFC3986: d.RFC3986 };
    }, 9539: (a, b) => {
      "use strict";
      var c;
      Object.defineProperty(b, "__esModule", { value: true }), b.DomainDataState = void 0, function(a2) {
        a2.Verified = "verified", a2.Pending = "pending";
      }(c || (b.DomainDataState = c = {}));
    }, 9545: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeDecisionTreeNode = b.serializeCheckBatchOptions = b.serializeCheckOptions = void 0;
      let d = c(9180);
      b.serializeCheckOptions = (a2) => ({ op: a2.op, checks: a2.checks.map(e), debug: a2.debug }), b.serializeCheckBatchOptions = (a2) => ({ op: "batch", checks: a2.checks.map(e), debug: a2.debug });
      let e = (a2) => {
        var b2;
        return { resource_type: (0, d.isResourceInterface)(a2.resource) ? a2.resource.getResourceType() : a2.resource.resourceType, resource_id: (0, d.isResourceInterface)(a2.resource) ? a2.resource.getResourceId() : a2.resource.resourceId ? a2.resource.resourceId : "", relation: a2.relation, subject: (0, d.isSubject)(a2.subject) ? { resource_type: a2.subject.resourceType, resource_id: a2.subject.resourceId } : { resource_type: a2.subject.getResourceType(), resource_id: a2.subject.getResourceId() }, context: null != (b2 = a2.context) ? b2 : {} };
      };
      b.deserializeDecisionTreeNode = (a2) => ({ check: { resource: { resourceType: a2.check.resource_type, resourceId: a2.check.resource_id }, relation: a2.check.relation, subject: { resourceType: a2.check.subject.resource_type, resourceId: a2.check.subject.resource_id }, context: a2.check.context }, policy: a2.policy, decision: a2.decision, processingTime: a2.processing_time, children: a2.children.map(b.deserializeDecisionTreeNode) });
    }, 9582: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.ParseError = void 0;
      class c extends Error {
        constructor({ message: a2, rawBody: b2, rawStatus: c2, requestID: d }) {
          super(a2), this.name = "ParseError", this.status = 500, this.rawBody = b2, this.rawStatus = c2, this.requestID = d;
        }
      }
      b.ParseError = c;
    }, 9599: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9641: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9661: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9664: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9687: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9694: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeCreateUserOptions = void 0, b.serializeCreateUserOptions = (a2) => ({ email: a2.email, password: a2.password, password_hash: a2.passwordHash, password_hash_type: a2.passwordHashType, first_name: a2.firstName, last_name: a2.lastName, email_verified: a2.emailVerified, external_id: a2.externalId, metadata: a2.metadata });
    }, 9713: (a, b, c) => {
      "use strict";
      var d = c(4228), e = c(9489), f = e([d("%String.prototype.indexOf%")]);
      a.exports = function(a2, b2) {
        var c2 = d(a2, !!b2);
        return "function" == typeof c2 && f(a2, ".prototype.") > -1 ? e([c2]) : c2;
      };
    }, 9735: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9760: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 9795: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeBatchWriteResourcesOptions = void 0;
      let d = c(9875), e = c(1586), f = c(4951);
      b.serializeBatchWriteResourcesOptions = (a2) => {
        let b2 = [];
        return a2.op === d.ResourceOp.Create ? b2 = a2.resources.map((a3) => (0, e.serializeCreateResourceOptions)(a3)) : a2.op === d.ResourceOp.Delete && (b2 = a2.resources.map((a3) => (0, f.serializeDeleteResourceOptions)(a3))), { op: a2.op, resources: b2 };
      };
    }, 9852: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.IronSessionProvider = void 0;
      class c {
      }
      b.IronSessionProvider = c;
    }, 9869: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeRole = void 0, b.deserializeRole = (a2) => ({ object: a2.object, id: a2.id, name: a2.name, slug: a2.slug, description: a2.description, permissions: a2.permissions, type: a2.type, createdAt: a2.created_at, updatedAt: a2.updated_at });
    }, 9875: function(a, b, c) {
      "use strict";
      var d = this && this.__createBinding || (Object.create ? function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2);
        var e2 = Object.getOwnPropertyDescriptor(b2, c2);
        (!e2 || ("get" in e2 ? !b2.__esModule : e2.writable || e2.configurable)) && (e2 = { enumerable: true, get: function() {
          return b2[c2];
        } }), Object.defineProperty(a2, d2, e2);
      } : function(a2, b2, c2, d2) {
        void 0 === d2 && (d2 = c2), a2[d2] = b2[c2];
      }), e = this && this.__exportStar || function(a2, b2) {
        for (var c2 in a2) "default" === c2 || Object.prototype.hasOwnProperty.call(b2, c2) || d(b2, a2, c2);
      };
      Object.defineProperty(b, "__esModule", { value: true }), e(c(6734), b), e(c(8596), b), e(c(7920), b), e(c(198), b), e(c(4972), b), e(c(7429), b), e(c(7275), b), e(c(4567), b);
    }, 9876: function(a, b, c) {
      "use strict";
      var d = this && this.__awaiter || function(a2, b2, c2, d2) {
        return new (c2 || (c2 = Promise))(function(e2, f2) {
          function g2(a3) {
            try {
              i(d2.next(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function h(a3) {
            try {
              i(d2.throw(a3));
            } catch (a4) {
              f2(a4);
            }
          }
          function i(a3) {
            var b3;
            a3.done ? e2(a3.value) : ((b3 = a3.value) instanceof c2 ? b3 : new c2(function(a4) {
              a4(b3);
            })).then(g2, h);
          }
          i((d2 = d2.apply(a2, b2 || [])).next());
        });
      };
      Object.defineProperty(b, "__esModule", { value: true }), b.EdgeIronSessionProvider = void 0;
      let e = c(1096), f = c(9852);
      class g extends f.IronSessionProvider {
        sealData(a2, b2) {
          return d(this, void 0, void 0, function* () {
            let c2 = Object.assign(Object.assign({}, b2), { ttl: 0 });
            return (0, e.sealData)(a2, c2);
          });
        }
        unsealData(a2, b2) {
          return d(this, void 0, void 0, function* () {
            return (0, e.unsealData)(a2, b2);
          });
        }
      }
      b.EdgeIronSessionProvider = g;
    }, 9891: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.serializeListUsersOptions = void 0, b.serializeListUsersOptions = (a2) => ({ email: a2.email, organization_id: a2.organizationId, limit: a2.limit, before: a2.before, after: a2.after, order: a2.order });
    }, 9941: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeOrganization = void 0;
      let d = c(2817);
      b.deserializeOrganization = (a2) => {
        var b2, c2;
        return Object.assign(Object.assign({ object: a2.object, id: a2.id, name: a2.name, allowProfilesOutsideOrganization: a2.allow_profiles_outside_organization, domains: a2.domains.map(d.deserializeOrganizationDomain) }, void 0 === a2.stripe_customer_id ? void 0 : { stripeCustomerId: a2.stripe_customer_id }), { createdAt: a2.created_at, updatedAt: a2.updated_at, externalId: null != (b2 = a2.external_id) ? b2 : null, metadata: null != (c2 = a2.metadata) ? c2 : {} });
      };
    }, 9983: (a, b, c) => {
      "use strict";
      var d = c(5597), e = c(3167), f = c(8121);
      a.exports = d ? function(a2) {
        return d(a2);
      } : e ? function(a2) {
        if (!a2 || "object" != typeof a2 && "function" != typeof a2) throw TypeError("getProto: not an object");
        return e(a2);
      } : f ? function(a2) {
        return f(a2);
      } : null;
    }, 9997: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.deserializeVerifyResponse = void 0;
      let d = c(8831);
      b.deserializeVerifyResponse = (a2) => ({ challenge: (0, d.deserializeChallenge)(a2.challenge), valid: a2.valid });
    } }, (a) => {
      var b = a(a.s = 2464);
      (_ENTRIES = "undefined" == typeof _ENTRIES ? {} : _ENTRIES)["middleware_src/middleware"] = b;
    }]);
  }
});

// node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js
var edgeFunctionHandler_exports = {};
__export(edgeFunctionHandler_exports, {
  default: () => edgeFunctionHandler
});
async function edgeFunctionHandler(request) {
  const path3 = new URL(request.url).pathname;
  const routes = globalThis._ROUTES;
  const correspondingRoute = routes.find((route) => route.regex.some((r) => new RegExp(r).test(path3)));
  if (!correspondingRoute) {
    throw new Error(`No route found for ${request.url}`);
  }
  const entry = await self._ENTRIES[`middleware_${correspondingRoute.name}`];
  const result = await entry.default({
    page: correspondingRoute.page,
    request: {
      ...request,
      page: {
        name: correspondingRoute.name
      }
    }
  });
  globalThis.__openNextAls.getStore()?.pendingPromiseRunner.add(result.waitUntil);
  const response = result.response;
  return response;
}
var init_edgeFunctionHandler = __esm({
  "node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js"() {
    globalThis._ENTRIES = {};
    globalThis.self = globalThis;
    globalThis._ROUTES = [{ "name": "src/middleware", "page": "/", "regex": ["^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*))(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/(api|trpc))(.*)(\\.json)?[\\/#\\?]?$"] }];
    require_edge_runtime_webpack();
    require_middleware();
  }
});

// node_modules/@opennextjs/aws/dist/utils/promise.js
init_logger();
var DetachedPromise = class {
  resolve;
  reject;
  promise;
  constructor() {
    let resolve;
    let reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolve = resolve;
    this.reject = reject;
  }
};
var DetachedPromiseRunner = class {
  promises = [];
  withResolvers() {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    return detachedPromise;
  }
  add(promise) {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    promise.then(detachedPromise.resolve, detachedPromise.reject);
  }
  async await() {
    debug(`Awaiting ${this.promises.length} detached promises`);
    const results = await Promise.allSettled(this.promises.map((p) => p.promise));
    const rejectedPromises = results.filter((r) => r.status === "rejected");
    rejectedPromises.forEach((r) => {
      error(r.reason);
    });
  }
};
async function awaitAllDetachedPromise() {
  const store = globalThis.__openNextAls.getStore();
  const promisesToAwait = store?.pendingPromiseRunner.await() ?? Promise.resolve();
  if (store?.waitUntil) {
    store.waitUntil(promisesToAwait);
    return;
  }
  await promisesToAwait;
}
function provideNextAfterProvider() {
  const NEXT_REQUEST_CONTEXT_SYMBOL = Symbol.for("@next/request-context");
  const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
  const store = globalThis.__openNextAls.getStore();
  const waitUntil = store?.waitUntil ?? ((promise) => store?.pendingPromiseRunner.add(promise));
  const nextAfterContext = {
    get: () => ({
      waitUntil
    })
  };
  globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
    globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  }
}
function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil, requestId = Math.random().toString(36) }, fn) {
  return globalThis.__openNextAls.run({
    requestId,
    pendingPromiseRunner: new DetachedPromiseRunner(),
    isISRRevalidation,
    waitUntil,
    writtenTags: /* @__PURE__ */ new Set()
  }, async () => {
    provideNextAfterProvider();
    let result;
    try {
      result = await fn();
    } finally {
      await awaitAllDetachedPromise();
    }
    return result;
  });
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/resolve.js
async function resolveConverter(converter2) {
  if (typeof converter2 === "function") {
    return converter2();
  }
  const m_1 = await Promise.resolve().then(() => (init_edge(), edge_exports));
  return m_1.default;
}
async function resolveWrapper(wrapper) {
  if (typeof wrapper === "function") {
    return wrapper();
  }
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_edge(), cloudflare_edge_exports));
  return m_1.default;
}
async function resolveOriginResolver(originResolver) {
  if (typeof originResolver === "function") {
    return originResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_pattern_env(), pattern_env_exports));
  return m_1.default;
}
async function resolveAssetResolver(assetResolver) {
  if (typeof assetResolver === "function") {
    return assetResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy(), dummy_exports));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
async function createGenericHandler(handler3) {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  globalThis.openNextConfig = config;
  const handlerConfig = config[handler3.type];
  const override = handlerConfig && "override" in handlerConfig ? handlerConfig.override : void 0;
  const converter2 = await resolveConverter(override?.converter);
  const { name, wrapper } = await resolveWrapper(override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(handler3.handler, converter2);
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto2 from "node:crypto";
import { parse as parseQs, stringify as stringifyQs } from "node:querystring";
import { Readable as Readable2 } from "node:stream";

// node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": {}, "eslint": { "ignoreDuringBuilds": true }, "typescript": { "ignoreBuildErrors": true, "tsconfigPath": "tsconfig.json" }, "typedRoutes": false, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.js", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "poweredByHeader": true, "compress": true, "images": { "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840], "imageSizes": [16, 32, 48, 64, 96, 128, 256, 384], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 60, "formats": ["image/webp"], "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "remotePatterns": [], "unoptimized": true }, "devIndicators": { "position": "bottom-left" }, "onDemandEntries": { "maxInactiveAge": 6e4, "pagesBufferLength": 5 }, "amp": { "canonicalBase": "" }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "serverRuntimeConfig": {}, "publicRuntimeConfig": {}, "reactProductionProfiling": false, "reactStrictMode": null, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": {}, "compiler": {}, "expireTime": 31536e3, "staticPageGenerationTimeout": 60, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "/Users/steven/swole-tracker", "experimental": { "useSkewCookie": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 30, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 4294967294 } }, "cacheHandlers": {}, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "serverSourceMaps": false, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "clientSegmentCache": false, "clientParamParsing": false, "dynamicOnHover": false, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "middlewarePrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 7, "memoryBasedWorkersCount": false, "imgOptConcurrency": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "imgOptSkipMetadata": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "largePageDataBytes": 128e3, "typedEnv": false, "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": false, "optimizeServerReact": true, "viewTransition": false, "routerBFCache": false, "removeUncaughtErrorAndRejectionListeners": false, "validateRSCRequestHeaders": false, "staleTimes": { "dynamic": 0, "static": 300 }, "serverComponentsHmrCache": true, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "cacheComponents": false, "inlineCss": false, "useCache": false, "globalNotFound": false, "devtoolSegmentExplorer": true, "browserDebugInfoInTerminal": false, "optimizeRouterScrolling": false, "optimizePackageImports": ["lucide-react", "framer-motion", "date-fns", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "rxjs", "@mui/material", "@mui/icons-material", "recharts", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-sqlite-node", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-wasm", "@effect/sql-sqlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight", "bundlePagesRouterDependencies": false, "configFileName": "next.config.js", "skipTrailingSlashRedirect": true, "turbopack": { "root": "/Users/steven/swole-tracker" }, "_originalRewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/ingest/static/:path*", "destination": "https://us-assets.i.posthog.com/static/:path*" }, { "source": "/ingest/:path*", "destination": "https://us.i.posthog.com/:path*" }, { "source": "/ingest/flags", "destination": "https://us.i.posthog.com/flags" }], "fallback": [] } };
var BuildId = "P51HMkr0eUCmmrWtINPsW";
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/ingest/static/:path*", "destination": "https://us-assets.i.posthog.com/static/:path*", "regex": "^/ingest/static(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/ingest/:path*", "destination": "https://us.i.posthog.com/:path*", "regex": "^/ingest(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/ingest/flags", "destination": "https://us.i.posthog.com/flags", "regex": "^/ingest/flags(?:/)?$" }], "fallback": [] }, "redirects": [], "routes": { "static": [{ "page": "/", "regex": "^/(?:/)?$", "routeKeys": {}, "namedRegex": "^/(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/auth/auth-code-error", "regex": "^/auth/auth\\-code\\-error(?:/)?$", "routeKeys": {}, "namedRegex": "^/auth/auth\\-code\\-error(?:/)?$" }, { "page": "/auth/login", "regex": "^/auth/login(?:/)?$", "routeKeys": {}, "namedRegex": "^/auth/login(?:/)?$" }, { "page": "/auth/register", "regex": "^/auth/register(?:/)?$", "routeKeys": {}, "namedRegex": "^/auth/register(?:/)?$" }, { "page": "/connect-whoop", "regex": "^/connect\\-whoop(?:/)?$", "routeKeys": {}, "namedRegex": "^/connect\\-whoop(?:/)?$" }, { "page": "/exercises", "regex": "^/exercises(?:/)?$", "routeKeys": {}, "namedRegex": "^/exercises(?:/)?$" }, { "page": "/privacy", "regex": "^/privacy(?:/)?$", "routeKeys": {}, "namedRegex": "^/privacy(?:/)?$" }, { "page": "/progress", "regex": "^/progress(?:/)?$", "routeKeys": {}, "namedRegex": "^/progress(?:/)?$" }, { "page": "/templates", "regex": "^/templates(?:/)?$", "routeKeys": {}, "namedRegex": "^/templates(?:/)?$" }, { "page": "/templates/new", "regex": "^/templates/new(?:/)?$", "routeKeys": {}, "namedRegex": "^/templates/new(?:/)?$" }, { "page": "/terms", "regex": "^/terms(?:/)?$", "routeKeys": {}, "namedRegex": "^/terms(?:/)?$" }, { "page": "/workout/start", "regex": "^/workout/start(?:/)?$", "routeKeys": {}, "namedRegex": "^/workout/start(?:/)?$" }, { "page": "/workouts", "regex": "^/workouts(?:/)?$", "routeKeys": {}, "namedRegex": "^/workouts(?:/)?$" }], "dynamic": [{ "page": "/api/trpc/[trpc]", "regex": "^/api/trpc/([^/]+?)(?:/)?$", "routeKeys": { "nxtPtrpc": "nxtPtrpc" }, "namedRegex": "^/api/trpc/(?<nxtPtrpc>[^/]+?)(?:/)?$" }, { "page": "/templates/[id]/edit", "regex": "^/templates/([^/]+?)/edit(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/templates/(?<nxtPid>[^/]+?)/edit(?:/)?$" }, { "page": "/workout/session/local/[localId]", "regex": "^/workout/session/local/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocalId": "nxtPlocalId" }, "namedRegex": "^/workout/session/local/(?<nxtPlocalId>[^/]+?)(?:/)?$" }, { "page": "/workout/session/[id]", "regex": "^/workout/session/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/workout/session/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/workouts/[id]", "regex": "^/workouts/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/workouts/(?<nxtPid>[^/]+?)(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var ConfigHeaders = [{ "source": "/(.*)", "headers": [{ "key": "X-Frame-Options", "value": "DENY" }, { "key": "X-Content-Type-Options", "value": "nosniff" }, { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }, { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }, { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://api.prod.whoop.com https://us.i.posthog.com https://us-assets.i.posthog.com; font-src 'self' data:; object-src 'none'; media-src 'self'; frame-src 'none'; worker-src 'self' blob:; child-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; manifest-src 'self'" }], "regex": "^(?:/(.*))(?:/)?$" }, { "source": "/api/(.*)", "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }], "regex": "^/api(?:/(.*))(?:/)?$" }];
var PrerenderManifest = { "version": 4, "routes": { "/auth/auth-code-error": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/auth/auth-code-error", "dataRoute": "/auth/auth-code-error.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/_not-found": { "initialStatus": 404, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_not-found", "dataRoute": "/_not-found.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/privacy": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/privacy", "dataRoute": "/privacy.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/terms": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/terms", "dataRoute": "/terms.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/", "dataRoute": "/index.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/auth/login": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/auth/login", "dataRoute": "/auth/login.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/auth/register": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/auth/register", "dataRoute": "/auth/register.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "dynamicRoutes": {}, "notFoundRoutes": [], "preview": { "previewModeId": "ab8f2c4c1e576e11f223a72f02aff8bc", "previewModeSigningKey": "b8588d18a58260509f111801e53c4f65cc137229321a587005fad69f5808d58c", "previewModeEncryptionKey": "c0a290204626fa0623524899e6ae229c01158b5343980b7fe247e83f8cc0be01" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge-runtime-webpack.js", "server/src/middleware.js"], "name": "src/middleware", "page": "/", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*))(\\.json)?[\\/#\\?]?$", "originalSource": "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/(api|trpc))(.*)(\\.json)?[\\/#\\?]?$", "originalSource": "/(api|trpc)(.*)" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "P51HMkr0eUCmmrWtINPsW", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "7er3JfyHN8JwsG7cHnqKlQpTby1pjibJPKmXY/W/6Ts=", "__NEXT_PREVIEW_MODE_ID": "ab8f2c4c1e576e11f223a72f02aff8bc", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "b8588d18a58260509f111801e53c4f65cc137229321a587005fad69f5808d58c", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "c0a290204626fa0623524899e6ae229c01158b5343980b7fe247e83f8cc0be01" } } }, "functions": {}, "sortedMiddleware": ["/"] };
var AppPathRoutesManifest = { "/_not-found/page": "/_not-found", "/api/test-env/route": "/api/test-env", "/api/auth/logout/route": "/api/auth/logout", "/api/auth/session/route": "/api/auth/session", "/api/auth/callback/route": "/api/auth/callback", "/api/auth/login/route": "/api/auth/login", "/api/joke/route": "/api/joke", "/api/auth/whoop/authorize/route": "/api/auth/whoop/authorize", "/api/trpc/[trpc]/route": "/api/trpc/[trpc]", "/api/auth/whoop/callback/route": "/api/auth/whoop/callback", "/api/webhooks/whoop/profile/route": "/api/webhooks/whoop/profile", "/api/webhooks/whoop/cycle/route": "/api/webhooks/whoop/cycle", "/api/webhooks/whoop/body-measurement/route": "/api/webhooks/whoop/body-measurement", "/api/webhooks/whoop/test/route": "/api/webhooks/whoop/test", "/api/whoop/auth/route": "/api/whoop/auth", "/api/whoop/status/route": "/api/whoop/status", "/api/whoop/cleanup-duplicates/route": "/api/whoop/cleanup-duplicates", "/api/webhooks/whoop/sleep/route": "/api/webhooks/whoop/sleep", "/api/webhooks/whoop/recovery/route": "/api/webhooks/whoop/recovery", "/api/whoop/sync-workouts/route": "/api/whoop/sync-workouts", "/api/webhooks/whoop/route": "/api/webhooks/whoop", "/api/health-advice/route": "/api/health-advice", "/api/whoop/sync-all/route": "/api/whoop/sync-all", "/auth/register/page": "/auth/register", "/exercises/page": "/exercises", "/progress/page": "/progress", "/auth/auth-code-error/page": "/auth/auth-code-error", "/page": "/", "/templates/new/page": "/templates/new", "/workout/start/page": "/workout/start", "/workouts/[id]/page": "/workouts/[id]", "/templates/[id]/edit/page": "/templates/[id]/edit", "/auth/login/page": "/auth/login", "/workout/session/[id]/page": "/workout/session/[id]", "/workouts/page": "/workouts", "/connect-whoop/page": "/connect-whoop", "/workout/session/local/[localId]/page": "/workout/session/local/[localId]", "/templates/page": "/templates", "/privacy/page": "/privacy", "/terms/page": "/terms" };
var FunctionsConfigManifest = { "version": 1, "functions": { "/api/auth/callback": {}, "/api/auth/login": {}, "/api/auth/logout": {}, "/api/auth/session": {}, "/api/auth/whoop/authorize": {}, "/api/auth/whoop/callback": {}, "/api/health-advice": {}, "/api/joke": {}, "/api/trpc/[trpc]": {}, "/api/webhooks/whoop/cycle": {}, "/api/webhooks/whoop/body-measurement": {}, "/api/webhooks/whoop/profile": {}, "/api/webhooks/whoop/recovery": {}, "/api/webhooks/whoop": {}, "/api/webhooks/whoop/sleep": {}, "/api/whoop/auth": {}, "/api/webhooks/whoop/test": {}, "/api/whoop/cleanup-duplicates": {}, "/api/whoop/sync-workouts": {}, "/api/whoop/status": {}, "/api/whoop/sync-all": {}, "/auth/auth-code-error": {}, "/exercises": {}, "/": {}, "/auth/login": {}, "/privacy": {}, "/progress": {}, "/templates/new": {}, "/templates": {}, "/terms": {}, "/workout/session/[id]": {}, "/workout/start": {}, "/workout/session/local/[localId]": {}, "/templates/[id]/edit": {}, "/workouts/[id]": {}, "/workouts": {}, "/connect-whoop": {}, "/auth/register": {} } };
var PagesManifest = { "/_app": "pages/_app.js", "/_error": "pages/_error.js", "/api/health": "pages/api/health.js", "/_document": "pages/_document.js", "/404": "pages/404.html" };
process.env.NEXT_BUILD_ID = BuildId;

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
init_util();
import { Transform } from "node:stream";

// node_modules/@opennextjs/aws/dist/core/routing/util.js
init_util();
init_logger();

// node_modules/@opennextjs/aws/dist/utils/binary.js
var commonBinaryMimeTypes = /* @__PURE__ */ new Set([
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
  // Serialized data
  "application/x-protobuf"
]);
function isBinaryContentType(contentType) {
  if (!contentType)
    return false;
  const value = contentType?.split(";")[0] ?? "";
  return commonBinaryMimeTypes.has(value);
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/i18n/accept-header.js
function parse(raw, preferences, options) {
  const lowers = /* @__PURE__ */ new Map();
  const header = raw.replace(/[ \t]/g, "");
  if (preferences) {
    let pos = 0;
    for (const preference of preferences) {
      const lower = preference.toLowerCase();
      lowers.set(lower, { orig: preference, pos: pos++ });
      if (options.prefixMatch) {
        const parts2 = lower.split("-");
        while (parts2.pop(), parts2.length > 0) {
          const joined = parts2.join("-");
          if (!lowers.has(joined)) {
            lowers.set(joined, { orig: preference, pos: pos++ });
          }
        }
      }
    }
  }
  const parts = header.split(",");
  const selections = [];
  const map = /* @__PURE__ */ new Set();
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const params = part.split(";");
    if (params.length > 2) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const token = params[0].toLowerCase();
    if (!token) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const selection = { token, pos: i, q: 1 };
    if (preferences && lowers.has(token)) {
      selection.pref = lowers.get(token).pos;
    }
    map.add(selection.token);
    if (params.length === 2) {
      const q = params[1];
      const [key, value] = q.split("=");
      if (!value || key !== "q" && key !== "Q") {
        throw new Error(`Invalid ${options.type} header`);
      }
      const score = Number.parseFloat(value);
      if (score === 0) {
        continue;
      }
      if (Number.isFinite(score) && score <= 1 && score >= 1e-3) {
        selection.q = score;
      }
    }
    selections.push(selection);
  }
  selections.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    if (b.pref !== a.pref) {
      if (a.pref === void 0) {
        return 1;
      }
      if (b.pref === void 0) {
        return -1;
      }
      return a.pref - b.pref;
    }
    return a.pos - b.pos;
  });
  const values = selections.map((selection) => selection.token);
  if (!preferences || !preferences.length) {
    return values;
  }
  const preferred = [];
  for (const selection of values) {
    if (selection === "*") {
      for (const [preference, value] of lowers) {
        if (!map.has(preference)) {
          preferred.push(value.orig);
        }
      }
    } else {
      const lower = selection.toLowerCase();
      if (lowers.has(lower)) {
        preferred.push(lowers.get(lower).orig);
      }
    }
  }
  return preferred;
}
function acceptLanguage(header = "", preferences) {
  return parse(header, preferences, {
    type: "accept-language",
    prefixMatch: true
  })[0] || void 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
function isLocalizedPath(path3) {
  return NextConfig.i18n?.locales.includes(path3.split("/")[1].toLowerCase()) ?? false;
}
function getLocaleFromCookie(cookies) {
  const i18n = NextConfig.i18n;
  const nextLocale = cookies.NEXT_LOCALE?.toLowerCase();
  return nextLocale ? i18n?.locales.find((locale) => nextLocale === locale.toLowerCase()) : void 0;
}
function detectDomainLocale({ hostname, detectedLocale }) {
  const i18n = NextConfig.i18n;
  const domains = i18n?.domains;
  if (!domains) {
    return;
  }
  const lowercasedLocale = detectedLocale?.toLowerCase();
  for (const domain of domains) {
    const domainHostname = domain.domain.split(":", 1)[0].toLowerCase();
    if (hostname === domainHostname || lowercasedLocale === domain.defaultLocale.toLowerCase() || domain.locales?.some((locale) => lowercasedLocale === locale.toLowerCase())) {
      return domain;
    }
  }
}
function detectLocale(internalEvent, i18n) {
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  if (i18n.localeDetection === false) {
    return domainLocale?.defaultLocale ?? i18n.defaultLocale;
  }
  const cookiesLocale = getLocaleFromCookie(internalEvent.cookies);
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  debug({
    cookiesLocale,
    preferredLocale,
    defaultLocale: i18n.defaultLocale,
    domainLocale
  });
  return domainLocale?.defaultLocale ?? cookiesLocale ?? preferredLocale ?? i18n.defaultLocale;
}
function localizePath(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n) {
    return internalEvent.rawPath;
  }
  if (isLocalizedPath(internalEvent.rawPath)) {
    return internalEvent.rawPath;
  }
  const detectedLocale = detectLocale(internalEvent, i18n);
  return `/${detectedLocale}${internalEvent.rawPath}`;
}
function handleLocaleRedirect(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n || i18n.localeDetection === false || internalEvent.rawPath !== "/") {
    return false;
  }
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  const detectedLocale = detectLocale(internalEvent, i18n);
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  const preferredDomain = detectDomainLocale({
    detectedLocale: preferredLocale
  });
  if (domainLocale && preferredDomain) {
    const isPDomain = preferredDomain.domain === domainLocale.domain;
    const isPLocale = preferredDomain.defaultLocale === preferredLocale;
    if (!isPDomain || !isPLocale) {
      const scheme = `http${preferredDomain.http ? "" : "s"}`;
      const rlocale = isPLocale ? "" : preferredLocale;
      return {
        type: "core",
        statusCode: 307,
        headers: {
          Location: `${scheme}://${preferredDomain.domain}/${rlocale}`
        },
        body: emptyReadableStream(),
        isBase64Encoded: false
      };
    }
  }
  const defaultLocale = domainLocale?.defaultLocale ?? i18n.defaultLocale;
  if (detectedLocale.toLowerCase() !== defaultLocale.toLowerCase()) {
    return {
      type: "core",
      statusCode: 307,
      headers: {
        Location: constructNextUrl(internalEvent.url, `/${detectedLocale}`)
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}

// node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateShardId(rawPath, maxConcurrency, prefix) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `${prefix}-${randomInt}`;
}
function generateMessageGroupId(rawPath) {
  const maxConcurrency = Number.parseInt(process.env.MAX_REVALIDATE_CONCURRENCY ?? "10");
  return generateShardId(rawPath, maxConcurrency, "revalidate");
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
function isExternal(url, host) {
  if (!url)
    return false;
  const pattern = /^https?:\/\//;
  if (host) {
    return pattern.test(url) && !url.includes(host);
  }
  return pattern.test(url);
}
function convertFromQueryString(query) {
  if (query === "")
    return {};
  const queryParts = query.split("&");
  return getQueryFromIterator(queryParts.map((p) => {
    const [key, value] = p.split("=");
    return [key, value];
  }));
}
function getUrlParts(url, isExternal2) {
  if (!isExternal2) {
    const regex2 = /\/([^?]*)\??(.*)/;
    const match3 = url.match(regex2);
    return {
      hostname: "",
      pathname: match3?.[1] ? `/${match3[1]}` : url,
      protocol: "",
      queryString: match3?.[2] ?? ""
    };
  }
  const regex = /^(https?:)\/\/?([^\/\s]+)(\/[^?]*)?(\?.*)?/;
  const match2 = url.match(regex);
  if (!match2) {
    throw new Error(`Invalid external URL: ${url}`);
  }
  return {
    protocol: match2[1] ?? "https:",
    hostname: match2[2],
    pathname: match2[3] ?? "",
    queryString: match2[4]?.slice(1) ?? ""
  };
}
function constructNextUrl(baseUrl, path3) {
  const nextBasePath = NextConfig.basePath ?? "";
  const url = new URL(`${nextBasePath}${path3}`, baseUrl);
  return url.href;
}
function convertToQueryString(query) {
  const queryStrings = [];
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => queryStrings.push(`${key}=${entry}`));
    } else {
      queryStrings.push(`${key}=${value}`);
    }
  });
  return queryStrings.length > 0 ? `?${queryStrings.join("&")}` : "";
}
function getMiddlewareMatch(middlewareManifest2, functionsManifest) {
  if (functionsManifest?.functions?.["/_middleware"]) {
    return functionsManifest.functions["/_middleware"].matchers?.map(({ regexp }) => new RegExp(regexp)) ?? [/.*/];
  }
  const rootMiddleware = middlewareManifest2.middleware["/"];
  if (!rootMiddleware?.matchers)
    return [];
  return rootMiddleware.matchers.map(({ regexp }) => new RegExp(regexp));
}
function escapeRegex(str, { isPath } = {}) {
  const result = str.replaceAll("(.)", "_\xB51_").replaceAll("(..)", "_\xB52_").replaceAll("(...)", "_\xB53_");
  return isPath ? result : result.replaceAll("+", "_\xB54_");
}
function unescapeRegex(str) {
  return str.replaceAll("_\xB51_", "(.)").replaceAll("_\xB52_", "(..)").replaceAll("_\xB53_", "(...)").replaceAll("_\xB54_", "+");
}
function convertBodyToReadableStream(method, body) {
  if (method === "GET" || method === "HEAD")
    return void 0;
  if (!body)
    return void 0;
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    }
  });
  return readable;
}
var CommonHeaders;
(function(CommonHeaders2) {
  CommonHeaders2["CACHE_CONTROL"] = "cache-control";
  CommonHeaders2["NEXT_CACHE"] = "x-nextjs-cache";
})(CommonHeaders || (CommonHeaders = {}));
function normalizeLocationHeader(location, baseUrl, encodeQuery = false) {
  if (!URL.canParse(location)) {
    return location;
  }
  const locationURL = new URL(location);
  const origin = new URL(baseUrl).origin;
  let search = locationURL.search;
  if (encodeQuery && search) {
    search = `?${stringifyQs(parseQs(search.slice(1)))}`;
  }
  const href = `${locationURL.origin}${locationURL.pathname}${search}${locationURL.hash}`;
  if (locationURL.origin === origin) {
    return href.slice(origin.length);
  }
  return href;
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
import { createHash } from "node:crypto";
init_stream();

// node_modules/@opennextjs/aws/dist/utils/cache.js
init_logger();
async function hasBeenRevalidated(key, tags, cacheEntry) {
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  const value = cacheEntry.value;
  if (!value) {
    return true;
  }
  if ("type" in cacheEntry && cacheEntry.type === "page") {
    return false;
  }
  const lastModified = cacheEntry.lastModified ?? Date.now();
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.hasBeenRevalidated(tags, lastModified);
  }
  const _lastModified = await globalThis.tagCache.getLastModified(key, lastModified);
  return _lastModified === -1;
}
function getTagsFromValue(value) {
  if (!value) {
    return [];
  }
  try {
    const cacheTags = value.meta?.headers?.["x-next-cache-tags"]?.split(",") ?? [];
    delete value.meta?.headers?.["x-next-cache-tags"];
    return cacheTags;
  } catch (e) {
    return [];
  }
}

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;
var VARY_HEADER = "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url";
async function computeCacheControl(path3, body, host, revalidate, lastModified) {
  let finalRevalidate = CACHE_ONE_YEAR;
  const existingRoute = Object.entries(PrerenderManifest.routes).find((p) => p[0] === path3)?.[1];
  if (revalidate === void 0 && existingRoute) {
    finalRevalidate = existingRoute.initialRevalidateSeconds === false ? CACHE_ONE_YEAR : existingRoute.initialRevalidateSeconds;
  } else if (revalidate !== void 0) {
    finalRevalidate = revalidate === false ? CACHE_ONE_YEAR : revalidate;
  }
  const age = Math.round((Date.now() - (lastModified ?? 0)) / 1e3);
  const hash = (str) => createHash("md5").update(str).digest("hex");
  const etag = hash(body);
  if (revalidate === 0) {
    return {
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "x-opennext-cache": "ERROR",
      etag
    };
  }
  if (finalRevalidate !== CACHE_ONE_YEAR) {
    const sMaxAge = Math.max(finalRevalidate - age, 1);
    debug("sMaxAge", {
      finalRevalidate,
      age,
      lastModified,
      revalidate
    });
    const isStale = sMaxAge === 1;
    if (isStale) {
      let url = NextConfig.trailingSlash ? `${path3}/` : path3;
      if (NextConfig.basePath) {
        url = `${NextConfig.basePath}${url}`;
      }
      await globalThis.queue.send({
        MessageBody: {
          host,
          url,
          eTag: etag,
          lastModified: lastModified ?? Date.now()
        },
        MessageDeduplicationId: hash(`${path3}-${lastModified}-${etag}`),
        MessageGroupId: generateMessageGroupId(path3)
      });
    }
    return {
      "cache-control": `s-maxage=${sMaxAge}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
      "x-opennext-cache": isStale ? "STALE" : "HIT",
      etag
    };
  }
  return {
    "cache-control": `s-maxage=${CACHE_ONE_YEAR}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
    "x-opennext-cache": "HIT",
    etag
  };
}
async function generateResult(event, localizedPath, cachedValue, lastModified) {
  debug("Returning result from experimental cache");
  let body = "";
  let type = "application/octet-stream";
  let isDataRequest = false;
  switch (cachedValue.type) {
    case "app":
      isDataRequest = Boolean(event.headers.rsc);
      body = isDataRequest ? cachedValue.rsc : cachedValue.html;
      type = isDataRequest ? "text/x-component" : "text/html; charset=utf-8";
      break;
    case "page":
      isDataRequest = Boolean(event.query.__nextDataReq);
      body = isDataRequest ? JSON.stringify(cachedValue.json) : cachedValue.html;
      type = isDataRequest ? "application/json" : "text/html; charset=utf-8";
      break;
  }
  const cacheControl = await computeCacheControl(localizedPath, body, event.headers.host, cachedValue.revalidate, lastModified);
  return {
    type: "core",
    // Sometimes other status codes can be cached, like 404. For these cases, we should return the correct status code
    // Also set the status code to the rewriteStatusCode if defined
    // This can happen in handleMiddleware in routingHandler.
    // `NextResponse.rewrite(url, { status: xxx})
    // The rewrite status code should take precedence over the cached one
    statusCode: event.rewriteStatusCode ?? cachedValue.meta?.status ?? 200,
    body: toReadableStream(body, false),
    isBase64Encoded: false,
    headers: {
      ...cacheControl,
      "content-type": type,
      ...cachedValue.meta?.headers,
      vary: VARY_HEADER
    }
  };
}
function escapePathDelimiters(segment, escapeEncoded) {
  return segment.replace(new RegExp(`([/#?]${escapeEncoded ? "|%(2f|23|3f|5c)" : ""})`, "gi"), (char) => encodeURIComponent(char));
}
function decodePathParams(pathname) {
  return pathname.split("/").map((segment) => {
    try {
      return escapePathDelimiters(decodeURIComponent(segment), true);
    } catch (e) {
      return segment;
    }
  }).join("/");
}
async function cacheInterceptor(event) {
  if (Boolean(event.headers["next-action"]) || Boolean(event.headers["x-prerender-revalidate"]))
    return event;
  const cookies = event.headers.cookie || "";
  const hasPreviewData = cookies.includes("__prerender_bypass") || cookies.includes("__next_preview_data");
  if (hasPreviewData) {
    debug("Preview mode detected, passing through to handler");
    return event;
  }
  let localizedPath = localizePath(event);
  if (NextConfig.basePath) {
    localizedPath = localizedPath.replace(NextConfig.basePath, "");
  }
  localizedPath = localizedPath.replace(/\/$/, "");
  localizedPath = decodePathParams(localizedPath);
  debug("Checking cache for", localizedPath, PrerenderManifest);
  const isISR = Object.keys(PrerenderManifest.routes).includes(localizedPath ?? "/") || Object.values(PrerenderManifest.dynamicRoutes).some((dr) => new RegExp(dr.routeRegex).test(localizedPath));
  debug("isISR", isISR);
  if (isISR) {
    try {
      const cachedData = await globalThis.incrementalCache.get(localizedPath ?? "/index");
      debug("cached data in interceptor", cachedData);
      if (!cachedData?.value) {
        return event;
      }
      if (cachedData.value?.type === "app" || cachedData.value?.type === "route") {
        const tags = getTagsFromValue(cachedData.value);
        const _hasBeenRevalidated = cachedData.shouldBypassTagCache ? false : await hasBeenRevalidated(localizedPath, tags, cachedData);
        if (_hasBeenRevalidated) {
          return event;
        }
      }
      const host = event.headers.host;
      switch (cachedData?.value?.type) {
        case "app":
        case "page":
          return generateResult(event, localizedPath, cachedData.value, cachedData.lastModified);
        case "redirect": {
          const cacheControl = await computeCacheControl(localizedPath, "", host, cachedData.value.revalidate, cachedData.lastModified);
          return {
            type: "core",
            statusCode: cachedData.value.meta?.status ?? 307,
            body: emptyReadableStream(),
            headers: {
              ...cachedData.value.meta?.headers ?? {},
              ...cacheControl
            },
            isBase64Encoded: false
          };
        }
        case "route": {
          const cacheControl = await computeCacheControl(localizedPath, cachedData.value.body, host, cachedData.value.revalidate, cachedData.lastModified);
          const isBinary = isBinaryContentType(String(cachedData.value.meta?.headers?.["content-type"]));
          return {
            type: "core",
            statusCode: event.rewriteStatusCode ?? cachedData.value.meta?.status ?? 200,
            body: toReadableStream(cachedData.value.body, isBinary),
            headers: {
              ...cacheControl,
              ...cachedData.value.meta?.headers,
              vary: VARY_HEADER
            },
            isBase64Encoded: isBinary
          };
        }
        default:
          return event;
      }
    } catch (e) {
      debug("Error while fetching cache", e);
      return event;
    }
  }
  return event;
}

// node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path3 = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  var isSafe = function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  };
  var safePattern = function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path3 += prefix;
        prefix = "";
      }
      if (path3) {
        result.push(path3);
        path3 = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path3 += value;
      continue;
    }
    if (path3) {
      result.push(path3);
      path3 = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function compile(str, options) {
  return tokensToFunction(parse2(str, options), options);
}
function tokensToFunction(tokens, options) {
  if (options === void 0) {
    options = {};
  }
  var reFlags = flags(options);
  var _a = options.encode, encode = _a === void 0 ? function(x) {
    return x;
  } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
  var matches = tokens.map(function(token) {
    if (typeof token === "object") {
      return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
    }
  });
  return function(data) {
    var path3 = "";
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (typeof token === "string") {
        path3 += token;
        continue;
      }
      var value = data ? data[token.name] : void 0;
      var optional = token.modifier === "?" || token.modifier === "*";
      var repeat = token.modifier === "*" || token.modifier === "+";
      if (Array.isArray(value)) {
        if (!repeat) {
          throw new TypeError('Expected "'.concat(token.name, '" to not repeat, but got an array'));
        }
        if (value.length === 0) {
          if (optional)
            continue;
          throw new TypeError('Expected "'.concat(token.name, '" to not be empty'));
        }
        for (var j = 0; j < value.length; j++) {
          var segment = encode(value[j], token);
          if (validate && !matches[i].test(segment)) {
            throw new TypeError('Expected all "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
          }
          path3 += token.prefix + segment + token.suffix;
        }
        continue;
      }
      if (typeof value === "string" || typeof value === "number") {
        var segment = encode(String(value), token);
        if (validate && !matches[i].test(segment)) {
          throw new TypeError('Expected "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
        }
        path3 += token.prefix + segment + token.suffix;
        continue;
      }
      if (optional)
        continue;
      var typeOfMessage = repeat ? "an array" : "a string";
      throw new TypeError('Expected "'.concat(token.name, '" to be ').concat(typeOfMessage));
    }
    return path3;
  };
}
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path3 = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path: path3, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path3, keys) {
  if (!keys)
    return path3;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path3.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path3.source);
  }
  return path3;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path3) {
    return pathToRegexp(path3, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path3, keys, options) {
  return tokensToRegexp(parse2(path3, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path3, keys, options) {
  if (path3 instanceof RegExp)
    return regexpToRegexp(path3, keys);
  if (Array.isArray(path3))
    return arrayToRegexp(path3, keys, options);
  return stringToRegexp(path3, keys, options);
}

// node_modules/@opennextjs/aws/dist/utils/normalize-path.js
import path2 from "node:path";
function normalizeRepeatedSlashes(url) {
  const urlNoQuery = url.host + url.pathname;
  return `${url.protocol}//${urlNoQuery.replace(/\\/g, "/").replace(/\/\/+/g, "/")}${url.search}`;
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/routeMatcher.js
var optionalLocalePrefixRegex = `^/(?:${RoutesManifest.locales.map((locale) => `${locale}/?`).join("|")})?`;
var optionalBasepathPrefixRegex = RoutesManifest.basePath ? `^${RoutesManifest.basePath}/?` : "^/";
var optionalPrefix = optionalLocalePrefixRegex.replace("^/", optionalBasepathPrefixRegex);
function routeMatcher(routeDefinitions) {
  const regexp = routeDefinitions.map((route) => ({
    page: route.page,
    regexp: new RegExp(route.regex.replace("^/", optionalPrefix))
  }));
  const appPathsSet = /* @__PURE__ */ new Set();
  const routePathsSet = /* @__PURE__ */ new Set();
  for (const [k, v] of Object.entries(AppPathRoutesManifest)) {
    if (k.endsWith("page")) {
      appPathsSet.add(v);
    } else if (k.endsWith("route")) {
      routePathsSet.add(v);
    }
  }
  return function matchRoute(path3) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path3));
    return foundRoutes.map((foundRoute) => {
      let routeType = "page";
      if (appPathsSet.has(foundRoute.page)) {
        routeType = "app";
      } else if (routePathsSet.has(foundRoute.page)) {
        routeType = "route";
      }
      return {
        route: foundRoute.page,
        type: routeType
      };
    });
  };
}
var staticRouteMatcher = routeMatcher([
  ...RoutesManifest.routes.static,
  ...getStaticAPIRoutes()
]);
var dynamicRouteMatcher = routeMatcher(RoutesManifest.routes.dynamic);
function getStaticAPIRoutes() {
  const createRouteDefinition = (route) => ({
    page: route,
    regex: `^${route}(?:/)?$`
  });
  const dynamicRoutePages = new Set(RoutesManifest.routes.dynamic.map(({ page }) => page));
  const pagesStaticAPIRoutes = Object.keys(PagesManifest).filter((route) => route.startsWith("/api/") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  const appPathsStaticAPIRoutes = Object.values(AppPathRoutesManifest).filter((route) => route.startsWith("/api/") || route === "/api" && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  return [...pagesStaticAPIRoutes, ...appPathsStaticAPIRoutes];
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
var routeHasMatcher = (headers, cookies, query) => (redirect) => {
  switch (redirect.type) {
    case "header":
      return !!headers?.[redirect.key.toLowerCase()] && new RegExp(redirect.value ?? "").test(headers[redirect.key.toLowerCase()] ?? "");
    case "cookie":
      return !!cookies?.[redirect.key] && new RegExp(redirect.value ?? "").test(cookies[redirect.key] ?? "");
    case "query":
      return query[redirect.key] && Array.isArray(redirect.value) ? redirect.value.reduce((prev, current) => prev || new RegExp(current).test(query[redirect.key]), false) : new RegExp(redirect.value ?? "").test(query[redirect.key] ?? "");
    case "host":
      return headers?.host !== "" && new RegExp(redirect.value ?? "").test(headers.host);
    default:
      return false;
  }
};
function checkHas(matcher, has, inverted = false) {
  return has ? has.reduce((acc, cur) => {
    if (acc === false)
      return false;
    return inverted ? !matcher(cur) : matcher(cur);
  }, true) : true;
}
var getParamsFromSource = (source) => (value) => {
  debug("value", value);
  const _match = source(value);
  return _match ? _match.params : {};
};
var computeParamHas = (headers, cookies, query) => (has) => {
  if (!has.value)
    return {};
  const matcher = new RegExp(`^${has.value}$`);
  const fromSource = (value) => {
    const matches = value.match(matcher);
    return matches?.groups ?? {};
  };
  switch (has.type) {
    case "header":
      return fromSource(headers[has.key.toLowerCase()] ?? "");
    case "cookie":
      return fromSource(cookies[has.key] ?? "");
    case "query":
      return Array.isArray(query[has.key]) ? fromSource(query[has.key].join(",")) : fromSource(query[has.key] ?? "");
    case "host":
      return fromSource(headers.host ?? "");
  }
};
function convertMatch(match2, toDestination, destination) {
  if (!match2) {
    return destination;
  }
  const { params } = match2;
  const isUsingParams = Object.keys(params).length > 0;
  return isUsingParams ? toDestination(params) : destination;
}
function getNextConfigHeaders(event, configHeaders) {
  if (!configHeaders) {
    return {};
  }
  const matcher = routeHasMatcher(event.headers, event.cookies, event.query);
  const requestHeaders = {};
  const localizedRawPath = localizePath(event);
  for (const { headers, has, missing, regex, source, locale } of configHeaders) {
    const path3 = locale === false ? event.rawPath : localizedRawPath;
    if (new RegExp(regex).test(path3) && checkHas(matcher, has) && checkHas(matcher, missing, true)) {
      const fromSource = match(source);
      const _match = fromSource(path3);
      headers.forEach((h) => {
        try {
          const key = convertMatch(_match, compile(h.key), h.key);
          const value = convertMatch(_match, compile(h.value), h.value);
          requestHeaders[key] = value;
        } catch {
          debug(`Error matching header ${h.key} with value ${h.value}`);
          requestHeaders[h.key] = h.value;
        }
      });
    }
  }
  return requestHeaders;
}
function handleRewrites(event, rewrites) {
  const { rawPath, headers, query, cookies, url } = event;
  const localizedRawPath = localizePath(event);
  const matcher = routeHasMatcher(headers, cookies, query);
  const computeHas = computeParamHas(headers, cookies, query);
  const rewrite = rewrites.find((route) => {
    const path3 = route.locale === false ? rawPath : localizedRawPath;
    return new RegExp(route.regex).test(path3) && checkHas(matcher, route.has) && checkHas(matcher, route.missing, true);
  });
  let finalQuery = query;
  let rewrittenUrl = url;
  const isExternalRewrite = isExternal(rewrite?.destination);
  debug("isExternalRewrite", isExternalRewrite);
  if (rewrite) {
    const { pathname, protocol, hostname, queryString } = getUrlParts(rewrite.destination, isExternalRewrite);
    const pathToUse = rewrite.locale === false ? rawPath : localizedRawPath;
    debug("urlParts", { pathname, protocol, hostname, queryString });
    const toDestinationPath = compile(escapeRegex(pathname, { isPath: true }));
    const toDestinationHost = compile(escapeRegex(hostname));
    const toDestinationQuery = compile(escapeRegex(queryString));
    const params = {
      // params for the source
      ...getParamsFromSource(match(escapeRegex(rewrite.source, { isPath: true })))(pathToUse),
      // params for the has
      ...rewrite.has?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {}),
      // params for the missing
      ...rewrite.missing?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {})
    };
    const isUsingParams = Object.keys(params).length > 0;
    let rewrittenQuery = queryString;
    let rewrittenHost = hostname;
    let rewrittenPath = pathname;
    if (isUsingParams) {
      rewrittenPath = unescapeRegex(toDestinationPath(params));
      rewrittenHost = unescapeRegex(toDestinationHost(params));
      rewrittenQuery = unescapeRegex(toDestinationQuery(params));
    }
    if (NextConfig.i18n && !isExternalRewrite) {
      const strippedPathLocale = rewrittenPath.replace(new RegExp(`^/(${NextConfig.i18n.locales.join("|")})`), "");
      if (strippedPathLocale.startsWith("/api/")) {
        rewrittenPath = strippedPathLocale;
      }
    }
    rewrittenUrl = isExternalRewrite ? `${protocol}//${rewrittenHost}${rewrittenPath}` : new URL(rewrittenPath, event.url).href;
    finalQuery = {
      ...query,
      ...convertFromQueryString(rewrittenQuery)
    };
    rewrittenUrl += convertToQueryString(finalQuery);
    debug("rewrittenUrl", { rewrittenUrl, finalQuery, isUsingParams });
  }
  return {
    internalEvent: {
      ...event,
      query: finalQuery,
      rawPath: new URL(rewrittenUrl).pathname,
      url: rewrittenUrl
    },
    __rewrite: rewrite,
    isExternalRewrite
  };
}
function handleRepeatedSlashRedirect(event) {
  if (event.rawPath.match(/(\\|\/\/)/)) {
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: normalizeRepeatedSlashes(new URL(event.url))
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}
function handleTrailingSlashRedirect(event) {
  const url = new URL(event.rawPath, "http://localhost");
  if (
    // Someone is trying to redirect to a different origin, let's not do that
    url.host !== "localhost" || NextConfig.skipTrailingSlashRedirect || // We should not apply trailing slash redirect to API routes
    event.rawPath.startsWith("/api/")
  ) {
    return false;
  }
  const emptyBody = emptyReadableStream();
  if (NextConfig.trailingSlash && !event.headers["x-nextjs-data"] && !event.rawPath.endsWith("/") && !event.rawPath.match(/[\w-]+\.[\w]+$/g)) {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0]}/${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  if (!NextConfig.trailingSlash && event.rawPath.endsWith("/") && event.rawPath !== "/") {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0].replace(/\/$/, "")}${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  return false;
}
function handleRedirects(event, redirects) {
  const repeatedSlashRedirect = handleRepeatedSlashRedirect(event);
  if (repeatedSlashRedirect)
    return repeatedSlashRedirect;
  const trailingSlashRedirect = handleTrailingSlashRedirect(event);
  if (trailingSlashRedirect)
    return trailingSlashRedirect;
  const localeRedirect = handleLocaleRedirect(event);
  if (localeRedirect)
    return localeRedirect;
  const { internalEvent, __rewrite } = handleRewrites(event, redirects.filter((r) => !r.internal));
  if (__rewrite && !__rewrite.internal) {
    return {
      type: event.type,
      statusCode: __rewrite.statusCode ?? 308,
      headers: {
        Location: internalEvent.url
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
}
function fixDataPage(internalEvent, buildId) {
  const { rawPath, query } = internalEvent;
  const basePath = NextConfig.basePath ?? "";
  const dataPattern = `${basePath}/_next/data/${buildId}`;
  if (rawPath.startsWith("/_next/data") && !rawPath.startsWith(dataPattern)) {
    return {
      type: internalEvent.type,
      statusCode: 404,
      body: toReadableStream("{}"),
      headers: {
        "Content-Type": "application/json"
      },
      isBase64Encoded: false
    };
  }
  if (rawPath.startsWith(dataPattern) && rawPath.endsWith(".json")) {
    const newPath = `${basePath}${rawPath.slice(dataPattern.length, -".json".length).replace(/^\/index$/, "/")}`;
    query.__nextDataReq = "1";
    return {
      ...internalEvent,
      rawPath: newPath,
      query,
      url: new URL(`${newPath}${convertToQueryString(query)}`, internalEvent.url).href
    };
  }
  return internalEvent;
}
function handleFallbackFalse(internalEvent, prerenderManifest) {
  const { rawPath } = internalEvent;
  const { dynamicRoutes, routes } = prerenderManifest;
  const prerenderedFallbackRoutes = Object.entries(dynamicRoutes).filter(([, { fallback }]) => fallback === false);
  const routeFallback = prerenderedFallbackRoutes.some(([, { routeRegex }]) => {
    const routeRegexExp = new RegExp(routeRegex);
    return routeRegexExp.test(rawPath);
  });
  const locales = NextConfig.i18n?.locales;
  const routesAlreadyHaveLocale = locales?.includes(rawPath.split("/")[1]) || // If we don't use locales, we don't need to add the default locale
  locales === void 0;
  let localizedPath = routesAlreadyHaveLocale ? rawPath : `/${NextConfig.i18n?.defaultLocale}${rawPath}`;
  if (
    // Not if localizedPath is "/" tho, because that would not make it find `isPregenerated` below since it would be try to match an empty string.
    localizedPath !== "/" && NextConfig.trailingSlash && localizedPath.endsWith("/")
  ) {
    localizedPath = localizedPath.slice(0, -1);
  }
  const matchedStaticRoute = staticRouteMatcher(localizedPath);
  const prerenderedFallbackRoutesName = prerenderedFallbackRoutes.map(([name]) => name);
  const matchedDynamicRoute = dynamicRouteMatcher(localizedPath).filter(({ route }) => !prerenderedFallbackRoutesName.includes(route));
  const isPregenerated = Object.keys(routes).includes(localizedPath);
  if (routeFallback && !isPregenerated && matchedStaticRoute.length === 0 && matchedDynamicRoute.length === 0) {
    return {
      event: {
        ...internalEvent,
        rawPath: "/404",
        url: constructNextUrl(internalEvent.url, "/404"),
        headers: {
          ...internalEvent.headers,
          "x-invoke-status": "404"
        }
      },
      isISR: false
    };
  }
  return {
    event: internalEvent,
    isISR: routeFallback || isPregenerated
  };
}

// node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
init_utils();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);
var REDIRECTS = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function defaultMiddlewareLoader() {
  return Promise.resolve().then(() => (init_edgeFunctionHandler(), edgeFunctionHandler_exports));
}
async function handleMiddleware(internalEvent, initialSearch, middlewareLoader = defaultMiddlewareLoader) {
  const headers = internalEvent.headers;
  if (headers["x-isr"] && headers["x-prerender-revalidate"] === PrerenderManifest.preview.previewModeId)
    return internalEvent;
  const normalizedPath = localizePath(internalEvent);
  const hasMatch = middleMatch.some((r) => r.test(normalizedPath));
  if (!hasMatch)
    return internalEvent;
  const initialUrl = new URL(normalizedPath, internalEvent.url);
  initialUrl.search = initialSearch;
  const url = initialUrl.href;
  const middleware = await middlewareLoader();
  const result = await middleware.default({
    // `geo` is pre Next 15.
    geo: {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: decodeURIComponent(headers["x-open-next-city"]),
      country: headers["x-open-next-country"],
      region: headers["x-open-next-region"],
      latitude: headers["x-open-next-latitude"],
      longitude: headers["x-open-next-longitude"]
    },
    headers,
    method: internalEvent.method || "GET",
    nextConfig: {
      basePath: NextConfig.basePath,
      i18n: NextConfig.i18n,
      trailingSlash: NextConfig.trailingSlash
    },
    url,
    body: convertBodyToReadableStream(internalEvent.method, internalEvent.body)
  });
  const statusCode = result.status;
  const responseHeaders = result.headers;
  const reqHeaders = {};
  const resHeaders = {};
  const filteredHeaders = [
    "x-middleware-override-headers",
    "x-middleware-next",
    "x-middleware-rewrite",
    // We need to drop `content-encoding` because it will be decoded
    "content-encoding"
  ];
  const xMiddlewareKey = "x-middleware-request-";
  responseHeaders.forEach((value, key) => {
    if (key.startsWith(xMiddlewareKey)) {
      const k = key.substring(xMiddlewareKey.length);
      reqHeaders[k] = value;
    } else {
      if (filteredHeaders.includes(key.toLowerCase()))
        return;
      if (key.toLowerCase() === "set-cookie") {
        resHeaders[key] = resHeaders[key] ? [...resHeaders[key], value] : [value];
      } else if (REDIRECTS.has(statusCode) && key.toLowerCase() === "location") {
        resHeaders[key] = normalizeLocationHeader(value, internalEvent.url);
      } else {
        resHeaders[key] = value;
      }
    }
  });
  const rewriteUrl = responseHeaders.get("x-middleware-rewrite");
  let isExternalRewrite = false;
  let middlewareQuery = internalEvent.query;
  let newUrl = internalEvent.url;
  if (rewriteUrl) {
    newUrl = rewriteUrl;
    if (isExternal(newUrl, internalEvent.headers.host)) {
      isExternalRewrite = true;
    } else {
      const rewriteUrlObject = new URL(rewriteUrl);
      middlewareQuery = getQueryFromSearchParams(rewriteUrlObject.searchParams);
      if ("__nextDataReq" in internalEvent.query) {
        middlewareQuery.__nextDataReq = internalEvent.query.__nextDataReq;
      }
    }
  }
  if (!rewriteUrl && !responseHeaders.get("x-middleware-next")) {
    const body = result.body ?? emptyReadableStream();
    return {
      type: internalEvent.type,
      statusCode,
      headers: resHeaders,
      body,
      isBase64Encoded: false
    };
  }
  return {
    responseHeaders: resHeaders,
    url: newUrl,
    rawPath: new URL(newUrl).pathname,
    type: internalEvent.type,
    headers: { ...internalEvent.headers, ...reqHeaders },
    body: internalEvent.body,
    method: internalEvent.method,
    query: middlewareQuery,
    cookies: internalEvent.cookies,
    remoteAddress: internalEvent.remoteAddress,
    isExternalRewrite,
    rewriteStatusCode: rewriteUrl && !isExternalRewrite ? statusCode : void 0
  };
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var INTERNAL_HEADER_REWRITE_STATUS_CODE = `${INTERNAL_HEADER_PREFIX}rewrite-status-code`;
var INTERNAL_EVENT_REQUEST_ID = `${INTERNAL_HEADER_PREFIX}request-id`;
var geoHeaderToNextHeader = {
  "x-open-next-city": "x-vercel-ip-city",
  "x-open-next-country": "x-vercel-ip-country",
  "x-open-next-region": "x-vercel-ip-country-region",
  "x-open-next-latitude": "x-vercel-ip-latitude",
  "x-open-next-longitude": "x-vercel-ip-longitude"
};
function applyMiddlewareHeaders(eventOrResult, middlewareHeaders) {
  const isResult = isInternalResult(eventOrResult);
  const headers = eventOrResult.headers;
  const keyPrefix = isResult ? "" : MIDDLEWARE_HEADER_PREFIX;
  Object.entries(middlewareHeaders).forEach(([key, value]) => {
    if (value) {
      headers[keyPrefix + key] = Array.isArray(value) ? value.join(",") : value;
    }
  });
}
async function routingHandler(event, { assetResolver }) {
  try {
    for (const [openNextGeoName, nextGeoName] of Object.entries(geoHeaderToNextHeader)) {
      const value = event.headers[openNextGeoName];
      if (value) {
        event.headers[nextGeoName] = value;
      }
    }
    for (const key of Object.keys(event.headers)) {
      if (key.startsWith(INTERNAL_HEADER_PREFIX) || key.startsWith(MIDDLEWARE_HEADER_PREFIX)) {
        delete event.headers[key];
      }
    }
    let headers = getNextConfigHeaders(event, ConfigHeaders);
    let eventOrResult = fixDataPage(event, BuildId);
    if (isInternalResult(eventOrResult)) {
      return eventOrResult;
    }
    const redirect = handleRedirects(eventOrResult, RoutesManifest.redirects);
    if (redirect) {
      redirect.headers.Location = normalizeLocationHeader(redirect.headers.Location, event.url, true);
      debug("redirect", redirect);
      return redirect;
    }
    const middlewareEventOrResult = await handleMiddleware(
      eventOrResult,
      // We need to pass the initial search without any decoding
      // TODO: we'd need to refactor InternalEvent to include the initial querystring directly
      // Should be done in another PR because it is a breaking change
      new URL(event.url).search
    );
    if (isInternalResult(middlewareEventOrResult)) {
      return middlewareEventOrResult;
    }
    const middlewareHeadersPrioritized = globalThis.openNextConfig.dangerous?.middlewareHeadersOverrideNextConfigHeaders ?? false;
    if (middlewareHeadersPrioritized) {
      headers = {
        ...headers,
        ...middlewareEventOrResult.responseHeaders
      };
    } else {
      headers = {
        ...middlewareEventOrResult.responseHeaders,
        ...headers
      };
    }
    let isExternalRewrite = middlewareEventOrResult.isExternalRewrite ?? false;
    eventOrResult = middlewareEventOrResult;
    if (!isExternalRewrite) {
      const beforeRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.beforeFiles);
      eventOrResult = beforeRewrite.internalEvent;
      isExternalRewrite = beforeRewrite.isExternalRewrite;
      if (!isExternalRewrite) {
        const assetResult = await assetResolver?.maybeGetAssetResult?.(eventOrResult);
        if (assetResult) {
          applyMiddlewareHeaders(assetResult, headers);
          return assetResult;
        }
      }
    }
    const foundStaticRoute = staticRouteMatcher(eventOrResult.rawPath);
    const isStaticRoute = !isExternalRewrite && foundStaticRoute.length > 0;
    if (!(isStaticRoute || isExternalRewrite)) {
      const afterRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.afterFiles);
      eventOrResult = afterRewrite.internalEvent;
      isExternalRewrite = afterRewrite.isExternalRewrite;
    }
    let isISR = false;
    if (!isExternalRewrite) {
      const fallbackResult = handleFallbackFalse(eventOrResult, PrerenderManifest);
      eventOrResult = fallbackResult.event;
      isISR = fallbackResult.isISR;
    }
    const foundDynamicRoute = dynamicRouteMatcher(eventOrResult.rawPath);
    const isDynamicRoute = !isExternalRewrite && foundDynamicRoute.length > 0;
    if (!(isDynamicRoute || isStaticRoute || isExternalRewrite)) {
      const fallbackRewrites = handleRewrites(eventOrResult, RoutesManifest.rewrites.fallback);
      eventOrResult = fallbackRewrites.internalEvent;
      isExternalRewrite = fallbackRewrites.isExternalRewrite;
    }
    const isNextImageRoute = eventOrResult.rawPath.startsWith("/_next/image");
    const isRouteFoundBeforeAllRewrites = isStaticRoute || isDynamicRoute || isExternalRewrite;
    if (!(isRouteFoundBeforeAllRewrites || isNextImageRoute || // We need to check again once all rewrites have been applied
    staticRouteMatcher(eventOrResult.rawPath).length > 0 || dynamicRouteMatcher(eventOrResult.rawPath).length > 0)) {
      eventOrResult = {
        ...eventOrResult,
        rawPath: "/404",
        url: constructNextUrl(eventOrResult.url, "/404"),
        headers: {
          ...eventOrResult.headers,
          "x-middleware-response-cache-control": "private, no-cache, no-store, max-age=0, must-revalidate"
        }
      };
    }
    if (globalThis.openNextConfig.dangerous?.enableCacheInterception && !isInternalResult(eventOrResult)) {
      debug("Cache interception enabled");
      eventOrResult = await cacheInterceptor(eventOrResult);
      if (isInternalResult(eventOrResult)) {
        applyMiddlewareHeaders(eventOrResult, headers);
        return eventOrResult;
      }
    }
    applyMiddlewareHeaders(eventOrResult, headers);
    const resolvedRoutes = [
      ...foundStaticRoute,
      ...foundDynamicRoute
    ];
    debug("resolvedRoutes", resolvedRoutes);
    return {
      internalEvent: eventOrResult,
      isExternalRewrite,
      origin: false,
      isISR,
      resolvedRoutes,
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(eventOrResult, NextConfig.i18n) : void 0,
      rewriteStatusCode: middlewareEventOrResult.rewriteStatusCode
    };
  } catch (e) {
    error("Error in routingHandler", e);
    return {
      internalEvent: {
        type: "core",
        method: "GET",
        rawPath: "/500",
        url: constructNextUrl(event.url, "/500"),
        headers: {
          ...event.headers
        },
        query: event.query,
        cookies: event.cookies,
        remoteAddress: event.remoteAddress
      },
      isExternalRewrite: false,
      origin: false,
      isISR: false,
      resolvedRoutes: [],
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(event, NextConfig.i18n) : void 0
    };
  }
}
function isInternalResult(eventOrResult) {
  return eventOrResult != null && "statusCode" in eventOrResult;
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
globalThis.internalFetch = fetch;
globalThis.__openNextAls = new AsyncLocalStorage();
var defaultHandler = async (internalEvent, options) => {
  const middlewareConfig = globalThis.openNextConfig.middleware;
  const originResolver = await resolveOriginResolver(middlewareConfig?.originResolver);
  const externalRequestProxy = await resolveProxyRequest(middlewareConfig?.override?.proxyExternalRequest);
  const assetResolver = await resolveAssetResolver(middlewareConfig?.assetResolver);
  const requestId = Math.random().toString(36);
  return runWithOpenNextRequestContext({
    isISRRevalidation: internalEvent.headers["x-isr"] === "1",
    waitUntil: options?.waitUntil,
    requestId
  }, async () => {
    const result = await routingHandler(internalEvent, { assetResolver });
    if ("internalEvent" in result) {
      debug("Middleware intercepted event", internalEvent);
      if (!result.isExternalRewrite) {
        const origin = await originResolver.resolve(result.internalEvent.rawPath);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_HEADER_INITIAL_URL]: internalEvent.url,
              [INTERNAL_HEADER_RESOLVED_ROUTES]: JSON.stringify(result.resolvedRoutes),
              [INTERNAL_EVENT_REQUEST_ID]: requestId,
              [INTERNAL_HEADER_REWRITE_STATUS_CODE]: String(result.rewriteStatusCode)
            }
          },
          isExternalRewrite: result.isExternalRewrite,
          origin,
          isISR: result.isISR,
          initialURL: result.initialURL,
          resolvedRoutes: result.resolvedRoutes
        };
      }
      try {
        return externalRequestProxy.proxy(result.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_EVENT_REQUEST_ID]: requestId
            },
            rawPath: "/500",
            url: constructNextUrl(result.internalEvent.url, "/500"),
            method: "GET"
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          origin: false,
          isISR: result.isISR,
          initialURL: result.internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    if (process.env.OPEN_NEXT_REQUEST_ID_HEADER || globalThis.openNextDebug) {
      result.headers[INTERNAL_EVENT_REQUEST_ID] = requestId;
    }
    debug("Middleware response", result);
    return result;
  });
};
var handler2 = await createGenericHandler({
  handler: defaultHandler,
  type: "middleware"
});
var middleware_default = {
  fetch: handler2
};
export {
  middleware_default as default,
  handler2 as handler
};
