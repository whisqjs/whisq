import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { p, div, mount, component } from "@whisq/core";
import { createRouter, RouterView, Link } from "../index.js";

// ── Test helpers ────────────────────────────────────────────────────────────

let container: HTMLElement;
let dispose: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  if (dispose) dispose();
  dispose = undefined;
  container.remove();
  window.history.replaceState(null, "", "/");
});

// ── Route matching ─────────────────────────────────────────────────────────

describe("createRouter", () => {
  it("matches exact route", () => {
    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/about", component: () => p("About") },
      ],
    });

    expect(router.current.value.path).toBe("/");
    expect(router.current.value.matched.length).toBe(1);
  });

  it("matches route with params", () => {
    window.history.replaceState(null, "", "/users/42");

    const router = createRouter({
      routes: [{ path: "/users/:id", component: () => p("User") }],
    });

    expect(router.current.value.params).toEqual({ id: "42" });
  });

  it("returns fallback for unmatched path", () => {
    window.history.replaceState(null, "", "/nonexistent");

    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "*", component: () => p("404") },
      ],
    });

    expect(router.current.value.matched.length).toBe(1);
  });

  it("returns empty matched for unmatched path without fallback", () => {
    window.history.replaceState(null, "", "/nonexistent");

    const router = createRouter({
      routes: [{ path: "/", component: () => p("Home") }],
    });

    expect(router.current.value.matched).toEqual([]);
  });

  it("extracts query params", () => {
    window.history.replaceState(null, "", "/search?q=whisq&page=2");

    const router = createRouter({
      routes: [{ path: "/search", component: () => p("Search") }],
    });

    expect(router.current.value.query).toEqual({ q: "whisq", page: "2" });
  });

  it("merges route meta", () => {
    window.history.replaceState(null, "", "/admin");

    const router = createRouter({
      routes: [
        {
          path: "/admin",
          component: () => p("Admin"),
          meta: { requiresAuth: true },
        },
      ],
    });

    expect(router.current.value.meta).toEqual({ requiresAuth: true });
  });
});

// ── Navigation ─────────────────────────────────────────────────────────────

describe("navigate", () => {
  it("updates current route signal", () => {
    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/about", component: () => p("About") },
      ],
    });

    expect(router.current.value.path).toBe("/");
    router.navigate("/about");
    expect(router.current.value.path).toBe("/about");
  });

  it("handles popstate (back/forward)", () => {
    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/about", component: () => p("About") },
      ],
    });

    router.navigate("/about");
    expect(router.current.value.path).toBe("/about");

    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(router.current.value.path).toBe("/");
  });
});

// ── Route Guards ──────────────────────────────────────────────────────────

describe("route guards", () => {
  it("beforeEach blocks navigation", () => {
    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/admin", component: () => p("Admin") },
      ],
      beforeEach: (to) => {
        if (to.path === "/admin") return false;
      },
    });

    router.navigate("/admin");
    expect(router.current.value.path).toBe("/");
  });

  it("beforeEach redirects", () => {
    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/admin", component: () => p("Admin") },
        { path: "/login", component: () => p("Login") },
      ],
      beforeEach: (to) => {
        if (to.path === "/admin") return "/login";
      },
    });

    router.navigate("/admin");
    expect(router.current.value.path).toBe("/login");
  });

  it("per-route beforeEnter blocks navigation", () => {
    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        {
          path: "/secret",
          component: () => p("Secret"),
          beforeEnter: () => false,
        },
      ],
    });

    router.navigate("/secret");
    expect(router.current.value.path).toBe("/");
  });

  it("afterEach fires after successful navigation", () => {
    const log: string[] = [];

    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/about", component: () => p("About") },
      ],
      afterEach: (to) => {
        log.push(to.path);
      },
    });

    router.navigate("/about");
    expect(log).toContain("/about");
  });

  it("afterEach does NOT fire when blocked", () => {
    const log: string[] = [];

    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/blocked", component: () => p("Blocked") },
      ],
      beforeEach: (to) => {
        if (to.path === "/blocked") return false;
      },
      afterEach: (to) => {
        log.push(to.path);
      },
    });

    router.navigate("/blocked");
    expect(log).not.toContain("/blocked");
  });

  it("guard receives from state", () => {
    let fromPath: string | null = null;

    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/about", component: () => p("About") },
      ],
      beforeEach: (_to, from) => {
        fromPath = from?.path ?? null;
      },
    });

    router.navigate("/about");
    expect(fromPath).toBe("/");
  });
});

