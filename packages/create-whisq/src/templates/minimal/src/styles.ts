import { sheet, theme } from "@whisq/core";

// ── Brand tokens ────────────────────────────────────────────────────────────

theme({
  color: {
    bg: "#000000",
    surface: "#0A0A1A",
    card: "#111130",
    primary: "#4F46E5",
    "primary-light": "#A78BFA",
    accent: "#5CE0F2",
    "accent-bright": "#7DF3FF",
    text: "#E2E8F0",
    muted: "#94A3B8",
    border: "#1E293B",
    success: "#10B981",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
  },
});

// ── App styles ──────────────────────────────────────────────────────────────

export const s = sheet({
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

  logo: {
    width: "40px",
    height: "40px",
  },

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
    transition: "all 0.15s ease",
    "&:hover": {
      borderColor: "var(--color-primary)",
      background: "var(--color-primary)",
      color: "#ffffff",
    },
  },

  resetBtn: {
    display: "inline-block",
    marginTop: "1rem",
    padding: "8px 20px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "transparent",
    color: "var(--color-muted)",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
    "&:hover": {
      borderColor: "var(--color-muted)",
      color: "var(--color-text)",
    },
  },

  footer: {
    fontSize: "0.8rem",
    color: "var(--color-muted)",
  },

  footerLink: {
    color: "var(--color-accent)",
    textDecoration: "none",
    "&:hover": {
      color: "var(--color-accent-bright)",
    },
  },
});
