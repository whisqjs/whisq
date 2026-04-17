import { component, div, mount } from "@whisq/core";
import { createRouter, RouterView, Link } from "@whisq/router";
import { s } from "./styles";

// File-based routing: @whisq/vite-plugin auto-generates routes from src/pages/
// - src/pages/index.ts  → /
// - src/pages/about.ts  → /about
// - src/pages/[id].ts   → /:id (dynamic param)

// For development, define routes manually — the vite plugin
// generates these automatically in production builds
import { Home } from "./pages/index";
import { About } from "./pages/about";

const router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/about", component: About },
  ],
});

const Nav = component(() =>
  div(
    { class: s.nav },
    Link({ href: "/", router }, "Home"),
    Link({ href: "/about", router }, "About"),
  ),
);

const App = component(() =>
  div({ class: s.app }, Nav({}), div({ class: s.content }, RouterView(router))),
);

mount(App({}), document.getElementById("app")!);
