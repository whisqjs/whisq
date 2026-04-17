import { component, div, h1, p, a } from "@whisq/core";
import { s } from "../styles";

export const About = component(() =>
  div(
    h1({ class: s.heading }, "About"),
    p(
      { class: s.text },
      "Built with ",
      a(
        { class: s.link, href: "https://whisq.dev", target: "_blank" },
        "Whisq",
      ),
      " — the AI-native UI framework.",
    ),
    p(
      { class: s.text },
      "Signals for state, hyperscript for views, zero build magic.",
    ),
  ),
);
