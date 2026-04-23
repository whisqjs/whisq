# whisq-template-todo

A minimal, StackBlitz-runnable [Whisq](https://whisq.dev) todo app. Used by the whisq.dev docs as the target of the "Open in StackBlitz" button on `/examples/todo-app/`.

## Run in StackBlitz

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/whisqjs/whisq/tree/main/examples/template-todo)

## Run locally

```bash
git clone https://github.com/whisqjs/whisq.git
cd whisq/examples/template-todo
npm install
npm run dev
```

## What the template demonstrates

The canonical alpha.8 Whisq patterns, one per file:

- **`src/main.ts`** — mount entrypoint.
- **`src/App.ts`** — `errorBoundary` wrapping the mutable UI (so a thrown error in any child degrades gracefully).
- **`src/stores/todos.ts`** — `persistedSignal<Todo[]>` with `onSchemaFailure` diagnostic, `randomId()` for keys, mutations exported as named actions.
- **`src/components/TodoInput.ts`** — `bind()` for two-way input binding.
- **`src/components/TodoList.ts`** — `match()` directly as a component root (no wrapper div), keyed `each()` with an `ItemAccessor<Todo>` render.
- **`src/components/TodoItem.ts`** — `bindField()` for the checkbox toggle, `class:` array form with a reactive strikethrough getter.
- **`src/styles.ts`** — `sheet()` with nested selectors (`&:hover`, `&:focus`) + `theme()` tokens.

## Dependency contract

The `@whisq/core` version in `package.json` is kept in lockstep with the monorepo via `scripts/sync-template-versions.mjs` on release. Every `pnpm run version` bump rewrites this file so `npm install @whisq/core` on StackBlitz resolves to a matching release.

## License

MIT (same as the framework).
