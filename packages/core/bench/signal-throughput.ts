/**
 * Whisq Signal Performance Benchmark
 *
 * Run: npx tsx packages/core/bench/signal-throughput.ts
 *
 * Measures:
 * - Signal read/write throughput
 * - Computed derivation overhead
 * - Effect notification speed
 * - Batch update performance
 * - Diamond dependency propagation
 */

import { signal, computed, effect, batch } from "../src/reactive.js";

function bench(name: string, fn: () => void, iterations = 100_000): void {
  // Warmup
  for (let i = 0; i < 1000; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;

  const opsPerSec = Math.round((iterations / elapsed) * 1000);
  const nsPerOp = Math.round((elapsed / iterations) * 1_000_000);

  console.log(
    `  ${name.padEnd(45)} ${opsPerSec.toLocaleString().padStart(12)} ops/s  ${nsPerOp.toLocaleString().padStart(8)} ns/op`,
  );
}

console.log("\n=== Whisq Signal Performance Benchmark ===\n");

// ── Signal read/write ───────────────────────────────────────────────────────

console.log("Signal read/write:");
const s = signal(0);

bench("signal.value (read)", () => {
  void s.value;
});

bench("signal.value = x (write)", () => {
  s.value = s.value + 1;
});

bench("signal.peek() (untracked read)", () => {
  void s.peek();
});

// ── Computed ────────────────────────────────────────────────────────────────

console.log("\nComputed:");
const a = signal(1);
const b = signal(2);
const sum = computed(() => a.value + b.value);

bench("computed.value (cached read)", () => {
  void sum.value;
});

bench("computed after dependency change", () => {
  a.value = a.value + 1;
  void sum.value;
});

// ── Effect ──────────────────────────────────────────────────────────────────

console.log("\nEffect:");
const trigger = signal(0);
let effectCount = 0;
const dispose = effect(() => {
  void trigger.value;
  effectCount++;
});

bench("signal write → effect notification", () => {
  trigger.value = trigger.value + 1;
});

dispose();

// ── Batch ───────────────────────────────────────────────────────────────────

console.log("\nBatch:");
const x = signal(0);
const y = signal(0);
const z = signal(0);
let batchEffects = 0;
const disposeBatch = effect(() => {
  void x.value;
  void y.value;
  void z.value;
  batchEffects++;
});

bench("batch(3 signals) → 1 effect", () => {
  batch(() => {
    x.value = x.value + 1;
    y.value = y.value + 1;
    z.value = z.value + 1;
  });
});

disposeBatch();

// ── Diamond dependency ──────────────────────────────────────────────────────

console.log("\nDiamond dependency (A → B,C → D):");
const root = signal(0);
const left = computed(() => root.value * 2);
const right = computed(() => root.value + 10);
const leaf = computed(() => left.value + right.value);
let diamondEffects = 0;
const disposeDiamond = effect(() => {
  void leaf.value;
  diamondEffects++;
});

bench("diamond: root update → leaf effect", () => {
  root.value = root.value + 1;
});

disposeDiamond();

// ── Many subscribers ────────────────────────────────────────────────────────

console.log("\nMany subscribers:");
const source = signal(0);
const disposers: (() => void)[] = [];
let subCount = 0;
for (let i = 0; i < 100; i++) {
  disposers.push(
    effect(() => {
      void source.value;
      subCount++;
    }),
  );
}

bench(
  "signal write → 100 effect notifications",
  () => {
    source.value = source.value + 1;
  },
  10_000,
);

for (const d of disposers) d();

// ── Signal creation ─────────────────────────────────────────────────────────

console.log("\nCreation:");
bench("signal() creation", () => {
  signal(0);
});

bench("computed() creation", () => {
  computed(() => 0);
});

bench("effect() creation + dispose", () => {
  const d = effect(() => {});
  d();
});

console.log("\n=== Done ===\n");
