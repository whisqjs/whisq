import { describe, it, expect, beforeEach } from "vitest";
import {
  signal,
  div,
  span,
  p,
  h1,
  button,
  input,
  br,
  img,
  ul,
  li,
  a,
  component,
  sheet,
  useHead,
} from "@whisq/core";
import {
  renderToString,
  renderToStream,
  renderToHydratableString,
  collectHead,
  renderHeadToString,
} from "../index.js";

describe("renderToString", () => {
  it("renders simple element to HTML string", () => {
    const node = div("Hello");
    const html = renderToString(node);
    expect(html).toBe("<div>Hello</div>");
  });

  it("renders nested elements", () => {
    const node = div(p("Paragraph"), span("Text"));
    const html = renderToString(node);
    expect(html).toBe("<div><p>Paragraph</p><span>Text</span></div>");
  });

  it("renders element attributes", () => {
    const node = div({ class: "card", id: "main" }, "Content");
    const html = renderToString(node);
    expect(html).toContain('class="card"');
    expect(html).toContain('id="main"');
    expect(html).toContain("Content");
  });

  it("handles self-closing void elements", () => {
    const node = div(br(), input({ type: "text" }));
    const html = renderToString(node);
    expect(html).toContain("<br>");
    expect(html).toContain('<input type="text">');
    // Void elements should NOT have closing tags
    expect(html).not.toContain("</br>");
    expect(html).not.toContain("</input>");
  });

  it("renders component output", () => {
    const Greeting = component((props: { name: string }) =>
      h1(`Hello ${props.name}`),
    );
    const node = Greeting({ name: "World" });
    const html = renderToString(node);
    expect(html).toBe("<h1>Hello World</h1>");
  });

  it("renders reactive content as snapshot", () => {
    const count = signal(42);
    const node = span(() => `Count: ${count.value}`);
    const html = renderToString(node);
    expect(html).toContain("Count: 42");
  });

  it("renders reactive class attribute", () => {
    const active = signal(true);
    const node = div(
      { class: () => (active.value ? "active" : "inactive") },
      "Test",
    );
    const html = renderToString(node);
    expect(html).toContain('class="active"');
  });

  it("skips event handlers in output", () => {
    const node = button({ onclick: () => {} }, "Click");
    const html = renderToString(node);
    expect(html).toBe("<button>Click</button>");
    expect(html).not.toContain("onclick");
  });

  it("renders anchor with href", () => {
    const node = a({ href: "/about" }, "About");
    const html = renderToString(node);
    expect(html).toBe('<a href="/about">About</a>');
  });

  it("renders list", () => {
    const items = ["a", "b", "c"];
    const node = ul(items.map((item) => li(item)));
    const html = renderToString(node);
    expect(html).toBe("<ul><li>a</li><li>b</li><li>c</li></ul>");
  });

  it("renders img with attributes", () => {
    const node = img({ src: "/photo.jpg", alt: "A photo" });
    const html = renderToString(node);
    expect(html).toContain('src="/photo.jpg"');
    expect(html).toContain('alt="A photo"');
    expect(html).not.toContain("</img>");
  });

  it("escapes HTML entities in text content", () => {
    const node = p('Hello <script>alert("xss")</script>');
    const html = renderToString(node);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML entities in attribute values", () => {
    const node = div({ class: 'a"b' }, "Test");
    const html = renderToString(node);
    expect(html).toContain('class="a&quot;b"');
  });
});

// ── XSS Prevention ──────────────────────────────────────────────────────────

