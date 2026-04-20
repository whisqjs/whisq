# Whisq — AI Test Prompts

A set of prompts you can paste into **Claude**, **ChatGPT**, **Gemini**, **Cursor** composer, or any other coding assistant to build real applications with Whisq. Use these to stress-test how well AIs actually produce working Whisq code, find rough edges in the API, and surface documentation gaps.

---

## How to use

Every prompt below is a self-contained fenced code block — hover over the block and click the **copy icon** your renderer provides (GitHub, VS Code preview, and most docs-site theme all show one). Paste the full text into your AI of choice. No assembly needed; each prompt already includes the reference links and hard constraints the AI needs up-front.

Take the output, drop it into a fresh `npm create whisq@latest` project, see what breaks. Every AI mistake that isn't covered by the reference block is a **docs gap** worth filing on `whisqjs/whisq.dev`.

---

## Prompt 1 — Todo list (warm-up)

Classic warm-up: signals, list rendering, form input, add/remove.

```text
You are writing an app using Whisq, an AI-native JavaScript framework.
Before writing any code, read these URLs and use them as the authoritative reference:

  - Compact LLM reference card (start here): https://whisq.dev/ai/llm-reference/
  - Core concepts:                           https://whisq.dev/core-concepts/
  - API reference:                           https://whisq.dev/api/
  - Guides (forms, data, styling, etc.):     https://whisq.dev/guides/
  - Machine-readable exports manifest:       https://unpkg.com/@whisq/core@latest/dist/public-api.json

Whisq rules (hard constraints):
  - NO JSX. NO template literals. UI is built from element FUNCTIONS: div(), span(), button(), input(), etc.
  - NO classes, NO `this`. Components are plain functions wrapped with component().
  - Reactivity uses signals: const count = signal(0); read count.value, write count.value = 5.
  - To use a signal as a child or prop, ALWAYS wrap in a function: div(() => count.value), { class: () => active.value ? "on" : "off" }.
  - Don't mutate arrays/objects in place — reassign: items.value = [...items.value, newItem].
  - Use bind(signal) for two-way form input binding instead of manual value/oninput.
  - Use ref<T>() for imperative DOM access.
  - Use match(...) for tri-state/multi-branch conditionals (loading/error/data), not chained when() calls.
  - Use resource(fetcher, { source, keepPrevious, initialValue }) for async data with cancellation.
  - Use signalMap / signalSet (imported from "@whisq/core/collections") for large keyed state.

Whisq project structure (one-line rule: one component per file; main.ts is for mounting, nothing else):
  - src/main.ts — ~4 lines, imports App and calls mount(App({}), document.getElementById("app")!). Nothing else.
  - src/App.ts — top-level component. Owns routing, layout, error boundary. Business logic goes in stores/; reusable UI in components/; route targets in pages/.
  - src/components/ — reusable UI, one per file. PascalCase filename matches the named export (Button.ts exports Button). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
  - src/pages/ — route targets if using @whisq/router. One file per route.
  - src/stores/ — shared state, one domain per file (cart.ts, auth.ts). Export signals + mutation helpers. No default exports. No import-time I/O.
  - src/lib/ — pure utilities, NO Whisq imports. Testable in Node without jsdom.
  - src/styles.ts — sheet() definitions at module scope.
  - DON'T ship a single-file app that inlines every component in main.ts for non-trivial projects. Scaffolders and AI output diverge when that happens, and editing turns into whole-file rewrites.

Whisq styling (use Whisq's built-in primitives — do NOT import styled-components, emotion, goober, or any other CSS-in-JS library; do NOT add Tailwind unless specifically asked):
  - sheet({ card: { padding: "1rem", color: "red", "&:hover": { color: "blue" }, "@media (max-width: 640px)": { padding: "0.5rem" } } })
    — scoped CSS classes with nested pseudo/media rules. Returns { card: "whisq-card-a1b2", ... } which you spread into class props. Use this as the DEFAULT for all non-reactive styling. No build step; a <style> tag is injected at runtime.
  - cx("btn", active && "btn-active") — compose class strings. Use inside { class: cx(...) }.
  - rcx(() => styles.base, () => active.value && styles.active) — REACTIVE class composition. Use when the class depends on a signal: { class: rcx(...) }.
  - For reactive inline styles, PREFER the object form with per-property getters over string templates:
      div({ style: {
        color: () => color.value,
        transform: () => `translateX(${x.value}px)`,
        "--accent": () => accent.value,   // CSS custom properties pass through unchanged
      }})
    Each property gets its own subscription. Do NOT stringify a full CSS declaration manually — coarse reactivity re-runs every style on every change.
  - sx({ color: "red" }, active.value && { borderColor: "blue" }, { padding: () => `${px.value}px` })
    — compositional helper that merges multiple style objects (supports conditionals via `cond && { ... }`).
  - theme({ color: { bg: "#111", fg: "#fff" }, space: { md: "1rem" } }) — design tokens written as CSS custom properties at :root. Call once at app start; reference inside sheet() rules via var(--color-bg) etc.
  - For layout, use flexbox or grid inside sheet() rules. Avoid hand-positioning with absolute/top/left unless the design actually requires overlay.
  - Do NOT write raw <style> tags in markup. sheet() handles <style> injection.
  - All of sheet, cx, rcx, sx, theme are imported from "@whisq/core".

Task: Build a todo app that mounts to #app, following the project structure rules above.

Features:
  - Text input to add new todos (Enter key or Add button submits).
  - List of todos. Each item shows the text and a ✕ button to remove it.
  - Each item has a checkbox that toggles "done". Done items are visually struck through (via a class, not inline style).
  - A footer shows "N of M done" that updates reactively.
  - An "All / Active / Done" filter that changes which items render.
  - LocalStorage persistence — the list survives page reload.

Acceptance criteria:
  - Adding an item via Enter key works.
  - Removing an item updates the footer count immediately.
  - Switching filters doesn't re-create components for items that remain visible (use each(..., { key })).
  - Empty state: when the list is empty show a "Nothing to do" message. Use match() or when(), not a function child with if-statements.
  - No innerHTML, no raw(), no html``, no JSX.
```

