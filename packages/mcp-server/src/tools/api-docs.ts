/**
 * Query Whisq API reference by topic. Returns structured documentation
 * that AI tools can use to generate accurate code.
 *
 * Topics are mostly hand-written below. The `signals` topic is generated
 * from the enriched manifest shipped by @whisq/core (see WHISQ-138):
 * `@whisq/core/public-api-annotated.json` is the drift-validated source of
 * truth. The other topics remain hand-written for now — migrating them is
 * tracked against #103.
 */

import annotatedManifest from "@whisq/core/public-api-annotated.json" with { type: "json" };

export type ApiTopic =
  | "signals"
  | "elements"
  | "components"
  | "routing"
  | "styling"
  | "forms"
  | "lists"
  | "async"
  | "ssr"
  | "testing"
  | "overview";

export interface ApiDocResult {
  topic: string;
  content: string;
}

interface EnrichedSymbol {
  name: string;
  kind: string;
  signature: string;
  summary: string;
  gotchas: string[];
  examples: string[];
  since: string;
  seeAlso: string[];
  topic: string;
}

interface EnrichedManifest {
  version: string;
  schemaVersion: number;
  symbols: EnrichedSymbol[];
}

const MANIFEST = annotatedManifest as EnrichedManifest;

const TOPIC_TITLES: Record<ApiTopic, string> = {
  overview: "Whisq API Overview",
  signals: "Signals",
  elements: "Elements",
  components: "Components",
  routing: "Routing (@whisq/router)",
  styling: "Styling",
  forms: "Forms",
  lists: "Lists",
  async: "Async Data",
  ssr: "SSR (@whisq/ssr)",
  testing: "Testing (@whisq/testing)",
};

function renderSymbol(symbol: EnrichedSymbol): string {
  const parts: string[] = [];
  parts.push(`## ${symbol.signature}`);
  parts.push("");
  parts.push(symbol.summary);
  for (const example of symbol.examples) {
    parts.push("");
    parts.push("```ts");
    parts.push(example);
    parts.push("```");
  }
  if (symbol.gotchas.length > 0) {
    parts.push("");
    parts.push("**Gotchas:**");
    for (const gotcha of symbol.gotchas) {
      parts.push(`- ${gotcha}`);
    }
  }
  if (symbol.seeAlso.length > 0) {
    parts.push("");
    parts.push(`**See also:** ${symbol.seeAlso.join(", ")}`);
  }
  return parts.join("\n");
}

function renderTopicFromManifest(topic: ApiTopic): string {
  const title = TOPIC_TITLES[topic];
  const symbols = MANIFEST.symbols.filter((s) => s.topic === topic);
  const sections = symbols.map((s) => renderSymbol(s));
  return [`# ${title}`, "", ...sections].join("\n");
}

