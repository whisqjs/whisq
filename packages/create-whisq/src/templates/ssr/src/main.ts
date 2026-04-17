import {
  signal,
  computed,
  component,
  div,
  h1,
  button,
  span,
  p,
  a,
  img,
  mount,
  sheet,
  theme,
} from "@whisq/core";

// ── Theme ──────────────────────────────────────────────────────────────────

theme({
  color: {
    bg: "#000000",
    surface: "#0A0A1A",
    card: "#111130",
    primary: "#4F46E5",
    accent: "#5CE0F2",
    text: "#E2E8F0",
    muted: "#94A3B8",
    border: "#1E293B",
  },
  radius: { sm: "6px", md: "8px", lg: "12px" },
});

const s = sheet({
  app: {
    maxWidth: "480px",
    width: "100%",
    padding: "2rem",
    textAlign: "center",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "2rem",
  },
  logo: { width: "40px", height: "40px" },
  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
    background: "linear-gradient(90deg, #A78BFA, #5CE0F2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  card: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "2rem",
    marginBottom: "1.5rem",
  },
  label: {
    fontSize: "0.85rem",
    color: "var(--color-muted)",
    marginBottom: "1rem",
    display: "block",
  },
  counter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
  },
  count: {
    fontSize: "3rem",
    fontWeight: "800",
    fontFamily: "'JetBrains Mono', monospace",
    color: "var(--color-accent)",
    minWidth: "80px",
  },
  btn: {
    width: "48px",
    height: "48px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    background: "var(--color-card)",
    color: "var(--color-text)",
    fontSize: "1.25rem",
    fontWeight: "600",
    cursor: "pointer",
    "&:hover": {
      borderColor: "var(--color-primary)",
      background: "var(--color-primary)",
      color: "#fff",
    },
  },
  footer: { fontSize: "0.8rem", color: "var(--color-muted)" },
  link: { color: "var(--color-accent)", textDecoration: "none" },
});

// ── App ────────────────────────────────────────────────────────────────────

const Counter = component(() => {
  const count = signal(0);
  const message = computed(() =>
    count.value === 0 ? "Click to get started" : `Count: ${count.value}`,
  );

  return div(
    { class: s.card },
    p({ class: s.label }, () => message.value),
    div(
      { class: s.counter },
      button({ class: s.btn, onclick: () => count.value-- }, "-"),
      span({ class: s.count }, () => `${count.value}`),
      button({ class: s.btn, onclick: () => count.value++ }, "+"),
    ),
  );
});

const App = component(() =>
  div(
    { class: s.app },
    div(
      { class: s.header },
      img({ class: s.logo, src: "/favicon.svg", alt: "Whisq" }),
      h1({ class: s.title }, "whisq"),
    ),
    Counter({}),
    p(
      { class: s.footer },
      "Server-rendered with ",
      a(
        { class: s.link, href: "https://whisq.dev", target: "_blank" },
        "@whisq/ssr",
      ),
    ),
  ),
);

mount(App({}), document.getElementById("app")!);
