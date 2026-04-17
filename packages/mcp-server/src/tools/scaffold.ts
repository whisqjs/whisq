/**
 * Generate Whisq components from descriptions, supporting multiple patterns.
 */

export interface ScaffoldInput {
  name: string;
  description: string;
  props?: string[];
  pattern?: "counter" | "form" | "list" | "resource" | "store";
}

export function scaffoldComponent(input: ScaffoldInput): string {
  const pattern = input.pattern ?? "counter";

  switch (pattern) {
    case "form":
      return scaffoldForm(input);
    case "list":
      return scaffoldList(input);
    case "resource":
      return scaffoldResource(input);
    case "store":
      return scaffoldStore(input);
    default:
      return scaffoldCounter(input);
  }
}

// ── Counter pattern ───────────────────────────────────────────────────────

function scaffoldCounter(input: ScaffoldInput): string {
  const { name, description, props = [] } = input;

  if (props.length > 0) {
    const propsType = `{ ${props.map((p) => `${p}: string`).join("; ")} }`;
    const propsUsage = props.map((p) => `    p(props.${p}),`).join("\n");

    return [
      `import { component, div, p } from "@whisq/core";`,
      ``,
      `/**`,
      ` * ${description}`,
      ` */`,
      `export const ${name} = component((props: ${propsType}) => {`,
      `  return div({ class: "${name.toLowerCase()}" },`,
      propsUsage,
      `  );`,
      `});`,
      ``,
    ].join("\n");
  }

  return [
    `import { signal, component, div, p, button, span } from "@whisq/core";`,
    ``,
    `/**`,
    ` * ${description}`,
    ` */`,
    `export const ${name} = component(() => {`,
    `  const count = signal(0);`,
    ``,
    `  return div({ class: "${name.toLowerCase()}" },`,
    `    p("${name}"),`,
    `    button({ onclick: () => count.value++ }, "+"),`,
    `    span(() => String(count.value)),`,
    `  );`,
    `});`,
    ``,
  ].join("\n");
}

// ── Form pattern ──────────────────────────────────────────────────────────

function scaffoldForm(input: ScaffoldInput): string {
  const { name, description, props = [] } = input;
  const fields = props.length > 0 ? props : ["email", "message"];

  const signals = fields.map((f) => `  const ${f} = signal("");`).join("\n");

  const inputs = fields
    .map((f) =>
      [
        `    label("${f.charAt(0).toUpperCase() + f.slice(1)}"),`,
        `    input({`,
        `      type: "text",`,
        `      placeholder: "${f}",`,
        `      value: () => ${f}.value,`,
        `      oninput: (e) => ${f}.value = (e.target as HTMLInputElement).value,`,
        `    }),`,
      ].join("\n"),
    )
    .join("\n");

  return [
    `import { signal, component, div, form, input, button, label } from "@whisq/core";`,
    ``,
    `/**`,
    ` * ${description}`,
    ` */`,
    `export const ${name} = component(() => {`,
    signals,
    ``,
    `  const handleSubmit = (e: Event) => {`,
    `    e.preventDefault();`,
    `    // TODO: handle form submission`,
    `  };`,
    ``,
    `  return form({ onsubmit: handleSubmit },`,
    inputs,
    `    button({ type: "submit" }, "Submit"),`,
    `  );`,
    `});`,
    ``,
  ].join("\n");
}

// ── List pattern ──────────────────────────────────────────────────────────

function scaffoldList(input: ScaffoldInput): string {
  const { name, description } = input;
  const itemName = name.replace(/List$/i, "").toLowerCase() || "item";

  return [
    `import { signal, component, div, ul, li, input, button, each } from "@whisq/core";`,
    ``,
    `/**`,
    ` * ${description}`,
    ` */`,
    `export const ${name} = component(() => {`,
    `  const items = signal<string[]>([]);`,
    `  const newItem = signal("");`,
    ``,
    `  const add = () => {`,
    `    if (!newItem.value.trim()) return;`,
    `    items.value = [...items.value, newItem.value.trim()];`,
    `    newItem.value = "";`,
    `  };`,
    ``,
    `  const remove = (index: number) => {`,
    `    items.value = items.value.filter((_, i) => i !== index);`,
    `  };`,
    ``,
    `  return div({ class: "${name.toLowerCase()}" },`,
    `    div(`,
    `      input({`,
    `        type: "text",`,
    `        placeholder: "Add ${itemName}...",`,
    `        value: () => newItem.value,`,
    `        oninput: (e) => newItem.value = (e.target as HTMLInputElement).value,`,
    `        onkeydown: (e) => e.key === "Enter" && add(),`,
    `      }),`,
    `      button({ onclick: add }, "Add"),`,
    `    ),`,
    `    ul(`,
    `      each(() => items.value, (${itemName}, index) =>`,
    `        li(`,
    `          ${itemName},`,
    `          button({ onclick: () => remove(index) }, "Remove"),`,
    `        ),`,
    `      ),`,
    `    ),`,
    `  );`,
    `});`,
    ``,
  ].join("\n");
}

// ── Resource pattern (async data) ─────────────────────────────────────────

function scaffoldResource(input: ScaffoldInput): string {
  const { name, description } = input;

  return [
    `import { component, div, p, ul, li, each, when, resource } from "@whisq/core";`,
    ``,
    `/**`,
    ` * ${description}`,
    ` */`,
    `export const ${name} = component(() => {`,
    `  const data = resource(() =>`,
    `    fetch("/api/data").then((r) => r.json()),`,
    `  );`,
    ``,
    `  return div({ class: "${name.toLowerCase()}" },`,
    `    when(() => data.loading(), () => p("Loading...")),`,
    `    when(() => !!data.error(), () => p(() => data.error()!.message)),`,
    `    when(() => !!data.data(), () =>`,
    `      ul(each(() => data.data()!, (item) => li(item.name))),`,
    `    ),`,
    `  );`,
    `});`,
    ``,
  ].join("\n");
}

// ── Store pattern (shared state module) ───────────────────────────────────

function scaffoldStore(input: ScaffoldInput): string {
  const { description, props = [] } = input;
  const fields = props.length > 0 ? props : ["count"];

  const signals = fields
    .map((f) => `export const ${f} = signal(0);`)
    .join("\n");

  const actions = fields
    .map((f) => {
      const capitalized = f.charAt(0).toUpperCase() + f.slice(1);
      return [
        `export const increment${capitalized} = () => { ${f}.value++; };`,
        `export const reset${capitalized} = () => { ${f}.value = 0; };`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `import { signal, computed } from "@whisq/core";`,
    ``,
    `/**`,
    ` * ${description}`,
    ` */`,
    ``,
    `// ── State`,
    signals,
    ``,
    `// ── Derived`,
    `export const total = computed(() => ${fields.map((f) => `${f}.value`).join(" + ")});`,
    ``,
    `// ── Actions`,
    actions,
    ``,
  ].join("\n");
}