const DOCS: Record<ApiTopic, string> = {
  overview: `# Whisq API Overview

Whisq is an AI-native JavaScript/TypeScript framework. No JSX, no build step.

## Core Concepts
- **Signals**: signal(), computed(), effect(), batch()
- **Elements**: div(), span(), button(), etc. — all HTML elements are functions
- **Components**: component() — function components with lifecycle hooks
- **Styling**: sheet(), theme() — CSS-in-JS with scoped classes
- **Routing**: @whisq/router — signal-based client-side routing
- **SSR**: @whisq/ssr — server-side rendering
- **Testing**: @whisq/testing — render, screen queries, fireEvent, userEvent

## Import
\`\`\`ts
import { signal, computed, effect, batch, div, span, button, component, mount } from "@whisq/core";
\`\`\``,

  signals: renderTopicFromManifest("signals"),

  elements: `# Elements

Every HTML element is a function. Two signatures:

## With props + children
\`\`\`ts
div({ class: "card", id: "main" }, h1("Title"), p("Content"))
\`\`\`

## Without props
\`\`\`ts
div(h1("Title"), p("Content"))
\`\`\`

## Reactive props
\`\`\`ts
div({ class: () => active.value ? "active" : "" }, "Text")
div({ style: () => \`color: \${color.value}\` }, "Styled")
div({ hidden: () => !visible.value }, "Conditional")
\`\`\`

## Events
\`\`\`ts
button({ onclick: () => count.value++ }, "Click")
input({ oninput: (e) => name.value = e.target.value })
\`\`\`

## Reactive children
\`\`\`ts
span(() => \`Count: \${count.value}\`)
\`\`\`

## Conditional: when()
\`\`\`ts
when(() => loggedIn.value, () => p("Welcome"), () => p("Login"))
\`\`\`

## Lists: each()
\`\`\`ts
ul(each(() => items.value, (item) => li(item.name)))
\`\`\`

## Raw HTML: raw()
\`\`\`ts
raw(htmlString) // no sanitization — trusted content only
\`\`\``,

  components: `# Components

## component(renderFn)
\`\`\`ts
const Counter = component((props: { initial?: number }) => {
  const count = signal(props.initial ?? 0);

  onMount(() => {
    console.log("mounted");
    return () => console.log("cleanup");
  });

  return div(
    button({ onclick: () => count.value-- }, "-"),
    span(() => count.value),
    button({ onclick: () => count.value++ }, "+"),
  );
});

// Usage — function call, not JSX
mount(Counter({ initial: 10 }), document.getElementById("app")!);
\`\`\`

## Lifecycle
- onMount(fn) — runs after DOM insertion; return cleanup function
- onCleanup(fn) — runs on unmount

## Nesting
\`\`\`ts
const App = component(() =>
  div(Header({}), Counter({ initial: 0 }), Footer({}))
);
\`\`\``,

  routing: `# Routing (@whisq/router)

## Setup
\`\`\`ts
import { createRouter, RouterView, Link } from "@whisq/router";

const router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/users/:id", component: UserDetail },
    { path: "*", component: NotFound },
  ],
  beforeEach: (to, from) => {
    if (to.path === "/admin" && !isLoggedIn()) return "/login";
  },
  scrollBehavior: "restore",
});
\`\`\`

## RouterView — renders matched route
\`\`\`ts
div(RouterView(router))
\`\`\`

## Link — client-side navigation
\`\`\`ts
Link({ href: "/about", router }, "About")
\`\`\`

## Programmatic navigation
\`\`\`ts
router.navigate("/users/42");
router.back();
router.forward();
\`\`\`

## Route state
\`\`\`ts
router.current.value.path    // "/users/42"
router.current.value.params  // { id: "42" }
router.current.value.query   // { page: "1" }
router.current.value.meta    // { requiresAuth: true }
\`\`\`

## Nested routes, lazy loading
\`\`\`ts
{ path: "/dashboard", component: Layout, children: [
  { path: "/settings", component: Settings },
] }
{ path: "/lazy", component: () => import("./LazyPage") }
\`\`\``,

  styling: `# Styling

## sheet(rules)
CSS-in-JS with scoped class names.
\`\`\`ts
import { sheet, theme } from "@whisq/core";

const s = sheet({
  card: { padding: "1rem", borderRadius: "8px" },
  title: { fontSize: "1.5rem", fontWeight: "700" },
  btn: {
    cursor: "pointer",
    "&:hover": { background: "#333" },
  },
});

div({ class: s.card }, h1({ class: s.title }, "Hello"))
\`\`\`

## theme(tokens)
Define CSS custom properties.
\`\`\`ts
theme({
  color: { primary: "#4F46E5", text: "#E2E8F0" },
  radius: { sm: "4px", md: "8px" },
});

// Use in sheet: "var(--color-primary)"
\`\`\``,

  forms: `# Forms

\`\`\`ts
const LoginForm = component(() => {
  const email = signal("");
  const password = signal("");
  const valid = computed(() =>
    email.value.includes("@") && password.value.length >= 8
  );

  return form({ onsubmit: (e) => { e.preventDefault(); submit(); } },
    input({
      type: "email",
      placeholder: "Email",
      value: () => email.value,
      oninput: (e) => email.value = (e.target as HTMLInputElement).value,
    }),
    input({
      type: "password",
      placeholder: "Password",
      value: () => password.value,
      oninput: (e) => password.value = (e.target as HTMLInputElement).value,
    }),
    button({ disabled: () => !valid.value }, "Sign In"),
  );
});
\`\`\`

## Key patterns
- Each field is a signal
- Use computed for derived validation
- disabled: () => !valid.value for reactive disable
- oninput for live updates, onchange for commit-on-blur`,

  lists: `# Lists

## each(signalFn, renderFn)
\`\`\`ts
ul(
  each(() => todos.value, (todo) =>
    li({ class: () => todo.done ? "done" : "" },
      span(todo.text),
      button({ onclick: () => remove(todo.id) }, "Remove"),
    ),
  ),
)
\`\`\`

## Alternative: .map()
\`\`\`ts
ul(() => items.value.map(item => li(item.name)))
\`\`\`

## Adding items
\`\`\`ts
items.value = [...items.value, newItem]; // NOT .push()
\`\`\`

## Removing items
\`\`\`ts
items.value = items.value.filter(i => i.id !== targetId);
\`\`\`

## Updating items
\`\`\`ts
items.value = items.value.map(i =>
  i.id === targetId ? { ...i, done: true } : i
);
\`\`\``,

  async: `# Async Data

## resource(fetchFn)
\`\`\`ts
const users = resource(() => fetch("/api/users").then(r => r.json()));

div(
  when(() => users.loading(), () => p("Loading...")),
  when(() => !!users.error(), () => p(() => users.error()!.message)),
  when(() => !!users.data(), () =>
    ul(each(() => users.data()!, (u) => li(u.name)))
  ),
)
\`\`\`

## resource API
- data() — resolved data or undefined
- loading() — boolean
- error() — Error or undefined
- refetch() — re-trigger the fetch`,

  ssr: `# SSR (@whisq/ssr)

## renderToString(node)
\`\`\`ts
import { renderToString } from "@whisq/ssr";
const html = renderToString(App({}));
\`\`\`

## renderToStream(node)
Progressive HTML delivery via ReadableStream.
\`\`\`ts
const stream = renderToStream(App({}));
\`\`\`

## renderToHydratableString(node)
Adds data-whisq-h attributes for client hydration.
\`\`\`ts
const html = renderToHydratableString(App({}));
\`\`\`

## Head management
\`\`\`ts
const head = collectHead();       // gathers title, meta, styles
const headHtml = renderHeadToString(head);
\`\`\``,

  testing: `# Testing (@whisq/testing)

## render + screen queries
\`\`\`ts
import { render, screen, fireEvent, userEvent, waitFor, cleanup } from "@whisq/testing";

const { container, unmount } = render(Counter({ initial: 0 }));
screen.getByText("0");
screen.getByRole("button");
screen.getByTestId("my-id");
screen.getByLabelText("Email");
screen.getAllByRole("listitem");
\`\`\`

## fireEvent
\`\`\`ts
fireEvent.click(screen.getByRole("button"));
fireEvent.input(el, { target: { value: "hello" } });
fireEvent.submit(el);
\`\`\`

## userEvent (realistic simulation)
\`\`\`ts
await userEvent.type(el, "hello");   // per-character events
await userEvent.clear(el);
await userEvent.click(el);           // mousedown + mouseup + click
await userEvent.tab();               // focus navigation
await userEvent.selectOptions(el, "value");
\`\`\`

## Async queries
\`\`\`ts
const el = await screen.findByText("Loaded");
await waitFor(() => expect(screen.getByText("Done")).toBeTruthy());
\`\`\``,
};

