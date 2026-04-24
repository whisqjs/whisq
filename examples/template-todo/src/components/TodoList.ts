import {
  component,
  div,
  ul,
  span,
  button,
  p,
  each,
  match,
} from "@whisq/core";
import {
  todos,
  visible,
  filter,
  setFilter,
  clearDone,
  pendingCount,
  type Filter,
} from "../stores/todos";
import { TodoItem } from "./TodoItem";
import { s } from "../styles";

// Labels plus the underlying filter value — one tuple per tab, ordered for
// a keyboard-natural left-to-right scan (broad → narrow).
const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all",    label: "All"    },
  { value: "active", label: "Active" },
  { value: "done",   label: "Done"   },
] as const;

// Renders the three filter tab buttons. Active-state styling is expressed
// via the alpha.8 `class: [...]` array form — the getter re-evaluates when
// `filter.value` changes, so exactly one tab carries the active class at
// any time, with no manual class-string assembly.
const FilterTabs = () =>
  div(
    { class: s.filters, role: "tablist", "aria-label": "Filter todos" },
    ...FILTERS.map(({ value, label }) =>
      button(
        {
          class: [
            s.filterBtn,
            () => filter.value === value && s.filterBtnActive,
          ],
          role: "tab",
          "aria-selected": () => filter.value === value,
          onclick: () => setFilter(value),
        },
        label,
      ),
    ),
  );

// `match()` works directly as a component root (WHISQ-121) — no sacrificial
// wrapper div needed just to host the returned function.
//
// Three arms instead of two: a completely empty store vs. a filter that
// hides every existing todo vs. rendering the list. The middle arm is what
// makes filters discoverable without a log message — if the user switches
// to "Done" on a list with no completed items, the tab stays highlighted
// but the body explains why.
export const TodoList = component(() =>
  match(
    [
      () => todos.value.length === 0,
      () => p({ class: s.empty }, "Nothing yet. Add a todo above."),
    ],
    [
      () => visible.value.length === 0,
      () =>
        div(
          FilterTabs(),
          p(
            { class: s.empty },
            () =>
              filter.value === "active"
                ? "Nothing active — everything's done."
                : "Nothing done yet.",
          ),
        ),
    ],
    () =>
      div(
        FilterTabs(),
        ul(
          { class: s.list },
          each(
            () => visible.value,
            (todo) => TodoItem({ todo }),
            { key: (t) => t.id },
          ),
        ),
        div(
          { class: s.footer },
          span(() => `${pendingCount.value} pending`),
          button(
            { class: s.btn, onclick: clearDone },
            "Clear done",
          ),
        ),
      ),
  ),
);
