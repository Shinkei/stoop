import js from "@eslint/js";
import tseslint from "typescript-eslint";
import solid from "eslint-plugin-solid/configs/typescript";

export default tseslint.config(
  // Ignores
  {
    ignores: [".output/**", ".vinxi/**", "node_modules/**"],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // SolidJS rules (incluye JSX + hooks de Solid)
  solid,

  // Overrides del proyecto
  {
    rules: {
      // Permite vars con _ prefix para ignorar (p.ej. _event)
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // No hace falta; Solid no usa React
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