## Prompt 2 — Signup form with live validation

Tests `bind()`, `computed`, controlled inputs, error UI.

```text
You are writing an app using Whisq, an AI-native JavaScript framework.
Before writing any code, read these URLs and use them as the authoritative reference:

  - Compact LLM reference card (start here): https://whisq.dev/ai/llm-reference/
  - Core concepts:                           https://whisq.dev/core-concepts/
  - API reference:                           https://whisq.dev/api/
  - Guides (forms, data, styling, etc.):     https://whisq.dev/guides/
  - Machine-readable exports manifest:       https://unpkg.com/@whisq/core@latest/dist/public-api.json

Whisq rules (hard constraints):
  - NO JSX. NO template literals. UI is built from element FUNCTIONS: div(), span(), button(), input(), etc.
  - NO classes, NO `this`. Components are plain functions wrapped with component().
  - Reactivity uses signals: const count = signal(0); read count.value, write count.value = 5.
  - To use a signal as a child or prop, ALWAYS wrap in a function: div(() => count.value), { class: () => active.value ? "on" : "off" }.
  - Don't mutate arrays/objects in place — reassign: items.value = [...items.value, newItem].
  - Use bind(signal) for two-way form input binding instead of manual value/oninput.
  - Use ref<T>() for imperative DOM access.
  - Use match(...) for tri-state/multi-branch conditionals (loading/error/data), not chained when() calls.
  - Use resource(fetcher, { source, keepPrevious, initialValue }) for async data with cancellation.
  - Use signalMap / signalSet (imported from "@whisq/core/collections") for large keyed state.

Whisq project structure (one-line rule: one component per file; main.ts is for mounting, nothing else):
  - src/main.ts — ~4 lines, imports App and calls mount(App({}), document.getElementById("app")!). Nothing else.
  - src/App.ts — top-level component. Owns routing, layout, error boundary. Business logic goes in stores/; reusable UI in components/; route targets in pages/.
  - src/components/ — reusable UI, one per file. PascalCase filename matches the named export (Button.ts exports Button). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
  - src/pages/ — route targets if using @whisq/router. One file per route.
  - src/stores/ — shared state, one domain per file (cart.ts, auth.ts). Export signals + mutation helpers. No default exports. No import-time I/O.
  - src/lib/ — pure utilities, NO Whisq imports. Testable in Node without jsdom.
  - src/styles.ts — sheet() definitions at module scope.
  - DON'T ship a single-file app that inlines every component in main.ts for non-trivial projects. Scaffolders and AI output diverge when that happens, and editing turns into whole-file rewrites.

Whisq styling (use Whisq's built-in primitives — do NOT import styled-components, emotion, goober, or any other CSS-in-JS library; do NOT add Tailwind unless specifically asked):
  - sheet({ card: { padding: "1rem", color: "red", "&:hover": { color: "blue" }, "@media (max-width: 640px)": { padding: "0.5rem" } } })
    — scoped CSS classes with nested pseudo/media rules. Returns { card: "whisq-card-a1b2", ... } which you spread into class props. Use this as the DEFAULT for all non-reactive styling. No build step; a <style> tag is injected at runtime.
  - cx("btn", active && "btn-active") — compose class strings. Use inside { class: cx(...) }.
  - rcx(() => styles.base, () => active.value && styles.active) — REACTIVE class composition. Use when the class depends on a signal: { class: rcx(...) }.
  - For reactive inline styles, PREFER the object form with per-property getters over string templates:
      div({ style: {
        color: () => color.value,
        transform: () => `translateX(${x.value}px)`,
        "--accent": () => accent.value,   // CSS custom properties pass through unchanged
      }})
    Each property gets its own subscription. Do NOT stringify a full CSS declaration manually — coarse reactivity re-runs every style on every change.
  - sx({ color: "red" }, active.value && { borderColor: "blue" }, { padding: () => `${px.value}px` })
    — compositional helper that merges multiple style objects (supports conditionals via `cond && { ... }`).
  - theme({ color: { bg: "#111", fg: "#fff" }, space: { md: "1rem" } }) — design tokens written as CSS custom properties at :root. Call once at app start; reference inside sheet() rules via var(--color-bg) etc.
  - For layout, use flexbox or grid inside sheet() rules. Avoid hand-positioning with absolute/top/left unless the design actually requires overlay.
  - Do NOT write raw <style> tags in markup. sheet() handles <style> injection.
  - All of sheet, cx, rcx, sx, theme are imported from "@whisq/core".

Task: Build a signup form that collects email, password, password-confirm, age, and "accept terms" checkbox.

Validation (live, as user types):
  - Email: must match a basic email shape.
  - Password: min 8 chars, must contain a digit.
  - Password-confirm: must equal password.
  - Age: integer ≥ 13.
  - Terms: must be checked.

UI requirements:
  - Each field shows its own validation error below it, but only after the field has been blurred once (don't scream at the user mid-typing).
  - The Submit button is disabled until every field is valid.
  - On submit, display a JSON summary of what would be sent.
  - Use bind() for every input — no hand-rolled value / oninput pairs.
  - Number input uses bind(age, { as: "number" }).
  - Checkbox uses bind(accepted, { as: "checkbox" }).
```

## Prompt 3 — Chat UI with `resource()` + `match()` + `signalMap`

Tests async data, per-key reactivity, optimistic updates.

