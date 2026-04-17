import {
  signal,
  computed,
  component,
  div,
  h2,
  button,
  span,
  p,
  a,
  img,
  mount,
} from "@whisq/core";
import { s } from "./styles";

const Counter = component(() => {
  const count = signal(0);
  const message = computed(() => {
    if (count.value === 0) return "Click the buttons to get started";
    if (count.value > 10) return "You're on a roll!";
    if (count.value < -5) return "Going negative, bold move";
    return `Current count: ${count.value}`;
  });

  return div(
    { class: s.card },
    p({ class: s.label }, () => message.value),
    div(
      { class: s.counter },
      button({ class: s.btn, onclick: () => count.value-- }, "-"),
      span({ class: s.count }, () => `${count.value}`),
      button({ class: s.btn, onclick: () => count.value++ }, "+"),
    ),
    button(
      {
        class: s.resetBtn,
        onclick: () => (count.value = 0),
      },
      "Reset",
    ),
  );
});

const App = component(() =>
  div(
    { class: s.app },
    div(
      { class: s.header },
      img({ class: s.logo, src: "/favicon.svg", alt: "Whisq" }),
      h2({ class: s.title }, "whisq"),
    ),
    Counter({}),
    p(
      { class: s.footer },
      "Built with ",
      a(
        { class: s.footerLink, href: "https://whisq.dev", target: "_blank" },
        "Whisq",
      ),
      " — the AI-native UI framework",
    ),
  ),
);

mount(App({}), document.getElementById("app")!);
