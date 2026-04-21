---
"@whisq/core": patch
"create-whisq": patch
---

Clarify `match()` as a **predicate chain, not pattern matching**.

Audit finding: `match()` has always had exactly one shape — variadic tuple branches `[predicate, render]` with an optional trailing bare render fn as fallback. The GPT-side alpha.6 feedback flagged "object vs tuple form" confusion, but no object form exists in the code; GPT was pattern-matching against Rust/Scala/Vue conventions where `match(value, { case1, case2 })` is common.

Changes:

- **JSDoc** now leads with _"Predicate-chain conditional renderer — not pattern matching"_ and calls out the canonical shape, first-true-wins ordering, and fallback-position rules explicitly.
- **Dev-mode validation** (stripped in production builds) throws a `WhisqStructureError` when `match()` receives a plain object (the exact GPT-style confusion), a malformed tuple, or a fallback that isn't in the last position. Production bundle unchanged at 5.25 KB gzipped.
- **Scaffolded templates** — all four `CLAUDE.md` files now include `match` in the canonical imports line and expand the "Conditional Rendering" section to document `when()` vs `match()` with a ready example. AI-generated code for new projects will reach for `match` instead of nesting `when()`.

Closes #83.