```text
You are writing an app using Whisq, an AI-native JavaScript framework.
Before writing any code, read these URLs and use them as the authoritative reference:

  - Compact LLM reference card (start here): https://whisq.dev/ai/llm-reference/
  - Core concepts:                           https://whisq.dev/core-concepts/
  - API reference:                           https://whisq.dev/api/
  - Guides (forms, data, styling, etc.):     https://whisq.dev/guides/
  - Machine-readable exports manifest:       https://unpkg.com/@whisq/core@latest/dist/public-api.json

Whisq rules (hard constraints):
  - NO JSX. NO template literals. UI is built from element FUNCTIONS: div(), span(), button(), input(), etc.
  - NO classes, NO `this`. Components are plain functions wrapped with component().
  - Reactivity uses signals: const count = signal(0); read count.value, write count.value = 5.
  - To use a signal as a child or prop, ALWAYS wrap in a function: div(() => count.value), { class: () => active.value ? "on" : "off" }.
  - Don't mutate arrays/objects in place — reassign: items.value = [...items.value, newItem].
  - Use bind(signal) for two-way form input binding instead of manual value/oninput.
  - Use ref<T>() for imperative DOM access.
  - Use match(...) for tri-state/multi-branch conditionals (loading/error/data), not chained when() calls.
  - Use resource(fetcher, { source, keepPrevious, initialValue }) for async data with cancellation.
  - Use signalMap / signalSet (imported from "@whisq/core/collections") for large keyed state.

Whisq project structure (one-line rule: one component per file; main.ts is for mounting, nothing else):
  - src/main.ts — ~4 lines, imports App and calls mount(App({}), document.getElementById("app")!). Nothing else.
  - src/App.ts — top-level component. Owns routing, layout, error boundary. Business logic goes in stores/; reusable UI in components/; route targets in pages/.
  - src/components/ — reusable UI, one per file. PascalCase filename matches the named export (Button.ts exports Button). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
  - src/pages/ — route targets if using @whisq/router. One file per route.
  - src/stores/ — shared state, one domain per file (cart.ts, auth.ts). Export signals + mutation helpers. No default exports. No import-time I/O.
  - src/lib/ — pure utilities, NO Whisq imports. Testable in Node without jsdom.
  - src/styles.ts — sheet() definitions at module scope.
  - DON'T ship a single-file app that inlines every component in main.ts for non-trivial projects. Scaffolders and AI output diverge when that happens, and editing turns into whole-file rewrites.

Whisq styling (use Whisq's built-in primitives — do NOT import styled-components, emotion, goober, or any other CSS-in-JS library; do NOT add Tailwind unless specifically asked):
  - sheet({ card: { padding: "1rem", color: "red", "&:hover": { color: "blue" }, "@media (max-width: 640px)": { padding: "0.5rem" } } })
    — scoped CSS classes with nested pseudo/media rules. Returns { card: "whisq-card-a1b2", ... } which you spread into class props. Use this as the DEFAULT for all non-reactive styling. No build step; a <style> tag is injected at runtime.
  - cx("btn", active && "btn-active") — compose class strings. Use inside { class: cx(...) }.
  - rcx(() => styles.base, () => active.value && styles.active) — REACTIVE class composition. Use when the class depends on a signal: { class: rcx(...) }.
  - For reactive inline styles, PREFER the object form with per-property getters over string templates:
      div({ style: {
        color: () => color.value,
        transform: () => `translateX(${x.value}px)`,
        "--accent": () => accent.value,   // CSS custom properties pass through unchanged
      }})
    Each property gets its own subscription. Do NOT stringify a full CSS declaration manually — coarse reactivity re-runs every style on every change.
  - sx({ color: "red" }, active.value && { borderColor: "blue" }, { padding: () => `${px.value}px` })
    — compositional helper that merges multiple style objects (supports conditionals via `cond && { ... }`).
  - theme({ color: { bg: "#111", fg: "#fff" }, space: { md: "1rem" } }) — design tokens written as CSS custom properties at :root. Call once at app start; reference inside sheet() rules via var(--color-bg) etc.
  - For layout, use flexbox or grid inside sheet() rules. Avoid hand-positioning with absolute/top/left unless the design actually requires overlay.
  - Do NOT write raw <style> tags in markup. sheet() handles <style> injection.
  - All of sheet, cx, rcx, sx, theme are imported from "@whisq/core".

Task: Build a chat room view that displays messages from https://jsonplaceholder.typicode.com/comments?postId=1 (each comment is a "message" with id, name, body).

Features:
  - On mount, fetch the messages via resource() with an AbortSignal.
  - Display three states via match():
      loading — show a skeleton of 3 message placeholders
      error   — show the error message and a Retry button (calls resource.refetch())
      ready   — show the message list
  - Messages are stored in a signalMap<string, Message> keyed by id so individual message edits are fine-grained.
  - Each message has a ❤ button. Clicking it toggles a "liked" flag on just that message — no other messages should re-render.
  - A "Send" input + button appends a locally-authored message optimistically via resource.mutate(), then POSTs to /comments (just log the would-be request, no real server).

Acceptance criteria:
  - Toggling ❤ on one message must not trigger re-render of any other message (prove via a counter you print in a devtools effect).
  - Error path works — to test, change the URL to an invalid one and reload.
  - Optimistic send shows the message immediately, even before the fake POST "finishes".
```

## Prompt 4 — Markdown editor with live preview

Tests `raw()`, `textarea({ ...bind(signal) })`, debounced compute.

