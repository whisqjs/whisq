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

```ts
ul(
  each(() => todos.value, (todo) =>
    li({ class: () => todo.done ? "done" : "" },
      span(todo.text),
      button({ onclick: () => remove(todo.id) }, "✕"),
    )
  ),
)

// Or inline with .map() (also works)
ul(
  () => items.value.map(item => li(item.name))
)
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

## Anti-Patterns (DO NOT)

- ❌ `html\`...\`` — use element functions instead (div, span, button...)
- ❌ `count.value` as child — always wrap: `() => count.value`
- ❌ JSX syntax — use hyperscript functions
- ❌ Class components — use `component()` function
- ❌ `this` keyword — there is no `this`
- ❌ `items.value.push(x)` — won't trigger. Use `items.value = [...items.value, x]`
- ✅ `raw()` is OK for HTML strings (markdown, rich text, third-party HTML)

## Project Structure

```
src/
  components/     # Component files
  stores/         # Shared state (exported signals)
  pages/          # Route pages (if using @whisq/router)
  main.ts         # Entry: mount(App({}), document.getElementById("app"))
```

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