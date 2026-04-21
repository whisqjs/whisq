# CLAUDE.md — Whisq Framework Context

> Whisq is an AI-native JavaScript/TypeScript framework for building reactive web UIs.
> It uses signals, hyperscript element functions, and function components.
> No build step required. No JSX. No compilation. Just JavaScript.

## Core API (Complete)

```ts
import {
  signal, computed, effect, batch,
  div, span, h1, h2, h3, p, button, input, textarea, select, option,
  a, img, ul, ol, li, table, thead, tbody, tr, th, td, form, label,
  header, footer, nav, main, section, article, aside, strong, em,
  h, raw, when, each, mount,
  component, onMount, onCleanup, resource,
} from "@whisq/core";
```

### Reactive State

```ts
const count = signal(0);        // create reactive value
count.value;                    // read (triggers tracking)
count.value = 5;                // write (triggers updates)
count.update(n => n + 1);      // update via function
count.peek();                  // read WITHOUT tracking

const double = computed(() => count.value * 2);  // derived value
const dispose = effect(() => console.log(count.value));  // side effect

batch(() => { x.value = 1; y.value = 2; });  // batch updates
```

### Elements (Primary API)

Every HTML element is a function. Two call signatures:

```ts
// With props + children
div({ class: "card", id: "main" },
  h1("Title"),
  p("Content"),
)

// Without props — just children
div(
  h1("Title"),
  p("Content"),
)

// Single text child shorthand
h1("Hello Whisq")
button("Click me")
```

### Reactive Props and Children

```ts
// Reactive class — pass a function
div({ class: () => active.value ? "card active" : "card" },
  // Reactive text — pass a function as child
  span(() => `Count: ${count.value}`),
)

// Reactive style
div({ style: () => `color: ${color.value}` }, "Styled text")

// Reactive visibility
div({ hidden: () => !visible.value }, "Now you see me")
```

#### Reactive shapes — pick the right one

Four shapes cover every reactive position. The one-line decision flow: *"single signal you own → `bind()`; field inside an item inside a signal-held array → `bindField()`."*

| Shape            | Example                                                            | Use when                                             |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| Getter child     | `span(() => count.value)`                                          | A signal drives inline text                          |
| Getter prop      | `{ class: () => active.value ? "on" : "off" }`                      | A signal drives an element attribute / class / style |
| `bind()` spread  | `input({ ...bind(email) })`                                        | Two-way binding one signal into one form input       |
| `bindField()` spread | `input({ type: "checkbox", ...bindField(todos, todo, "done", { as: "checkbox" }) })` | Field inside an item inside a keyed `each`           |

Inside a keyed `each(..., { key })`, the callback’s `item` is an **accessor function** — call it (`todo()`) to read the current item. Getters that close over `todo` directly go stale when the array is replaced.

### Events

```ts
// Events use on* props — standard DOM event names
button({ onclick: () => count.value++ }, "Click me")
input({ oninput: (e) => name.value = e.target.value })
form({ onsubmit: (e) => { e.preventDefault(); save(); } },
  // form children
)
div({ onmouseenter: () => hovered.value = true })
input({ onkeydown: (e) => e.key === "Enter" && submit() })
```

### Conditional Rendering — when()

```ts
div(
  when(() => loggedIn.value,
    () => p("Welcome back!"),
    () => button({ onclick: login }, "Sign In"),
  ),
)

// Or inline with ternary (also works)
div(
  () => isError.value ? p({ class: "error" }, "Something broke") : null,
)
```

### List Rendering — each()

`each()` has two shapes depending on whether you pass a `key` option:

