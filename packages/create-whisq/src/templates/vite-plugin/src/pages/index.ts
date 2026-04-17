import { signal, component, div, h1, button, span, p } from "@whisq/core";
import { s } from "../styles";

export const Home = component(() => {
  const count = signal(0);

  return div(
    h1({ class: s.heading }, "Home"),
    p({ class: s.text }, "File-based routing powered by @whisq/vite-plugin."),
    div(
      { class: s.row },
      button({ class: s.btn, onclick: () => count.value-- }, "-"),
      span({ class: s.count }, () => `${count.value}`),
      button({ class: s.btn, onclick: () => count.value++ }, "+"),
    ),
  );
});
