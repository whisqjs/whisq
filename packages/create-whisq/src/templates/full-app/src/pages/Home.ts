import {
  signal,
  computed,
  component,
  div,
  h1,
  button,
  span,
  p,
} from "@whisq/core";
import { s } from "../styles";

export const Home = component(() => {
  const count = signal(0);
  const label = computed(() =>
    count.value === 0 ? "Click to start" : `Count: ${count.value}`,
  );

  return div(
    h1({ class: s.heading }, "Home"),
    p({ class: s.text }, () => label.value),
    div(
      { class: s.row },
      button({ class: s.btn, onclick: () => count.value-- }, "-"),
      span({ class: s.count }, () => `${count.value}`),
      button({ class: s.btn, onclick: () => count.value++ }, "+"),
    ),
  );
});