```text
You are writing an app using Whisq, an AI-native JavaScript framework.
Before writing any code, read these URLs and use them as the authoritative reference:

  - Compact LLM reference card (start here): https://whisq.dev/ai/llm-reference/
  - Core concepts:                           https://whisq.dev/core-concepts/
  - API reference:                           https://whisq.dev/api/
  - Guides (forms, data, styling, etc.):     https://whisq.dev/guides/
  - Machine-readable exports manifest:       https://unpkg.com/@whisq/core@latest/dist/public-api.json

Whisq rules (hard constraints):
  - NO JSX. NO template literals. UI is built from element FUNCTIONS: div(), span(), button(), input(), etc.
  - NO classes, NO `this`. Components are plain functions wrapped with component().
  - Reactivity uses signals: const count = signal(0); read count.value, write count.value = 5.
  - To use a signal as a child or prop, ALWAYS wrap in a function: div(() => count.value), { class: () => active.value ? "on" : "off" }.
  - Don't mutate arrays/objects in place — reassign: items.value = [...items.value, newItem].
  - Use bind(signal) for two-way form input binding instead of manual value/oninput.
  - Use ref<T>() for imperative DOM access.
  - Use match(...) for tri-state/multi-branch conditionals (loading/error/data), not chained when() calls.
  - Use resource(fetcher, { source, keepPrevious, initialValue }) for async data with cancellation.
  - Use signalMap / signalSet (imported from "@whisq/core/collections") for large keyed state.

Whisq project structure (one-line rule: one component per file; main.ts is for mounting, nothing else):
  - src/main.ts — ~4 lines, imports App and calls mount(App({}), document.getElementById("app")!). Nothing else.
  - src/App.ts — top-level component. Owns routing, layout, error boundary. Business logic goes in stores/; reusable UI in components/; route targets in pages/.
  - src/components/ — reusable UI, one per file. PascalCase filename matches the named export (Button.ts exports Button). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
  - src/pages/ — route targets if using @whisq/router. One file per route.
  - src/stores/ — shared state, one domain per file (cart.ts, auth.ts). Export signals + mutation helpers. No default exports. No import-time I/O.
  - src/lib/ — pure utilities, NO Whisq imports. Testable in Node without jsdom.
  - src/styles.ts — sheet() definitions at module scope.
  - DON'T ship a single-file app that inlines every component in main.ts for non-trivial projects. Scaffolders and AI output diverge when that happens, and editing turns into whole-file rewrites.

Whisq styling (use Whisq's built-in primitives — do NOT import styled-components, emotion, goober, or any other CSS-in-JS library; do NOT add Tailwind unless specifically asked):
  - sheet({ card: { padding: "1rem", color: "red", "&:hover": { color: "blue" }, "@media (max-width: 640px)": { padding: "0.5rem" } } })
    — scoped CSS classes with nested pseudo/media rules. Returns { card: "whisq-card-a1b2", ... } which you spread into class props. Use this as the DEFAULT for all non-reactive styling. No build step; a <style> tag is injected at runtime.
  - cx("btn", active && "btn-active") — compose class strings. Use inside { class: cx(...) }.
  - rcx(() => styles.base, () => active.value && styles.active) — REACTIVE class composition. Use when the class depends on a signal: { class: rcx(...) }.
  - For reactive inline styles, PREFER the object form with per-property getters over string templates:
      div({ style: {
        color: () => color.value,
        transform: () => `translateX(${x.value}px)`,
        "--accent": () => accent.value,   // CSS custom properties pass through unchanged
      }})
    Each property gets its own subscription. Do NOT stringify a full CSS declaration manually — coarse reactivity re-runs every style on every change.
  - sx({ color: "red" }, active.value && { borderColor: "blue" }, { padding: () => `${px.value}px` })
    — compositional helper that merges multiple style objects (supports conditionals via `cond && { ... }`).
  - theme({ color: { bg: "#111", fg: "#fff" }, space: { md: "1rem" } }) — design tokens written as CSS custom properties at :root. Call once at app start; reference inside sheet() rules via var(--color-bg) etc.
  - For layout, use flexbox or grid inside sheet() rules. Avoid hand-positioning with absolute/top/left unless the design actually requires overlay.
  - Do NOT write raw <style> tags in markup. sheet() handles <style> injection.
  - All of sheet, cx, rcx, sx, theme are imported from "@whisq/core".

Task: Build a split-pane markdown editor.

Layout:
  - Left: textarea bound to a `source` signal via bind().
  - Right: preview rendered from the Markdown.
  - Use marked (load via CDN script tag in the HTML, access as window.marked: https://unpkg.com/marked@latest).

Features:
  - Live preview updates as user types, but debounced 150ms to avoid hammering the parser.
  - An "outline" panel under the preview listing the top-level H1/H2/H3 headings, generated from the markdown.
  - A word count under the editor.
  - A toggle for "safe mode" that strips <script> / <iframe> tags before rendering.
  - Use raw() for the rendered HTML (acknowledge the XSS risk; mitigate via safe mode when enabled).
```

## Prompt 5 — Live dashboard with dependent resources

Tests `resource({ source })` — re-fetching when a signal changes.

