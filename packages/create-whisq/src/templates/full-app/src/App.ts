// App.ts owns the top-level shell: routing, layout, error boundary, head
// setup. Business logic goes in `stores/`; route targets in `pages/`;
// reusable UI in `components/`; pure utilities in `lib/`.

import { component, div, p, button, errorBoundary } from "@whisq/core";
import { createRouter, RouterView, Link } from "@whisq/router";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { s } from "./styles";

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

// The boundary wraps the route content so a thrown error in any page (or
// its child components / effects) degrades gracefully to a retry UI instead
// of tearing down the whole app.
export const App = component(() =>
  div(
    { class: s.app },
    Nav({}),
    div(
      { class: s.content },
      errorBoundary(
        (error, retry) =>
          div(
            p({ class: s.heading }, "Something broke"),
            p({ class: s.text }, error.message),
            button({ class: s.btn, onclick: retry }, "Retry"),
          ),
        () => RouterView(router),
      ),
    ),
  ),
);
