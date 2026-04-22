---
"@whisq/core": minor
---

The `class:` prop on every element now accepts an **array of sources** with per-source reactivity. Strings are class names; falsy values (`false | null | undefined | 0 | ""`) are filtered out — enabling the `cond && "active"` shorthand inline; functions are reactive — each function is called during the render effect and re-reads when its tracked signals change.

```ts
div({
  class: [
    "btn",
    () => `btn-${variant.value}`,       // reactive
    loading.value && "btn-loading",     // static conditional — cond && "…"
    () => isDisabled.value && "disabled", // reactive conditional
  ],
});
```

If any array element is a function, the array is applied reactively; otherwise it's applied once at mount. This removes the `cx` vs `rcx` migration footgun Claude's alpha.7 feedback flagged — you no longer have to remember which helper to import when a class prop grows a reactive branch mid-edit.

`cx` and `rcx` continue to work unchanged — this is a pure addition. A future release may collapse them into a single composition helper (see WHISQ-97 option A) but that change is deferred.

Closes WHISQ-97 option B. Options A (unified `cx`) and the `rcx` deprecation path remain open on the issue for a follow-up cycle.
