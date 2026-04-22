---
"@whisq/core": minor
---

Fix `component()` and `sheet()` type signatures so that apps scaffolded from `create-whisq@latest` type-check cleanly under `tsc --strict`.

Previously, `component()` was typed as `(props) => WhisqTemplate` — a legacy template-literal shape (`{ fragment, bindings, dispose }`) — while every element function (`div`, `span`, etc.) returns `WhisqNode` (`{ el, disposers, dispose, __whisq }`). The two shapes were incompatible, so **every** hyperscript component setup failed `tsc --strict` with _"Type 'WhisqNode' is missing properties: fragment, bindings"_. The runtime check in `component.ts` already required `WhisqNode`-shaped output, so the types were wrong for the documented and actually-supported API.

Changes:

- **`component<P>(setup: (props: P) => WhisqNode): ComponentDef<P>`** — setup now returns `WhisqNode`, matching the runtime guard and the hyperscript API that the LLM reference, docs, and starter templates all use. The JSDoc example switches from the legacy `html\`...\`` form to the hyperscript form.
- **`ComponentDef<P>` call signature** — returns `WhisqNode` so components compose inside elements (`div(MyComponent({}))` now type-checks).
- **`sheet()` nested selectors** — `StyleRule` is now recursive (`{ [key: string]: StyleValue | StyleRule }`), so mixing base CSS properties and nested rules (`"&:hover": { … }`, `"& a": { "&:hover": { … } }`, `"@media (…)": { … }`) under the same top-level key type-checks. The runtime behaviour is unchanged — the prefix convention is still the source of truth for which keys are nested vs base.

Breaking: if any code relied on the old `(props) => WhisqTemplate` signature (the tagged-template `html\`...\`` path was already rejected by `component()`'s runtime check, so it couldn't actually have been in production use), it needs to return a `WhisqNode` instead.

Closes WHISQ-108. The `html` tagged-template API and `WhisqTemplate` type remain in `@whisq/core/template` for internal use; fully removing them is tracked as a follow-up to #108.
