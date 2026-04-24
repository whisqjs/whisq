import { computed, signal } from "@whisq/core";
import { persistedSignal } from "@whisq/core/persistence";
import { randomId } from "@whisq/core/ids";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export type Filter = "all" | "active" | "done";

// Persisted signal: survives reloads, tabs share state. Schema versioned via
// the key suffix — bump to `:v2` on shape change and the old value falls
// back to the initial `[]`.
export const todos = persistedSignal<Todo[]>("whisq-template-todo:v1", [], {
  onSchemaFailure: (err) => {
    console.warn("todos: failed to hydrate stored state, resetting", err);
  },
});

// View filter — kept in memory (not persisted) so a fresh tab always starts
// on "all" and the user's previous narrowing doesn't silently hide rows.
export const filter = signal<Filter>("all");

export const pendingCount = computed(
  () => todos.value.filter((t) => !t.done).length,
);

// The rows TodoList renders, driven by the current filter. Keyed `each()`
// over this signal keeps row DOM nodes stable across filter changes so any
// in-progress inline UI state (focus, selection) survives narrowing.
export const visible = computed<Todo[]>(() => {
  const f = filter.value;
  if (f === "active") return todos.value.filter((t) => !t.done);
  if (f === "done") return todos.value.filter((t) => t.done);
  return todos.value;
});

// Mutations as named actions — every write goes through one of these so
// the "set of ways state can change" stays auditable.
export const addTodo = (text: string): void => {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.value = [
    ...todos.value,
    { id: randomId(), text: trimmed, done: false },
  ];
};

export const removeTodo = (id: string): void => {
  todos.value = todos.value.filter((t) => t.id !== id);
};

export const clearDone = (): void => {
  todos.value = todos.value.filter((t) => !t.done);
};

export const setFilter = (next: Filter): void => {
  filter.value = next;
};