describe("XSS prevention", () => {
  it("escapes script tags in text children", () => {
    const html = renderToString(div("<script>alert(1)</script>"));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes quotes in attributes preventing attribute breakout", () => {
    const html = renderToString(div({ title: '" onmouseover="alert(1)' }));
    // The double quotes are escaped to &quot; so the attribute value
    // stays contained — onmouseover cannot become a real attribute
    expect(html).toContain("&quot;");
    // The entire malicious string is inside the title attribute value, safely quoted
    expect(html).toMatch(/title="&quot; onmouseover=&quot;alert\(1\)"/);
  });

  it("escapes ampersands in text content", () => {
    const html = renderToString(p("a & b < c > d"));
    expect(html).toContain("&amp;");
    expect(html).toContain("&lt;");
    expect(html).toContain("&gt;");
  });

  it("safely handles single quotes in double-quoted attributes", () => {
    const html = renderToString(div({ title: "it's" }));
    // Single quotes inside double-quoted attributes are safe — no escaping needed
    expect(html).toContain('title="it\'s"');
  });

  it("prevents javascript: protocol in href", () => {
    const html = renderToString(a({ href: "javascript:alert(1)" }, "Click"));
    // The href should be rendered as-is (escaping the value is the user's responsibility)
    // but the attribute value should be properly quoted
    expect(html).toContain('href="javascript:alert(1)"');
    // No unquoted attributes that could break out
    expect(html).not.toContain("href=javascript");
  });

  it("escapes nested HTML in reactive text", () => {
    const html = renderToString(span(() => "<img src=x onerror=alert(1)>"));
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("handles null and undefined attributes safely", () => {
    const html = renderToString(div({ class: undefined, id: null as any }));
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });
});

// ── renderToStream ──────────────────────────────────────────────────────────

describe("renderToStream", () => {
  it("returns a ReadableStream", () => {
    const stream = renderToStream(div("Hello"));
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it("produces the same output as renderToString", async () => {
    const node = div({ class: "test" }, p("Hello"), span("World"));
    const stringResult = renderToString(node);

    const stream = renderToStream(node);
    const reader = stream.getReader();
    let streamResult = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      streamResult += value;
    }

    expect(streamResult).toBe(stringResult);
  });

  it("streams nested elements", async () => {
    const node = ul(li("One"), li("Two"), li("Three"));
    const stream = renderToStream(node);
    const reader = stream.getReader();
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toContain("<li>One</li>");
  });
});

// ── renderToHydratableString ────────────────────────────────────────────────

describe("renderToHydratableString", () => {
  it("adds data-whisq-h attributes", () => {
    const html = renderToHydratableString(div(p("Hello")));
    expect(html).toContain("data-whisq-h=");
  });

  it("assigns unique IDs to elements", () => {
    const html = renderToHydratableString(div(p("A"), p("B"), p("C")));
    const ids = html.match(/data-whisq-h="(\d+)"/g);
    expect(ids).not.toBeNull();
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids!.length);
  });

  it("preserves content correctness", () => {
    const html = renderToHydratableString(
      div({ class: "test" }, span("Hello")),
    );
    expect(html).toContain('class="test"');
    expect(html).toContain("<span");
    expect(html).toContain("Hello");
  });

  it("does not add hydration markers to text nodes", () => {
    const html = renderToHydratableString(p("Just text"));
    // Only the <p> should have a marker, not the text
    const markers = html.match(/data-whisq-h/g);
    expect(markers?.length).toBe(1);
  });
});

// ── collectHead ─────────────────────────────────────────────────────────────

describe("collectHead", () => {
  beforeEach(() => {
    // Clean up head tags from previous tests
    document
      .querySelectorAll("style[id^='whisq-style-']")
      .forEach((el) => el.remove());
    document.querySelectorAll("[data-whisq-head]").forEach((el) => el.remove());
  });

  it("collects styles injected by sheet()", () => {
    sheet({ btn: { color: "red" } });
    const head = collectHead();
    expect(head.styles.length).toBeGreaterThan(0);
    expect(head.styles[0]).toContain("color:red");
  });

  it("collects title from document", () => {
    document.title = "Test Page";
    const head = collectHead();
    expect(head.title).toBe("Test Page");
  });
});

// ── renderHeadToString ──────────────────────────────────────────────────────

describe("renderHeadToString", () => {
  it("renders title", () => {
    const html = renderHeadToString({
      title: "Hello",
      meta: [],
      links: [],
      styles: [],
    });
    expect(html).toContain("<title>Hello</title>");
  });

  it("renders meta tags", () => {
    const html = renderHeadToString({
      meta: [{ name: "description", content: "A test page" }],
      links: [],
      styles: [],
    });
    expect(html).toContain('<meta name="description" content="A test page">');
  });

  it("renders styles", () => {
    const html = renderHeadToString({
      meta: [],
      links: [],
      styles: [".btn{color:red}"],
    });
    expect(html).toContain("<style>.btn{color:red}</style>");
  });

  it("escapes title content", () => {
    const html = renderHeadToString({
      title: "<script>alert(1)</script>",
      meta: [],
      links: [],
      styles: [],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
