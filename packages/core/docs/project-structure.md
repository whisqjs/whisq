# Project structure conventions

Canonical file layout for Whisq applications. Every `npm create whisq@latest` template uses this shape; AI-generated code should too.

> **One-line rule:** one component per file. `main.ts` is for mounting, nothing else.

---

## The tree

```
src/
  main.ts          # entrypoint — mounts App to #app, nothing else
  App.ts           # top-level component — routing, layout, error boundaries
  styles.ts        # sheet() definitions at module scope
  components/      # reusable UI components
    Button.ts
    Card.ts
    TodoItem.ts
  pages/           # route targets (if using @whisq/router)
    Home.ts
    About.ts
    TodoDetail.ts
  stores/          # shared state — one domain per file
    cart.ts
    auth.ts
    session.ts
  lib/             # pure utilities, NO Whisq imports (testable in isolation)
    format-date.ts
    parse-query.ts
```

This is what the `full-app` template scaffolds. The other templates (`minimal`, `ssr`, `vite-plugin`) are subsets — drop what you don't need, but keep the same layout for what you do use.

---

## Per-file rules

### `src/main.ts` — the entrypoint

Four lines, give or take. Imports the root component, calls `mount`. **Nothing else.** No signals, no helpers, no route definitions.

```ts
import { mount } from "@whisq/core";
import { App } from "./App";

mount(App({}), document.getElementById("app")!);
```

If you feel tempted to put anything else here, it belongs in `App.ts` or a store.

### `src/App.ts` — the top-level component

The application's root component. Owns:

- Routing (wiring up `createRouter` + `RouterView`)
- Layout (header / nav / main / footer)
- Global error boundary (via `errorBoundary`)
- Theme / head setup (`theme()`, `useHead()`)

Does **not** own:

- Business-logic state — that belongs in `stores/`
- Individual route pages — those belong in `pages/`
- Reusable UI — that belongs in `components/`

```ts
import { component, div } from "@whisq/core";
import { createRouter, RouterView } from "@whisq/router";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Nav } from "./components/Nav";
import { s } from "./styles";

const router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/about", component: About },
  ],
});

export const App = component(() =>
  div({ class: s.app }, Nav({ router }), RouterView({ router })),
);
```

### `src/components/` — reusable UI

- **One component per file.** Named export. PascalCase filename matches the export name: `Button.ts` exports `Button`.
- Aim for <100 lines including styles and helpers. If you're past 150, it's probably two components.
- Components that are used in one place only stay inline in their page or parent. Pull them out here when they're reused.
- No side effects at module scope (no network calls, no timers). Keep the module import-cheap.

### `src/pages/` — route targets

- One file per route. Filename matches the route's purpose (`Home.ts`, `UserProfile.ts`), not its URL.
- Each page exports one `component()` — that's the route's render target.
- Pages can own their own page-scoped state via `signal()` at module scope OR inside the component setup. Route-crossing state lives in `stores/`.
- Dynamic segments (`/user/:id`) read params via `route.params.value.id` inside the page.

### `src/stores/` — shared state

- One domain per file. `cart.ts`, `auth.ts`, `session.ts`, etc. — not `store.ts` or `state.ts`.
- Each file exports the signals plus the mutation helpers that operate on them. Consumers import both from the same module.
- No default exports — named exports compose better and name better in stack traces.
- No top-level I/O at import time. Kick off network calls from the component that needs them (via `resource()`) or from a function the consumer calls.

```ts
// stores/cart.ts
import { signal, computed } from "@whisq/core";

export const items = signal<CartItem[]>([]);
export const total = computed(() =>
  items.value.reduce((sum, i) => sum + i.price * i.quantity, 0),
);

export function add(item: CartItem) {
  items.value = [...items.value, item];
}

export function remove(id: string) {
  items.value = items.value.filter((i) => i.id !== id);
}
```

### `src/lib/` — pure utilities

- No Whisq imports. No DOM. Testable in Node without jsdom.
- Each file is a small, focused utility. `format-date.ts`, `parse-query.ts`, `slugify.ts`.
- If something needs a signal, it belongs in `stores/`, not `lib/`.

### `src/styles.ts` — styling

- `sheet()` definitions at module scope. Import the returned object anywhere as `s` (or `styles`).
- `theme()` lives here too — called once at module load for design tokens.
- Per-component one-off styles CAN live in the component file if they're small and local; anything shared goes here.

---

## One component per file, really?

Yes. The single strongest predictor of a Whisq app an AI won't mangle on its second iteration is that every component has a file with its name on it. When an AI is asked to "fix the Card component's padding", it finds `src/components/Card.ts`, edits, done. When Card is inlined at line 412 of main.ts, the AI either rewrites the whole file (losing other changes) or hallucinates a new Card component somewhere else.

**Small local helpers** (a `formatPrice` pure function used only in `Card.ts`) stay inline. **Small sub-components** (a `CardHeader` used only in `Card.ts`) can stay inline. The rule only applies to components that are _reused_ or _conceptually independent_.

### When to split

Pull a sub-component into its own file when **any** of:

- Used in more than one place.
- Owns its own state or effects that are conceptually independent.
- Exceeds ~50 lines on its own.
- Has its own tests (or should).

Otherwise keep it inline.

---

## Anti-patterns

| Anti-pattern                               | Why it hurts                                                                        | Do instead                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| Single-file app (everything in `main.ts`)  | Unreadable past 200 lines; AI rewrites the whole file to change anything            | Split per the tree above                    |
| `src/lib/index.ts` utility soup            | Imports everything; kills tree-shaking; circular-import magnet                      | One utility per file, import specifically   |
| Default exports                            | Don't compose in stack traces or auto-imports; AI often re-exports them differently | Always named exports                        |
| `stores/store.ts` holding everything       | Import of one domain drags in all; testing requires the whole graph                 | One domain per file                         |
| Top-level network calls in a store         | Import-time side effects break SSR and tests                                        | Kick off from `resource()` or a user action |
| `src/main.ts` doing anything but `mount()` | `main.ts` gets a second responsibility, then a third                                | Move to `App.ts` or a store                 |

---

## See also

- [`reactive-shapes.md`](./reactive-shapes.md) — the four shapes of reactive data flow.
- [`batch-semantics.md`](./batch-semantics.md) — how `batch()` sequences effect flushes.
- The `full-app` template at [`packages/create-whisq/src/templates/full-app/`](../../create-whisq/src/templates/full-app/) is a live reference of this structure.