```text
You are writing an app using Whisq, an AI-native JavaScript framework.
Before writing any code, read these URLs and use them as the authoritative reference:

  - Compact LLM reference card (start here): https://whisq.dev/ai/llm-reference/
  - Core concepts:                           https://whisq.dev/core-concepts/
  - API reference:                           https://whisq.dev/api/
  - Guides (forms, data, styling, etc.):     https://whisq.dev/guides/
  - Machine-readable exports manifest:       https://unpkg.com/@whisq/core@latest/dist/public-api.json

Whisq rules (hard constraints):
  - NO JSX. NO template literals. UI is built from element FUNCTIONS: div(), span(), button(), input(), etc.
  - NO classes, NO `this`. Components are plain functions wrapped with component().
  - Reactivity uses signals: const count = signal(0); read count.value, write count.value = 5.
  - To use a signal as a child or prop, ALWAYS wrap in a function: div(() => count.value), { class: () => active.value ? "on" : "off" }.
  - Don't mutate arrays/objects in place — reassign: items.value = [...items.value, newItem].
  - Use bind(signal) for two-way form input binding instead of manual value/oninput.
  - Use ref<T>() for imperative DOM access.
  - Use match(...) for tri-state/multi-branch conditionals (loading/error/data), not chained when() calls.
  - Use resource(fetcher, { source, keepPrevious, initialValue }) for async data with cancellation.
  - Use signalMap / signalSet (imported from "@whisq/core/collections") for large keyed state.

Whisq project structure (one-line rule: one component per file; main.ts is for mounting, nothing else):
  - src/main.ts — ~4 lines, imports App and calls mount(App({}), document.getElementById("app")!). Nothing else.
  - src/App.ts — top-level component. Owns routing, layout, error boundary. Business logic goes in stores/; reusable UI in components/; route targets in pages/.
  - src/components/ — reusable UI, one per file. PascalCase filename matches the named export (Button.ts exports Button). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
  - src/pages/ — route targets if using @whisq/router. One file per route.
  - src/stores/ — shared state, one domain per file (cart.ts, auth.ts). Export signals + mutation helpers. No default exports. No import-time I/O.
  - src/lib/ — pure utilities, NO Whisq imports. Testable in Node without jsdom.
  - src/styles.ts — sheet() definitions at module scope.
  - DON'T ship a single-file app that inlines every component in main.ts for non-trivial projects. Scaffolders and AI output diverge when that happens, and editing turns into whole-file rewrites.

Whisq styling (use Whisq's built-in primitives — do NOT import styled-components, emotion, goober, or any other CSS-in-JS library; do NOT add Tailwind unless specifically asked):
  - sheet({ card: { padding: "1rem", color: "red", "&:hover": { color: "blue" }, "@media (max-width: 640px)": { padding: "0.5rem" } } })
    — scoped CSS classes with nested pseudo/media rules. Returns { card: "whisq-card-a1b2", ... } which you spread into class props. Use this as the DEFAULT for all non-reactive styling. No build step; a <style> tag is injected at runtime.
  - cx("btn", active && "btn-active") — compose class strings. Use inside { class: cx(...) }.
  - rcx(() => styles.base, () => active.value && styles.active) — REACTIVE class composition. Use when the class depends on a signal: { class: rcx(...) }.
  - For reactive inline styles, PREFER the object form with per-property getters over string templates:
      div({ style: {
        color: () => color.value,
        transform: () => `translateX(${x.value}px)`,
        "--accent": () => accent.value,   // CSS custom properties pass through unchanged
      }})
    Each property gets its own subscription. Do NOT stringify a full CSS declaration manually — coarse reactivity re-runs every style on every change.
  - sx({ color: "red" }, active.value && { borderColor: "blue" }, { padding: () => `${px.value}px` })
    — compositional helper that merges multiple style objects (supports conditionals via `cond && { ... }`).
  - theme({ color: { bg: "#111", fg: "#fff" }, space: { md: "1rem" } }) — design tokens written as CSS custom properties at :root. Call once at app start; reference inside sheet() rules via var(--color-bg) etc.
  - For layout, use flexbox or grid inside sheet() rules. Avoid hand-positioning with absolute/top/left unless the design actually requires overlay.
  - Do NOT write raw <style> tags in markup. sheet() handles <style> injection.
  - All of sheet, cx, rcx, sx, theme are imported from "@whisq/core".

Task: Build a stock-ticker dashboard.

Layout:
  - Top bar: dropdown of 10 ticker symbols (hard-code them: AAPL, MSFT, ...).
  - Main area: current price (big), 24h change %, and a sparkline SVG.
  - Refresh every 5 seconds automatically. Add a pause/resume toggle.

Data:
  - Use a mock fetcher that returns { price: randomWalk, changePct: ..., history: number[30] } after a simulated 200ms delay, with 5% chance of failure.
  - Tie the fetcher to resource(..., { source: () => selected.value, keepPrevious: true }) so switching tickers shows the previous ticker's data until the new one loads (no loading flash).
  - Abort in-flight requests when the user changes the dropdown mid-fetch — verify by logging cancellations.
```

## Prompt 6 — Multi-route SPA with `@whisq/router`

Tests `@whisq/router` integration.