```ts
// 1. Non-keyed — items re-render on every source change, simple snapshot.
ul(
  each(() => items.value, (item) =>
    li(item.name),
  ),
)

// 2. Keyed — DOM nodes are reused for matching keys. The render callback
//    receives ACCESSORS, not snapshots, so field reads inside reactive
//    getters see fresh values when the source array is replaced:
ul(
  each(
    () => todos.value,
    (todo) =>
      li(
        { class: () => todo().done ? "done" : "" },  // getter reads accessor
        span(() => todo().text),                      // getter reads accessor
        button({ onclick: () => remove(todo().id) }, "✕"),
      ),
    { key: (t) => t.id },
  ),
)
```

When you pass `{ key }`, the callback’s `item` / `index` are **accessor functions** — call them (`todo()`, `index()`) to read the current value. Wrap them in `() =>` for reactive children/props so they re-read when the source array changes.

Inline `.map()` also works for simple cases:

```ts
ul(() => items.value.map(item => li(item.name)))
```

### Components

```ts
const Counter = component((props: { initial?: number }) => {
  const count = signal(props.initial ?? 0);

  onMount(() => {
    console.log("mounted!");
    return () => console.log("cleanup!");
  });

  return div({ class: "counter" },
    button({ onclick: () => count.value-- }, "-"),
    span(() => count.value),
    button({ onclick: () => count.value++ }, "+"),
  );
});

// Use component — it's a function call
mount(Counter({ initial: 10 }), document.getElementById("app"));

// Nest components
const App = component(() => {
  return div(
    header(h1("My App")),
    main(
      Counter({ initial: 0 }),
      Counter({ initial: 100 }),
    ),
  );
});
```

### Forms

```ts
const LoginForm = component(() => {
  const email = signal("");
  const password = signal("");
  const valid = computed(() => email.value.includes("@") && password.value.length >= 8);

  return form({ onsubmit: (e) => { e.preventDefault(); submit(); } },
    input({
      type: "email",
      placeholder: "Email",
      value: () => email.value,
      oninput: (e) => email.value = e.target.value,
    }),
    input({
      type: "password",
      placeholder: "Password",
      value: () => password.value,
      oninput: (e) => password.value = e.target.value,
    }),
    button({ disabled: () => !valid.value }, "Sign In"),
  );
});
```

### Async Data — resource()

```ts
const users = resource(() => fetch("/api/users").then(r => r.json()));

div(
  when(() => users.loading(), () => p("Loading...")),
  when(() => !!users.error(), () => p(() => users.error().message)),
  when(() => !!users.data(), () =>
    ul(each(() => users.data(), (u) => li(u.name)))
  ),
)
```

### Raw HTML Fallback — raw()

```ts
// For injecting pre-built HTML (markdown, third-party, etc.)
div({ class: "content" },
  h1("My Post"),
  raw(markdownToHtml(post.body)),
)

// ⚠️ raw() does NOT sanitize. Never pass user input directly.
```

### Low-Level — h()

```ts
// For dynamic tag names or edge cases
h("custom-element", { class: "foo" }, "content")
```

### Mount

```ts
const dispose = mount(App({}), document.getElementById("app"));
// Later: dispose() to unmount and clean up
```

## Shared State (Store Pattern)

```ts
// stores/cart.ts — just export signals and functions
export const items = signal([]);
export const total = computed(() => items.value.reduce((s, i) => s + i.price, 0));
export const addItem = (item) => { items.value = [...items.value, item]; };

// Any component — just import
import { items, total, addItem } from "./stores/cart";
```

### Persisted stores (opt-in, sub-path import)

Use `persistedSignal` when a store should survive reloads. It is in a sub-path export so apps that don't need it pay no bundle cost.

```ts
// stores/todos.ts
import { persistedSignal } from "@whisq/core/persistence";

export const todos = persistedSignal<Todo[]>("todos", []);
// - reads from localStorage on init, writes on change
// - SSR-safe (returns initial when window is undefined)
// - falls back to initial on parse/schema error; warns on quota-exceeded
```

Call at module scope in `stores/` — the write effect lives for the module lifetime by design.

## Anti-Patterns (DO NOT)

