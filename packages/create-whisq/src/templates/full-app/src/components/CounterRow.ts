// Reusable UI component. One component per file, PascalCase — the filename
// matches the named export. Pulled out of pages/Home.ts so it can be reused
// on other pages without copy/paste.

import { component, div, button, span } from "@whisq/core";
import { s } from "../styles";
import { formatCount } from "../lib/format";

interface CounterRowProps {
  /** Reactive getter for the current count. */
  count: () => number;
  /** Increment handler. */
  onIncrement: () => void;
  /** Decrement handler. */
  onDecrement: () => void;
}

export const CounterRow = component((props: CounterRowProps) =>
  div(
    { class: s.row },
    button({ class: s.btn, onclick: props.onDecrement }, "-"),
    span({ class: s.count }, () => formatCount(props.count())),
    button({ class: s.btn, onclick: props.onIncrement }, "+"),
  ),
);
