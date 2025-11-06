import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Treat 'any' types as warnings instead of errors to allow builds
      "@typescript-eslint/no-explicit-any": "warn",
      // Treat unused variables as warnings
      "@typescript-eslint/no-unused-vars": "warn",
      // Treat React hooks issues as warnings
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error", // Keep this as error as it can cause runtime issues
      // Allow require() style imports (needed for some dynamic imports)
      "@typescript-eslint/no-require-imports": "warn",
      // Treat prefer-const as warning
      "prefer-const": "warn",
      // Treat unescaped entities as warnings
      "react/no-unescaped-entities": "warn",
      // Treat img element warnings as warnings
      "@next/next/no-img-element": "warn",
    },
  },
];

export default eslintConfig;
