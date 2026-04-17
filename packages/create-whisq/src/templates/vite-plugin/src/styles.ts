import { sheet, theme } from "@whisq/core";

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

export const s = sheet({
  app: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "2rem",
  },

  nav: {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid var(--color-border)",
    "& a": {
      color: "var(--color-muted)",
      textDecoration: "none",
      fontSize: "0.9rem",
      "&:hover": { color: "var(--color-accent)" },
    },
  },

  content: { minHeight: "300px" },

  heading: {
    fontSize: "1.5rem",
    fontWeight: "700",
    marginBottom: "1rem",
    background: "linear-gradient(90deg, #A78BFA, #5CE0F2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  text: {
    color: "var(--color-muted)",
    fontSize: "0.9rem",
    lineHeight: "1.6",
    marginBottom: "1rem",
  },

  row: { display: "flex", alignItems: "center", gap: "1rem" },

  count: {
    fontSize: "2rem",
    fontWeight: "800",
    fontFamily: "'JetBrains Mono', monospace",
    color: "var(--color-accent)",
    minWidth: "60px",
    textAlign: "center",
  },

  btn: {
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    background: "var(--color-card)",
    color: "var(--color-text)",
    fontSize: "1.1rem",
    fontWeight: "600",
    cursor: "pointer",
    "&:hover": {
      borderColor: "var(--color-primary)",
      background: "var(--color-primary)",
      color: "#fff",
    },
  },

  link: {
    color: "var(--color-accent)",
    textDecoration: "none",
    "&:hover": { textDecoration: "underline" },
  },
});
