import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { ignores: ["**/*.js", "**/*.mjs", "**/*.cjs"] },
  { files: ["**/*.ts"], plugins: { js }, extends: ["js/recommended"] },
  tseslint.configs.recommended,
]);