---
"create-whisq": patch
---

Document project-structure conventions so AI-generated Whisq code matches the scaffolder templates (WHISQ-71).

Every scaffolded project's `CLAUDE.md` now includes the full convention: one component per file in `src/components/`, one domain per file in `src/stores/`, `main.ts` is for mounting and nothing else, `src/lib/` is Whisq-free. Anti-patterns are called out explicitly (single-file apps, `src/lib/index.ts` utility soup, default exports, import-time I/O in stores).

Canonical reference lives in the framework repo at [`packages/core/docs/project-structure.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/project-structure.md). The CLAUDE.md section links to it for deep detail.

`@whisq/core` is unchanged — this is template/docs content only.
