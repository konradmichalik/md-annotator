import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  dts: false,
  splitting: false,
  clean: true,
  external: ["@opencode-ai/plugin"],
  noExternal: [/^(?!@opencode-ai\/plugin).*/],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
