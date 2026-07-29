import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["lib/calculations/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "document",
          message: "Calculation code must not depend on the DOM.",
        },
        {
          name: "window",
          message: "Calculation code must not depend on the browser runtime.",
        },
        {
          name: "fetch",
          message: "Calculation code must not depend on the network.",
        },
        {
          name: "XMLHttpRequest",
          message: "Calculation code must not depend on the network.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/*",
                "next",
                "next/*",
                "@prisma/*",
                "prisma",
                "prisma/*",
                "@/app/*",
                "@/app/**",
                "@/components/*",
                "@/components/**",
                "@/features/*",
                "@/features/**",
                "@/lib/db/*",
                "@/lib/db/**",
                "../../app/*",
                "../../app/**",
                "../../components/*",
                "../../components/**",
                "../../features/*",
                "../../features/**",
                "../db/*",
                "../db/**",
              ],
              message:
                "Calculation code must remain independent of UI, framework, database, and feature layers.",
            },
          ],
        },
      ],
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "coverage/**",
    "lib/db/generated/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
