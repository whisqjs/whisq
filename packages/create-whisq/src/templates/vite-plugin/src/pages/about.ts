import { component, div, h1, p, a } from "@whisq/core";
import { s } from "../styles";

export const About = component(() =>
  div(
    h1({ class: s.heading }, "About"),
    p(
      { class: s.text },
      "This project uses ",
      a(
        { class: s.link, href: "https://whisq.dev", target: "_blank" },
        "@whisq/vite-plugin",
      ),
      " for file-based routing.",
    ),
    p(
      { class: s.text },
      "Add new pages in src/pages/ and they become routes automatically.",
    ),
  ),
);
