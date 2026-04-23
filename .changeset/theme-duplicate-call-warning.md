---
"@whisq/core": minor
---

Dev-mode warning on duplicate `theme()` calls. Completes the alpha.7 `theme()` saga started by #99 / #105 (docs + SSR guard). Catches the failure mode Claude's alpha.8 feedback flagged: a multi-file project that imports two styles files and silently wipes the first theme's variables.

```ts
// styles.ts — app's primary theme
import { theme } from "@whisq/core";
theme({ color: { primary: "#4386FB" } });

// another styles.ts elsewhere in the graph — accidentally imported
import { theme } from "@whisq/core";
theme({ color: { primary: "#ffffff" } });
// Dev: console.warn names the conflict; production is silent.
```

New optional `silent?: boolean` on the `theme()` signature suppresses the warning for legitimate second calls (theme-switching toggles):

```ts
// Runtime theme switch — intentional; silent: true says "don't warn"
theme(darkTokens, { silent: true });
```

Detection is DOM-based — a `getElementById("whisq-style-whisq-theme")` check. Production builds strip the entire guard via the existing `NODE_ENV !== "production"` pattern, so there's no runtime cost in shipped code. Each `theme()` is still last-call-wins: the warning doesn't change injection semantics, only surfaces when a second call would replace an existing block.

Exported `ThemeOptions` type for callers who type their wrapper helpers.

Closes WHISQ-122.
