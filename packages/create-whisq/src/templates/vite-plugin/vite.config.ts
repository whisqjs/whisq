import { defineConfig } from "vite";
import { whisqPlugin } from "@whisq/vite-plugin";

export default defineConfig({
  plugins: [
    whisqPlugin({
      pagesDir: "src/pages",
    }),
  ],
});
