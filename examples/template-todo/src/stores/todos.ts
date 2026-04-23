import { computed } from "@whisq/core";
import { persistedSignal } from "@whisq/core/persistence";
import { randomId } from "@whisq/core/ids";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

// Persisted signal: survives reloads, tabs share state. Schema versioned via
// the key suffix — bump to `:v2` on shape change and the old value falls
// back to the initial `[]`.
export const todos = persistedSignal<Todo[]>("whisq-template-todo:v1", [], {
  onSchemaFailure: (err) => {
    console.warn("todos: failed to hydrate stored state, resetting", err);
  },
});

export const pendingCount = computed(
  () => todos.value.filter((t) => !t.done).length,
);

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
