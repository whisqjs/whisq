import { a, effect, type WhisqNode } from "@whisq/core";
import type { Router, RouteComponent } from "./router.js";

// ── Lazy component resolution ─────────────────────────────────────────────

async function resolveComponent(
  component: RouteComponent,
): Promise<(props: Record<string, string>) => any> {
  if (typeof component === "function" && component.length === 0) {
    try {
      const result = (component as () => any)();
      if (
        result &&
        typeof result === "object" &&
        typeof result.then === "function"
      ) {
        const mod = await result;
        if (mod && typeof mod.default === "function") {
          return mod.default;
        }
      }
    } catch {
      // Not a lazy import — it's a regular component
    }
  }
  return component as (props: Record<string, string>) => any;
}

// ── RouterView ─────────────────────────────────────────────────────────────

/**
 * Renders the component that matches the current route.
 * For nested routes, specify `depth` to render child routes.
 *
 * ```ts
 * mount(RouterView(router), document.getElementById("app"));
 *
 * // Inside a layout component — renders the child route
 * const Layout = () => div(nav("..."), RouterView(router, 1));
 * ```
 */
export function RouterView(router: Router, depth: number = 0): WhisqNode {
  const container = document.createElement("div");
  container.setAttribute("data-whisq-router-view", "");
  const disposers: (() => void)[] = [];
  let currentDispose: (() => void) | null = null;

  const dispose = effect(() => {
    const route = router.current.value;
    const matchedRoute = route.matched[depth];

    if (currentDispose) {
      currentDispose();
      currentDispose = null;
    }
    container.textContent = "";

    if (matchedRoute) {
      const allParams: Record<string, string> = {};
      for (let i = 0; i <= depth && i < route.matched.length; i++) {
        Object.assign(allParams, route.matched[i].params);
      }

      resolveComponent(matchedRoute.route.component).then((comp) => {
        if (router.current.value !== route) return;
        const node = comp(allParams) as WhisqNode;
        container.appendChild(node.el);
        currentDispose = () => node.dispose();
      });
    }
  });

  disposers.push(dispose);

  return {
    __whisq: true,
    el: container,
    disposers,
    dispose() {
      if (currentDispose) currentDispose();
      for (const d of disposers) d();
    },
  };
}

// ── Link ───────────────────────────────────────────────────────────────────

type Child = string | number | WhisqNode;

/**
 * A navigation link that uses pushState instead of full page reload.
 *
 * ```ts
 * Link({ href: "/about", router }, "About Us")
 *
 * // Active link styling
 * Link({
 *   href: "/about",
 *   router,
 *   class: () => router.current.value.path === "/about" ? "active" : "",
 * }, "About")
 * ```
 */
export function Link(
  props: {
    href: string;
    router: Router;
    class?: string | (() => string);
  },
  ...children: Child[]
): WhisqNode {
  const anchorProps: Record<string, any> = {
    href: props.href,
    onclick: (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      props.router.navigate(props.href);
    },
  };

  if (props.class) {
    anchorProps.class = props.class;
  }

  return a(anchorProps, ...children);
}