const VALID_TOPICS = Object.keys(DOCS) as ApiTopic[];

export function queryApi(topic: string): ApiDocResult {
  const normalized = topic.toLowerCase().trim();

  // Direct match
  if (normalized in DOCS) {
    return { topic: normalized, content: DOCS[normalized as ApiTopic] };
  }

  // Fuzzy match — check if topic is a substring of a valid topic
  const match = VALID_TOPICS.find(
    (t) => t.includes(normalized) || normalized.includes(t),
  );
  if (match) {
    return { topic: match, content: DOCS[match] };
  }

  // Alias mapping
  const aliases: Record<string, ApiTopic> = {
    state: "signals",
    reactive: "signals",
    signal: "signals",
    html: "elements",
    dom: "elements",
    element: "elements",
    component: "components",
    router: "routing",
    routes: "routing",
    navigation: "routing",
    css: "styling",
    style: "styling",
    styles: "styling",
    theme: "styling",
    form: "forms",
    input: "forms",
    list: "lists",
    each: "lists",
    array: "lists",
    fetch: "async",
    resource: "async",
    data: "async",
    render: "ssr",
    server: "ssr",
    test: "testing",
    tests: "testing",
    vitest: "testing",
  };

  const aliased = aliases[normalized];
  if (aliased) {
    return { topic: aliased, content: DOCS[aliased] };
  }

  return {
    topic: "unknown",
    content: `Topic "${topic}" not found. Available topics: ${VALID_TOPICS.join(", ")}`,
  };
}
