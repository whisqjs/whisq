---
"@whisq/core": minor
---

New `compose(bindResult, extras)` helper for order-independent composition of `bind()` / `bindField()` / `bindPath()` results with user-supplied event handlers.

The dev warning added in alpha.9 caught _direction 1_ (user handler after the bind spread) but _direction 2_ (user handler before the spread) was undetectable from final props alone — the user's handler was gone without a trace by the time the element builder ran. `compose()` sidesteps the order dependency entirely: shared handler keys chain both handlers (bind first, user second), and non-handler props follow normal object-spread semantics (extras win).

```ts
import { bind, compose, input } from "@whisq/core";

input({
  ...compose(bind(draft), {
    oninput: (e) => track(e),            // fires after bind writes draft
    onfocus: () => analytics.focus(),    // bind has no onfocus — attaches cleanly
  }),
});
```

The compose result re-tags its bind-sentinel with the composed handler as the "declared" one, so the alpha.9 duplicate-handler warning does not fire on a well-formed `compose()` spread, but still fires if someone overwrites the compose result afterward.

Closes WHISQ-132.
