# `batch()` semantics

Canonical reference for the four guarantees `batch()` makes, pinned by tests in [`packages/core/src/__tests__/batch.test.ts`](../src/__tests__/batch.test.ts).

These are the answers to [whisqjs/whisq#59](https://github.com/whisqjs/whisq/issues/59) / [whisqjs/whisq.dev#11](https://github.com/whisqjs/whisq.dev/issues/11). The doc site's `batch()` API page should mirror this content under a "Guarantees" section.

The implementation lives in [`packages/core/src/reactive.ts`](../src/reactive.ts) — specifically the `batch()` function and the `notify()` helper that consults `batchDepth` and `pendingEffects`.

---

## 1. Computed recomputation inside a batch

**Guarantee.** Inside a batch:

- A computed that depends on a signal you write to does **not** recompute when the signal is written.
- Reading the computed's `.value` **mid-batch returns the stale value** (the cached value from before the batch).
- After the batch ends, the computed recomputes **exactly once**, regardless of how many times its dependencies were written inside the batch.

### Example

```ts
const a = signal(1);
const b = signal(2);
const sum = computed(() => a.value + b.value);

sum.value; // 3 — primes the cache

batch(() => {
  a.value = 10;
  b.value = 20;
  sum.value; // ← 3  (STALE — still the cached value from before the batch)
});

sum.value; // 30  (fresh)
```

### Why it behaves this way

A `computed` is backed by an internal `recompute` subscriber that the `computed` registers against each signal it reads. When the signal is written, `notify()` walks the subscriber list:

- **Outside a batch:** `recompute` runs synchronously, which flips the computed's internal `dirty` flag to `true` and fans out to the computed's own subscribers. The next read sees `dirty: true` and re-evaluates the computation.
- **Inside a batch:** `recompute` is added to `pendingEffects` but **not executed**. The `dirty` flag stays `false`, so `.value` returns the cached `_value`.

When the outermost batch exits, `pendingEffects` is drained and `recompute` runs once (Set-deduplicated across multiple writes).

### Pinning tests

- `mid-batch reads of a computed return the STALE value`
- `computed recompute runs exactly once after a batch with multiple dep writes`
- `effects that read a computed inside a batch observe the stale value, run once after`

---

## 2. Nested `batch()` — flattened (reference-counted)

**Guarantee.** Nested `batch()` calls are reference-counted. Effects only flush when the **outermost** batch closes. An inner `batch(...)` exits without running any effects.

### Example

```ts
const a = signal(0);
const b = signal(0);
effect(() => {
  console.log("effect", a.value, b.value);
});
// prints: effect 0 0

batch(() => {
  a.value = 1;
  batch(() => {
    b.value = 2;
    // nothing logged here
  });
  // nothing logged here either
});
// prints: effect 1 2  (one flush at the outermost boundary)
```

### Why it behaves this way

`batch()` increments `batchDepth` on entry and decrements in `finally`. The flush block is guarded by `if (batchDepth === 0)`, so inner batches exit with `batchDepth > 0` and skip the flush.

### Pinning tests

- `effects only flush at the outermost batch boundary`
- `deeply nested batches still collapse to a single flush`
- `an inner batch does not flush effects queued by the outer batch`

---

## 3. Async / `await` — the batch closes at the first `await`

**Guarantee.** `batch(fn)` is **synchronous**. It runs `fn` up to (and including) the first `await` or any code that returns a Promise, then its `finally` block runs immediately and flushes effects. Anything after an `await` in an async `fn` runs **outside** the batch.

The published type is `batch(fn: () => void)` — passing an async function is **not supported** by the contract. The mechanical behavior is documented here because it's observable and will catch you out if you rely on `batch` as an async transaction.

### Example

```ts
batch(async () => {
  a.value = 1; // inside the batch — effect deferred
  await fetch("/x");
  b.value = 2; // OUTSIDE the batch — effect runs immediately
});
```

### Why it behaves this way

An `async` function called without `await` returns a Promise immediately on the first suspension point. `batch()`'s `try { fn(); } finally { ... }` sees `fn()` return (with a pending Promise), then unconditionally runs the `finally` block. There is no mechanism by which `batch` can re-enter the pending continuation, because JavaScript's `try/finally` doesn't follow microtask boundaries.

### Recommendation for async "transactions"

If you want to coalesce signal writes that span an `await`, do the async work first and call `batch()` around only the synchronous write cluster:

```ts
const data = await fetch("/x").then((r) => r.json());
batch(() => {
  user.value = data.user;
  settings.value = data.settings;
  status.value = "ready";
});
```

### Pinning tests

- `writes before the first await are batched; writes after are not`
- `batch() is synchronous: the returned value is void and does not await`

---

## 4. Throw inside a batch — writes are committed, effects still flush

**Guarantee.** If code inside `batch(fn)` throws:

- Signal writes that happened **before** the throw are **committed** — they are not rolled back.
- `pendingEffects` still flushes in the `finally` block, so effects observe the committed writes.
- The error propagates out of `batch()` as normal (nothing is swallowed).

### Example

```ts
const a = signal(1);
const b = signal(2);

try {
  batch(() => {
    a.value = 10; // committed
    throw new Error("oops");
    b.value = 20; // unreachable
  });
} catch (e) {
  // caught here — the error propagates
}

a.value; // 10  (committed)
b.value; // 2   (untouched — assignment never ran)

// The effect that reads `a` runs once, after the throw, with a.value === 10.
```

### Why it behaves this way

The signal setter applies `_value = newValue` **eagerly** and only the `notify()` call is deferred during a batch. `batch()`'s `finally` block runs regardless of whether `fn` returned normally or threw, so `pendingEffects` is always drained. The catch-or-rethrow decision is up to the caller — `batch()` itself doesn't intercept errors.

There is no "transactional" semantics here: signals don't snapshot their prior values before a batch, and there's no rollback on error.

### Pinning tests

- `writes performed before the throw are committed (not rolled back)`
- `effects for the applied writes still flush after a throw`
- `after a throw, batchDepth resets cleanly — a later batch flushes as normal`

---

## Quick reference

| Scenario                                             | Behavior                                                |
| ---------------------------------------------------- | ------------------------------------------------------- |
| Mid-batch read of a computed whose dep was written   | Returns stale value                                     |
| Computed recompute count for N writes inside a batch | Exactly one, after batch exits                          |
| Nested `batch()`                                     | Flattened — only outermost flushes                      |
| `batch(async () => { ... await ...; write })`        | Post-`await` writes run outside the batch               |
| Throw mid-batch                                      | Prior writes committed, effects flush, error propagates |

## Not guaranteed (implementation details, subject to change)

- **Effect execution order**: `pendingEffects` is a `Set` iterated via `[...pendingEffects]` snapshot. Insertion order is preserved today (per ES spec Set semantics), but we may introduce priority queues or batching by component boundary in the future. Don't rely on effects running in a specific order relative to one another.
- **Dedup semantics for effects queued multiple times**: a single effect queued N times during a batch runs once at flush — this is guaranteed. The optimization beyond that (e.g. skipping effects whose dependencies ended up with their original values) is **not** guaranteed and is subject to change.
