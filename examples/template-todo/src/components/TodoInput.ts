import {
  component,
  signal,
  form,
  input,
  button,
  bind,
} from "@whisq/core";
import { addTodo } from "../stores/todos";
import { s } from "../styles";

export const TodoInput = component(() => {
  const draft = signal("");

  const submit = (e: Event): void => {
    e.preventDefault();
    addTodo(draft.value);
    draft.value = "";
  };

  return form(
    { class: s.inputRow, onsubmit: submit },
    input({
      class: s.input,
      type: "text",
      placeholder: "What needs doing?",
      // bind spread LAST — per the WHISQ-120 convention, spreading bind
      // last makes it obvious if another handler gets wiped (since bind's
      // handler would be the one that "wins" and overwrites yours).
      ...bind(draft),
    }),
    button({ class: s.btn, type: "submit" }, "Add"),
  );
});
