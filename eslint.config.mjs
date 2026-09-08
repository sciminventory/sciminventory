import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".next-build/**", ".next-webpack/**", "out/**", "build/**", "**/.venv/**", "**/__pycache__/**", "next-env.d.ts"]),
]);
