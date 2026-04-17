import { signal, type ReadonlySignal } from "@whisq/core";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RouteConfig {
  path: string;
  component: RouteComponent;
  children?: RouteConfig[];
  meta?: Record<string, unknown>;
  beforeEnter?: NavigationGuard;
}

export type RouteComponent =
  | ((props: Record<string, string>) => any)
  | (() => Promise<{ default: (props: Record<string, string>) => any }>);

export interface RouterConfig {
  routes: RouteConfig[];
  beforeEach?: NavigationGuard;
  afterEach?: AfterGuard;
  scrollBehavior?: ScrollBehaviorOption;
}

export type NavigationGuard = (
  to: RouteState,
  from: RouteState | null,
) => boolean | string | void;

export type AfterGuard = (to: RouteState, from: RouteState | null) => void;

export type ScrollBehaviorOption = "auto" | "top" | "restore" | false;

export interface RouteState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  matched: MatchedRoute[];
  meta: Record<string, unknown>;
}

export interface MatchedRoute {
  route: RouteConfig;
  params: Record<string, string>;
}

export interface Router {
  current: ReadonlySignal<RouteState>;
  navigate(path: string): void;
  back(): void;
  forward(): void;
  dispose(): void;
}

// ── Route matching ─────────────────────────────────────────────────────────

function matchRoute(
  pathname: string,
  routes: RouteConfig[],
  parentPath: string = "",
): MatchedRoute[] | null {
  for (const route of routes) {
    if (route.path === "*") {
      return [{ route, params: {} }];
    }

    const fullPath = normalizePath(parentPath + "/" + route.path);
    const paramNames: string[] = [];
    const pattern = fullPath.replace(/:(\w+)/g, (_match, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });

    // Exact match if no children, prefix match if has children
    const hasChildren = route.children && route.children.length > 0;
    const regex = hasChildren
      ? new RegExp(`^${pattern}(?=/|$)`)
      : new RegExp(`^${pattern}$`);
    const match = pathname.match(regex);

    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = match[i + 1];
      }

      const matched: MatchedRoute[] = [{ route, params }];

      if (hasChildren) {
        const childMatch = matchRoute(pathname, route.children!, fullPath);
        if (childMatch) {
          matched.push(...childMatch);
        }
      }

      return matched;
    }
  }

  return null;
}

function normalizePath(path: string): string {
  return ("/" + path).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function parseQuery(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!search || search === "?") return params;

  const searchStr = search.startsWith("?") ? search.slice(1) : search;
  for (const pair of searchStr.split("&")) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
    }
  }
  return params;
}

function resolveRoute(routes: RouteConfig[]): RouteState {
  const pathname = window.location.pathname;
  const query = parseQuery(window.location.search);
  const result = matchRoute(pathname, routes);

  const params: Record<string, string> = {};
  const meta: Record<string, unknown> = {};
  if (result) {
    for (const m of result) {
      Object.assign(params, m.params);
      if (m.route.meta) Object.assign(meta, m.route.meta);
    }
  }

  return {
    path: pathname,
    params,
    query,
    matched: result ?? [],
    meta,
  };
}

// ── Scroll management ─────────────────────────────────────────────────────

const scrollPositions = new Map<string, { x: number; y: number }>();

function saveScrollPosition(path: string): void {
  scrollPositions.set(path, { x: window.scrollX, y: window.scrollY });
}

function restoreScrollPosition(path: string): void {
  const pos = scrollPositions.get(path);
  if (pos) {
    window.scrollTo(pos.x, pos.y);
  }
}

// ── createRouter ───────────────────────────────────────────────────────────

/**
 * Create a signal-based router with push-state navigation.
 *
 * ```ts
 * const router = createRouter({
 *   routes: [
 *     { path: "/", component: Home },
 *     { path: "/users/:id", component: UserDetail },
 *     { path: "*", component: NotFound },
 *   ],
 *   beforeEach: (to, from) => {
 *     if (to.path === "/admin" && !isLoggedIn()) return "/login";
 *   },
 *   scrollBehavior: "restore",
 * });
 * ```
 */
export function createRouter(config: RouterConfig): Router {
  const scrollBehavior = config.scrollBehavior ?? "top";
  const _current = signal<RouteState>(resolveRoute(config.routes));

  function runGuards(
    to: RouteState,
    from: RouteState | null,
  ): boolean | string {
    // Global beforeEach
    if (config.beforeEach) {
      const result = config.beforeEach(to, from);
      if (result === false) return false;
      if (typeof result === "string") return result;
    }

    // Per-route beforeEnter (check all matched routes)
    for (const m of to.matched) {
      if (m.route.beforeEnter) {
        const result = m.route.beforeEnter(to, from);
        if (result === false) return false;
        if (typeof result === "string") return result;
      }
    }

    return true;
  }

  function performNavigation(isPop: boolean): void {
    const from = _current.value;
    const to = resolveRoute(config.routes);

    // Save scroll position before navigating
    if (scrollBehavior === "restore") {
      saveScrollPosition(from.path);
    }

    // Run guards
    const guardResult = runGuards(to, from);
    if (guardResult === false) {
      // Navigation cancelled — revert URL
      if (!isPop) {
        window.history.replaceState(null, "", from.path);
      }
      return;
    }
    if (typeof guardResult === "string") {
      // Redirect
      window.history.replaceState(null, "", guardResult);
      const redirectTo = resolveRoute(config.routes);
      _current.value = redirectTo;
      handleScroll(redirectTo, false);
      if (config.afterEach) config.afterEach(redirectTo, from);
      return;
    }

    _current.value = to;
    handleScroll(to, isPop);
    if (config.afterEach) config.afterEach(to, from);
  }

  function handleScroll(to: RouteState, isPop: boolean): void {
    if (scrollBehavior === false || scrollBehavior === "auto") return;
    if (scrollBehavior === "restore" && isPop) {
      requestAnimationFrame(() => restoreScrollPosition(to.path));
    } else {
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
  }

  function onPopState(): void {
    performNavigation(true);
  }

  window.addEventListener("popstate", onPopState);

  return {
    current: _current,

    navigate(path: string) {
      window.history.pushState(null, "", path);
      performNavigation(false);
    },

    back() {
      window.history.back();
    },

    forward() {
      window.history.forward();
    },

    dispose() {
      window.removeEventListener("popstate", onPopState);
    },
  };
}