// ── Nested Routes ─────────────────────────────────────────────────────────

describe("nested routes", () => {
  it("matches parent and child", () => {
    window.history.replaceState(null, "", "/dashboard/settings");

    const router = createRouter({
      routes: [
        {
          path: "/dashboard",
          component: () => div("Layout"),
          children: [{ path: "/settings", component: () => p("Settings") }],
        },
      ],
    });

    expect(router.current.value.matched.length).toBe(2);
  });

  it("merges params from parent and child", () => {
    window.history.replaceState(null, "", "/users/42/posts/7");

    const router = createRouter({
      routes: [
        {
          path: "/users/:userId",
          component: () => div("User"),
          children: [{ path: "/posts/:postId", component: () => p("Post") }],
        },
      ],
    });

    expect(router.current.value.params).toEqual({ userId: "42", postId: "7" });
  });

  it("merges meta from parent and child", () => {
    window.history.replaceState(null, "", "/admin/users");

    const router = createRouter({
      routes: [
        {
          path: "/admin",
          component: () => div("Admin"),
          meta: { requiresAuth: true },
          children: [
            {
              path: "/users",
              component: () => p("Users"),
              meta: { title: "Users" },
            },
          ],
        },
      ],
    });

    expect(router.current.value.meta).toEqual({
      requiresAuth: true,
      title: "Users",
    });
  });
});

// ── RouterView ─────────────────────────────────────────────────────────────

describe("RouterView", () => {
  it("renders matched component", async () => {
    const router = createRouter({
      routes: [{ path: "/", component: component(() => p("Home Page")) }],
    });

    dispose = mount(RouterView(router), container);
    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("Home Page");
  });

  it("updates when route changes", async () => {
    const router = createRouter({
      routes: [
        { path: "/", component: component(() => p("Home")) },
        { path: "/about", component: component(() => p("About")) },
      ],
    });

    dispose = mount(RouterView(router), container);
    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("Home");

    router.navigate("/about");
    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("About");
  });

  it("passes params as props", async () => {
    window.history.replaceState(null, "", "/users/7");

    const router = createRouter({
      routes: [
        {
          path: "/users/:id",
          component: component((props: { id: string }) =>
            p(`User: ${props.id}`),
          ),
        },
      ],
    });

    dispose = mount(RouterView(router), container);
    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("User: 7");
  });

  it("renders nothing when no match", async () => {
    window.history.replaceState(null, "", "/nonexistent");

    const router = createRouter({
      routes: [{ path: "/", component: () => p("Home") }],
    });

    dispose = mount(RouterView(router), container);
    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("");
  });

  it("handles lazy-loaded components", async () => {
    const LazyPage = () =>
      Promise.resolve({
        default: component(() => p("Lazy Loaded")),
      });

    const router = createRouter({
      routes: [{ path: "/", component: LazyPage }],
    });

    dispose = mount(RouterView(router), container);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toBe("Lazy Loaded");
  });
});

// ── Link ───────────────────────────────────────────────────────────────────

describe("Link", () => {
  it("renders an anchor element", () => {
    const router = createRouter({
      routes: [{ path: "/", component: () => p("Home") }],
    });

    dispose = mount(Link({ href: "/about", router }, "About"), container);

    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("/about");
    expect(anchor!.textContent).toBe("About");
  });

  it("navigates on click", () => {
    const router = createRouter({
      routes: [
        { path: "/", component: () => p("Home") },
        { path: "/about", component: () => p("About") },
      ],
    });

    dispose = mount(Link({ href: "/about", router }, "About"), container);

    const anchor = container.querySelector("a")!;
    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    expect(router.current.value.path).toBe("/about");
  });
});
