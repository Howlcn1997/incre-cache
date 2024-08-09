import { defineConfig } from "father";

export default defineConfig({
  esm: { input: "src" },
  cjs: { input: "src" },
  umd: { entry: "src/index.ts",name: "increCache" },
});
