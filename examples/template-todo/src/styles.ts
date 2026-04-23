import { sheet, theme } from "@whisq/core";

theme({
  color: {
    bg: "#0a0a12",
    surface: "#111122",
    card: "#1a1a2e",
    primary: "#4F46E5",
    accent: "#5CE0F2",
    text: "#E2E8F0",
    muted: "#94A3B8",
    border: "#1E293B",
    danger: "#dc2626",
  },
  radius: { sm: "6px", md: "8px", lg: "12px" },
});

export const s = sheet({
  app: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "var(--color-text)",
  },

  heading: {
    fontSize: "1.75rem",
    fontWeight: "700",
    marginBottom: "1.5rem",
    background: "linear-gradient(90deg, #A78BFA, #5CE0F2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  inputRow: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1.5rem",
  },

  input: {
    flex: "1",
    padding: "0.625rem 0.875rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    background: "var(--color-card)",
    color: "var(--color-text)",
    fontSize: "1rem",
    "&:focus": {
      outline: "none",
      borderColor: "var(--color-primary)",
    },
  },

  btn: {
    padding: "0.625rem 1rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    background: "var(--color-card)",
    color: "var(--color-text)",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    "&:hover": {
      borderColor: "var(--color-primary)",
      background: "var(--color-primary)",
      color: "#ffffff",
    },
  },

  list: {
    listStyle: "none",
    padding: "0",
    margin: "0",
  },

  item: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem",
    borderRadius: "var(--radius-md)",
    background: "var(--color-card)",
    marginBottom: "0.5rem",
  },

  itemText: {
    flex: "1",
    fontSize: "0.95rem",
  },

  doneText: {
    textDecoration: "line-through",
    color: "var(--color-muted)",
  },

  removeBtn: {
    width: "32px",
    height: "32px",
    padding: "0",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "transparent",
    color: "var(--color-muted)",
    fontSize: "1.25rem",
    lineHeight: "1",
    cursor: "pointer",
    "&:hover": {
      borderColor: "var(--color-danger)",
      color: "var(--color-danger)",
    },
  },

  empty: {
    color: "var(--color-muted)",
    fontSize: "0.95rem",
    fontStyle: "italic",
    padding: "2rem 0",
    textAlign: "center",
  },

  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "1rem",
    padding: "0.75rem 0",
    borderTop: "1px solid var(--color-border)",
    fontSize: "0.875rem",
    color: "var(--color-muted)",
  },

  error: {
    padding: "1rem",
    borderRadius: "var(--radius-md)",
    background: "var(--color-card)",
    border: "1px solid var(--color-danger)",
    color: "var(--color-danger)",
  },
});
