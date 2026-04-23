import {
  component,
  div,
  h1,
  p,
  button,
  errorBoundary,
} from "@whisq/core";
import { TodoInput } from "./components/TodoInput";
import { TodoList } from "./components/TodoList";
import { s } from "./styles";

export const App = component(() =>
  div(
    { class: s.app },
    h1({ class: s.heading }, "Whisq todos"),
    // errorBoundary wraps the mutable UI so a thrown error in any child
    // degrades to a retry button instead of tearing down the whole app.
    errorBoundary(
      (err, retry) =>
        div(
          { class: s.error },
          p("Something broke: " + err.message),
          button({ class: s.btn, onclick: retry }, "Retry"),
        ),
      () =>
        div(
          TodoInput({}),
          TodoList({}),
        ),
    ),
  ),
);
