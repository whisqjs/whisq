# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Whisq, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

Email: **whisq@whisq.dev**

Include:

- Description of the vulnerability
- Steps to reproduce
- Affected packages and versions
- Impact assessment (what an attacker could do)

### What to Expect

| Timeframe    | Action                                               |
| ------------ | ---------------------------------------------------- |
| **24 hours** | We acknowledge receipt of your report                |
| **72 hours** | We provide an initial assessment and severity rating |
| **7 days**   | We aim to have a fix in development                  |
| **30 days**  | We release a patch and publish a security advisory   |

### Severity Ratings

We use the following severity scale:

- **Critical** — Remote code execution, data exfiltration, authentication bypass
- **High** — XSS, CSRF, privilege escalation, significant data exposure
- **Medium** — Information disclosure, denial of service, limited injection
- **Low** — Minor information leak, theoretical attack with unlikely prerequisites

### Scope

The following packages are in scope:

| Package             | Security-Relevant Areas                                 |
| ------------------- | ------------------------------------------------------- |
| `@whisq/core`       | DOM manipulation, `raw()` HTML injection                |
| `@whisq/ssr`        | HTML output escaping, hydration safety                  |
| `@whisq/sandbox`    | Code execution isolation, global blocking               |
| `@whisq/mcp-server` | Tool execution boundaries, input validation             |
| `@whisq/router`     | URL parsing, parameter injection                        |
| `@whisq/devtools`   | Signal inspection (dev only, not shipped to production) |

### Out of Scope

- Vulnerabilities in dependencies (report to the dependency maintainer)
- Social engineering attacks
- Denial of service via resource exhaustion on whisq.dev
- Issues in example code or documentation

### Credit

We credit reporters in our security advisories (unless you prefer anonymity). If you'd like to be credited, include your preferred name and optional link.

## Supported Versions

| Version       | Supported   |
| ------------- | ----------- |
| 1.x (current) | Yes         |
| 0.x (alpha)   | Best effort |

## Security Best Practices for Whisq Users

### raw() — HTML Injection

`raw()` injects HTML directly into the DOM without sanitization. Never pass user input to it:

```ts
// ❌ DANGEROUS — XSS vulnerability
raw(userInput);

// ✅ SAFE — use element functions for user content
p(userInput);

// ✅ SAFE — sanitize before passing to raw()
import DOMPurify from "dompurify";
raw(DOMPurify.sanitize(htmlFromCMS));
```

### SSR — HTML Escaping

`@whisq/ssr` escapes text content and attribute values automatically. However, be cautious with:

- Dynamic `style` attributes — validate CSS values server-side
- Dynamic `href` attributes — validate URLs to prevent `javascript:` protocol injection

### Sandbox — Isolation Boundaries

`@whisq/sandbox` blocks browser globals but runs in the same thread. For truly untrusted code, consider:

- Running the sandbox in a Web Worker for thread isolation
- Setting strict `timeout` values to prevent infinite loops
- Not exposing sensitive data in the sandbox scope
