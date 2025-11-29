// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var Context = class {
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  setLayout = (layout) => this.#layout = layout;
  getLayout = () => this.#layout;
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  notFound = () => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = (method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  };
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// src/_worker.js
var app = new Hono2();
app.use("/api/*", cors());
var profiles = /* @__PURE__ */ new Map();
var matches = /* @__PURE__ */ new Map();
var notices = /* @__PURE__ */ new Map();
var profileIdCounter = 1;
var matchIdCounter = 1;
var noticeIdCounter = 1;
app.get("/", (c) => {
  return c.html(getMainPageHTML());
});
app.get("/admin", (c) => {
  return c.html(getAdminPageHTML());
});
app.get("/notices", (c) => {
  return c.html(getNoticesPageHTML());
});
app.post("/api/admin/login", async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (username === "admin" && password === "admin1234") {
      return c.json({ success: true, token: "YWRtaW46YWRtaW4xMjM0" });
    }
    return c.json({ error: "\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uD2C0\uB9BD\uB2C8\uB2E4" }, 401);
  } catch (err) {
    return c.json({ error: "\uB85C\uADF8\uC778 \uC2E4\uD328" }, 500);
  }
});
app.post("/api/register", async (c) => {
  try {
    const data = await c.req.json();
    if (!data.name || !data.age || !data.gender || !data.country) {
      return c.json({ error: "\uD544\uC218 \uC815\uBCF4\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694" }, 400);
    }
    const profile = {
      id: profileIdCounter++,
      name: data.name,
      age: parseInt(data.age),
      gender: data.gender,
      country: data.country,
      about: data.about || "",
      interests: data.interests || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    profiles.set(profile.id, profile);
    return c.json({ success: true, profile });
  } catch (err) {
    return c.json({ error: "\uD504\uB85C\uD544 \uB4F1\uB85D \uC2E4\uD328" }, 500);
  }
});
app.get("/api/profiles", (c) => {
  const gender = c.req.query("gender");
  const country = c.req.query("country");
  let result = Array.from(profiles.values());
  if (gender) {
    result = result.filter((p) => p.gender === gender);
  }
  if (country) {
    result = result.filter((p) => p.country === country);
  }
  return c.json({ profiles: result });
});
app.get("/api/profiles/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const profile = profiles.get(id);
  if (!profile) {
    return c.json({ error: "\uD504\uB85C\uD544\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }, 404);
  }
  return c.json({ profile });
});
app.post("/api/match", async (c) => {
  try {
    const { fromId, toId } = await c.req.json();
    const fromProfile = profiles.get(fromId);
    const toProfile = profiles.get(toId);
    if (!fromProfile || !toProfile) {
      return c.json({ error: "\uD504\uB85C\uD544\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }, 404);
    }
    const match2 = {
      id: matchIdCounter++,
      fromId,
      toId,
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    matches.set(match2.id, match2);
    return c.json({ success: true, match: match2 });
  } catch (err) {
    return c.json({ error: "\uB9E4\uCE6D \uC694\uCCAD \uC2E4\uD328" }, 500);
  }
});
app.get("/api/stats", (c) => {
  const profileArray = Array.from(profiles.values());
  const matchArray = Array.from(matches.values());
  const stats = {
    totalProfiles: profileArray.length,
    totalMatches: matchArray.length,
    byGender: {
      male: profileArray.filter((p) => p.gender === "\uB0A8\uC131").length,
      female: profileArray.filter((p) => p.gender === "\uC5EC\uC131").length
    },
    byAge: {
      "40s": profileArray.filter((p) => p.age >= 40 && p.age < 50).length,
      "50s": profileArray.filter((p) => p.age >= 50 && p.age < 60).length,
      "60s": profileArray.filter((p) => p.age >= 60 && p.age < 70).length
    }
  };
  return c.json(stats);
});
app.get("/api/admin/members", (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Basic YWRtaW46YWRtaW4xMjM0") {
    return c.json({ error: "\uC778\uC99D \uC2E4\uD328" }, 401);
  }
  return c.json({ members: Array.from(profiles.values()) });
});
app.put("/api/admin/members/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Basic YWRtaW46YWRtaW4xMjM0") {
    return c.json({ error: "\uC778\uC99D \uC2E4\uD328" }, 401);
  }
  const id = parseInt(c.req.param("id"));
  const profile = profiles.get(id);
  if (!profile) {
    return c.json({ error: "\uD68C\uC6D0\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }, 404);
  }
  const data = await c.req.json();
  const updated = { ...profile, ...data };
  profiles.set(id, updated);
  return c.json({ success: true, member: updated });
});
app.delete("/api/admin/members/:id", (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Basic YWRtaW46YWRtaW4xMjM0") {
    return c.json({ error: "\uC778\uC99D \uC2E4\uD328" }, 401);
  }
  const id = parseInt(c.req.param("id"));
  if (!profiles.has(id)) {
    return c.json({ error: "\uD68C\uC6D0\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }, 404);
  }
  profiles.delete(id);
  return c.json({ success: true });
});
app.get("/api/admin/matches", (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Basic YWRtaW46YWRtaW4xMjM0") {
    return c.json({ error: "\uC778\uC99D \uC2E4\uD328" }, 401);
  }
  const matchArray = Array.from(matches.values()).map((match2) => {
    const fromProfile = profiles.get(match2.fromId);
    const toProfile = profiles.get(match2.toId);
    return {
      ...match2,
      fromName: fromProfile?.name || "\uC54C \uC218 \uC5C6\uC74C",
      toName: toProfile?.name || "\uC54C \uC218 \uC5C6\uC74C"
    };
  });
  return c.json({ matches: matchArray });
});
app.get("/api/notices", (c) => {
  return c.json({ notices: Array.from(notices.values()).reverse() });
});
app.post("/api/admin/notices", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Basic YWRtaW46YWRtaW4xMjM0") {
    return c.json({ error: "\uC778\uC99D \uC2E4\uD328" }, 401);
  }
  const { title, content, important } = await c.req.json();
  const notice = {
    id: noticeIdCounter++,
    title,
    content,
    important: important || false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  notices.set(notice.id, notice);
  return c.json({ success: true, notice });
});
app.put("/api/admin/notices/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Basic YWRtaW46YWRtaW4xMjM0") {
    return c.json({ error: "\uC778\uC99D \uC2E4\uD328" }, 401);
  }
  const id = parseInt(c.req.param("id"));
  const notice = notices.get(id);
  if (!notice) {
    return c.json({ error: "\uACF5\uC9C0\uC0AC\uD56D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }, 404);
  }
  const data = await c.req.json();
  const updated = { ...notice, ...data };
  notices.set(id, updated);
  return c.json({ success: true, notice: updated });
});
app.delete("/api/admin/notices/:id", (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Basic YWRtaW46YWRtaW4xMjM0") {
    return c.json({ error: "\uC778\uC99D \uC2E4\uD328" }, 401);
  }
  const id = parseInt(c.req.param("id"));
  if (!notices.has(id)) {
    return c.json({ error: "\uACF5\uC9C0\uC0AC\uD56D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" }, 404);
  }
  notices.delete(id);
  return c.json({ success: true });
});
function getMainPageHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Couple Gate - \uAD6D\uACBD\uC744 \uB118\uC5B4 \uC0AC\uB791\uC744 \uC5F0\uACB0\uD558\uB294 \uAD6D\uC81C \uC5F0\uC560\xB7\uACB0\uD63C \uB9E4\uCE6D \uD50C\uB7AB\uD3FC</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-pink-300 via-red-300 to-purple-400 min-h-screen">
  <div class="container mx-auto px-4 py-4 md:py-8">
    <!-- \uD5E4\uB354 -->
    <div class="text-center text-white mb-6 md:mb-12">
      <div class="flex justify-end items-center mb-4">
        <select id="language-selector" class="bg-white text-black px-3 py-2 rounded-lg shadow-lg border-2 border-pink-500 hover:bg-pink-50 font-bold cursor-pointer">
          <option value="ko">\uD55C\uAD6D\uC5B4</option>
          <option value="en">English</option>
          <option value="zh">\u4E2D\u6587</option>
          <option value="ja">\u65E5\u672C\u8A9E</option>
          <option value="vi">Ti\u1EBFng Vi\u1EC7t</option>
          <option value="ar">\u0627\u0644\u0639\u0631\u0628\u064A\u0629</option>
        </select>
        <a href="/notices" class="ml-4 bg-white text-pink-600 px-4 py-2 rounded-lg shadow-lg hover:bg-pink-50 font-bold">
          <i class="fas fa-bell"></i> <span class="hidden md:inline">\uACF5\uC9C0\uC0AC\uD56D</span>
        </a>
      </div>
      
      <h1 class="text-3xl md:text-5xl font-bold mb-2 md:mb-4" id="main-title">
        <i class="fas fa-heart text-2xl md:text-4xl"></i> Couple Gate
      </h1>
      <p class="text-lg md:text-2xl mb-2" id="main-subtitle">\uAD6D\uACBD\uC744 \uB118\uC5B4 \uC0AC\uB791\uC744 \uC5F0\uACB0\uD558\uB294 \uAD6D\uC81C \uC5F0\uC560\xB7\uACB0\uD63C \uB9E4\uCE6D \uD50C\uB7AB\uD3FC</p>
      <p class="text-base md:text-xl font-bold text-gray-900" id="target-audience">40\uB300\xB750\uB300\xB760\uB300 \uC2F1\uAE00\xB7\uB3CC\uC2F1 \uAE00\uB85C\uBC8C \uAD6D\uC81C \uC5F0\uC560\xB7\uACB0\uD63C</p>
    </div>

    <!-- \uD0ED \uBA54\uB274 -->
    <div class="max-w-4xl mx-auto mb-6">
      <div class="flex flex-wrap gap-2 justify-center">
        <button onclick="showTab('register')" class="tab-btn active px-4 md:px-6 py-2 md:py-3 bg-white text-pink-600 rounded-lg font-bold shadow-lg hover:bg-pink-50" id="tab-register">
          <i class="fas fa-user-plus"></i> <span class="hidden sm:inline">\uD504\uB85C\uD544 \uB4F1\uB85D</span>
        </button>
        <button onclick="showTab('search')" class="tab-btn px-4 md:px-6 py-2 md:py-3 bg-pink-100 text-gray-700 rounded-lg font-bold shadow hover:bg-pink-200" id="tab-search">
          <i class="fas fa-search"></i> <span class="hidden sm:inline">\uD504\uB85C\uD544 \uCC3E\uAE30</span>
        </button>
        <button onclick="showTab('stats')" class="tab-btn px-4 md:px-6 py-2 md:py-3 bg-pink-100 text-gray-700 rounded-lg font-bold shadow hover:bg-pink-200" id="tab-stats">
          <i class="fas fa-chart-bar"></i> <span class="hidden sm:inline">\uD1B5\uACC4</span>
        </button>
      </div>
    </div>

    <!-- \uD504\uB85C\uD544 \uB4F1\uB85D \uD0ED -->
    <div id="register-tab" class="tab-content max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8">
      <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6" id="register-title">
        <i class="fas fa-user-plus text-pink-500"></i> \uD504\uB85C\uD544 \uB4F1\uB85D
      </h2>
      
      <form id="registerForm" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-700 font-semibold mb-2" id="label-name">\uC774\uB984</label>
            <input type="text" id="name" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2" id="label-age">\uB098\uC774 (40-70\uC138)</label>
            <input type="number" id="age" min="40" max="70" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-700 font-semibold mb-2" id="label-gender">\uC131\uBCC4</label>
            <select id="gender" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="">\uC120\uD0DD\uD558\uC138\uC694</option>
              <option value="\uB0A8\uC131">\uB0A8\uC131</option>
              <option value="\uC5EC\uC131">\uC5EC\uC131</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2" id="label-country">\uAD6D\uAC00</label>
            <select id="country" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="">\uC120\uD0DD\uD558\uC138\uC694</option>
              <option value="\uD55C\uAD6D">\uD55C\uAD6D</option>
              <option value="\uBBF8\uAD6D">\uBBF8\uAD6D</option>
              <option value="\uCE90\uB098\uB2E4">\uCE90\uB098\uB2E4</option>
              <option value="\uC77C\uBCF8">\uC77C\uBCF8</option>
              <option value="\uC911\uAD6D">\uC911\uAD6D</option>
              <option value="\uBCA0\uD2B8\uB0A8">\uBCA0\uD2B8\uB0A8</option>
              <option value="\uD0DC\uAD6D">\uD0DC\uAD6D</option>
              <option value="\uD544\uB9AC\uD540">\uD544\uB9AC\uD540</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2" id="label-about">\uC790\uAE30\uC18C\uAC1C</label>
          <textarea id="about" rows="3" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"></textarea>
        </div>

        <div>
          <label class="block text-gray-700 font-semibold mb-2" id="label-interests">\uAD00\uC2EC\uC0AC</label>
          <input type="text" id="interests" placeholder="\uC608: \uC694\uB9AC, \uC5EC\uD589, \uB3C5\uC11C" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
        </div>

        <button type="submit" class="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 transition" id="btn-register">
          <i class="fas fa-paper-plane"></i> \uB4F1\uB85D\uD558\uAE30
        </button>
      </form>

      <div id="registerResult" class="mt-4 hidden"></div>
    </div>

    <!-- \uD504\uB85C\uD544 \uCC3E\uAE30 \uD0ED -->
    <div id="search-tab" class="tab-content hidden max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8">
      <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6" id="search-title">
        <i class="fas fa-search text-pink-500"></i> \uD504\uB85C\uD544 \uCC3E\uAE30
      </h2>
      
      <div class="flex flex-wrap gap-4 mb-6">
        <select id="filterGender" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
          <option value="">\uBAA8\uB4E0 \uC131\uBCC4</option>
          <option value="\uB0A8\uC131">\uB0A8\uC131</option>
          <option value="\uC5EC\uC131">\uC5EC\uC131</option>
        </select>
        <select id="filterCountry" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
          <option value="">\uBAA8\uB4E0 \uAD6D\uAC00</option>
          <option value="\uD55C\uAD6D">\uD55C\uAD6D</option>
          <option value="\uBBF8\uAD6D">\uBBF8\uAD6D</option>
          <option value="\uCE90\uB098\uB2E4">\uCE90\uB098\uB2E4</option>
          <option value="\uC77C\uBCF8">\uC77C\uBCF8</option>
          <option value="\uC911\uAD6D">\uC911\uAD6D</option>
          <option value="\uBCA0\uD2B8\uB0A8">\uBCA0\uD2B8\uB0A8</option>
        </select>
        <button onclick="searchProfiles()" class="px-6 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700" id="btn-search">
          <i class="fas fa-search"></i> \uAC80\uC0C9
        </button>
      </div>

      <div id="profileResults" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>

    <!-- \uD1B5\uACC4 \uD0ED -->
    <div id="stats-tab" class="tab-content hidden max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-4 md:p-8">
      <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6" id="stats-title">
        <i class="fas fa-chart-bar text-pink-500"></i> \uD1B5\uACC4
      </h2>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="statsContainer">
        <!-- \uD1B5\uACC4 \uCE74\uB4DC\uB4E4\uC774 \uC5EC\uAE30 \uD45C\uC2DC\uB429\uB2C8\uB2E4 -->
      </div>
    </div>
  </div>

  <script>
    // \uB2E4\uAD6D\uC5B4 \uC9C0\uC6D0
    const translations = {
      ko: {
        'main-title': 'Couple Gate',
        'main-subtitle': '\uAD6D\uACBD\uC744 \uB118\uC5B4 \uC0AC\uB791\uC744 \uC5F0\uACB0\uD558\uB294 \uAD6D\uC81C \uC5F0\uC560\xB7\uACB0\uD63C \uB9E4\uCE6D \uD50C\uB7AB\uD3FC',
        'target-audience': '40\uB300\xB750\uB300\xB760\uB300 \uC2F1\uAE00\xB7\uB3CC\uC2F1 \uAE00\uB85C\uBC8C \uAD6D\uC81C \uC5F0\uC560\xB7\uACB0\uD63C',
        'tab-register': '\uD504\uB85C\uD544 \uB4F1\uB85D',
        'tab-search': '\uD504\uB85C\uD544 \uCC3E\uAE30',
        'tab-stats': '\uD1B5\uACC4',
        'register-title': '\uD504\uB85C\uD544 \uB4F1\uB85D',
        'label-name': '\uC774\uB984',
        'label-age': '\uB098\uC774 (40-70\uC138)',
        'label-gender': '\uC131\uBCC4',
        'label-country': '\uAD6D\uAC00',
        'label-about': '\uC790\uAE30\uC18C\uAC1C',
        'label-interests': '\uAD00\uC2EC\uC0AC',
        'btn-register': '\uB4F1\uB85D\uD558\uAE30',
        'search-title': '\uD504\uB85C\uD544 \uCC3E\uAE30',
        'btn-search': '\uAC80\uC0C9',
        'stats-title': '\uD1B5\uACC4'
      },
      en: {
        'main-title': 'Couple Gate',
        'main-subtitle': 'International Dating & Marriage Platform Connecting Love Across Borders',
        'target-audience': 'Singles & Divorcees in 40s, 50s, 60s for Global Romance & Marriage',
        'tab-register': 'Register',
        'tab-search': 'Search',
        'tab-stats': 'Statistics',
        'register-title': 'Profile Registration',
        'label-name': 'Name',
        'label-age': 'Age (40-70)',
        'label-gender': 'Gender',
        'label-country': 'Country',
        'label-about': 'About Me',
        'label-interests': 'Interests',
        'btn-register': 'Register',
        'search-title': 'Find Profiles',
        'btn-search': 'Search',
        'stats-title': 'Statistics'
      },
      zh: {
        'main-title': 'Couple Gate',
        'main-subtitle': '\u8DE8\u8D8A\u56FD\u5883\u8FDE\u63A5\u7231\u60C5\u7684\u56FD\u9645\u604B\u7231\xB7\u5A5A\u59FB\u914D\u5BF9\u5E73\u53F0',
        'target-audience': '40\u5C81\xB750\u5C81\xB760\u5C81\u5355\u8EAB\xB7\u79BB\u5F02\u5168\u7403\u56FD\u9645\u604B\u7231\xB7\u5A5A\u59FB',
        'tab-register': '\u6CE8\u518C\u8D44\u6599',
        'tab-search': '\u67E5\u627E\u8D44\u6599',
        'tab-stats': '\u7EDF\u8BA1',
        'register-title': '\u8D44\u6599\u6CE8\u518C',
        'label-name': '\u59D3\u540D',
        'label-age': '\u5E74\u9F84 (40-70\u5C81)',
        'label-gender': '\u6027\u522B',
        'label-country': '\u56FD\u5BB6',
        'label-about': '\u81EA\u6211\u4ECB\u7ECD',
        'label-interests': '\u5174\u8DA3',
        'btn-register': '\u6CE8\u518C',
        'search-title': '\u67E5\u627E\u8D44\u6599',
        'btn-search': '\u641C\u7D22',
        'stats-title': '\u7EDF\u8BA1'
      },
      ja: {
        'main-title': 'Couple Gate',
        'main-subtitle': '\u56FD\u5883\u3092\u8D8A\u3048\u3066\u611B\u3092\u7E4B\u3050\u56FD\u969B\u604B\u611B\xB7\u7D50\u5A5A\u30DE\u30C3\u30C1\u30F3\u30B0\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0',
        'target-audience': '40\u4EE3\xB750\u4EE3\xB760\u4EE3\u30B7\u30F3\u30B0\u30EB\xB7\u30D0\u30C4\u30A4\u30C1\u306E\u30B0\u30ED\u30FC\u30D0\u30EB\u56FD\u969B\u604B\u611B\xB7\u7D50\u5A5A',
        'tab-register': '\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u767B\u9332',
        'tab-search': '\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u691C\u7D22',
        'tab-stats': '\u7D71\u8A08',
        'register-title': '\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u767B\u9332',
        'label-name': '\u540D\u524D',
        'label-age': '\u5E74\u9F62 (40-70\u6B73)',
        'label-gender': '\u6027\u5225',
        'label-country': '\u56FD',
        'label-about': '\u81EA\u5DF1\u7D39\u4ECB',
        'label-interests': '\u8DA3\u5473',
        'btn-register': '\u767B\u9332',
        'search-title': '\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u691C\u7D22',
        'btn-search': '\u691C\u7D22',
        'stats-title': '\u7D71\u8A08'
      },
      vi: {
        'main-title': 'Couple Gate',
        'main-subtitle': 'N\u1EC1n t\u1EA3ng h\u1EB9n h\xF2 & k\u1EBFt h\xF4n qu\u1ED1c t\u1EBF k\u1EBFt n\u1ED1i t\xECnh y\xEAu v\u01B0\u1EE3t bi\xEAn gi\u1EDBi',
        'target-audience': '\u0110\u1ED9c th\xE2n & ly h\xF4n \u1EDF \u0111\u1ED9 tu\u1ED5i 40, 50, 60 cho t\xECnh y\xEAu & h\xF4n nh\xE2n to\xE0n c\u1EA7u',
        'tab-register': '\u0110\u0103ng k\xFD',
        'tab-search': 'T\xECm ki\u1EBFm',
        'tab-stats': 'Th\u1ED1ng k\xEA',
        'register-title': '\u0110\u0103ng k\xFD h\u1ED3 s\u01A1',
        'label-name': 'T\xEAn',
        'label-age': 'Tu\u1ED5i (40-70)',
        'label-gender': 'Gi\u1EDBi t\xEDnh',
        'label-country': 'Qu\u1ED1c gia',
        'label-about': 'Gi\u1EDBi thi\u1EC7u b\u1EA3n th\xE2n',
        'label-interests': 'S\u1EDF th\xEDch',
        'btn-register': '\u0110\u0103ng k\xFD',
        'search-title': 'T\xECm h\u1ED3 s\u01A1',
        'btn-search': 'T\xECm ki\u1EBFm',
        'stats-title': 'Th\u1ED1ng k\xEA'
      },
      ar: {
        'main-title': 'Couple Gate',
        'main-subtitle': '\u0645\u0646\u0635\u0629 \u0627\u0644\u0645\u0648\u0627\u0639\u062F\u0629 \u0648\u0627\u0644\u0632\u0648\u0627\u062C \u0627\u0644\u062F\u0648\u0644\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u0631\u0628\u0637 \u0627\u0644\u062D\u0628 \u0639\u0628\u0631 \u0627\u0644\u062D\u062F\u0648\u062F',
        'target-audience': '\u0627\u0644\u0639\u0632\u0627\u0628 \u0648\u0627\u0644\u0645\u0637\u0644\u0642\u0648\u0646 \u0641\u064A \u0627\u0644\u0623\u0631\u0628\u0639\u064A\u0646\u064A\u0627\u062A \u0648\u0627\u0644\u062E\u0645\u0633\u064A\u0646\u064A\u0627\u062A \u0648\u0627\u0644\u0633\u062A\u064A\u0646\u064A\u0627\u062A \u0644\u0644\u0631\u0648\u0645\u0627\u0646\u0633\u064A\u0629 \u0648\u0627\u0644\u0632\u0648\u0627\u062C \u0627\u0644\u0639\u0627\u0644\u0645\u064A',
        'tab-register': '\u062A\u0633\u062C\u064A\u0644',
        'tab-search': '\u0628\u062D\u062B',
        'tab-stats': '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A',
        'register-title': '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A',
        'label-name': '\u0627\u0644\u0627\u0633\u0645',
        'label-age': '\u0627\u0644\u0639\u0645\u0631 (40-70)',
        'label-gender': '\u0627\u0644\u062C\u0646\u0633',
        'label-country': '\u0627\u0644\u062F\u0648\u0644\u0629',
        'label-about': '\u0639\u0646 \u0646\u0641\u0633\u064A',
        'label-interests': '\u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A',
        'btn-register': '\u062A\u0633\u062C\u064A\u0644',
        'search-title': '\u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0645\u0644\u0641\u0627\u062A',
        'btn-search': '\u0628\u062D\u062B',
        'stats-title': '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A'
      }
    };

    document.getElementById('language-selector').addEventListener('change', function() {
      const lang = this.value;
      const trans = translations[lang];
      
      if (lang === 'ar') {
        document.body.setAttribute('dir', 'rtl');
      } else {
        document.body.setAttribute('dir', 'ltr');
      }
      
      for (const [id, text] of Object.entries(trans)) {
        const elem = document.getElementById(id);
        if (elem) {
          if (elem.tagName === 'BUTTON') {
            const icon = elem.querySelector('i');
            if (icon) {
              elem.innerHTML = icon.outerHTML + ' <span class="hidden sm:inline">' + text + '</span>';
            } else {
              elem.innerHTML = text;
            }
          } else {
            const icon = elem.querySelector('i');
            if (icon) {
              elem.innerHTML = icon.outerHTML + ' ' + text;
            } else {
              elem.textContent = text;
            }
          }
        }
      }
    });

    // \uD0ED \uC804\uD658
    function showTab(tab) {
      document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-white', 'text-pink-600');
        b.classList.add('bg-pink-100', 'text-gray-700');
      });
      
      document.getElementById(tab + '-tab').classList.remove('hidden');
      const btn = document.querySelector(\`button[onclick="showTab('\${tab}')"]\`);
      btn.classList.add('active', 'bg-white', 'text-pink-600');
      btn.classList.remove('bg-pink-100', 'text-gray-700');
      
      if (tab === 'stats') {
        loadStats();
      } else if (tab === 'search') {
        searchProfiles();
      }
    }

    // \uD504\uB85C\uD544 \uB4F1\uB85D
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const data = {
        name: document.getElementById('name').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        country: document.getElementById('country').value,
        about: document.getElementById('about').value,
        interests: document.getElementById('interests').value
      };
      
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          document.getElementById('registerResult').innerHTML = \`
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <p class="text-green-800"><i class="fas fa-check-circle"></i> \uD504\uB85C\uD544\uC774 \uC131\uACF5\uC801\uC73C\uB85C \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4!</p>
            </div>
          \`;
          document.getElementById('registerResult').classList.remove('hidden');
          document.getElementById('registerForm').reset();
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        document.getElementById('registerResult').innerHTML = \`
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800"><i class="fas fa-exclamation-circle"></i> \${err.message}</p>
          </div>
        \`;
        document.getElementById('registerResult').classList.remove('hidden');
      }
    });

    // \uD504\uB85C\uD544 \uAC80\uC0C9
    async function searchProfiles() {
      const gender = document.getElementById('filterGender').value;
      const country = document.getElementById('filterCountry').value;
      
      let url = '/api/profiles?';
      if (gender) url += \`gender=\${gender}&\`;
      if (country) url += \`country=\${country}\`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        const container = document.getElementById('profileResults');
        container.innerHTML = '';
        
        if (data.profiles.length === 0) {
          container.innerHTML = '<p class="col-span-2 text-center text-gray-500">\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
          return;
        }
        
        data.profiles.forEach(profile => {
          const card = document.createElement('div');
          card.className = 'bg-pink-50 rounded-lg p-4 shadow hover:shadow-lg transition';
          card.innerHTML = \`
            <div class="flex items-center mb-2">
              <i class="fas fa-user-circle text-3xl text-pink-500 mr-3"></i>
              <div>
                <h3 class="font-bold text-lg">\${profile.name}</h3>
                <p class="text-sm text-gray-600">\${profile.age}\uC138 \xB7 \${profile.gender} \xB7 \${profile.country}</p>
              </div>
            </div>
            <p class="text-gray-700 text-sm mb-2">\${profile.about || '\uC790\uAE30\uC18C\uAC1C \uC5C6\uC74C'}</p>
            <p class="text-gray-600 text-sm"><i class="fas fa-heart text-pink-400"></i> \${profile.interests || '\uAD00\uC2EC\uC0AC \uC5C6\uC74C'}</p>
          \`;
          container.appendChild(card);
        });
      } catch (err) {
        console.error('\uAC80\uC0C9 \uC2E4\uD328:', err);
      }
    }

    // \uD1B5\uACC4 \uB85C\uB4DC
    async function loadStats() {
      try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        const container = document.getElementById('statsContainer');
        container.innerHTML = \`
          <div class="bg-pink-50 rounded-lg p-4 text-center">
            <i class="fas fa-users text-3xl text-pink-500 mb-2"></i>
            <p class="text-2xl font-bold text-gray-800">\${stats.totalProfiles}</p>
            <p class="text-gray-600 text-sm">\uC804\uCCB4 \uD68C\uC6D0</p>
          </div>
          <div class="bg-blue-50 rounded-lg p-4 text-center">
            <i class="fas fa-heart text-3xl text-blue-500 mb-2"></i>
            <p class="text-2xl font-bold text-gray-800">\${stats.totalMatches}</p>
            <p class="text-gray-600 text-sm">\uB9E4\uCE6D \uC218</p>
          </div>
          <div class="bg-purple-50 rounded-lg p-4 text-center">
            <i class="fas fa-venus-mars text-3xl text-purple-500 mb-2"></i>
            <p class="text-2xl font-bold text-gray-800">\${stats.byGender.male} / \${stats.byGender.female}</p>
            <p class="text-gray-600 text-sm">\uB0A8\uC131 / \uC5EC\uC131</p>
          </div>
          <div class="bg-green-50 rounded-lg p-4 text-center">
            <i class="fas fa-chart-pie text-3xl text-green-500 mb-2"></i>
            <p class="text-lg font-bold text-gray-800">\${stats.byAge['40s']}/\${stats.byAge['50s']}/\${stats.byAge['60s']}</p>
            <p class="text-gray-600 text-sm">40\uB300/50\uB300/60\uB300</p>
          </div>
        \`;
      } catch (err) {
        console.error('\uD1B5\uACC4 \uB85C\uB4DC \uC2E4\uD328:', err);
      }
    }

    // \uD398\uC774\uC9C0 \uB85C\uB4DC\uC2DC \uCD08\uAE30\uD654
    loadStats();
  </script>

  <!-- \uCC57\uBD07 \uC2A4\uD0C0\uC77C -->
  <style>
    .chatbot-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 120px;
      height: 120px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.6);
      z-index: 9998;
      transition: transform 0.3s ease;
    }
    .chatbot-button:hover { transform: scale(1.1); }
    .chatbot-button i { color: white; font-size: 56px; }
    .ai-badge {
      position: absolute;
      top: -10px;
      right: -10px;
      background: #ff4757;
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      border: 4px solid white;
    }
    .chatbot-window {
      position: fixed;
      bottom: 150px;
      right: 20px;
      width: 760px;
      max-width: calc(100vw - 40px);
      height: 1000px;
      max-height: calc(100vh - 180px);
      background: white;
      border-radius: 24px;
      box-shadow: 0 16px 64px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .chatbot-window.active { display: flex; }
    .chatbot-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .chatbot-header-left { display: flex; align-items: center; gap: 24px; }
    .chatbot-avatar {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chatbot-avatar i { color: #667eea; font-size: 48px; }
    .chatbot-title h3 { margin: 0; font-size: 32px; font-weight: bold; }
    .chatbot-title p { margin: 0; font-size: 24px; opacity: 0.9; }
    .chatbot-close { cursor: pointer; font-size: 48px; opacity: 0.8; transition: opacity 0.2s; }
    .chatbot-close:hover { opacity: 1; }
    .chatbot-body { flex: 1; overflow-y: auto; padding: 32px; background: #f7f9fc; }
    .faq-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 4px solid #e0e7ff;
    }
    .faq-header i { color: #667eea; font-size: 36px; }
    .faq-header h4 { margin: 0; color: #1e293b; font-size: 30px; font-weight: 600; }
    .faq-list { display: flex; flex-direction: column; gap: 16px; }
    .faq-item {
      background: white;
      padding: 24px 32px;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .faq-item:hover {
      background: #f1f5f9;
      border-color: #667eea;
      transform: translateX(8px);
    }
    .faq-item span { font-size: 28px; color: #334155; flex: 1; }
    .faq-item i { color: #94a3b8; font-size: 24px; }
    .chatbot-answer {
      background: #ede9fe;
      border-left: 8px solid #667eea;
      padding: 32px;
      border-radius: 16px;
      margin-top: 32px;
      display: none;
    }
    .chatbot-answer.active { display: block; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .answer-text { color: #1e293b; font-size: 28px; line-height: 1.8; white-space: pre-wrap; }
    .back-button {
      background: #667eea;
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 26px;
      margin-top: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: background 0.2s;
    }
    .back-button:hover { background: #5568d3; }
    @media (max-width: 768px) {
      .chatbot-window { width: calc(100vw - 20px); right: 10px; bottom: 140px; height: calc(100vh - 160px); }
      .chatbot-button { width: 112px; height: 112px; right: 15px; bottom: 15px; }
      .chatbot-button i { font-size: 48px; }
      .ai-badge { width: 40px; height: 40px; font-size: 16px; }
      .chatbot-header { padding: 20px; }
      .chatbot-avatar { width: 60px; height: 60px; }
      .chatbot-avatar i { font-size: 36px; }
      .chatbot-title h3 { font-size: 24px; }
      .chatbot-title p { font-size: 18px; }
      .chatbot-close { font-size: 36px; }
      .chatbot-body { padding: 20px; }
      .faq-header i { font-size: 28px; }
      .faq-header h4 { font-size: 24px; }
      .faq-item { padding: 18px 24px; }
      .faq-item span { font-size: 22px; }
      .faq-item i { font-size: 20px; }
      .answer-text { font-size: 22px; }
      .back-button { padding: 12px 24px; font-size: 20px; }
    }
  </style>

  <!-- \uCC57\uBD07 HTML -->
  <div class="chatbot-button" onclick="toggleChatbot()">
    <i class="fas fa-robot"></i>
    <div class="ai-badge">AI</div>
  </div>

  <div class="chatbot-window" id="chatbotWindow">
    <div class="chatbot-header">
      <div class="chatbot-header-left">
        <div class="chatbot-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="chatbot-title">
          <h3 id="chatbot-title">\uCC57\uBD07</h3>
          <p id="chatbot-subtitle">\uAD81\uAE08\uD558\uC2E0 \uC9C8\uBB38\uC740 \uC6B4\uC601\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694</p>
        </div>
      </div>
      <div class="chatbot-close" onclick="toggleChatbot()">
        <i class="fas fa-times"></i>
      </div>
    </div>
    
    <div class="chatbot-body">
      <div class="faq-header">
        <i class="fas fa-lightbulb"></i>
        <h4 id="faq-title">\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38</h4>
      </div>
      
      <div class="faq-list" id="faqList"></div>
      
      <div class="chatbot-answer" id="chatbotAnswer">
        <div class="answer-text" id="answerText"></div>
        <button class="back-button" onclick="showQuestions()">
          <i class="fas fa-arrow-left"></i>
          <span id="back-button-text">\uC9C8\uBB38 \uBAA9\uB85D\uC73C\uB85C</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    const chatbotFaqData = {
      "ko": {
        "title": "\uCC57\uBD07",
        "subtitle": "\uAD81\uAE08\uD558\uC2E0 \uC9C8\uBB38\uC740 \uC6B4\uC601\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694",
        "faqTitle": "\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38",
        "backButton": "\uC9C8\uBB38 \uBAA9\uB85D\uC73C\uB85C",
        "questions": [
          {"q": "CoupleGate\uB294 \uC5B4\uB5A4 \uD50C\uB7AB\uD3FC\uC778\uAC00\uC694?", "a": "CoupleGate\uB294 \uC804 \uC138\uACC4 \uC0AC\uB78C\uB4E4\uACFC \uC9C4\uC9C0\uD55C \uAD6D\uC81C \uC5F0\uC560\xB7\uACB0\uD63C\uC744 \uC5F0\uACB0\uD558\uB294 \uAE00\uB85C\uBC8C \uB9E4\uCE6D \uD50C\uB7AB\uD3FC\uC785\uB2C8\uB2E4. AI \uAE30\uBC18 \uB9E4\uCE6D, \uC2E4\uC2DC\uAC04 \uBC88\uC5ED, \uD654\uC0C1\uD1B5\uD654 \uB4F1 \uC7A5\uAC70\uB9AC\xB7\uAD6D\uC81C \uC5F0\uC560\uC5D0 \uD544\uC694\uD55C \uAE30\uB2A5\uC744 \uBAA8\uB450 \uC81C\uACF5\uD569\uB2C8\uB2E4."},
          {"q": "\uC8FC \uC774\uC6A9\uC790\uB294 \uC5B4\uB5A4 \uC0AC\uB78C\uB4E4\uC778\uAC00\uC694?", "a": "40\uB300\xB750\uB300\xB760\uB300 \uC2F1\uAE00, \uB3CC\uC2F1, \uAE00\uB85C\uBC8C \uC5F0\uC560\xB7\uACB0\uD63C\uC744 \uC6D0\uD558\uB294 \uBD84\uB4E4\uC774 \uC911\uC2EC\uC785\uB2C8\uB2E4. \uC2E0\uB8B0\uC131 \uC788\uB294 \uB300\uD654\xB7\uB9E4\uCE6D\uC744 \uC704\uD574 \uC5C4\uACA9\uD55C \uC778\uC99D \uC2DC\uC2A4\uD15C\uC774 \uC801\uC6A9\uB429\uB2C8\uB2E4."},
          {"q": "\uBB34\uB8CC \uD68C\uC6D0\uACFC \uC720\uB8CC \uD68C\uC6D0 \uCC28\uC774\uAC00 \uBB34\uC5C7\uC778\uAC00\uC694?", "a": "\uBB34\uB8CC \uD68C\uC6D0: \uBA54\uB274\xB7\uAC80\uC0C9 \uC77C\uBD80 \uAE30\uB2A5\uB9CC \uC0AC\uC6A9 \uAC00\uB2A5\\n\uC720\uB8CC \uD68C\uC6D0: \uBAA8\uB4E0 \uAE30\uB2A5 \uAC1C\uBC29 (\uB9E4\uCE6D, \uBA54\uC2DC\uC9C0, \uD654\uC0C1\uD1B5\uD654, \uBC88\uC5ED, \uACE0\uAE09 \uD544\uD130, \uD504\uB85C\uD544 \uBD84\uC11D \uB4F1)\\n3\uAC1C \uC774\uC0C1 \uC18C\uC15C \uBBF8\uB514\uC5B4 \uC778\uC99D \uD544\uC218 \u2192 \uD68C\uC6D0 \uC790\uACA9 \uD65C\uC131\uD654"},
          {"q": "\uD68C\uC6D0\uAC00\uC785\uC740 \uC5B4\uB5BB\uAC8C \uD558\uB098\uC694?", "a": "'Sign Up Free' \uD074\uB9AD \u2192 \uC774\uBA54\uC77C \uC785\uB825\\n3\uAC1C \uC774\uC0C1 SNS \uACC4\uC815 \uC778\uC99D (Facebook/Instagram/Kakao/X/Naver/Google/WeChat)\\n\uD504\uB85C\uD544 \uC0AC\uC9C4\xB7\uC790\uAE30\uC18C\uAC1C \uC791\uC131\\n\uBB34\uB8CC \uD68C\uC6D0 \uC790\uACA9 \uD68D\uB4DD"},
          {"q": "SNS \uC778\uC99D\uC740 \uC65C 3\uAC1C \uC774\uC0C1 \uD544\uC694\uD55C\uAC00\uC694?", "a": "\uAD6D\uC81C \uB9E4\uCE6D \uD50C\uB7AB\uD3FC\uC5D0\uC11C \uAC00\uC7A5 \uC911\uC694\uD55C \uC694\uC18C\uB294 \uC2E0\uB8B0\uC131 \uD655\uBCF4\uC785\uB2C8\uB2E4. \uB2E4\uC911 SNS \uC778\uC99D\uC740 \uC0AC\uAE30 \uACC4\uC815\uC744 \uCC28\uB2E8\uD558\uACE0 \uC548\uC815\uC801\uC778 \uB9E4\uCE6D\uC744 \uC81C\uACF5\uD569\uB2C8\uB2E4."},
          {"q": "\uC5B4\uB5A4 \uACC4\uC815\uB4E4\uC744 \uC778\uC99D\uD560 \uC218 \uC788\uB098\uC694?", "a": "Facebook, Instagram, Kakao, X(Twitter), Naver, Google, WeChat \u2014 \uCD1D 7\uAC1C \uC911 3\uAC1C \uC774\uC0C1 \uC778\uC99D\uD574\uC57C \uD68C\uC6D0 \uAC00\uC785 \uC644\uB8CC\uB429\uB2C8\uB2E4."},
          {"q": "\uC5BC\uAD74 \uC778\uC99D\xB7\uC2E0\uBD84\uC99D \uC778\uC99D\uC740 \uBB34\uC5C7\uC778\uAC00\uC694?", "a": "AI \uAE30\uBC18 \uC5BC\uAD74 \uB9E4\uCE6D\xB7ID \uC778\uC99D\uC744 \uD1B5\uD574 \uAC00\uC9DC \uC0AC\uC9C4\xB7\uB3C4\uC6A9\uC744 \uBC29\uC9C0\uD558\uACE0 \uC2E4\uC81C \uBCF8\uC778\uC784\uC744 \uC790\uB3D9 \uAC80\uC99D\uD569\uB2C8\uB2E4."},
          {"q": "AI \uD504\uB85C\uD544 \uC790\uB3D9 \uAC80\uC99D \uAE30\uB2A5\uC774 \uC788\uB098\uC694?", "a": "\uC608. Deepfake\xB7\uD569\uC131\xB7\uC911\uBCF5 \uC0AC\uC9C4\uC744 AI\uAC00 \uC790\uB3D9 \uBD84\uC11D\uD574 \uC704\uD5D8 \uACC4\uC815\uC744 \uAC78\uB7EC\uC90D\uB2C8\uB2E4."},
          {"q": "AI \uD504\uB85C\uD544 \uC790\uB3D9 \uC791\uC131 \uAE30\uB2A5\uC740 \uBB34\uC5C7\uC778\uAC00\uC694?", "a": "\uC5C5\uB85C\uB4DC\uD55C \uC0AC\uC9C4\xB7\uAD00\uC2EC\uC0AC\uB97C \uBD84\uC11D\uD574\\n\uC790\uAE30\uC18C\uAC1C \uC790\uB3D9 \uC0DD\uC131\\n\uCD5C\uACE0\uC758 \uC0AC\uC9C4 \uC870\uD569 \uCD94\uCC9C\\n\uB9E4\uB825\uC801\uC778 \uBB38\uC7A5 \uB9AC\uB77C\uC774\uD305\\n\uB4F1\uC744 \uC790\uB3D9\uC73C\uB85C \uB3C4\uC640\uC90D\uB2C8\uB2E4."},
          {"q": "\uBB38\uD654 \uCC28\uC774 \uCF54\uCE6D \uAE30\uB2A5\uC774 \uC788\uB098\uC694?", "a": "\uC788\uC2B5\uB2C8\uB2E4. \uAD6D\uAC00\uBCC4 \uB370\uC774\uD2B8 \uB9E4\uB108\xB7\uC8FC\uC758\uC0AC\uD56D\xB7\uAE08\uAE30\uC0AC\uD56D\uC744 \uC790\uB3D9 \uC548\uB0B4\uD558\uC5EC \uC624\uD574 \uC5C6\uC774 \uAD00\uACC4\uB97C \uC720\uC9C0\uD560 \uC218 \uC788\uB3C4\uB85D \uB3C4\uC640\uC90D\uB2C8\uB2E4. \uC608: \uD55C\uAD6D \uB0A8\uC131 \u2194 \uBCA0\uD2B8\uB0A8 \uC5EC\uC131 \uB300\uD654 \uD301 \uB4F1"},
          {"q": "AI \uBC88\uC5ED \uAE30\uB2A5\uC740 \uC5B4\uB5BB\uAC8C \uB3D9\uC791\uD558\uB098\uC694?", "a": "\uBA54\uC2DC\uC9C0\uB97C \uBCF4\uB0B4\uBA74 \uC790\uB3D9\uC73C\uB85C \uC0C1\uB300 \uAD6D\uAC00 \uC5B8\uC5B4\uB85C \uBC88\uC5ED\uB418\uBA70 \uC6D0\uBB38 + \uBC88\uC5ED\uBB38\uC774 \uD568\uAED8 \uD45C\uC2DC\uB429\uB2C8\uB2E4."},
          {"q": "\uC0C1\uB300\uBC29 \uC751\uB2F5\uC774 \uB290\uB9B0 \uC774\uC720\uB97C \uBD84\uC11D\uD574\uC8FC\uB294 \uAE30\uB2A5\uC774 \uC788\uB098\uC694?", "a": "\uC788\uC2B5\uB2C8\uB2E4. \uBA54\uC2DC\uC9C0 \uD328\uD134\xB7\uAC10\uC815 \uBD84\uC11D\uC744 \uAE30\uBC18\uC73C\uB85C '\uBC14\uBE60\uC11C \uC9C0\uC5F0', '\uAD00\uC2EC\uB3C4 \uB0AE\uC74C', '\uC2E0\uC911\uD568' \uB4F1\uC744 AI\uAC00 \uCD94\uC815\uD574\uC90D\uB2C8\uB2E4."},
          {"q": "\uC74C\uC131 \uBA54\uC2DC\uC9C0\uB3C4 \uBC88\uC5ED\uB418\uB098\uC694?", "a": "\uAC00\uB2A5\uD569\uB2C8\uB2E4. \uC74C\uC131\uC744 \uD14D\uC2A4\uD2B8\uB85C \uBCC0\uD658 \u2192 \uBC88\uC5ED \u2192 \uAC10\uC815 \uBD84\uC11D\uAE4C\uC9C0 \uC790\uB3D9 \uCC98\uB9AC\uB429\uB2C8\uB2E4."},
          {"q": "\uC0AC\uC9C4\uC740 \uBA87 \uC7A5\uAE4C\uC9C0 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uB098\uC694?", "a": "\uCD5C\uB300 10\uC7A5\uAE4C\uC9C0 \uAC00\uB2A5\uD569\uB2C8\uB2E4."},
          {"q": "\uB3D9\uC601\uC0C1\uB3C4 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uB098\uC694?", "a": "\uB124, \uCD5C\uB300 3\uAC1C\uC758 \uB3D9\uC601\uC0C1\uC744 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."},
          {"q": "\uD504\uB85C\uD544 \uB9E4\uB825\uB3C4 \uC810\uC218 \uAE30\uB2A5\uC774 \uC788\uB098\uC694?", "a": "\uC788\uC2B5\uB2C8\uB2E4. \uC0AC\uC9C4\xB7\uBB38\uC7A5\xB7\uAD00\uC2EC\uC0AC\uB97C \uBD84\uC11D\uD558\uC5EC Attractiveness Score\uB97C \uC81C\uACF5\uD558\uACE0 \uAC1C\uC120 \uD301\uAE4C\uC9C0 \uC548\uB0B4\uD569\uB2C8\uB2E4."},
          {"q": "\uACC4\uC815\uC744 \uD0C8\uD1F4\uD558\uACE0 \uC2F6\uC5B4\uC694", "a": "\uC571 \uC624\uB978\uCABD \uC0C1\uB2E8 \uBA54\uB274 \u2192 Settings(\uC124\uC815) \u2192 Account(\uACC4\uC815 \uAD00\uB9AC) \uC120\uD0DD \u2192 \uD654\uBA74 \uB9E8 \uD558\uB2E8\uC758 Delete Account(\uACC4\uC815 \uC0AD\uC81C) \uD074\uB9AD \u2192 \uBCF8\uC778 \uC778\uC99D \uD6C4 \uD0C8\uD1F4 \uC644\uB8CC\\n\u203B \uD0C8\uD1F4 \uC989\uC2DC \uBAA8\uB4E0 \uD504\uB85C\uD544\xB7\uB9E4\uCE6D\xB7\uBA54\uC2DC\uC9C0 \uAE30\uB85D\uC774 \uC0AD\uC81C\uB418\uBA70 \uBCF5\uAD6C\uAC00 \uBD88\uAC00\uB2A5\uD569\uB2C8\uB2E4."},
          {"q": "\uD504\uB9AC\uBBF8\uC5C4 \uACB0\uC81C \uD6C4 \uD658\uBD88\uC744 \uBC1B\uACE0 \uC2F6\uC5B4\uC694", "a": "\uACB0\uC81C \uD6C4 48\uC2DC\uAC04 \uC774\uB0B4, \uC720\uB8CC \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC740 \uACBD\uC6B0 \uD658\uBD88 \uAC00\uB2A5\uD569\uB2C8\uB2E4. \uACB0\uC81C \uC624\uB958 \uC2DC\uC5D0\uB3C4 \uD658\uBD88 \uAC00\uB2A5\uD569\uB2C8\uB2E4. \uD658\uBD88 \uBB38\uC758\uB294 \uACE0\uAC1D\uC13C\uD130\uB85C \uC601\uC218\uC99D\uACFC \uD568\uAED8 \uC81C\uCD9C\uD574\uC8FC\uC138\uC694."},
          {"q": "\uC18C\uC15C \uBBF8\uB514\uC5B4 \uC778\uC99D\uC774 \uACC4\uC18D \uC2E4\uD328\uD574\uC694", "a": "SNS \uB85C\uADF8\uC778 \uC815\uBCF4 \uC624\uB958, \uB3D9\uC77C \uACC4\uC815 \uC911\uBCF5 \uB85C\uADF8\uC778, \uAD8C\uD55C \uAC70\uBD80, \uD504\uB85C\uD544 \uC815\uBCF4 \uBD80\uC871, VPN \uC0AC\uC6A9, \uD31D\uC5C5 \uCC28\uB2E8 \uB4F1\uC774 \uC6D0\uC778\uC785\uB2C8\uB2E4. SNS \uC815\uC0C1 \uB85C\uADF8\uC778 \uD655\uC778, \uD31D\uC5C5 \uD5C8\uC6A9, VPN \uB044\uAE30, \uAE30\uBCF8\uC815\uBCF4 \uB4F1\uB85D \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."}
        ]
      },
      "en": {
        "title": "Chatbot",
        "subtitle": "How can I help you?",
        "faqTitle": "Frequently Asked Questions",
        "backButton": "Back to questions",
        "questions": [
          {"q": "What is CoupleGate?", "a": "CoupleGate is a global matching platform connecting people worldwide for serious international dating and marriage. It provides AI-based matching, real-time translation, video calls, and all features necessary for long-distance international relationships."},
          {"q": "Who are the main users?", "a": "Singles and divorcees in their 40s, 50s, and 60s seeking global dating and marriage. A strict verification system is applied for reliable conversations and matching."},
          {"q": "What's the difference between free and premium?", "a": "Free members: Limited menu and search features\\nPremium members: Full access (matching, messaging, video calls, translation, advanced filters, profile analysis)\\n3+ social media verifications required"},
          {"q": "How do I sign up?", "a": "Click 'Sign Up Free' \u2192 Enter email \u2192 Verify 3+ SNS accounts (Facebook/Instagram/Kakao/X/Naver/Google/WeChat) \u2192 Add profile photo and bio \u2192 Complete free membership"},
          {"q": "Why do I need 3+ SNS verifications?", "a": "Trust is the most important element in international matching platforms. Multi-SNS verification blocks fraudulent accounts and provides stable matching."},
          {"q": "Which accounts can I verify?", "a": "Facebook, Instagram, Kakao, X(Twitter), Naver, Google, WeChat \u2014 You need to verify at least 3 out of 7 accounts to complete sign-up."},
          {"q": "What is face & ID verification?", "a": "AI-based face matching and ID verification automatically validates your identity to prevent fake photos and identity theft."},
          {"q": "Is there automatic profile verification?", "a": "Yes. AI automatically analyzes Deepfake, composite, and duplicate photos to filter out risky accounts."},
          {"q": "What is automatic profile creation?", "a": "Analyzes uploaded photos and interests to:\\nAuto-generate bio\\nRecommend best photo combinations\\nRewrite attractive sentences\\nand more."},
          {"q": "Is there cultural difference coaching?", "a": "Yes. Provides automatic guidance on dating manners, precautions, and taboos by country to maintain relationships without misunderstandings. Example: Korean men \u2194 Vietnamese women conversation tips"},
          {"q": "How does AI translation work?", "a": "Messages are automatically translated to the recipient's language, displaying both original and translated text together."},
          {"q": "Can you analyze why responses are slow?", "a": "Yes. Based on message patterns and emotion analysis, AI estimates reasons like 'busy delay', 'low interest', 'being careful', etc."},
          {"q": "Are voice messages translated too?", "a": "Yes. Voice is converted to text \u2192 translated \u2192 emotion analyzed automatically."},
          {"q": "How many photos can I upload?", "a": "Up to 10 photos."},
          {"q": "Can I upload videos too?", "a": "Yes, up to 3 videos."},
          {"q": "Is there a profile attractiveness score?", "a": "Yes. Analyzes photos, descriptions, and interests to provide an Attractiveness Score with improvement tips."},
          {"q": "How do I delete my account?", "a": "Top right menu \u2192 Settings \u2192 Account management \u2192 Delete Account at bottom \u2192 Verify identity \u2192 Complete deletion\\n\u203B All profile, match, and message records are permanently deleted and cannot be recovered."},
          {"q": "Can I get a refund after premium payment?", "a": "Refunds available within 48 hours if premium features weren't used. Also available for payment errors. Submit refund requests with receipt to customer service."},
          {"q": "Why does SNS verification keep failing?", "a": "Causes: Wrong SNS login info, duplicate logins on multiple devices, permission denied, missing profile info, VPN usage, popup blocked. Solutions: Verify SNS login, allow popups, disable VPN, add profile info, retry."}
        ]
      },
      "zh": {
        "title": "\u804A\u5929\u673A\u5668\u4EBA",
        "subtitle": "\u6211\u80FD\u5E2E\u60A8\u4EC0\u4E48\uFF1F",
        "faqTitle": "\u5E38\u89C1\u95EE\u9898",
        "backButton": "\u8FD4\u56DE\u95EE\u9898\u5217\u8868",
        "questions": [
          {"q": "CoupleGate\u662F\u4EC0\u4E48\uFF1F", "a": "CoupleGate\u662F\u4E00\u4E2A\u5168\u7403\u914D\u5BF9\u5E73\u53F0\uFF0C\u8FDE\u63A5\u4E16\u754C\u5404\u5730\u7684\u4EBA\u4EEC\u8FDB\u884C\u8BA4\u771F\u7684\u56FD\u9645\u7EA6\u4F1A\u548C\u5A5A\u59FB\u3002\u5B83\u63D0\u4F9B\u57FA\u4E8EAI\u7684\u914D\u5BF9\u3001\u5B9E\u65F6\u7FFB\u8BD1\u3001\u89C6\u9891\u901A\u8BDD\u7B49\u8FDC\u8DDD\u79BB\u56FD\u9645\u5173\u7CFB\u6240\u9700\u7684\u6240\u6709\u529F\u80FD\u3002"},
          {"q": "\u4E3B\u8981\u7528\u6237\u662F\u8C01\uFF1F", "a": "40\u5C81\u300150\u5C81\u300160\u5C81\u7684\u5355\u8EAB\u8005\u3001\u79BB\u5F02\u8005\uFF0C\u5E0C\u671B\u5168\u7403\u7EA6\u4F1A\u548C\u7ED3\u5A5A\u7684\u4EBA\u4E3A\u4E2D\u5FC3\u3002\u4E3A\u4E86\u53EF\u9760\u7684\u5BF9\u8BDD\u548C\u914D\u5BF9\uFF0C\u5E94\u7528\u4E86\u4E25\u683C\u7684\u8BA4\u8BC1\u7CFB\u7EDF\u3002"},
          {"q": "\u514D\u8D39\u4F1A\u5458\u548C\u4ED8\u8D39\u4F1A\u5458\u6709\u4EC0\u4E48\u533A\u522B\uFF1F", "a": "\u514D\u8D39\u4F1A\u5458\uFF1A\u4EC5\u9650\u90E8\u5206\u83DC\u5355\u548C\u641C\u7D22\u529F\u80FD\\n\u4ED8\u8D39\u4F1A\u5458\uFF1A\u5B8C\u5168\u8BBF\u95EE\uFF08\u914D\u5BF9\u3001\u6D88\u606F\u3001\u89C6\u9891\u901A\u8BDD\u3001\u7FFB\u8BD1\u3001\u9AD8\u7EA7\u8FC7\u6EE4\u5668\u3001\u4E2A\u4EBA\u8D44\u6599\u5206\u6790\uFF09\\n\u9700\u89813\u4E2A\u4EE5\u4E0A\u793E\u4EA4\u5A92\u4F53\u9A8C\u8BC1"},
          {"q": "\u5982\u4F55\u6CE8\u518C\uFF1F", "a": "\u70B9\u51FB'\u514D\u8D39\u6CE8\u518C'\u2192\u8F93\u5165\u7535\u5B50\u90AE\u4EF6\u2192\u9A8C\u8BC13\u4E2A\u4EE5\u4E0ASNS\u5E10\u6237\uFF08Facebook/Instagram/Kakao/X/Naver/Google/WeChat\uFF09\u2192\u6DFB\u52A0\u4E2A\u4EBA\u8D44\u6599\u7167\u7247\u548C\u7B80\u4ECB\u2192\u5B8C\u6210\u514D\u8D39\u4F1A\u5458\u8D44\u683C"},
          {"q": "\u4E3A\u4EC0\u4E48\u9700\u89813\u4E2A\u4EE5\u4E0A\u7684SNS\u9A8C\u8BC1\uFF1F", "a": "\u4FE1\u4EFB\u662F\u56FD\u9645\u914D\u5BF9\u5E73\u53F0\u6700\u91CD\u8981\u7684\u8981\u7D20\u3002\u591A\u91CDSNS\u9A8C\u8BC1\u53EF\u4EE5\u963B\u6B62\u6B3A\u8BC8\u5E10\u6237\u5E76\u63D0\u4F9B\u7A33\u5B9A\u7684\u914D\u5BF9\u3002"},
          {"q": "\u53EF\u4EE5\u9A8C\u8BC1\u54EA\u4E9B\u5E10\u6237\uFF1F", "a": "Facebook\u3001Instagram\u3001Kakao\u3001X(Twitter)\u3001Naver\u3001Google\u3001WeChat \u2014 \u9700\u8981\u9A8C\u8BC17\u4E2A\u4E2D\u7684\u81F3\u5C113\u4E2A\u624D\u80FD\u5B8C\u6210\u6CE8\u518C\u3002"},
          {"q": "\u4EC0\u4E48\u662F\u9762\u90E8\u548C\u8EAB\u4EFD\u8BC1\u9A8C\u8BC1\uFF1F", "a": "\u57FA\u4E8EAI\u7684\u9762\u90E8\u5339\u914D\u548CID\u9A8C\u8BC1\u81EA\u52A8\u9A8C\u8BC1\u60A8\u7684\u8EAB\u4EFD\uFF0C\u4EE5\u9632\u6B62\u5047\u7167\u7247\u548C\u8EAB\u4EFD\u76D7\u7528\u3002"},
          {"q": "\u6709\u81EA\u52A8\u4E2A\u4EBA\u8D44\u6599\u9A8C\u8BC1\u5417\uFF1F", "a": "\u6709\u3002AI\u81EA\u52A8\u5206\u6790Deepfake\u3001\u5408\u6210\u548C\u91CD\u590D\u7167\u7247\u4EE5\u8FC7\u6EE4\u98CE\u9669\u5E10\u6237\u3002"},
          {"q": "\u4EC0\u4E48\u662F\u81EA\u52A8\u4E2A\u4EBA\u8D44\u6599\u521B\u5EFA\uFF1F", "a": "\u5206\u6790\u4E0A\u4F20\u7684\u7167\u7247\u548C\u5174\u8DA3\u4EE5\uFF1A\\n\u81EA\u52A8\u751F\u6210\u7B80\u4ECB\\n\u63A8\u8350\u6700\u4F73\u7167\u7247\u7EC4\u5408\\n\u91CD\u5199\u6709\u5438\u5F15\u529B\u7684\u53E5\u5B50\\n\u7B49\u3002"},
          {"q": "\u6709\u6587\u5316\u5DEE\u5F02\u8F85\u5BFC\u5417\uFF1F", "a": "\u6709\u3002\u81EA\u52A8\u63D0\u4F9B\u5404\u56FD\u7EA6\u4F1A\u793C\u4EEA\u3001\u6CE8\u610F\u4E8B\u9879\u548C\u7981\u5FCC\u6307\u5BFC\uFF0C\u5E2E\u52A9\u7EF4\u6301\u5173\u7CFB\u800C\u4E0D\u4EA7\u751F\u8BEF\u89E3\u3002\u4F8B\u5982\uFF1A\u97E9\u56FD\u7537\u6027\u2194\u8D8A\u5357\u5973\u6027\u5BF9\u8BDD\u63D0\u793A"},
          {"q": "AI\u7FFB\u8BD1\u5982\u4F55\u5DE5\u4F5C\uFF1F", "a": "\u6D88\u606F\u81EA\u52A8\u7FFB\u8BD1\u4E3A\u6536\u4EF6\u4EBA\u7684\u8BED\u8A00\uFF0C\u540C\u65F6\u663E\u793A\u539F\u6587\u548C\u8BD1\u6587\u3002"},
          {"q": "\u53EF\u4EE5\u5206\u6790\u4E3A\u4EC0\u4E48\u54CD\u5E94\u6162\u5417\uFF1F", "a": "\u53EF\u4EE5\u3002\u57FA\u4E8E\u6D88\u606F\u6A21\u5F0F\u548C\u60C5\u611F\u5206\u6790\uFF0CAI\u4F30\u8BA1\u539F\u56E0\uFF0C\u5982'\u5FD9\u788C\u5EF6\u8FDF'\u3001'\u5174\u8DA3\u4F4E'\u3001'\u8C28\u614E'\u7B49\u3002"},
          {"q": "\u8BED\u97F3\u6D88\u606F\u4E5F\u4F1A\u88AB\u7FFB\u8BD1\u5417\uFF1F", "a": "\u662F\u7684\u3002\u8BED\u97F3\u8F6C\u6362\u4E3A\u6587\u672C\u2192\u7FFB\u8BD1\u2192\u81EA\u52A8\u8FDB\u884C\u60C5\u611F\u5206\u6790\u3002"},
          {"q": "\u53EF\u4EE5\u4E0A\u4F20\u591A\u5C11\u5F20\u7167\u7247\uFF1F", "a": "\u6700\u591A10\u5F20\u7167\u7247\u3002"},
          {"q": "\u4E5F\u53EF\u4EE5\u4E0A\u4F20\u89C6\u9891\u5417\uFF1F", "a": "\u662F\u7684\uFF0C\u6700\u591A3\u4E2A\u89C6\u9891\u3002"},
          {"q": "\u6709\u4E2A\u4EBA\u8D44\u6599\u5438\u5F15\u529B\u8BC4\u5206\u5417\uFF1F", "a": "\u6709\u3002\u5206\u6790\u7167\u7247\u3001\u63CF\u8FF0\u548C\u5174\u8DA3\u4EE5\u63D0\u4F9B\u5438\u5F15\u529B\u8BC4\u5206\u548C\u6539\u8FDB\u63D0\u793A\u3002"},
          {"q": "\u5982\u4F55\u5220\u9664\u6211\u7684\u5E10\u6237\uFF1F", "a": "\u53F3\u4E0A\u89D2\u83DC\u5355\u2192\u8BBE\u7F6E\u2192\u5E10\u6237\u7BA1\u7406\u2192\u5E95\u90E8\u5220\u9664\u5E10\u6237\u2192\u9A8C\u8BC1\u8EAB\u4EFD\u2192\u5B8C\u6210\u5220\u9664\\n\u203B\u6240\u6709\u4E2A\u4EBA\u8D44\u6599\u3001\u5339\u914D\u548C\u6D88\u606F\u8BB0\u5F55\u5C06\u88AB\u6C38\u4E45\u5220\u9664\uFF0C\u65E0\u6CD5\u6062\u590D\u3002"},
          {"q": "\u4ED8\u8D39\u540E\u53EF\u4EE5\u9000\u6B3E\u5417\uFF1F", "a": "\u5982\u679C\u672A\u4F7F\u7528\u4ED8\u8D39\u529F\u80FD\uFF0C\u5219\u53EF\u5728\u4ED8\u6B3E\u540E48\u5C0F\u65F6\u5185\u9000\u6B3E\u3002\u4ED8\u6B3E\u9519\u8BEF\u65F6\u4E5F\u53EF\u9000\u6B3E\u3002\u8BF7\u5C06\u9000\u6B3E\u8BF7\u6C42\u4E0E\u6536\u636E\u4E00\u8D77\u63D0\u4EA4\u7ED9\u5BA2\u670D\u3002"},
          {"q": "\u4E3A\u4EC0\u4E48SNS\u9A8C\u8BC1\u4E00\u76F4\u5931\u8D25\uFF1F", "a": "\u539F\u56E0\uFF1ASNS\u767B\u5F55\u4FE1\u606F\u9519\u8BEF\u3001\u5728\u591A\u4E2A\u8BBE\u5907\u4E0A\u91CD\u590D\u767B\u5F55\u3001\u6743\u9650\u88AB\u62D2\u7EDD\u3001\u7F3A\u5C11\u4E2A\u4EBA\u8D44\u6599\u4FE1\u606F\u3001\u4F7F\u7528VPN\u3001\u5F39\u51FA\u7A97\u53E3\u88AB\u963B\u6B62\u3002\u89E3\u51B3\u65B9\u6848\uFF1A\u9A8C\u8BC1SNS\u767B\u5F55\u3001\u5141\u8BB8\u5F39\u51FA\u7A97\u53E3\u3001\u7981\u7528VPN\u3001\u6DFB\u52A0\u4E2A\u4EBA\u8D44\u6599\u4FE1\u606F\u3001\u91CD\u8BD5\u3002"}
        ]
      },
      "ja": {
        "title": "\u30C1\u30E3\u30C3\u30C8\u30DC\u30C3\u30C8",
        "subtitle": "\u3069\u306E\u3088\u3046\u306B\u304A\u624B\u4F1D\u3044\u3067\u304D\u307E\u3059\u304B\uFF1F",
        "faqTitle": "\u3088\u304F\u3042\u308B\u8CEA\u554F",
        "backButton": "\u8CEA\u554F\u30EA\u30B9\u30C8\u306B\u623B\u308B",
        "questions": [
          {"q": "CoupleGate\u3068\u306F\u4F55\u3067\u3059\u304B\uFF1F", "a": "CoupleGate\u306F\u3001\u4E16\u754C\u4E2D\u306E\u4EBA\u3005\u3068\u771F\u5263\u306A\u56FD\u969B\u604B\u611B\u30FB\u7D50\u5A5A\u3092\u7D50\u3076\u30B0\u30ED\u30FC\u30D0\u30EB\u30DE\u30C3\u30C1\u30F3\u30B0\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u3067\u3059\u3002AI\u30D9\u30FC\u30B9\u306E\u30DE\u30C3\u30C1\u30F3\u30B0\u3001\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u7FFB\u8A33\u3001\u30D3\u30C7\u30AA\u901A\u8A71\u306A\u3069\u3001\u9060\u8DDD\u96E2\u30FB\u56FD\u969B\u604B\u611B\u306B\u5FC5\u8981\u306A\u6A5F\u80FD\u3092\u3059\u3079\u3066\u63D0\u4F9B\u3057\u307E\u3059\u3002"},
          {"q": "\u4E3B\u306A\u5229\u7528\u8005\u306F\u3069\u306E\u3088\u3046\u306A\u4EBA\u3067\u3059\u304B\uFF1F", "a": "40\u4EE3\u30FB50\u4EE3\u30FB60\u4EE3\u306E\u30B7\u30F3\u30B0\u30EB\u3001\u30D0\u30C4\u30A4\u30C1\u3001\u30B0\u30ED\u30FC\u30D0\u30EB\u604B\u611B\u30FB\u7D50\u5A5A\u3092\u5E0C\u671B\u3059\u308B\u65B9\u304C\u4E2D\u5FC3\u3067\u3059\u3002\u4FE1\u983C\u6027\u306E\u3042\u308B\u4F1A\u8A71\u30FB\u30DE\u30C3\u30C1\u30F3\u30B0\u306E\u305F\u3081\u3001\u53B3\u683C\u306A\u8A8D\u8A3C\u30B7\u30B9\u30C6\u30E0\u304C\u9069\u7528\u3055\u308C\u307E\u3059\u3002"},
          {"q": "\u7121\u6599\u4F1A\u54E1\u3068\u6709\u6599\u4F1A\u54E1\u306E\u9055\u3044\u306F\uFF1F", "a": "\u7121\u6599\u4F1A\u54E1\uFF1A\u30E1\u30CB\u30E5\u30FC\u30FB\u691C\u7D22\u306E\u4E00\u90E8\u6A5F\u80FD\u306E\u307F\u5229\u7528\u53EF\u80FD\\n\u6709\u6599\u4F1A\u54E1\uFF1A\u3059\u3079\u3066\u306E\u6A5F\u80FD\u958B\u653E\uFF08\u30DE\u30C3\u30C1\u30F3\u30B0\u3001\u30E1\u30C3\u30BB\u30FC\u30B8\u3001\u30D3\u30C7\u30AA\u901A\u8A71\u3001\u7FFB\u8A33\u3001\u9AD8\u5EA6\u306A\u30D5\u30A3\u30EB\u30BF\u30FC\u3001\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u5206\u6790\u306A\u3069\uFF09\\n3\u3064\u4EE5\u4E0A\u306E\u30BD\u30FC\u30B7\u30E3\u30EB\u30E1\u30C7\u30A3\u30A2\u8A8D\u8A3C\u304C\u5FC5\u9808"},
          {"q": "\u767B\u9332\u65B9\u6CD5\u306F\uFF1F", "a": "'\u7121\u6599\u767B\u9332'\u3092\u30AF\u30EA\u30C3\u30AF\u2192\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u21923\u3064\u4EE5\u4E0A\u306ESNS\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u8A8D\u8A3C\uFF08Facebook/Instagram/Kakao/X/Naver/Google/WeChat\uFF09\u2192\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u5199\u771F\u3068\u81EA\u5DF1\u7D39\u4ECB\u3092\u8FFD\u52A0\u2192\u7121\u6599\u4F1A\u54E1\u767B\u9332\u5B8C\u4E86"},
          {"q": "\u306A\u305C3\u3064\u4EE5\u4E0A\u306ESNS\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u304B\uFF1F", "a": "\u4FE1\u983C\u306F\u56FD\u969B\u30DE\u30C3\u30C1\u30F3\u30B0\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u3067\u6700\u3082\u91CD\u8981\u306A\u8981\u7D20\u3067\u3059\u3002\u8907\u6570\u306ESNS\u8A8D\u8A3C\u306B\u3088\u308A\u8A50\u6B3A\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u30D6\u30ED\u30C3\u30AF\u3057\u3001\u5B89\u5B9A\u3057\u305F\u30DE\u30C3\u30C1\u30F3\u30B0\u3092\u63D0\u4F9B\u3057\u307E\u3059\u3002"},
          {"q": "\u3069\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u8A8D\u8A3C\u3067\u304D\u307E\u3059\u304B\uFF1F", "a": "Facebook\u3001Instagram\u3001Kakao\u3001X(Twitter)\u3001Naver\u3001Google\u3001WeChat \u2014 7\u3064\u306E\u3046\u3061\u5C11\u306A\u304F\u3068\u30823\u3064\u3092\u8A8D\u8A3C\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002"},
          {"q": "\u9854\u8A8D\u8A3C\u3068ID\u8A8D\u8A3C\u3068\u306F\u4F55\u3067\u3059\u304B\uFF1F", "a": "AI\u30D9\u30FC\u30B9\u306E\u9854\u30DE\u30C3\u30C1\u30F3\u30B0\u3068ID\u8A8D\u8A3C\u306B\u3088\u308A\u3001\u507D\u306E\u5199\u771F\u3084\u8EAB\u5143\u76D7\u7528\u3092\u9632\u304E\u3001\u672C\u4EBA\u78BA\u8A8D\u3092\u81EA\u52D5\u7684\u306B\u691C\u8A3C\u3057\u307E\u3059\u3002"},
          {"q": "\u81EA\u52D5\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u691C\u8A3C\u6A5F\u80FD\u306F\u3042\u308A\u307E\u3059\u304B\uFF1F", "a": "\u306F\u3044\u3002AI\u304CDeepfake\u3001\u5408\u6210\u3001\u91CD\u8907\u5199\u771F\u3092\u81EA\u52D5\u5206\u6790\u3057\u3066\u5371\u967A\u306A\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u30D5\u30A3\u30EB\u30BF\u30EA\u30F3\u30B0\u3057\u307E\u3059\u3002"},
          {"q": "\u81EA\u52D5\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u4F5C\u6210\u6A5F\u80FD\u3068\u306F\u4F55\u3067\u3059\u304B\uFF1F", "a": "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3057\u305F\u5199\u771F\u3068\u8208\u5473\u3092\u5206\u6790\u3057\u3066\uFF1A\\n\u81EA\u5DF1\u7D39\u4ECB\u306E\u81EA\u52D5\u751F\u6210\\n\u6700\u9069\u306A\u5199\u771F\u306E\u7D44\u307F\u5408\u308F\u305B\u3092\u63A8\u5968\\n\u9B45\u529B\u7684\u306A\u6587\u7AE0\u306E\u30EA\u30E9\u30A4\u30C8\\n\u306A\u3069\u3002"},
          {"q": "\u6587\u5316\u306E\u9055\u3044\u30B3\u30FC\u30C1\u30F3\u30B0\u6A5F\u80FD\u306F\u3042\u308A\u307E\u3059\u304B\uFF1F", "a": "\u3042\u308A\u307E\u3059\u3002\u56FD\u5225\u306E\u30C7\u30FC\u30C8\u30DE\u30CA\u30FC\u3001\u6CE8\u610F\u4E8B\u9805\u3001\u30BF\u30D6\u30FC\u3092\u81EA\u52D5\u7684\u306B\u6848\u5185\u3057\u3001\u8AA4\u89E3\u306A\u304F\u95A2\u4FC2\u3092\u7DAD\u6301\u3067\u304D\u308B\u3088\u3046\u30B5\u30DD\u30FC\u30C8\u3057\u307E\u3059\u3002\u4F8B\uFF1A\u97D3\u56FD\u4EBA\u7537\u6027\u2194\u30D9\u30C8\u30CA\u30E0\u4EBA\u5973\u6027\u306E\u4F1A\u8A71\u306E\u30D2\u30F3\u30C8"},
          {"q": "AI\u7FFB\u8A33\u306F\u3069\u306E\u3088\u3046\u306B\u6A5F\u80FD\u3057\u307E\u3059\u304B\uFF1F", "a": "\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u81EA\u52D5\u7684\u306B\u53D7\u4FE1\u8005\u306E\u8A00\u8A9E\u306B\u7FFB\u8A33\u3055\u308C\u3001\u539F\u6587\u3068\u7FFB\u8A33\u6587\u306E\u4E21\u65B9\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002"},
          {"q": "\u5FDC\u7B54\u304C\u9045\u3044\u7406\u7531\u3092\u5206\u6790\u3067\u304D\u307E\u3059\u304B\uFF1F", "a": "\u306F\u3044\u3002\u30E1\u30C3\u30BB\u30FC\u30B8\u30D1\u30BF\u30FC\u30F3\u3068\u611F\u60C5\u5206\u6790\u306B\u57FA\u3065\u3044\u3066\u3001'\u5FD9\u3057\u304F\u3066\u9045\u5EF6'\u3001'\u95A2\u5FC3\u5EA6\u304C\u4F4E\u3044'\u3001'\u614E\u91CD'\u306A\u3069\u3092AI\u304C\u63A8\u5B9A\u3057\u307E\u3059\u3002"},
          {"q": "\u97F3\u58F0\u30E1\u30C3\u30BB\u30FC\u30B8\u3082\u7FFB\u8A33\u3055\u308C\u307E\u3059\u304B\uFF1F", "a": "\u306F\u3044\u3002\u97F3\u58F0\u3092\u30C6\u30AD\u30B9\u30C8\u306B\u5909\u63DB\u2192\u7FFB\u8A33\u2192\u611F\u60C5\u5206\u6790\u307E\u3067\u81EA\u52D5\u51E6\u7406\u3055\u308C\u307E\u3059\u3002"},
          {"q": "\u5199\u771F\u306F\u4F55\u679A\u307E\u3067\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3067\u304D\u307E\u3059\u304B\uFF1F", "a": "\u6700\u592710\u679A\u307E\u3067\u53EF\u80FD\u3067\u3059\u3002"},
          {"q": "\u52D5\u753B\u3082\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3067\u304D\u307E\u3059\u304B\uFF1F", "a": "\u306F\u3044\u3001\u6700\u59273\u3064\u306E\u52D5\u753B\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3067\u304D\u307E\u3059\u3002"},
          {"q": "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u9B45\u529B\u30B9\u30B3\u30A2\u6A5F\u80FD\u306F\u3042\u308A\u307E\u3059\u304B\uFF1F", "a": "\u3042\u308A\u307E\u3059\u3002\u5199\u771F\u3001\u8AAC\u660E\u3001\u8208\u5473\u3092\u5206\u6790\u3057\u3066\u9B45\u529B\u30B9\u30B3\u30A2\u3068\u6539\u5584\u306E\u30D2\u30F3\u30C8\u3092\u63D0\u4F9B\u3057\u307E\u3059\u3002"},
          {"q": "\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u524A\u9664\u3057\u305F\u3044", "a": "\u53F3\u4E0A\u306E\u30E1\u30CB\u30E5\u30FC\u2192\u8A2D\u5B9A\u2192\u30A2\u30AB\u30A6\u30F3\u30C8\u7BA1\u7406\u2192\u4E0B\u90E8\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u524A\u9664\u2192\u672C\u4EBA\u78BA\u8A8D\u2192\u524A\u9664\u5B8C\u4E86\\n\u203B\u3059\u3079\u3066\u306E\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u3001\u30DE\u30C3\u30C1\u30F3\u30B0\u3001\u30E1\u30C3\u30BB\u30FC\u30B8\u8A18\u9332\u304C\u6C38\u4E45\u306B\u524A\u9664\u3055\u308C\u3001\u5FA9\u5143\u3067\u304D\u307E\u305B\u3093\u3002"},
          {"q": "\u30D7\u30EC\u30DF\u30A2\u30E0\u652F\u6255\u3044\u5F8C\u306B\u8FD4\u91D1\u3067\u304D\u307E\u3059\u304B\uFF1F", "a": "\u30D7\u30EC\u30DF\u30A2\u30E0\u6A5F\u80FD\u3092\u4F7F\u7528\u3057\u3066\u3044\u306A\u3044\u5834\u5408\u3001\u652F\u6255\u3044\u5F8C48\u6642\u9593\u4EE5\u5185\u306B\u8FD4\u91D1\u53EF\u80FD\u3067\u3059\u3002\u652F\u6255\u3044\u30A8\u30E9\u30FC\u306E\u5834\u5408\u3082\u8FD4\u91D1\u53EF\u80FD\u3067\u3059\u3002\u9818\u53CE\u66F8\u3068\u4E00\u7DD2\u306B\u30AB\u30B9\u30BF\u30DE\u30FC\u30B5\u30FC\u30D3\u30B9\u306B\u8FD4\u91D1\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u63D0\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002"},
          {"q": "SNS\u8A8D\u8A3C\u304C\u5931\u6557\u3057\u7D9A\u3051\u308B\u7406\u7531\u306F\uFF1F", "a": "\u539F\u56E0\uFF1ASNS\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u306E\u8AA4\u308A\u3001\u8907\u6570\u306E\u30C7\u30D0\u30A4\u30B9\u3067\u306E\u91CD\u8907\u30ED\u30B0\u30A4\u30F3\u3001\u6A29\u9650\u62D2\u5426\u3001\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u60C5\u5831\u306E\u6B20\u843D\u3001VPN\u4F7F\u7528\u3001\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u30D6\u30ED\u30C3\u30AF\u3002\u89E3\u6C7A\u7B56\uFF1ASNS\u30ED\u30B0\u30A4\u30F3\u306E\u78BA\u8A8D\u3001\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u8A31\u53EF\u3001VPN\u7121\u52B9\u5316\u3001\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u60C5\u5831\u306E\u8FFD\u52A0\u3001\u518D\u8A66\u884C\u3002"}
        ]
      },
      "vi": {
        "title": "Chatbot",
        "subtitle": "T\xF4i c\xF3 th\u1EC3 gi\xFAp g\xEC cho b\u1EA1n?",
        "faqTitle": "C\xE2u h\u1ECFi th\u01B0\u1EDDng g\u1EB7p",
        "backButton": "Quay l\u1EA1i danh s\xE1ch c\xE2u h\u1ECFi",
        "questions": [
          {"q": "CoupleGate l\xE0 g\xEC?", "a": "CoupleGate l\xE0 n\u1EC1n t\u1EA3ng k\u1EBFt n\u1ED1i to\xE0n c\u1EA7u k\u1EBFt n\u1ED1i m\u1ECDi ng\u01B0\u1EDDi tr\xEAn to\xE0n th\u1EBF gi\u1EDBi \u0111\u1EC3 h\u1EB9n h\xF2 v\xE0 k\u1EBFt h\xF4n qu\u1ED1c t\u1EBF nghi\xEAm t\xFAc. N\xF3 cung c\u1EA5p k\u1EBFt n\u1ED1i d\u1EF1a tr\xEAn AI, d\u1ECBch thu\u1EADt th\u1EDDi gian th\u1EF1c, cu\u1ED9c g\u1ECDi video v\xE0 t\u1EA5t c\u1EA3 c\xE1c t\xEDnh n\u0103ng c\u1EA7n thi\u1EBFt cho c\xE1c m\u1ED1i quan h\u1EC7 qu\u1ED1c t\u1EBF \u0111\u01B0\u1EDDng d\xE0i."},
          {"q": "Ng\u01B0\u1EDDi d\xF9ng ch\xEDnh l\xE0 ai?", "a": "\u0110\u1ED9c th\xE2n v\xE0 ly h\xF4n \u1EDF \u0111\u1ED9 tu\u1ED5i 40, 50, 60 t\xECm ki\u1EBFm h\u1EB9n h\xF2 v\xE0 k\u1EBFt h\xF4n to\xE0n c\u1EA7u. H\u1EC7 th\u1ED1ng x\xE1c minh nghi\xEAm ng\u1EB7t \u0111\u01B0\u1EE3c \xE1p d\u1EE5ng cho c\xE1c cu\u1ED9c tr\xF2 chuy\u1EC7n v\xE0 k\u1EBFt n\u1ED1i \u0111\xE1ng tin c\u1EADy."},
          {"q": "S\u1EF1 kh\xE1c bi\u1EC7t gi\u1EEFa th\xE0nh vi\xEAn mi\u1EC5n ph\xED v\xE0 cao c\u1EA5p?", "a": "Th\xE0nh vi\xEAn mi\u1EC5n ph\xED: Gi\u1EDBi h\u1EA1n menu v\xE0 t\xEDnh n\u0103ng t\xECm ki\u1EBFm\\nTh\xE0nh vi\xEAn cao c\u1EA5p: Truy c\u1EADp \u0111\u1EA7y \u0111\u1EE7 (k\u1EBFt n\u1ED1i, nh\u1EAFn tin, cu\u1ED9c g\u1ECDi video, d\u1ECBch thu\u1EADt, b\u1ED9 l\u1ECDc n\xE2ng cao, ph\xE2n t\xEDch h\u1ED3 s\u01A1)\\nY\xEAu c\u1EA7u 3+ x\xE1c minh m\u1EA1ng x\xE3 h\u1ED9i"},
          {"q": "L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 \u0111\u0103ng k\xFD?", "a": "Nh\u1EA5p '\u0110\u0103ng k\xFD mi\u1EC5n ph\xED' \u2192 Nh\u1EADp email \u2192 X\xE1c minh 3+ t\xE0i kho\u1EA3n SNS (Facebook/Instagram/Kakao/X/Naver/Google/WeChat) \u2192 Th\xEAm \u1EA3nh h\u1ED3 s\u01A1 v\xE0 ti\u1EC3u s\u1EED \u2192 Ho\xE0n t\u1EA5t \u0111\u0103ng k\xFD mi\u1EC5n ph\xED"},
          {"q": "T\u1EA1i sao c\u1EA7n 3+ x\xE1c minh SNS?", "a": "Tin c\u1EADy l\xE0 y\u1EBFu t\u1ED1 quan tr\u1ECDng nh\u1EA5t trong c\xE1c n\u1EC1n t\u1EA3ng k\u1EBFt n\u1ED1i qu\u1ED1c t\u1EBF. X\xE1c minh \u0111a SNS ch\u1EB7n c\xE1c t\xE0i kho\u1EA3n gian l\u1EADn v\xE0 cung c\u1EA5p k\u1EBFt n\u1ED1i \u1ED5n \u0111\u1ECBnh."},
          {"q": "T\xF4i c\xF3 th\u1EC3 x\xE1c minh t\xE0i kho\u1EA3n n\xE0o?", "a": "Facebook, Instagram, Kakao, X(Twitter), Naver, Google, WeChat \u2014 B\u1EA1n c\u1EA7n x\xE1c minh \xEDt nh\u1EA5t 3 trong 7 t\xE0i kho\u1EA3n \u0111\u1EC3 ho\xE0n t\u1EA5t \u0111\u0103ng k\xFD."},
          {"q": "X\xE1c minh khu\xF4n m\u1EB7t v\xE0 ID l\xE0 g\xEC?", "a": "X\xE1c minh khu\xF4n m\u1EB7t v\xE0 ID d\u1EF1a tr\xEAn AI t\u1EF1 \u0111\u1ED9ng x\xE1c th\u1EF1c danh t\xEDnh c\u1EE7a b\u1EA1n \u0111\u1EC3 ng\u0103n ch\u1EB7n \u1EA3nh gi\u1EA3 v\xE0 tr\u1ED9m c\u1EAFp danh t\xEDnh."},
          {"q": "C\xF3 x\xE1c minh h\u1ED3 s\u01A1 t\u1EF1 \u0111\u1ED9ng kh\xF4ng?", "a": "C\xF3. AI t\u1EF1 \u0111\u1ED9ng ph\xE2n t\xEDch Deepfake, \u1EA3nh t\u1ED5ng h\u1EE3p v\xE0 tr\xF9ng l\u1EB7p \u0111\u1EC3 l\u1ECDc c\xE1c t\xE0i kho\u1EA3n r\u1EE7i ro."},
          {"q": "T\u1EA1o h\u1ED3 s\u01A1 t\u1EF1 \u0111\u1ED9ng l\xE0 g\xEC?", "a": "Ph\xE2n t\xEDch \u1EA3nh v\xE0 s\u1EDF th\xEDch \u0111\xE3 t\u1EA3i l\xEAn \u0111\u1EC3:\\nT\u1EF1 \u0111\u1ED9ng t\u1EA1o ti\u1EC3u s\u1EED\\n\u0110\u1EC1 xu\u1EA5t k\u1EBFt h\u1EE3p \u1EA3nh t\u1ED1t nh\u1EA5t\\nVi\u1EBFt l\u1EA1i c\xE2u h\u1EA5p d\u1EABn\\nv\xE0 h\u01A1n th\u1EBF n\u1EEFa."},
          {"q": "C\xF3 hu\u1EA5n luy\u1EC7n s\u1EF1 kh\xE1c bi\u1EC7t v\u0103n h\xF3a kh\xF4ng?", "a": "C\xF3. Cung c\u1EA5p h\u01B0\u1EDBng d\u1EABn t\u1EF1 \u0111\u1ED9ng v\u1EC1 ph\xE9p l\u1ECBch s\u1EF1 h\u1EB9n h\xF2, bi\u1EC7n ph\xE1p ph\xF2ng ng\u1EEBa v\xE0 c\u1EA5m k\u1EF5 theo qu\u1ED1c gia \u0111\u1EC3 duy tr\xEC m\u1ED1i quan h\u1EC7 m\xE0 kh\xF4ng hi\u1EC3u l\u1EA7m. V\xED d\u1EE5: M\u1EB9o tr\xF2 chuy\u1EC7n gi\u1EEFa nam gi\u1EDBi H\xE0n Qu\u1ED1c \u2194 n\u1EEF gi\u1EDBi Vi\u1EC7t Nam"},
          {"q": "D\u1ECBch thu\u1EADt AI ho\u1EA1t \u0111\u1ED9ng nh\u01B0 th\u1EBF n\xE0o?", "a": "Tin nh\u1EAFn \u0111\u01B0\u1EE3c t\u1EF1 \u0111\u1ED9ng d\u1ECBch sang ng\xF4n ng\u1EEF c\u1EE7a ng\u01B0\u1EDDi nh\u1EADn, hi\u1EC3n th\u1ECB c\u1EA3 v\u0103n b\u1EA3n g\u1ED1c v\xE0 d\u1ECBch c\xF9ng nhau."},
          {"q": "C\xF3 th\u1EC3 ph\xE2n t\xEDch t\u1EA1i sao ph\u1EA3n h\u1ED3i ch\u1EADm kh\xF4ng?", "a": "C\xF3. D\u1EF1a tr\xEAn m\u1EABu tin nh\u1EAFn v\xE0 ph\xE2n t\xEDch c\u1EA3m x\xFAc, AI \u01B0\u1EDBc t\xEDnh c\xE1c l\xFD do nh\u01B0 'b\u1EADn r\u1ED9n tr\xEC ho\xE3n', 'quan t\xE2m th\u1EA5p', 'c\u1EA9n th\u1EADn', v.v."},
          {"q": "Tin nh\u1EAFn tho\u1EA1i c\u0169ng \u0111\u01B0\u1EE3c d\u1ECBch kh\xF4ng?", "a": "C\xF3. Gi\u1ECDng n\xF3i \u0111\u01B0\u1EE3c chuy\u1EC3n \u0111\u1ED5i th\xE0nh v\u0103n b\u1EA3n \u2192 d\u1ECBch \u2192 ph\xE2n t\xEDch c\u1EA3m x\xFAc t\u1EF1 \u0111\u1ED9ng."},
          {"q": "T\xF4i c\xF3 th\u1EC3 t\u1EA3i l\xEAn bao nhi\xEAu \u1EA3nh?", "a": "T\u1ED1i \u0111a 10 \u1EA3nh."},
          {"q": "T\xF4i c\xF3 th\u1EC3 t\u1EA3i l\xEAn video kh\xF4ng?", "a": "C\xF3, t\u1ED1i \u0111a 3 video."},
          {"q": "C\xF3 \u0111i\u1EC3m h\u1EA5p d\u1EABn h\u1ED3 s\u01A1 kh\xF4ng?", "a": "C\xF3. Ph\xE2n t\xEDch \u1EA3nh, m\xF4 t\u1EA3 v\xE0 s\u1EDF th\xEDch \u0111\u1EC3 cung c\u1EA5p \u0110i\u1EC3m h\u1EA5p d\u1EABn v\u1EDBi c\xE1c m\u1EB9o c\u1EA3i thi\u1EC7n."},
          {"q": "L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 x\xF3a t\xE0i kho\u1EA3n c\u1EE7a t\xF4i?", "a": "Menu ph\xEDa tr\xEAn b\xEAn ph\u1EA3i \u2192 C\xE0i \u0111\u1EB7t \u2192 Qu\u1EA3n l\xFD t\xE0i kho\u1EA3n \u2192 X\xF3a t\xE0i kho\u1EA3n \u1EDF d\u01B0\u1EDBi c\xF9ng \u2192 X\xE1c minh danh t\xEDnh \u2192 Ho\xE0n t\u1EA5t x\xF3a\\n\u203B T\u1EA5t c\u1EA3 h\u1ED3 s\u01A1, k\u1EBFt n\u1ED1i v\xE0 h\u1ED3 s\u01A1 tin nh\u1EAFn s\u1EBD b\u1ECB x\xF3a v\u0129nh vi\u1EC5n v\xE0 kh\xF4ng th\u1EC3 kh\xF4i ph\u1EE5c."},
          {"q": "T\xF4i c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c ho\xE0n ti\u1EC1n sau khi thanh to\xE1n cao c\u1EA5p kh\xF4ng?", "a": "Ho\xE0n ti\u1EC1n c\xF3 s\u1EB5n trong v\xF2ng 48 gi\u1EDD n\u1EBFu c\xE1c t\xEDnh n\u0103ng cao c\u1EA5p ch\u01B0a \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng. C\u0169ng c\xF3 s\u1EB5n cho l\u1ED7i thanh to\xE1n. G\u1EEDi y\xEAu c\u1EA7u ho\xE0n ti\u1EC1n v\u1EDBi bi\xEAn lai cho d\u1ECBch v\u1EE5 kh\xE1ch h\xE0ng."},
          {"q": "T\u1EA1i sao x\xE1c minh SNS ti\u1EBFp t\u1EE5c th\u1EA5t b\u1EA1i?", "a": "Nguy\xEAn nh\xE2n: Th\xF4ng tin \u0111\u0103ng nh\u1EADp SNS sai, \u0111\u0103ng nh\u1EADp tr\xF9ng l\u1EB7p tr\xEAn nhi\u1EC1u thi\u1EBFt b\u1ECB, quy\u1EC1n b\u1ECB t\u1EEB ch\u1ED1i, thi\u1EBFu th\xF4ng tin h\u1ED3 s\u01A1, s\u1EED d\u1EE5ng VPN, popup b\u1ECB ch\u1EB7n. Gi\u1EA3i ph\xE1p: X\xE1c minh \u0111\u0103ng nh\u1EADp SNS, cho ph\xE9p popup, t\u1EAFt VPN, th\xEAm th\xF4ng tin h\u1ED3 s\u01A1, th\u1EED l\u1EA1i."}
        ]
      },
      "ar": {
        "title": "\u0631\u0648\u0628\u0648\u062A \u0627\u0644\u062F\u0631\u062F\u0634\u0629",
        "subtitle": "\u0643\u064A\u0641 \u064A\u0645\u0643\u0646\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643\u061F",
        "faqTitle": "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629",
        "backButton": "\u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0633\u0626\u0644\u0629",
        "questions": [
          {"q": "\u0645\u0627 \u0647\u0648 CoupleGate\u061F", "a": "CoupleGate \u0647\u0648 \u0645\u0646\u0635\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u0639\u0627\u0644\u0645\u064A\u0629 \u062A\u0631\u0628\u0637 \u0627\u0644\u0623\u0634\u062E\u0627\u0635 \u0641\u064A \u062C\u0645\u064A\u0639 \u0623\u0646\u062D\u0627\u0621 \u0627\u0644\u0639\u0627\u0644\u0645 \u0644\u0644\u0645\u0648\u0627\u0639\u062F\u0629 \u0648\u0627\u0644\u0632\u0648\u0627\u062C \u0627\u0644\u062F\u0648\u0644\u064A \u0627\u0644\u062C\u0627\u062F. \u064A\u0648\u0641\u0631 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0641\u064A \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0641\u0639\u0644\u064A \u0648\u0645\u0643\u0627\u0644\u0645\u0627\u062A \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0648\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0636\u0631\u0648\u0631\u064A\u0629 \u0644\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u062F\u0648\u0644\u064A\u0629 \u0628\u0639\u064A\u062F\u0629 \u0627\u0644\u0645\u062F\u0649."},
          {"q": "\u0645\u0646 \u0647\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0648\u0646\u061F", "a": "\u0627\u0644\u0639\u0632\u0627\u0628 \u0648\u0627\u0644\u0645\u0637\u0644\u0642\u0648\u0646 \u0641\u064A \u0627\u0644\u0623\u0631\u0628\u0639\u064A\u0646\u064A\u0627\u062A \u0648\u0627\u0644\u062E\u0645\u0633\u064A\u0646\u064A\u0627\u062A \u0648\u0627\u0644\u0633\u062A\u064A\u0646\u064A\u0627\u062A \u0627\u0644\u0630\u064A\u0646 \u064A\u0628\u062D\u062B\u0648\u0646 \u0639\u0646 \u0627\u0644\u0645\u0648\u0627\u0639\u062F\u0629 \u0648\u0627\u0644\u0632\u0648\u0627\u062C \u0627\u0644\u0639\u0627\u0644\u0645\u064A. \u064A\u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0646\u0638\u0627\u0645 \u062A\u062D\u0642\u0642 \u0635\u0627\u0631\u0645 \u0644\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0648\u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0648\u062B\u0648\u0642\u0629."},
          {"q": "\u0645\u0627 \u0627\u0644\u0641\u0631\u0642 \u0628\u064A\u0646 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u064A\u0646 \u0648\u0627\u0644\u0645\u0645\u064A\u0632\u064A\u0646\u061F", "a": "\u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0648\u0646: \u0642\u0627\u0626\u0645\u0629 \u0645\u062D\u062F\u0648\u062F\u0629 \u0648\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0628\u062D\u062B\\n\u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u0645\u064A\u0632\u0648\u0646: \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0643\u0627\u0645\u0644 (\u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0648\u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0629 \u0648\u0645\u0643\u0627\u0644\u0645\u0627\u062A \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0648\u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0648\u0627\u0644\u0645\u0631\u0634\u062D\u0627\u062A \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629 \u0648\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A)\\n3+ \u062A\u062D\u0642\u0642\u0627\u062A \u0645\u0646 \u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639\u064A \u0645\u0637\u0644\u0648\u0628\u0629"},
          {"q": "\u0643\u064A\u0641 \u0623\u0642\u0648\u0645 \u0628\u0627\u0644\u062A\u0633\u062C\u064A\u0644\u061F", "a": "\u0627\u0646\u0642\u0631 \u0641\u0648\u0642 '\u062A\u0633\u062C\u064A\u0644 \u0645\u062C\u0627\u0646\u064A' \u2192 \u0623\u062F\u062E\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u2192 \u062A\u062D\u0642\u0642 \u0645\u0646 3+ \u062D\u0633\u0627\u0628\u0627\u062A SNS (Facebook/Instagram/Kakao/X/Naver/Google/WeChat) \u2192 \u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A \u0648\u0627\u0644\u0633\u064A\u0631\u0629 \u0627\u0644\u0630\u0627\u062A\u064A\u0629 \u2192 \u0623\u0643\u0645\u0644 \u0627\u0644\u0639\u0636\u0648\u064A\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629"},
          {"q": "\u0644\u0645\u0627\u0630\u0627 \u0623\u062D\u062A\u0627\u062C 3+ \u062A\u062D\u0642\u0642\u0627\u062A SNS\u061F", "a": "\u0627\u0644\u062B\u0642\u0629 \u0647\u064A \u0627\u0644\u0639\u0646\u0635\u0631 \u0627\u0644\u0623\u0643\u062B\u0631 \u0623\u0647\u0645\u064A\u0629 \u0641\u064A \u0645\u0646\u0635\u0627\u062A \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u062F\u0648\u0644\u064A\u0629. \u064A\u062D\u0638\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0645\u062A\u0639\u062F\u062F \u0645\u0646 SNS \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644\u064A\u0629 \u0648\u064A\u0648\u0641\u0631 \u0645\u0637\u0627\u0628\u0642\u0629 \u0645\u0633\u062A\u0642\u0631\u0629."},
          {"q": "\u0645\u0627 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u062A\u064A \u064A\u0645\u0643\u0646\u0646\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646\u0647\u0627\u061F", "a": "Facebook \u0648 Instagram \u0648 Kakao \u0648 X (Twitter) \u0648 Naver \u0648 Google \u0648 WeChat \u2014 \u062A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 3 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0645\u0646 \u0623\u0635\u0644 7 \u062D\u0633\u0627\u0628\u0627\u062A \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0633\u062C\u064A\u0644."},
          {"q": "\u0645\u0627 \u0647\u0648 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0648\u062C\u0647 \u0648\u0627\u0644\u0647\u0648\u064A\u0629\u061F", "a": "\u064A\u062A\u062D\u0642\u0642 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0648\u062C\u0647 \u0648\u0627\u0644\u0647\u0648\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0625\u0644\u0649 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0645\u0646 \u0647\u0648\u064A\u062A\u0643 \u0644\u0645\u0646\u0639 \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0645\u0632\u064A\u0641\u0629 \u0648\u0633\u0631\u0642\u0629 \u0627\u0644\u0647\u0648\u064A\u0629."},
          {"q": "\u0647\u0644 \u064A\u0648\u062C\u062F \u062A\u062D\u0642\u0642 \u062A\u0644\u0642\u0627\u0626\u064A \u0645\u0646 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A\u061F", "a": "\u0646\u0639\u0645. \u064A\u0642\u0648\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0628\u062A\u062D\u0644\u064A\u0644 Deepfake \u0648\u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0645\u0631\u0643\u0628\u0629 \u0648\u0627\u0644\u0645\u0643\u0631\u0631\u0629 \u0644\u062A\u0635\u0641\u064A\u0629 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u062E\u0637\u0631\u0629."},
          {"q": "\u0645\u0627 \u0647\u0648 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u061F", "a": "\u064A\u062D\u0644\u0644 \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u062D\u0645\u0644\u0629 \u0645\u0646 \u0623\u062C\u0644:\\n\u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0633\u064A\u0631\u0629 \u0627\u0644\u0630\u0627\u062A\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627\\n\u0627\u0644\u062A\u0648\u0635\u064A\u0629 \u0628\u0623\u0641\u0636\u0644 \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0635\u0648\u0631\\n\u0625\u0639\u0627\u062F\u0629 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u062C\u0645\u0644 \u0627\u0644\u062C\u0630\u0627\u0628\u0629\\n\u0648\u0623\u0643\u062B\u0631."},
          {"q": "\u0647\u0644 \u064A\u0648\u062C\u062F \u062A\u062F\u0631\u064A\u0628 \u0639\u0644\u0649 \u0627\u0644\u0627\u062E\u062A\u0644\u0627\u0641\u0627\u062A \u0627\u0644\u062B\u0642\u0627\u0641\u064A\u0629\u061F", "a": "\u0646\u0639\u0645. \u064A\u0648\u0641\u0631 \u0625\u0631\u0634\u0627\u062F\u0627\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u062D\u0648\u0644 \u0622\u062F\u0627\u0628 \u0627\u0644\u0645\u0648\u0627\u0639\u062F\u0629 \u0648\u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u0627\u062A \u0648\u0627\u0644\u0645\u062D\u0631\u0645\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0628\u0644\u062F \u0644\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u062F\u0648\u0646 \u0633\u0648\u0621 \u0641\u0647\u0645. \u0645\u062B\u0627\u0644: \u0646\u0635\u0627\u0626\u062D \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0628\u064A\u0646 \u0627\u0644\u0631\u062C\u0627\u0644 \u0627\u0644\u0643\u0648\u0631\u064A\u064A\u0646 \u2194 \u0627\u0644\u0646\u0633\u0627\u0621 \u0627\u0644\u0641\u064A\u062A\u0646\u0627\u0645\u064A\u0627\u062A"},
          {"q": "\u0643\u064A\u0641 \u062A\u0639\u0645\u0644 \u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u061F", "a": "\u064A\u062A\u0645 \u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0625\u0644\u0649 \u0644\u063A\u0629 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u060C \u0648\u0639\u0631\u0636 \u0643\u0644 \u0645\u0646 \u0627\u0644\u0646\u0635 \u0627\u0644\u0623\u0635\u0644\u064A \u0648\u0627\u0644\u0645\u062A\u0631\u062C\u0645 \u0645\u0639\u064B\u0627."},
          {"q": "\u0647\u0644 \u064A\u0645\u0643\u0646 \u062A\u062D\u0644\u064A\u0644 \u0633\u0628\u0628 \u0628\u0637\u0621 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0627\u062A\u061F", "a": "\u0646\u0639\u0645. \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0648\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0634\u0627\u0639\u0631 \u060C \u064A\u0642\u062F\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0623\u0633\u0628\u0627\u0628\u064B\u0627 \u0645\u062B\u0644 '\u062A\u0623\u062E\u064A\u0631 \u0645\u0634\u063A\u0648\u0644' \u0648 '\u0627\u0647\u062A\u0645\u0627\u0645 \u0645\u0646\u062E\u0641\u0636' \u0648 '\u0643\u0648\u0646\u0647 \u062D\u0630\u0631\u064B\u0627' \u0648\u0645\u0627 \u0625\u0644\u0649 \u0630\u0644\u0643."},
          {"q": "\u0647\u0644 \u064A\u062A\u0645 \u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0623\u064A\u0636\u064B\u0627\u061F", "a": "\u0646\u0639\u0645. \u064A\u062A\u0645 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0635\u0648\u062A \u0625\u0644\u0649 \u0646\u0635 \u2192 \u062A\u0631\u062C\u0645\u0629 \u2192 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0634\u0627\u0639\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627."},
          {"q": "\u0643\u0645 \u0639\u062F\u062F \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u062A\u064A \u064A\u0645\u0643\u0646\u0646\u064A \u062A\u062D\u0645\u064A\u0644\u0647\u0627\u061F", "a": "\u0645\u0627 \u064A\u0635\u0644 \u0625\u0644\u0649 10 \u0635\u0648\u0631."},
          {"q": "\u0647\u0644 \u064A\u0645\u0643\u0646\u0646\u064A \u062A\u062D\u0645\u064A\u0644 \u0645\u0642\u0627\u0637\u0639 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0623\u064A\u0636\u064B\u0627\u061F", "a": "\u0646\u0639\u0645 \u060C \u0645\u0627 \u064A\u0635\u0644 \u0625\u0644\u0649 3 \u0645\u0642\u0627\u0637\u0639 \u0641\u064A\u062F\u064A\u0648."},
          {"q": "\u0647\u0644 \u0647\u0646\u0627\u0643 \u0646\u0642\u0627\u0637 \u062C\u0627\u0630\u0628\u064A\u0629 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A\u061F", "a": "\u0646\u0639\u0645. \u064A\u062D\u0644\u0644 \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0623\u0648\u0635\u0627\u0641 \u0648\u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0644\u062A\u0648\u0641\u064A\u0631 \u0646\u0642\u0627\u0637 \u0627\u0644\u062C\u0627\u0630\u0628\u064A\u0629 \u0645\u0639 \u0646\u0635\u0627\u0626\u062D \u0627\u0644\u062A\u062D\u0633\u064A\u0646."},
          {"q": "\u0643\u064A\u0641 \u0623\u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u064A\u061F", "a": "\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0644\u0648\u064A\u0629 \u0627\u0644\u064A\u0645\u0646\u0649 \u2192 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u2192 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062D\u0633\u0627\u0628 \u2192 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628 \u0641\u064A \u0627\u0644\u0623\u0633\u0641\u0644 \u2192 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0647\u0648\u064A\u0629 \u2192 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062D\u0630\u0641\\n\u203B \u064A\u062A\u0645 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A \u0648\u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0648\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0628\u0634\u0643\u0644 \u062F\u0627\u0626\u0645 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0633\u062A\u0631\u062F\u0627\u062F\u0647\u0627."},
          {"q": "\u0647\u0644 \u064A\u0645\u0643\u0646\u0646\u064A \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0628\u0639\u062F \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u0645\u064A\u0632\u061F", "a": "\u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F\u0627\u062A \u0645\u062A\u0627\u062D\u0629 \u0641\u064A \u063A\u0636\u0648\u0646 48 \u0633\u0627\u0639\u0629 \u0625\u0630\u0627 \u0644\u0645 \u064A\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0645\u0645\u064A\u0632\u0629. \u0645\u062A\u0627\u062D \u0623\u064A\u0636\u064B\u0627 \u0644\u0623\u062E\u0637\u0627\u0621 \u0627\u0644\u062F\u0641\u0639. \u0623\u0631\u0633\u0644 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0645\u0639 \u0627\u0644\u0625\u064A\u0635\u0627\u0644 \u0625\u0644\u0649 \u062E\u062F\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."},
          {"q": "\u0644\u0645\u0627\u0630\u0627 \u064A\u0633\u062A\u0645\u0631 \u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 SNS\u061F", "a": "\u0627\u0644\u0623\u0633\u0628\u0627\u0628: \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 SNS \u062E\u0627\u0637\u0626\u0629 \u060C \u062A\u0633\u062C\u064A\u0644\u0627\u062A \u062F\u062E\u0648\u0644 \u0645\u0643\u0631\u0631\u0629 \u0639\u0644\u0649 \u0623\u062C\u0647\u0632\u0629 \u0645\u062A\u0639\u062F\u062F\u0629 \u060C \u0631\u0641\u0636 \u0627\u0644\u0625\u0630\u0646 \u060C \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0645\u0644\u0641 \u062A\u0639\u0631\u064A\u0641 \u0645\u0641\u0642\u0648\u062F\u0629 \u060C \u0627\u0633\u062A\u062E\u062F\u0627\u0645 VPN \u060C \u0646\u0627\u0641\u0630\u0629 \u0645\u0646\u0628\u062B\u0642\u0629 \u0645\u062D\u0638\u0648\u0631\u0629. \u0627\u0644\u062D\u0644\u0648\u0644: \u062A\u062D\u0642\u0642 \u0645\u0646 \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 SNS \u060C \u0627\u0644\u0633\u0645\u0627\u062D \u0628\u0627\u0644\u0646\u0648\u0627\u0641\u0630 \u0627\u0644\u0645\u0646\u0628\u062B\u0642\u0629 \u060C \u062A\u0639\u0637\u064A\u0644 VPN \u060C \u0625\u0636\u0627\u0641\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A \u060C \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."}
        ]
      }
    };

    let currentChatbotLang = 'ko';

    function toggleChatbot() {
      const chatbot = document.getElementById('chatbotWindow');
      chatbot.classList.toggle('active');
      if (chatbot.classList.contains('active')) {
        showQuestions();
      }
    }

    function showQuestions() {
      const faqList = document.getElementById('faqList');
      const chatbotAnswer = document.getElementById('chatbotAnswer');
      
      faqList.style.display = 'flex';
      chatbotAnswer.classList.remove('active');
      
      loadChatbotFAQs();
    }

    function showAnswer(question, answer) {
      const faqList = document.getElementById('faqList');
      const chatbotAnswer = document.getElementById('chatbotAnswer');
      const answerText = document.getElementById('answerText');
      
      faqList.style.display = 'none';
      answerText.textContent = answer;
      chatbotAnswer.classList.add('active');
    }

    function loadChatbotFAQs() {
      const data = chatbotFaqData[currentChatbotLang];
      const faqList = document.getElementById('faqList');
      
      document.getElementById('chatbot-title').textContent = data.title;
      document.getElementById('chatbot-subtitle').textContent = data.subtitle;
      document.getElementById('faq-title').textContent = data.faqTitle;
      document.getElementById('back-button-text').textContent = data.backButton;
      
      faqList.innerHTML = '';
      data.questions.forEach((item, index) => {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-item';
        faqItem.innerHTML = \`
          <span>\${index + 1}. \${item.q}</span>
          <i class="fas fa-chevron-right"></i>
        \`;
        faqItem.onclick = () => showAnswer(item.q, item.a);
        faqList.appendChild(faqItem);
      });
    }

    // \uC5B8\uC5B4 \uC120\uD0DD\uAE30\uC640 \uCC57\uBD07 \uC5B8\uC5B4 \uB3D9\uAE30\uD654
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
      langSelector.addEventListener('change', function() {
        currentChatbotLang = this.value;
        if (document.getElementById('chatbotWindow').classList.contains('active')) {
          loadChatbotFAQs();
        }
      });
    }

    // DOM \uC900\uBE44 \uD6C4 \uCD08\uAE30 \uCC57\uBD07 FAQ \uB370\uC774\uD130 \uB85C\uB4DC
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        // DOM\uC774 \uC900\uBE44\uB418\uBA74 \uCD08\uAE30 \uB370\uC774\uD130 \uC124\uC815 (\uCC57\uBD07\uC774 \uC5F4\uB9B4 \uB54C \uC0AC\uC6A9)
        if (document.getElementById('faqList')) {
          loadChatbotFAQs();
        }
      });
    } else {
      // \uC774\uBBF8 DOM\uC774 \uB85C\uB4DC\uB41C \uACBD\uC6B0
      if (document.getElementById('faqList')) {
        loadChatbotFAQs();
      }
    }
  </script>
</body>
</html>`;
}
function getAdminPageHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Couple Gate - \uAD00\uB9AC\uC790 \uD398\uC774\uC9C0</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100 min-h-screen">
  <!-- \uB85C\uADF8\uC778 \uD654\uBA74 -->
  <div id="loginScreen" class="min-h-screen flex items-center justify-center px-4">
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <h1 class="text-3xl font-bold text-center mb-6 text-pink-600">
        <i class="fas fa-lock"></i> \uAD00\uB9AC\uC790 \uB85C\uADF8\uC778
      </h1>
      <form id="loginForm">
        <div class="mb-4">
          <label class="block text-gray-700 font-semibold mb-2">\uC544\uC774\uB514</label>
          <input type="text" id="username" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
        </div>
        <div class="mb-6">
          <label class="block text-gray-700 font-semibold mb-2">\uBE44\uBC00\uBC88\uD638</label>
          <input type="password" id="password" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
        </div>
        <button type="submit" class="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700">
          <i class="fas fa-sign-in-alt"></i> \uB85C\uADF8\uC778
        </button>
      </form>
      <div id="loginError" class="mt-4 hidden">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 text-center"><i class="fas fa-exclamation-circle"></i> <span id="loginErrorMsg"></span></p>
        </div>
      </div>
    </div>
  </div>

  <!-- \uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC -->
  <div id="adminDashboard" class="hidden">
    <nav class="bg-pink-600 text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold">
          <i class="fas fa-heart"></i> Couple Gate \uAD00\uB9AC\uC790
        </h1>
        <div class="flex gap-4">
          <a href="/" class="hover:text-pink-200"><i class="fas fa-home"></i> \uBA54\uC778</a>
          <button onclick="logout()" class="hover:text-pink-200"><i class="fas fa-sign-out-alt"></i> \uB85C\uADF8\uC544\uC6C3</button>
        </div>
      </div>
    </nav>

    <div class="container mx-auto px-4 py-8">
      <!-- \uD0ED \uBA54\uB274 -->
      <div class="mb-6">
        <div class="flex flex-wrap gap-2">
          <button onclick="showAdminTab('members')" class="admin-tab-btn active px-6 py-3 bg-white text-pink-600 rounded-lg font-bold shadow-lg">
            <i class="fas fa-users"></i> \uD68C\uC6D0 \uAD00\uB9AC
          </button>
          <button onclick="showAdminTab('matches')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow">
            <i class="fas fa-heart"></i> \uB9E4\uCE6D \uAD00\uB9AC
          </button>
          <button onclick="showAdminTab('stats')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow">
            <i class="fas fa-chart-bar"></i> \uD1B5\uACC4 \uB300\uC2DC\uBCF4\uB4DC
          </button>
          <button onclick="showAdminTab('notices')" class="admin-tab-btn px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold shadow">
            <i class="fas fa-bell"></i> \uACF5\uC9C0\uC0AC\uD56D \uAD00\uB9AC
          </button>
        </div>
      </div>

      <!-- \uD68C\uC6D0 \uAD00\uB9AC \uD0ED -->
      <div id="members-tab" class="admin-tab-content bg-white rounded-lg shadow-xl p-6">
        <h2 class="text-2xl font-bold mb-4"><i class="fas fa-users text-pink-500"></i> \uD68C\uC6D0 \uAD00\uB9AC</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-pink-50">
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">\uC774\uB984</th>
                <th class="px-4 py-2 text-left">\uB098\uC774</th>
                <th class="px-4 py-2 text-left">\uC131\uBCC4</th>
                <th class="px-4 py-2 text-left">\uAD6D\uAC00</th>
                <th class="px-4 py-2 text-left">\uAC00\uC785\uC77C</th>
                <th class="px-4 py-2 text-left">\uAD00\uB9AC</th>
              </tr>
            </thead>
            <tbody id="membersTableBody">
            </tbody>
          </table>
        </div>
      </div>

      <!-- \uB9E4\uCE6D \uAD00\uB9AC \uD0ED -->
      <div id="matches-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6">
        <h2 class="text-2xl font-bold mb-4"><i class="fas fa-heart text-pink-500"></i> \uB9E4\uCE6D \uAD00\uB9AC</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-pink-50">
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">\uC2E0\uCCAD\uC790</th>
                <th class="px-4 py-2 text-left">\uB300\uC0C1\uC790</th>
                <th class="px-4 py-2 text-left">\uC0C1\uD0DC</th>
                <th class="px-4 py-2 text-left">\uC2E0\uCCAD\uC77C</th>
              </tr>
            </thead>
            <tbody id="matchesTableBody">
            </tbody>
          </table>
        </div>
      </div>

      <!-- \uD1B5\uACC4 \uB300\uC2DC\uBCF4\uB4DC \uD0ED -->
      <div id="stats-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6">
        <h2 class="text-2xl font-bold mb-4"><i class="fas fa-chart-bar text-pink-500"></i> \uC0C1\uC138 \uD1B5\uACC4</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="adminStatsContainer">
        </div>
      </div>

      <!-- \uACF5\uC9C0\uC0AC\uD56D \uAD00\uB9AC \uD0ED -->
      <div id="notices-tab" class="admin-tab-content hidden bg-white rounded-lg shadow-xl p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold"><i class="fas fa-bell text-pink-500"></i> \uACF5\uC9C0\uC0AC\uD56D \uAD00\uB9AC</h2>
          <button onclick="showNoticeForm()" class="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-pink-700">
            <i class="fas fa-plus"></i> \uC0C8 \uACF5\uC9C0\uC0AC\uD56D
          </button>
        </div>

        <!-- \uACF5\uC9C0\uC0AC\uD56D \uC791\uC131 \uD3FC -->
        <div id="noticeFormContainer" class="hidden mb-6 bg-pink-50 rounded-lg p-4">
          <form id="noticeForm">
            <input type="hidden" id="editNoticeId">
            <div class="mb-4">
              <label class="block font-semibold mb-2">\uC81C\uBAA9</label>
              <input type="text" id="noticeTitle" required class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div class="mb-4">
              <label class="block font-semibold mb-2">\uB0B4\uC6A9</label>
              <textarea id="noticeContent" rows="5" required class="w-full px-4 py-2 border rounded-lg"></textarea>
            </div>
            <div class="mb-4">
              <label class="flex items-center">
                <input type="checkbox" id="noticeImportant" class="mr-2">
                <span class="font-semibold">\uC911\uC694 \uACF5\uC9C0\uC0AC\uD56D</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button type="submit" class="bg-pink-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-pink-700">
                <i class="fas fa-save"></i> \uC800\uC7A5
              </button>
              <button type="button" onclick="hideNoticeForm()" class="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500">
                \uCDE8\uC18C
              </button>
            </div>
          </form>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-pink-50">
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">\uC81C\uBAA9</th>
                <th class="px-4 py-2 text-left">\uC911\uC694</th>
                <th class="px-4 py-2 text-left">\uC791\uC131\uC77C</th>
                <th class="px-4 py-2 text-left">\uAD00\uB9AC</th>
              </tr>
            </thead>
            <tbody id="noticesTableBody">
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    let authToken = null;

    // \uB85C\uADF8\uC778
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          authToken = result.token;
          document.getElementById('loginScreen').classList.add('hidden');
          document.getElementById('adminDashboard').classList.remove('hidden');
          loadMembers();
        } else {
          document.getElementById('loginErrorMsg').textContent = result.error;
          document.getElementById('loginError').classList.remove('hidden');
        }
      } catch (err) {
        document.getElementById('loginErrorMsg').textContent = '\uB85C\uADF8\uC778 \uC2E4\uD328';
        document.getElementById('loginError').classList.remove('hidden');
      }
    });

    // \uB85C\uADF8\uC544\uC6C3
    function logout() {
      authToken = null;
      document.getElementById('loginScreen').classList.remove('hidden');
      document.getElementById('adminDashboard').classList.add('hidden');
      document.getElementById('loginForm').reset();
    }

    // \uD0ED \uC804\uD658
    function showAdminTab(tab) {
      document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.add('hidden'));
      document.querySelectorAll('.admin-tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-white', 'text-pink-600');
        b.classList.add('bg-gray-200', 'text-gray-700');
      });
      
      document.getElementById(tab + '-tab').classList.remove('hidden');
      const btn = document.querySelector(\`button[onclick="showAdminTab('\${tab}')"]\`);
      btn.classList.add('active', 'bg-white', 'text-pink-600');
      btn.classList.remove('bg-gray-200', 'text-gray-700');
      
      if (tab === 'members') loadMembers();
      else if (tab === 'matches') loadMatches();
      else if (tab === 'stats') loadAdminStats();
      else if (tab === 'notices') loadNotices();
    }

    // \uD68C\uC6D0 \uBAA9\uB85D \uB85C\uB4DC
    async function loadMembers() {
      try {
        const response = await fetch('/api/admin/members', {
          headers: { 'Authorization': \`Basic \${authToken}\` }
        });
        
        const data = await response.json();
        const tbody = document.getElementById('membersTableBody');
        tbody.innerHTML = '';
        
        data.members.forEach(member => {
          const tr = document.createElement('tr');
          tr.className = 'border-b hover:bg-gray-50';
          tr.innerHTML = \`
            <td class="px-4 py-2">\${member.id}</td>
            <td class="px-4 py-2">\${member.name}</td>
            <td class="px-4 py-2">\${member.age}</td>
            <td class="px-4 py-2">\${member.gender}</td>
            <td class="px-4 py-2">\${member.country}</td>
            <td class="px-4 py-2">\${new Date(member.createdAt).toLocaleDateString()}</td>
            <td class="px-4 py-2">
              <button onclick="deleteMember(\${member.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i> \uC0AD\uC81C
              </button>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('\uD68C\uC6D0 \uBAA9\uB85D \uB85C\uB4DC \uC2E4\uD328:', err);
      }
    }

    // \uD68C\uC6D0 \uC0AD\uC81C
    async function deleteMember(id) {
      if (!confirm('\uC815\uB9D0 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
      
      try {
        const response = await fetch(\`/api/admin/members/\${id}\`, {
          method: 'DELETE',
          headers: { 'Authorization': \`Basic \${authToken}\` }
        });
        
        if (response.ok) {
          loadMembers();
        }
      } catch (err) {
        alert('\uC0AD\uC81C \uC2E4\uD328');
      }
    }

    // \uB9E4\uCE6D \uBAA9\uB85D \uB85C\uB4DC
    async function loadMatches() {
      try {
        const response = await fetch('/api/admin/matches', {
          headers: { 'Authorization': \`Basic \${authToken}\` }
        });
        
        const data = await response.json();
        const tbody = document.getElementById('matchesTableBody');
        tbody.innerHTML = '';
        
        data.matches.forEach(match => {
          const tr = document.createElement('tr');
          tr.className = 'border-b hover:bg-gray-50';
          tr.innerHTML = \`
            <td class="px-4 py-2">\${match.id}</td>
            <td class="px-4 py-2">\${match.fromName}</td>
            <td class="px-4 py-2">\${match.toName}</td>
            <td class="px-4 py-2">
              <span class="px-2 py-1 rounded text-sm \${match.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : match.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                \${match.status}
              </span>
            </td>
            <td class="px-4 py-2">\${new Date(match.createdAt).toLocaleDateString()}</td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('\uB9E4\uCE6D \uBAA9\uB85D \uB85C\uB4DC \uC2E4\uD328:', err);
      }
    }

    // \uAD00\uB9AC\uC790 \uD1B5\uACC4 \uB85C\uB4DC
    async function loadAdminStats() {
      try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        const container = document.getElementById('adminStatsContainer');
        container.innerHTML = \`
          <div class="bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg p-6 shadow">
            <i class="fas fa-users text-4xl text-pink-600 mb-2"></i>
            <p class="text-3xl font-bold text-gray-800">\${stats.totalProfiles}</p>
            <p class="text-gray-600">\uC804\uCCB4 \uD68C\uC6D0 \uC218</p>
          </div>
          <div class="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-6 shadow">
            <i class="fas fa-heart text-4xl text-blue-600 mb-2"></i>
            <p class="text-3xl font-bold text-gray-800">\${stats.totalMatches}</p>
            <p class="text-gray-600">\uCD1D \uB9E4\uCE6D \uC218</p>
          </div>
          <div class="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-6 shadow">
            <i class="fas fa-venus-mars text-4xl text-purple-600 mb-2"></i>
            <p class="text-xl font-bold text-gray-800">\uB0A8\uC131: \${stats.byGender.male}</p>
            <p class="text-xl font-bold text-gray-800">\uC5EC\uC131: \${stats.byGender.female}</p>
          </div>
          <div class="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-6 shadow">
            <i class="fas fa-chart-pie text-4xl text-green-600 mb-2"></i>
            <p class="text-lg font-bold text-gray-800">40\uB300: \${stats.byAge['40s']}</p>
            <p class="text-lg font-bold text-gray-800">50\uB300: \${stats.byAge['50s']}</p>
            <p class="text-lg font-bold text-gray-800">60\uB300: \${stats.byAge['60s']}</p>
          </div>
        \`;
      } catch (err) {
        console.error('\uD1B5\uACC4 \uB85C\uB4DC \uC2E4\uD328:', err);
      }
    }

    // \uACF5\uC9C0\uC0AC\uD56D \uBAA9\uB85D \uB85C\uB4DC
    async function loadNotices() {
      try {
        const response = await fetch('/api/notices');
        const data = await response.json();
        const tbody = document.getElementById('noticesTableBody');
        tbody.innerHTML = '';
        
        data.notices.forEach(notice => {
          const tr = document.createElement('tr');
          tr.className = 'border-b hover:bg-gray-50';
          tr.innerHTML = \`
            <td class="px-4 py-2">\${notice.id}</td>
            <td class="px-4 py-2">\${notice.title}</td>
            <td class="px-4 py-2">
              \${notice.important ? '<i class="fas fa-star text-yellow-500"></i>' : ''}
            </td>
            <td class="px-4 py-2">\${new Date(notice.createdAt).toLocaleDateString()}</td>
            <td class="px-4 py-2">
              <button onclick="editNotice(\${notice.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                <i class="fas fa-edit"></i> \uC218\uC815
              </button>
              <button onclick="deleteNotice(\${notice.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i> \uC0AD\uC81C
              </button>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('\uACF5\uC9C0\uC0AC\uD56D \uB85C\uB4DC \uC2E4\uD328:', err);
      }
    }

    // \uACF5\uC9C0\uC0AC\uD56D \uD3FC \uD45C\uC2DC
    function showNoticeForm() {
      document.getElementById('noticeFormContainer').classList.remove('hidden');
      document.getElementById('noticeForm').reset();
      document.getElementById('editNoticeId').value = '';
    }

    // \uACF5\uC9C0\uC0AC\uD56D \uD3FC \uC228\uAE30\uAE30
    function hideNoticeForm() {
      document.getElementById('noticeFormContainer').classList.add('hidden');
    }

    // \uACF5\uC9C0\uC0AC\uD56D \uC800\uC7A5
    document.getElementById('noticeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('editNoticeId').value;
      const data = {
        title: document.getElementById('noticeTitle').value,
        content: document.getElementById('noticeContent').value,
        important: document.getElementById('noticeImportant').checked
      };
      
      try {
        const url = id ? \`/api/admin/notices/\${id}\` : '/api/admin/notices';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Basic \${authToken}\`
          },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          hideNoticeForm();
          loadNotices();
        }
      } catch (err) {
        alert('\uC800\uC7A5 \uC2E4\uD328');
      }
    });

    // \uACF5\uC9C0\uC0AC\uD56D \uC218\uC815
    async function editNotice(id) {
      try {
        const response = await fetch('/api/notices');
        const data = await response.json();
        const notice = data.notices.find(n => n.id === id);
        
        if (notice) {
          document.getElementById('editNoticeId').value = notice.id;
          document.getElementById('noticeTitle').value = notice.title;
          document.getElementById('noticeContent').value = notice.content;
          document.getElementById('noticeImportant').checked = notice.important;
          showNoticeForm();
        }
      } catch (err) {
        alert('\uACF5\uC9C0\uC0AC\uD56D \uBD88\uB7EC\uC624\uAE30 \uC2E4\uD328');
      }
    }

    // \uACF5\uC9C0\uC0AC\uD56D \uC0AD\uC81C
    async function deleteNotice(id) {
      if (!confirm('\uC815\uB9D0 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
      
      try {
        const response = await fetch(\`/api/admin/notices/\${id}\`, {
          method: 'DELETE',
          headers: { 'Authorization': \`Basic \${authToken}\` }
        });
        
        if (response.ok) {
          loadNotices();
        }
      } catch (err) {
        alert('\uC0AD\uC81C \uC2E4\uD328');
      }
    }
  </script>
</body>
</html>`;
}
function getNoticesPageHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\uACF5\uC9C0\uC0AC\uD56D - Couple Gate</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-pink-300 via-red-300 to-purple-400 min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <a href="/" class="text-white hover:text-pink-100">
        <i class="fas fa-arrow-left"></i> \uBA54\uC778\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30
      </a>
    </div>

    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl p-6 md:p-8">
      <h1 class="text-3xl font-bold text-center mb-8 text-pink-600">
        <i class="fas fa-bell"></i> \uACF5\uC9C0\uC0AC\uD56D
      </h1>

      <div id="noticesContainer" class="space-y-4">
      </div>
    </div>
  </div>

  <script>
    async function loadNotices() {
      try {
        const response = await fetch('/api/notices');
        const data = await response.json();
        const container = document.getElementById('noticesContainer');
        container.innerHTML = '';
        
        if (data.notices.length === 0) {
          container.innerHTML = '<p class="text-center text-gray-500">\uB4F1\uB85D\uB41C \uACF5\uC9C0\uC0AC\uD56D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
          return;
        }
        
        data.notices.forEach(notice => {
          const div = document.createElement('div');
          div.className = \`border rounded-lg p-4 \${notice.important ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}\`;
          div.innerHTML = \`
            <div class="flex items-start">
              \${notice.important ? '<i class="fas fa-star text-yellow-500 mt-1 mr-2"></i>' : '<i class="fas fa-bell text-pink-500 mt-1 mr-2"></i>'}
              <div class="flex-1">
                <h3 class="font-bold text-lg mb-2">\${notice.title}</h3>
                <p class="text-gray-700 whitespace-pre-wrap">\${notice.content}</p>
                <p class="text-sm text-gray-500 mt-2">
                  <i class="fas fa-calendar"></i> \${new Date(notice.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          \`;
          container.appendChild(div);
        });
      } catch (err) {
        console.error('\uACF5\uC9C0\uC0AC\uD56D \uB85C\uB4DC \uC2E4\uD328:', err);
      }
    }

    loadNotices();
  </script>
</body>
</html>`;
}
var worker_default = app;
export {
  worker_default as default
};
