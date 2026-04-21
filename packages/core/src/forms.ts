// ============================================================================
// Whisq Core — Form binding extensions (sub-path export)
//
// Import path: `@whisq/core/forms`
//
// Kept off the top-level bundle — apps that only need bind() and bindField()
// (the 80% case) pay no size cost. Opt in here for nested-record binding.
// ============================================================================

export { bindPath } from "./bindPath.js";