- ❌ `html\`...\`` — use element functions instead (div, span, button...)
- ❌ `count.value` as child — always wrap: `() => count.value`
- ❌ JSX syntax — use hyperscript functions
- ❌ Class components — use `component()` function
- ❌ `this` keyword — there is no `this`
- ❌ `items.value.push(x)` — won't trigger. Use `items.value = [...items.value, x]`
- ✅ `raw()` is OK for HTML strings (markdown, rich text, third-party HTML)

## Project Structure

**One-line rule:** one component per file. `main.ts` is for mounting, nothing else.

```
src/
  main.ts         # entrypoint — mounts App to #app, nothing else
  App.ts          # top-level component — routing, layout, error boundaries
  styles.ts       # sheet() definitions at module scope
  components/     # reusable UI — one per file, PascalCase, named exports
    Button.ts
    Card.ts
  pages/          # route targets (if using @whisq/router)
    Home.ts
    About.ts
  stores/         # shared state — one domain per file
    cart.ts
    auth.ts
  lib/            # pure utilities, NO Whisq imports (testable in isolation)
```

- **`main.ts`** stays ~4 lines: import `App`, call `mount(App({}), ...)`. Nothing else belongs here.
- **`App.ts`** owns routing, layout, error boundary, head setup. Business logic goes in `stores/`; route pages in `pages/`; reusable UI in `components/`.
- **One component per file** in `components/`. PascalCase filename matches the named export (`Button.ts` exports `Button`). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
- **Stores** export both the signals and the mutation helpers that operate on them. No default exports. No import-time I/O.
- **`lib/`** is Whisq-free — if it needs a signal, it belongs in `stores/`.

Anti-patterns to avoid: single-file apps, `src/lib/index.ts` utility soup, default exports, `stores/store.ts` holding everything, top-level network calls in a store, `main.ts` doing anything but `mount()`.

Full convention with examples: [`packages/core/docs/project-structure.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/project-structure.md) (in the framework repo).

## Git Workflow

### Branching
- `main` — production releases only
- `develop` — integration branch, all features merge here
- `feature/WHISQ-<issue#>-<short-desc>` — feature work
- `bugfix/WHISQ-<issue#>-<short-desc>` — bug fixes
- `release/v<version>` — release preparation (develop -> main)

### Commit Messages
Format: `WHISQ-<issue#>: <short description>`
Example: `WHISQ-1: implement keyed list reconciliation`

### PR Flow
1. feature/bugfix branch -> PR to `develop` -> squash merge
2. release branch -> PR to `main` -> merge + tag
3. After release merge, back-merge `main` into `develop`

### Task Tracking
All work is tracked via GitHub Issues on `whisqjs/whisq`.
Milestone: `v1.0.0-alpha`. Labels: P0-critical, P1-high, P2-medium, sprint-1..6, core, router, ssr, tooling, testing, docs, ci.

## Brand & Visual Identity

See [docs/BRAND_IDENTITY.md](./docs/BRAND_IDENTITY.md) for:
- Complete color palette extracted from mascot (deep indigo + cyan accent)
- Typography (Inter + JetBrains Mono), type scale, spacing tokens
- Mascot usage rules, logo lockups, wordmark specs
- Component styles (buttons, code blocks, callouts)
- Dark mode (default), motion/animation principles
- Gradient definitions, iconography (Lucide), shadow system

See [docs/BRAND_GUIDE.md](./docs/BRAND_GUIDE.md) for:
- AI image generation prompts for logo and mascot variants

## Documentation Website (whisq.dev)

See [docs/DOCS_WEBSITE_SPEC.md](./docs/DOCS_WEBSITE_SPEC.md) for:
- SSG: Starlight (Astro) with custom Whisq dark theme
- Hosting: Cloudflare Pages (free, fastest CDN)
- Full site structure with 40+ content pages
- Starlight config, sidebar, navigation
- Landing page section-by-section spec
- API reference template, content writing guidelines
- SEO, analytics, deployment pipeline