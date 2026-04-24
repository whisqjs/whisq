// ============================================================================
// Whisq Core — Sub-path import guard stubs
//
// The main `@whisq/core` entry is deliberately small — persistence, id
// generation, reactive collections, and nested-path forms live behind
// sub-path exports (`@whisq/core/persistence`, `/ids`, `/collections`,
// `/forms`) so an app that doesn't use them pays no bundle cost.
//
// The downside of that split: a user (or AI) writing
//   import { partition } from "@whisq/core";
// gets the generic bundler error ("partition is not exported") with no
// hint that the symbol exists — it's just on another path. This module
// re-exports those sub-path names as runtime stubs from the main entry.
// Importing one silently compiles; calling it throws with a message that
// names the correct sub-path and links to the docs page. Zero behavioural
// impact on callers who import correctly from the sub-path.
//
// Bundle impact: `@whisq/core` has `sideEffects: false`, so any stub the
// user didn't actually import is dropped by the bundler's unused-export
// elimination. In practice: if `import { signal } from "@whisq/core"` is
// all the user wrote, none of these stubs appear in the output bundle.
// The `bench:shake` script verifies this on every release.
// ============================================================================

function subpathError(
  name: string,
  subpath: string,
  slug: string,
): Error {
  return new Error(
    `[whisq] "${name}" is not exported from "@whisq/core". ` +
      `Import it from "@whisq/core/${subpath}" instead. ` +
      `See https://whisq.dev/api/${slug}/`,
  );
}

/**
 * @deprecated Import `partition` from `@whisq/core/collections` instead.
 * Calling this re-export at runtime throws with the correct sub-path.
 * See https://whisq.dev/api/partition/
 */
export function partition(..._args: unknown[]): never {
  throw subpathError("partition", "collections", "partition");
}

/**
 * @deprecated Import `signalMap` from `@whisq/core/collections` instead.
 * Calling this re-export at runtime throws with the correct sub-path.
 * See https://whisq.dev/api/signalmap/
 */
export function signalMap(..._args: unknown[]): never {
  throw subpathError("signalMap", "collections", "signalmap");
}

/**
 * @deprecated Import `signalSet` from `@whisq/core/collections` instead.
 * Calling this re-export at runtime throws with the correct sub-path.
 * See https://whisq.dev/api/signalset/
 */
export function signalSet(..._args: unknown[]): never {
  throw subpathError("signalSet", "collections", "signalset");
}

/**
 * @deprecated Import `randomId` from `@whisq/core/ids` instead.
 * Calling this re-export at runtime throws with the correct sub-path.
 * See https://whisq.dev/api/randomid/
 */
export function randomId(..._args: unknown[]): never {
  throw subpathError("randomId", "ids", "randomid");
}

/**
 * @deprecated Import `persistedSignal` from `@whisq/core/persistence` instead.
 * Calling this re-export at runtime throws with the correct sub-path.
 * See https://whisq.dev/api/persistedsignal/
 */
export function persistedSignal(..._args: unknown[]): never {
  throw subpathError("persistedSignal", "persistence", "persistedsignal");
}

/**
 * @deprecated Import `bindPath` from `@whisq/core/forms` instead.
 * Calling this re-export at runtime throws with the correct sub-path.
 * See https://whisq.dev/api/bindpath/
 */
export function bindPath(..._args: unknown[]): never {
  throw subpathError("bindPath", "forms", "bindpath");
}
