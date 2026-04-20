---
"@whisq/core": minor
---

Clarify the `ref()` accessor and export a named `ElementRef<T>` type alias (WHISQ-63).

Addresses the feedback from real app-building: "which accessor on which container-shaped primitive?" The answer for refs has always been `.value` (refs are plain Whisq signals), but the type `Signal<T | null>` surfaced in editor tooltips didn't name the concept, and React's `.current` priors caused a guessing step.

**Changes:**

- **New** `ElementRef<T>` type alias exported from `@whisq/core`. Structurally identical to `Signal<T | null>`; the alias exists purely so tooltips read `ElementRef<HTMLInputElement>` and LLMs get a stronger prior for the concept.
- **`ref<T>()`** now declares its return type as `ElementRef<T>` instead of `Signal<T | null>`. No runtime change.
- **JSDoc tightened** on both `ref()` and `Ref<T>` to say explicitly: _"read it with `.value`, not `.current`"_.

**Usage:**

```ts
import { ref } from "@whisq/core";
import type { ElementRef } from "@whisq/core";

const inputEl = ref<HTMLInputElement>(); // ElementRef<HTMLInputElement>
input({ ref: inputEl });
onMount(() => inputEl.value?.focus()); // .value — not .current

// Naming a prop / field that holds a ref:
type FormRefs = {
  email: ElementRef<HTMLInputElement>;
  submitBtn: ElementRef<HTMLButtonElement>;
};
```

5 new tests in `ref.test.ts` pin: no `.current` property exists, the return value passes `isSignal()`, `subscribe()` fires on mount + unmount, and `ElementRef<T>` is assignable both to the `Ref` prop type and to a `Signal<T | null>` slot.

Backward compatible. The underlying type is still `Signal<T | null>`; code that declared `Signal<HTMLInputElement | null>` for a ref still works.
