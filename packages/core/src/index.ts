// ============================================================================
// Whisq Core — Public API
//
// Primary: Hyperscript functions — div(), span(), button(), h()
// Fallback: raw() — for injecting HTML strings when needed
//
// Reactive:   signal, computed, effect, batch
// Elements:   div, span, button, input, h1, h2, ... (every HTML tag)
// Helpers:    h, raw, when, each, mount
// Component:  component, onMount, onCleanup, resource
// ============================================================================

// Reactive primitives
export { signal, computed, effect, batch } from "./reactive.js";
export type { Signal, ReadonlySignal } from "./reactive.js";

// Reactive collections (signalMap, signalSet) live in a sub-path import
// to keep the top-level bundle under 5 KB:
//   import { signalMap, signalSet } from "@whisq/core/collections";

// Element functions (primary API)
export {
  // Core
  h,
  raw,
  when,
  match,
  each,
  errorBoundary,
  portal,
  transition,
  mount,
  // Layout
  div,
  span,
  main,
  section,
  article,
  aside,
  header,
  footer,
  nav,
  // Text
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  strong,
  em,
  small,
  pre,
  code,
  // Interactive
  button,
  a,
  // Forms
  form,
  input,
  textarea,
  select,
  option,
  label,
  // Lists
  ul,
  ol,
  li,
  // Table
  table,
  thead,
  tbody,
  tr,
  th,
  td,
  // Media
  img,
  video,
  audio,
  // Misc
  br,
  hr,
  iframe,
} from "./elements.js";
export type {
  WhisqNode,
  EventHandler,
  WhisqEvent,
  ClassArraySource,
} from "./elements.js";

// Component model
export {
  component,
  onMount,
  onCleanup,
  resource,
  createContext,
  provide,
  inject,
  useHead,
} from "./component.js";
export type {
  ComponentDef,
  Resource,
  ResourceOptions,
  ResourceSourceOptions,
  InjectionKey,
} from "./component.js";

// Refs
export { ref } from "./ref.js";
export type { Ref, ElementRef } from "./ref.js";

// Styling
export { sheet, styles, cx, rcx, sx, theme } from "./styling.js";
export type { StyleObject } from "./elements.js";

// Dev-mode diagnostics
export { WhisqStructureError, WhisqKeyByError } from "./dev-errors.js";
export type {
  WhisqStructureErrorFields,
  WhisqKeyByErrorFields,
} from "./dev-errors.js";

// Forms
export { bind } from "./bind.js";
export type {
  TextBind,
  NumberBind,
  CheckboxBind,
  RadioBind,
  BindOptions,
} from "./bind.js";
export { bindField } from "./bindField.js";
export type { BindFieldOptions } from "./bindField.js";

// bindPath() for nested-object paths lives at `@whisq/core/forms` — kept off
// the top-level bundle so apps that don't need deep binding pay no size cost.
