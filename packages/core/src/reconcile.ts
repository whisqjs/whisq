// ============================================================================
// Whisq Core — Keyed List Reconciliation
// LIS-based diffing algorithm for efficient DOM updates.
// Only inserts, removes, or moves nodes that actually changed.
// ============================================================================

import type { WhisqNode } from "./elements.js";

export interface KeyedEntry {
  key: unknown;
  node: WhisqNode;
}

/**
 * Reconcile a keyed list. Diffs old keys vs new keys, reuses DOM nodes
 * for matching keys, and only performs the minimal set of DOM operations.
 *
 * Returns the new entries array (with reused or freshly created nodes).
 */
export function reconcileKeyed<T>(
  parent: Node,
  marker: Node,
  oldEntries: KeyedEntry[],
  newItems: T[],
  keyFn: (item: T) => unknown,
  renderFn: (item: T, index: number) => WhisqNode,
): KeyedEntry[] {
  const newLen = newItems.length;
  const oldLen = oldEntries.length;

  // Fast path: empty → populated
  if (oldLen === 0) {
    const entries: KeyedEntry[] = new Array(newLen);
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < newLen; i++) {
      const node = renderFn(newItems[i], i);
      fragment.appendChild(node.el);
      entries[i] = { key: keyFn(newItems[i]), node };
    }
    parent.insertBefore(fragment, marker);
    return entries;
  }

  // Fast path: populated → empty
  if (newLen === 0) {
    for (let i = 0; i < oldLen; i++) {
      oldEntries[i].node.el.parentNode?.removeChild(oldEntries[i].node.el);
      oldEntries[i].node.dispose();
    }
    return [];
  }

  // Build old key → index map
  const oldKeyMap = new Map<unknown, number>();
  for (let i = 0; i < oldLen; i++) {
    oldKeyMap.set(oldEntries[i].key, i);
  }

  // Map new items to old indices (or -1 if new)
  const newKeys: unknown[] = new Array(newLen);
  const sources: number[] = new Array(newLen);
  const seenKeys = new Set<unknown>();
  for (let i = 0; i < newLen; i++) {
    const key = keyFn(newItems[i]);
    newKeys[i] = key;

    if (seenKeys.has(key)) {
      // Duplicate key — treat as new node to avoid double-referencing the same DOM element
      const safeKey =
        typeof key === "string" ||
        typeof key === "number" ||
        typeof key === "bigint"
          ? String(key)
              .slice(0, 128)
              .replace(/[\r\n]/g, "\\n")
          : `[object ${Object.prototype.toString.call(key).slice(8, -1)}]`;
      console.warn(
        `[whisq] each(): duplicate key "${safeKey}" at index ${i}. Keys must be unique.`,
      );
      sources[i] = -1;
    } else {
      const oldIdx = oldKeyMap.get(key);
      sources[i] = oldIdx !== undefined ? oldIdx : -1;
    }
    seenKeys.add(key);
  }

  // Find which old entries are kept
  const oldKept = new Set<number>();
  for (let i = 0; i < newLen; i++) {
    if (sources[i] !== -1) oldKept.add(sources[i]);
  }

  // Dispose and remove old entries not in the new list
  for (let i = 0; i < oldLen; i++) {
    if (!oldKept.has(i)) {
      oldEntries[i].node.el.parentNode?.removeChild(oldEntries[i].node.el);
      oldEntries[i].node.dispose();
    }
  }

  // Build the new entries array, reusing old nodes where possible
  const newEntries: KeyedEntry[] = new Array(newLen);
  for (let i = 0; i < newLen; i++) {
    if (sources[i] !== -1) {
      newEntries[i] = oldEntries[sources[i]];
    } else {
      const node = renderFn(newItems[i], i);
      newEntries[i] = { key: newKeys[i], node };
    }
  }

  // Compute LIS on the kept sources (items present in both old and new lists).
  // Items in the LIS are already in the correct relative order and don't need moving.
  const keptSources = sources.filter((s) => s !== -1);
  const lis = longestIncreasingSubsequence(keptSources);
  const lisSet = new Set(lis.map((idx) => keptSources[idx]));

  // Place nodes in correct order.
  // Walk backwards from the end, inserting before the next sibling.
  // TODO(WHISQ-XX): handle fragment-based WhisqNodes (raw(), nested keyed each()).
  // Currently assumes render functions return element-based nodes.
  let nextSibling: Node = marker;
  for (let i = newLen - 1; i >= 0; i--) {
    const entry = newEntries[i];
    const el = entry.node.el;

    if (sources[i] === -1) {
      // New node — insert it
      parent.insertBefore(el, nextSibling);
    } else if (!lisSet.has(sources[i])) {
      // Existing node not in LIS — needs to move
      parent.insertBefore(el, nextSibling);
    }
    // Nodes in LIS stay in place (they're already in correct relative order)
    // but we still update nextSibling

    nextSibling = el;
  }

  return newEntries;
}

/**
 * Find the longest increasing subsequence of an array of numbers.
 * Returns the indices into the input array.
 */
function longestIncreasingSubsequence(arr: number[]): number[] {
  const n = arr.length;
  if (n === 0) return [];

  // tails[i] = smallest tail value for IS of length i+1
  const tails: number[] = [];
  // indices[i] = index in arr of tails[i]
  const tailIndices: number[] = [];
  // prev[i] = index in arr of predecessor of arr[i] in the LIS
  const prev: number[] = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const val = arr[i];

    // Binary search for the position
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < val) lo = mid + 1;
      else hi = mid;
    }

    tails[lo] = val;
    tailIndices[lo] = i;

    if (lo > 0) {
      prev[i] = tailIndices[lo - 1];
    }
  }

  // Reconstruct
  const result: number[] = new Array(tails.length);
  let idx = tailIndices[tails.length - 1];
  for (let i = result.length - 1; i >= 0; i--) {
    result[i] = idx;
    idx = prev[idx];
  }

  return result;
}