```text
You are writing an app using Whisq, an AI-native JavaScript framework.
Before writing any code, read these URLs and use them as the authoritative reference:

  - Compact LLM reference card (start here): https://whisq.dev/ai/llm-reference/
  - Core concepts:                           https://whisq.dev/core-concepts/
  - API reference:                           https://whisq.dev/api/
  - Guides (forms, data, styling, etc.):     https://whisq.dev/guides/
  - Router-specific reference:               https://whisq.dev/api/router/
  - Machine-readable exports manifest:       https://unpkg.com/@whisq/core@latest/dist/public-api.json

Whisq rules (hard constraints):
  - NO JSX. NO template literals. UI is built from element FUNCTIONS: div(), span(), button(), input(), etc.
  - NO classes, NO `this`. Components are plain functions wrapped with component().
  - Reactivity uses signals: const count = signal(0); read count.value, write count.value = 5.
  - To use a signal as a child or prop, ALWAYS wrap in a function: div(() => count.value), { class: () => active.value ? "on" : "off" }.
  - Don't mutate arrays/objects in place — reassign: items.value = [...items.value, newItem].
  - Use bind(signal) for two-way form input binding instead of manual value/oninput.
  - Use ref<T>() for imperative DOM access.
  - Use match(...) for tri-state/multi-branch conditionals (loading/error/data), not chained when() calls.
  - Use resource(fetcher, { source, keepPrevious, initialValue }) for async data with cancellation.
  - Use signalMap / signalSet (imported from "@whisq/core/collections") for large keyed state.

Whisq project structure (one-line rule: one component per file; main.ts is for mounting, nothing else):
  - src/main.ts — ~4 lines, imports App and calls mount(App({}), document.getElementById("app")!). Nothing else.
  - src/App.ts — top-level component. Owns routing, layout, error boundary. Business logic goes in stores/; reusable UI in components/; route targets in pages/.
  - src/components/ — reusable UI, one per file. PascalCase filename matches the named export (Button.ts exports Button). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
  - src/pages/ — route targets if using @whisq/router. One file per route.
  - src/stores/ — shared state, one domain per file (cart.ts, auth.ts). Export signals + mutation helpers. No default exports. No import-time I/O.
  - src/lib/ — pure utilities, NO Whisq imports. Testable in Node without jsdom.
  - src/styles.ts — sheet() definitions at module scope.
  - DON'T ship a single-file app that inlines every component in main.ts for non-trivial projects. Scaffolders and AI output diverge when that happens, and editing turns into whole-file rewrites.

Whisq styling (use Whisq's built-in primitives — do NOT import styled-components, emotion, goober, or any other CSS-in-JS library; do NOT add Tailwind unless specifically asked):
  - sheet({ card: { padding: "1rem", color: "red", "&:hover": { color: "blue" }, "@media (max-width: 640px)": { padding: "0.5rem" } } })
    — scoped CSS classes with nested pseudo/media rules. Returns { card: "whisq-card-a1b2", ... } which you spread into class props. Use this as the DEFAULT for all non-reactive styling. No build step; a <style> tag is injected at runtime.
  - cx("btn", active && "btn-active") — compose class strings. Use inside { class: cx(...) }.
  - rcx(() => styles.base, () => active.value && styles.active) — REACTIVE class composition. Use when the class depends on a signal: { class: rcx(...) }.
  - For reactive inline styles, PREFER the object form with per-property getters over string templates:
      div({ style: {
        color: () => color.value,
        transform: () => `translateX(${x.value}px)`,
        "--accent": () => accent.value,   // CSS custom properties pass through unchanged
      }})
    Each property gets its own subscription. Do NOT stringify a full CSS declaration manually — coarse reactivity re-runs every style on every change.
  - sx({ color: "red" }, active.value && { borderColor: "blue" }, { padding: () => `${px.value}px` })
    — compositional helper that merges multiple style objects (supports conditionals via `cond && { ... }`).
  - theme({ color: { bg: "#111", fg: "#fff" }, space: { md: "1rem" } }) — design tokens written as CSS custom properties at :root. Call once at app start; reference inside sheet() rules via var(--color-bg) etc.
  - For layout, use flexbox or grid inside sheet() rules. Avoid hand-positioning with absolute/top/left unless the design actually requires overlay.
  - Do NOT write raw <style> tags in markup. sheet() handles <style> injection.
  - All of sheet, cx, rcx, sx, theme are imported from "@whisq/core".

Task: Build a mini e-commerce catalogue with these routes:

  - /              product list (6 hard-coded products with name, price, thumbnail)
  - /product/:id   product detail page (shows the one product + description + Add to cart button)
  - /cart          cart contents with quantity adjusters and a running total
  - /404           fallback

Requirements:
  - Shared cart state lives in a store (stores/cart.ts) that exports signal-backed cart + addToCart / removeFromCart functions.
  - The header shows the cart count; update reactively as items are added/removed from any page.
  - Product detail uses resource({ source: () => route.params.value.id }) to load "details" (simulate with Promise.resolve(hardcodedProducts[id])). Navigating between products should keep the previous page visible during transition (keepPrevious: true).
  - Use <a href="/..."> with the router's link pattern — no full page reloads.
```

## Prompt 7 — SSR blog with `@whisq/ssr`

Tests server-side rendering + hydration.

