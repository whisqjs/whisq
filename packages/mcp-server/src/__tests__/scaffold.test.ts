import { describe, it, expect } from "vitest";
import { scaffoldComponent } from "../tools/scaffold.js";

describe("scaffoldComponent — counter (default)", () => {
  it("generates valid component code", () => {
    const code = scaffoldComponent({
      name: "Counter",
      description: "A simple counter",
    });

    expect(code).toContain("export const Counter = component(");
    expect(code).toContain("return div(");
    expect(code).toContain("signal(");
  });

  it("includes imports from @whisq/core", () => {
    const code = scaffoldComponent({
      name: "MyComponent",
      description: "Test component",
    });

    expect(code).toContain('from "@whisq/core"');
    expect(code).toContain("import {");
    expect(code).toContain("component");
    expect(code).toContain("div");
  });

  it("includes JSDoc description", () => {
    const code = scaffoldComponent({
      name: "Card",
      description: "A card component for displaying content",
    });

    expect(code).toContain("A card component for displaying content");
  });

  it("handles props", () => {
    const code = scaffoldComponent({
      name: "UserCard",
      description: "Displays user info",
      props: ["name", "email"],
    });

    expect(code).toContain("props: { name: string; email: string }");
    expect(code).toContain("props.name");
    expect(code).toContain("props.email");
  });

  it("generates component without props", () => {
    const code = scaffoldComponent({
      name: "Header",
      description: "App header",
    });

    expect(code).toContain("component(() =>");
    expect(code).not.toContain("props:");
  });
});

describe("scaffoldComponent — form", () => {
  it("generates form with default fields", () => {
    const code = scaffoldComponent({
      name: "ContactForm",
      description: "Contact form",
      pattern: "form",
    });

    expect(code).toContain("form");
    expect(code).toContain("signal(");
    expect(code).toContain("onsubmit");
    expect(code).toContain("email");
    expect(code).toContain("message");
  });

  it("uses props as field names", () => {
    const code = scaffoldComponent({
      name: "LoginForm",
      description: "Login form",
      pattern: "form",
      props: ["username", "password"],
    });

    expect(code).toContain("username");
    expect(code).toContain("password");
  });
});

describe("scaffoldComponent — list", () => {
  it("generates list with add/remove", () => {
    const code = scaffoldComponent({
      name: "TodoList",
      description: "Todo list",
      pattern: "list",
    });

    expect(code).toContain("each(");
    expect(code).toContain("signal<string[]>");
    expect(code).toContain("const add");
    expect(code).toContain("const remove");
    expect(code).toContain("[...items.value");
  });
});

describe("scaffoldComponent — resource", () => {
  it("generates async data component", () => {
    const code = scaffoldComponent({
      name: "UserList",
      description: "Fetches and displays users",
      pattern: "resource",
    });

    expect(code).toContain("resource(");
    expect(code).toContain("fetch(");
    expect(code).toContain("data.loading()");
    expect(code).toContain("data.error()");
    expect(code).toContain("data.data()");
  });
});

describe("scaffoldComponent — store", () => {
  it("generates store module with default field", () => {
    const code = scaffoldComponent({
      name: "counterStore",
      description: "Counter store",
      pattern: "store",
    });

    expect(code).toContain("export const count = signal(");
    expect(code).toContain("computed(");
    expect(code).toContain("incrementCount");
    expect(code).toContain("resetCount");
  });

  it("uses props as store fields", () => {
    const code = scaffoldComponent({
      name: "cartStore",
      description: "Shopping cart",
      pattern: "store",
      props: ["items", "total"],
    });

    expect(code).toContain("export const items = signal(");
    expect(code).toContain("export const total = signal(");
    expect(code).toContain("incrementItems");
    expect(code).toContain("incrementTotal");
  });
});
