---
"@whisq/core": minor
---

Dev-only warning when spreading `bind()` / `bindField()` / `bindPath()` then overwriting one of its event handlers. Closes the production-bug window Claude's alpha.8 feedback called out as the top concern:

```ts
// Before: silently dropped bind's oninput, no warning.
input({
  ...bind(draft),
  oninput: (e) => track(e),   // overwrites bind's oninput
});

// Now (in dev): console.warn with the tag, event name, and a fix hint.
```

Mechanism — the three bind helpers attach a symbol-keyed manifest of the handlers they declared to their return objects. Object spread copies symbol-keyed own properties, so the manifest survives into the final props. The element builder checks "for each declared handler, is the current prop handler still the one I declared?" On mismatch, `console.warn` (dev only; zero cost in production).

**Known limitation.** Only catches _direction 1_ — spread-first, user-handler-second. _Direction 2_ (user handler first, `...bind(sig)` spread on top) cannot be detected from final props alone: by the time the element builder sees `props`, the user's original handler is gone without a trace. The warning message steers users toward the safer convention: spread bind LAST so it's your own handler that visibly "wins", making the collision obvious.

Closes WHISQ-120.