```text
You are writing an app using Whisq, an AI-native JavaScript framework.
Before writing any code, read these URLs and use them as the authoritative reference:

  - Compact LLM reference card (start here): https://whisq.dev/ai/llm-reference/
  - Core concepts:                           https://whisq.dev/core-concepts/
  - API reference:                           https://whisq.dev/api/
  - SSR guide:                               https://whisq.dev/guides/ssr/
  - Machine-readable exports manifest:       https://unpkg.com/@whisq/core@latest/dist/public-api.json

Whisq rules (hard constraints):
  - NO JSX. NO template literals. UI is built from element FUNCTIONS: div(), span(), button(), input(), etc.
  - NO classes, NO `this`. Components are plain functions wrapped with component().
  - Reactivity uses signals: const count = signal(0); read count.value, write count.value = 5.
  - To use a signal as a child or prop, ALWAYS wrap in a function: div(() => count.value), { class: () => active.value ? "on" : "off" }.
  - Don't mutate arrays/objects in place — reassign: items.value = [...items.value, newItem].
  - Use bind(signal) for two-way form input binding instead of manual value/oninput.
  - Use ref<T>() for imperative DOM access.
  - Use match(...) for tri-state/multi-branch conditionals (loading/error/data), not chained when() calls.
  - Use resource(fetcher, { source, keepPrevious, initialValue }) for async data with cancellation.
  - Use signalMap / signalSet (imported from "@whisq/core/collections") for large keyed state.

Whisq project structure (one-line rule: one component per file; main.ts is for mounting, nothing else):
  - src/main.ts — ~4 lines, imports App and calls mount(App({}), document.getElementById("app")!). Nothing else.
  - src/App.ts — top-level component. Owns routing, layout, error boundary. Business logic goes in stores/; reusable UI in components/; route targets in pages/.
  - src/components/ — reusable UI, one per file. PascalCase filename matches the named export (Button.ts exports Button). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
  - src/pages/ — route targets if using @whisq/router. One file per route.
  - src/stores/ — shared state, one domain per file (cart.ts, auth.ts). Export signals + mutation helpers. No default exports. No import-time I/O.
  - src/lib/ — pure utilities, NO Whisq imports. Testable in Node without jsdom.
  - src/styles.ts — sheet() definitions at module scope.
  - DON'T ship a single-file app that inlines every component in main.ts for non-trivial projects. Scaffolders and AI output diverge when that happens, and editing turns into whole-file rewrites.

Whisq styling (use Whisq's built-in primitives — do NOT import styled-components, emotion, goober, or any other CSS-in-JS library; do NOT add Tailwind unless specifically asked):
  - sheet({ card: { padding: "1rem", color: "red", "&:hover": { color: "blue" }, "@media (max-width: 640px)": { padding: "0.5rem" } } })
    — scoped CSS classes with nested pseudo/media rules. Returns { card: "whisq-card-a1b2", ... } which you spread into class props. Use this as the DEFAULT for all non-reactive styling. No build step; a <style> tag is injected at runtime.
  - cx("btn", active && "btn-active") — compose class strings. Use inside { class: cx(...) }.
  - rcx(() => styles.base, () => active.value && styles.active) — REACTIVE class composition. Use when the class depends on a signal: { class: rcx(...) }.
  - For reactive inline styles, PREFER the object form with per-property getters over string templates:
      div({ style: {
        color: () => color.value,
        transform: () => `translateX(${x.value}px)`,
        "--accent": () => accent.value,   // CSS custom properties pass through unchanged
      }})
    Each property gets its own subscription. Do NOT stringify a full CSS declaration manually — coarse reactivity re-runs every style on every change.
  - sx({ color: "red" }, active.value && { borderColor: "blue" }, { padding: () => `${px.value}px` })
    — compositional helper that merges multiple style objects (supports conditionals via `cond && { ... }`).
  - theme({ color: { bg: "#111", fg: "#fff" }, space: { md: "1rem" } }) — design tokens written as CSS custom properties at :root. Call once at app start; reference inside sheet() rules via var(--color-bg) etc.
  - For layout, use flexbox or grid inside sheet() rules. Avoid hand-positioning with absolute/top/left unless the design actually requires overlay.
  - Do NOT write raw <style> tags in markup. sheet() handles <style> injection.
  - All of sheet, cx, rcx, sx, theme are imported from "@whisq/core".

Task: Build a blog homepage that renders server-side (@whisq/ssr) and hydrates on the client.

Requirements:
  - Three posts, hard-coded. Each has title, publishedAt, excerpt, body (markdown).
  - SSR renders the full list into document.body as HTML, plus a serialized state blob the client reads to resume without refetching.
  - Client-side, each post has a "Read more" button that expands the full markdown body inline. The expansion state is client-only (doesn't need to SSR).
  - Use useHead() to set <title> and <meta name="description"> from the most recent post.
```

## Prompt 8 — Snake game (stress-test reactivity)

Tests per-frame updates, keyboard events, refs, performance.

```text
You are writing an app using Whisq, an AI-native JavaScript framework.
Before writing any code, read these URLs and use them as the authoritative reference:

  - Compact LLM reference card (start here): https://whisq.dev/ai/llm-reference/
  - Core concepts:                           https://whisq.dev/core-concepts/
  - API reference:                           https://whisq.dev/api/
  - Guides (forms, data, styling, etc.):     https://whisq.dev/guides/
  - Machine-readable exports manifest:       https://unpkg.com/@whisq/core@latest/dist/public-api.json

Whisq rules (hard constraints):
  - NO JSX. NO template literals. UI is built from element FUNCTIONS: div(), span(), button(), input(), etc.
  - NO classes, NO `this`. Components are plain functions wrapped with component().
  - Reactivity uses signals: const count = signal(0); read count.value, write count.value = 5.
  - To use a signal as a child or prop, ALWAYS wrap in a function: div(() => count.value), { class: () => active.value ? "on" : "off" }.
  - Don't mutate arrays/objects in place — reassign: items.value = [...items.value, newItem].
  - Use bind(signal) for two-way form input binding instead of manual value/oninput.
  - Use ref<T>() for imperative DOM access.
  - Use match(...) for tri-state/multi-branch conditionals (loading/error/data), not chained when() calls.
  - Use resource(fetcher, { source, keepPrevious, initialValue }) for async data with cancellation.
  - Use signalMap / signalSet (imported from "@whisq/core/collections") for large keyed state.

Whisq project structure (one-line rule: one component per file; main.ts is for mounting, nothing else):
  - src/main.ts — ~4 lines, imports App and calls mount(App({}), document.getElementById("app")!). Nothing else.
  - src/App.ts — top-level component. Owns routing, layout, error boundary. Business logic goes in stores/; reusable UI in components/; route targets in pages/.
  - src/components/ — reusable UI, one per file. PascalCase filename matches the named export (Button.ts exports Button). Pull a sub-component into its own file when it is reused OR owns independent state OR exceeds ~50 lines.
  - src/pages/ — route targets if using @whisq/router. One file per route.
  - src/stores/ — shared state, one domain per file (cart.ts, auth.ts). Export signals + mutation helpers. No default exports. No import-time I/O.
  - src/lib/ — pure utilities, NO Whisq imports. Testable in Node without jsdom.
  - src/styles.ts — sheet() definitions at module scope.
  - DON'T ship a single-file app that inlines every component in main.ts for non-trivial projects. Scaffolders and AI output diverge when that happens, and editing turns into whole-file rewrites.

Whisq styling (use Whisq's built-in primitives — do NOT import styled-components, emotion, goober, or any other CSS-in-JS library; do NOT add Tailwind unless specifically asked):
  - sheet({ card: { padding: "1rem", color: "red", "&:hover": { color: "blue" }, "@media (max-width: 640px)": { padding: "0.5rem" } } })
    — scoped CSS classes with nested pseudo/media rules. Returns { card: "whisq-card-a1b2", ... } which you spread into class props. Use this as the DEFAULT for all non-reactive styling. No build step; a <style> tag is injected at runtime.
  - cx("btn", active && "btn-active") — compose class strings. Use inside { class: cx(...) }.
  - rcx(() => styles.base, () => active.value && styles.active) — REACTIVE class composition. Use when the class depends on a signal: { class: rcx(...) }.
  - For reactive inline styles, PREFER the object form with per-property getters over string templates:
      div({ style: {
        color: () => color.value,
        transform: () => `translateX(${x.value}px)`,
        "--accent": () => accent.value,   // CSS custom properties pass through unchanged
      }})
    Each property gets its own subscription. Do NOT stringify a full CSS declaration manually — coarse reactivity re-runs every style on every change.
  - sx({ color: "red" }, active.value && { borderColor: "blue" }, { padding: () => `${px.value}px` })
    — compositional helper that merges multiple style objects (supports conditionals via `cond && { ... }`).
  - theme({ color: { bg: "#111", fg: "#fff" }, space: { md: "1rem" } }) — design tokens written as CSS custom properties at :root. Call once at app start; reference inside sheet() rules via var(--color-bg) etc.
  - For layout, use flexbox or grid inside sheet() rules. Avoid hand-positioning with absolute/top/left unless the design actually requires overlay.
  - Do NOT write raw <style> tags in markup. sheet() handles <style> injection.
  - All of sheet, cx, rcx, sx, theme are imported from "@whisq/core".

Task: Build Snake.

Requirements:
  - 20x20 board. Render as either a grid of divs or one <canvas> element (your call — if canvas, use ref<HTMLCanvasElement>() to draw).
  - Snake state (signal<Point[]>), food position (signal<Point>), direction (signal<Dir>), score (signal<number>).
  - Arrow-key input changes direction. Reject 180° reversals.
  - Game loop: advance one step every 150ms via setInterval created in onMount and cleared on cleanup.
  - Pause/resume with Space.
  - Game-over screen with final score + Restart button.

Anti-pattern to avoid:
  - If you pick the div-grid approach, don't re-render the whole board on every tick. Use each() with a stable key so only changed cells update. If you can't get that fast enough, fall back to canvas.
```

