import {
  component,
  li,
  input,
  span,
  button,
  bindField,
} from "@whisq/core";
import type { ItemAccessor } from "@whisq/core";
import { todos, removeTodo } from "../stores/todos";
import type { Todo } from "../stores/todos";
import { s } from "../styles";

interface TodoItemProps {
  todo: ItemAccessor<Todo>;
}

export const TodoItem = component((props: TodoItemProps) =>
  li(
    { class: s.item },
    input({
      type: "checkbox",
      ...bindField(todos, props.todo, "done", { as: "checkbox" }),
    }),
    span(
      // class: array form — strings + reactive getter, falsy-filtered.
      {
        class: [
          s.itemText,
          () => props.todo.value.done && s.doneText,
        ],
      },
      () => props.todo.value.text,
    ),
    button(
      {
        class: s.removeBtn,
        "aria-label": "Remove",
        onclick: () => removeTodo(props.todo.value.id),
      },
      "×",
    ),
  ),
);
