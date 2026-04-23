---
"@whisq/core": minor
---

Typed `aria-*` attributes on every element. `BaseProps` now accepts `[key: \`aria-${string}\`]: ReactiveProp<string | boolean | undefined>` — mirrors the existing `data-*` pattern but with a wider value type because ARIA uses both enum-string attrs (`aria-live: "polite"`) and predicate-boolean attrs (`aria-expanded`, `aria-hidden`, `aria-pressed`).

```ts
// Before: typed props rejected aria-label; workaround was `title="Remove"`
// (correct for tooltips, compromised for screen readers).
button({ "aria-label": "Remove" }, "×");

// Reactive ARIA also works:
button({ "aria-expanded": () => menuOpen.value }, "menu");
div({ "aria-live": "polite", "aria-atomic": true }, () => status.value);
```

Also fixes the **boolean serialisation bug** this exposed: the generic boolean-attribute branch in `applyProp` wrote `aria-expanded=""` for `true`, which is **invalid** per the ARIA spec — `aria-expanded=""` is not equivalent to `aria-expanded="true"`. A dedicated `aria-*` branch now serialises `true`/`false` to the strings `"true"` / `"false"`, and `undefined`/`null` still removes the attribute. String values pass through unchanged.

Runtime cost: one `startsWith("aria-")` check per prop. Bundle size: 5.67 KB of 6 KB budget (+ ~20 B).

Discovered during WHISQ-124 smoke-test; the `examples/template-todo/` remove button now uses `aria-label="Remove"` instead of the previous `title="Remove"` workaround.

Closes WHISQ-128.