---

## Evaluation checklist (per prompt)

For every AI-generated app, score it on:

| #   | Criterion                                                                         | Weight            |
| --- | --------------------------------------------------------------------------------- | ----------------- |
| 1   | Compiles + runs without TypeScript errors                                         | must pass         |
| 2   | No `innerHTML`, no JSX, no template literals for UI                               | must pass         |
| 3   | Signal reads wrapped in `() => sig.value` as children/props                       | must pass         |
| 4   | Arrays and objects replaced (not mutated) when updating signals                   | must pass         |
| 5   | Uses Whisq's actual API, not invented names (e.g. `useSignal` — doesn't exist)    | must pass         |
| 6   | `each()` uses a stable key for lists that re-order or delete                      | strong preference |
| 7   | Uses `match()` for 3+ branch conditionals (not chained `when`s or `if` trees)     | preference        |
| 8   | Uses `bind()` for form inputs                                                     | preference        |
| 9   | Uses `resource()` with `{ signal }` for fetches that can cancel                   | preference        |
| 10  | Component boundaries are sensible — setup functions don't balloon past ~100 lines | preference        |

## Common AI mistakes to watch for

Log any you see so the framework / docs can push back against them.

- **Invented React-isms**: `useState`, `useEffect`, `useMemo`, `useRef` — doesn't exist in Whisq. Signals + effects + `ref()` are the equivalents.
- **`count.value` as a child** instead of `() => count.value` — renders once as a static snapshot.
- **In-place array mutation**: `items.value.push(x)` — won't trigger reactivity. Must be `items.value = [...items.value, x]`.
- **Template literal soup**: returning `html\`<div>${...}</div>\``— that's not Whisq's API. Use`div(...)`.
- **Classes for components**: `class App extends Component` — no. `const App = component((props) => div(...))`.
- **`this.state`**: no `this` in Whisq.
- **Forgetting to dispose** `setInterval` / event listeners in `onMount` — should `return () => clearInterval(id)` from the mount callback.
- **Using raw promises without signal-aware cancellation** instead of `resource()`.
- **Importing styled-components / emotion / goober / @emotion/styled** — Whisq ships `sheet()` / `cx()` / `rcx()` / `sx()` / `theme()` in `@whisq/core`. No external CSS-in-JS library needed.
- **Sprinkling Tailwind classes (`p-4 flex gap-2`)** when the app isn't wired for Tailwind — those render as no-ops. Use `sheet()` rules or ask the user if Tailwind should be set up.
- **Inline style strings** like `style: \`color: ${c.value}\``— re-stringifies the whole declaration on every change. Use the object form`style: { color: () => c.value }` for per-property reactivity.
- **Raw `<style>` tags in markup** — `sheet()` injects them automatically with scoped class names.
- **Hand-rolling BEM / utility class names** that collide globally — `sheet()` returns hashed scoped names (`whisq-card-a1b2`) for free.

## Feeding results back

When the AI gets something wrong that wasn't covered by the reference block, that's a **docs gap**, not an AI failure. File an issue on `whisqjs/whisq.dev` with:

- The prompt that was used.
- The incorrect output.
- Which doc page should have covered the correct pattern.

That closes the loop between "AI can write Whisq" and "Whisq docs are AI-ready".
