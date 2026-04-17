# Whisq API Stability & Deprecation Policy

> Defines which APIs are frozen for v1.0, how changes are communicated, and the deprecation lifecycle.

---

## Stability Tiers

Every public export from `@whisq/core` falls into one of three tiers:

### Stable (Frozen for v1.x)

These APIs will not have breaking changes in any v1.x release. Bug fixes and additive changes are allowed.

| Export                             | Module    | Description                         |
| ---------------------------------- | --------- | ----------------------------------- |
| `signal<T>()`                      | reactive  | Create a reactive signal            |
| `computed<T>()`                    | reactive  | Create a derived signal             |
| `effect()`                         | reactive  | Create a side effect                |
| `batch()`                          | reactive  | Batch multiple signal updates       |
| `Signal<T>`                        | reactive  | Signal type                         |
| `ReadonlySignal<T>`                | reactive  | Readonly signal type                |
| `h()`                              | elements  | Create any HTML element by tag name |
| `raw()`                            | elements  | Inject raw HTML strings             |
| `when()`                           | elements  | Conditional rendering               |
| `each()`                           | elements  | List rendering                      |
| `mount()`                          | elements  | Mount a component tree to the DOM   |
| `div()`, `span()`, `button()`, ... | elements  | All 40+ element functions           |
| `WhisqNode`                        | elements  | Node type                           |
| `component<P>()`                   | component | Define a component                  |
| `onMount()`                        | component | Mount lifecycle hook                |
| `onCleanup()`                      | component | Cleanup lifecycle hook              |
| `resource<T>()`                    | component | Async data fetching                 |
| `Resource<T>`                      | component | Resource type                       |
| `sheet<T>()`                       | styling   | Scoped CSS classes                  |
| `styles()`                         | styling   | Reactive inline styles              |
| `cx()`                             | styling   | Class name composition              |
| `rcx()`                            | styling   | Reactive class composition          |
| `theme()`                          | styling   | CSS custom properties               |

### Evolving

These APIs are stable but may receive additive changes (new options, new return properties) in minor releases.

| Export               | Module    | Notes                           |
| -------------------- | --------- | ------------------------------- |
| `errorBoundary()`    | elements  | API may expand with new options |
| `portal()`           | elements  | API may expand with new options |
| `transition()`       | elements  | Animation API may evolve        |
| `createContext<T>()` | component | May add scoping options         |
| `provide<T>()`       | component | May add scoping options         |
| `inject<T>()`        | component | May add default factory         |
| `useHead()`          | component | May add more head tags          |

### Experimental

These exports may change or be removed in minor releases. Use at your own risk.

| Export            | Module    | Notes                           |
| ----------------- | --------- | ------------------------------- |
| `ComponentDef<P>` | component | Internal type, may change shape |
| `InjectionKey<T>` | component | Implementation detail may shift |

---

## Deprecation Lifecycle

When a stable API needs to change:

### Step 1: Deprecation Warning (v1.x)

The existing API continues to work but logs a console warning in development:

```ts
// Internal deprecation helper
function deprecated(oldName: string, newName: string): void {
  if (import.meta.env?.DEV) {
    console.warn(`[whisq] ${oldName} is deprecated. Use ${newName} instead.`);
  }
}
```

### Step 2: Migration Period (1-2 minor releases)

Both old and new APIs work. Documentation updated to show the new API. Migration guide published.

### Step 3: Removal (next major version only)

Deprecated APIs are removed only in major version bumps (v2.0, v3.0). They are never removed in v1.x.

---

## Versioning Rules

| Change Type                | Version Bump  | Example                              |
| -------------------------- | ------------- | ------------------------------------ |
| Bug fix (no API change)    | Patch (1.0.x) | Fix signal disposal leak             |
| New API added              | Minor (1.x.0) | Add `signal.subscribe()`             |
| New option on existing API | Minor (1.x.0) | Add `timeout` option to `resource()` |
| Deprecation warning added  | Minor (1.x.0) | Mark old API as deprecated           |
| Breaking change            | Major (x.0.0) | Remove deprecated API                |
| Experimental API change    | Minor (1.x.0) | Change experimental API shape        |

---

## Ecosystem Package Stability

Ecosystem packages follow the same versioning but are not bound to the same freeze:

| Package              | Stability                                              |
| -------------------- | ------------------------------------------------------ |
| `@whisq/core`        | Frozen — follows this policy strictly                  |
| `@whisq/router`      | Evolving — API may change in minor releases until v1.0 |
| `@whisq/ssr`         | Evolving — API may change in minor releases until v1.0 |
| `@whisq/testing`     | Evolving — API may expand in minor releases            |
| `@whisq/devtools`    | Experimental — API may change significantly            |
| `@whisq/vite-plugin` | Evolving — follows Vite's own evolution                |
| `@whisq/mcp-server`  | Evolving — follows MCP protocol evolution              |
| `@whisq/sandbox`     | Evolving — isolation API may change                    |
| `create-whisq`       | Stable — template structure is consistent              |

---

## Guarantees

1. **No silent breaking changes** — every breaking change is announced, deprecated first, and documented.
2. **Minimum 2 minor releases** between deprecation and removal.
3. **No breaking changes in patch releases** — ever.
4. **`@whisq/core` v1.x is safe to depend on** — your code won't break on update.
