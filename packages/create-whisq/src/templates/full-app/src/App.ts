import { component, div } from "@whisq/core";
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

export const App = component(() =>
  div({ class: s.app }, Nav({}), div({ class: s.content }, RouterView(router))),
);
