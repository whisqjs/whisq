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
import { todos, clearDone, pendingCount } from "../stores/todos";
import { TodoItem } from "./TodoItem";
import { s } from "../styles";

// `match()` works directly as a component root (WHISQ-121) — no sacrificial
// wrapper div needed just to host the returned function.
export const TodoList = component(() =>
  match(
    [
      () => todos.value.length === 0,
      () => p({ class: s.empty }, "Nothing yet. Add a todo above."),
    ],
    () =>
      div(
        ul(
          { class: s.list },
          each(
            () => todos.value,
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
