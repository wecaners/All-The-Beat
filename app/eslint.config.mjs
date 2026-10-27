import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 계층 의존 방향: app → server → db (_agent/rules/app.md)
  {
    files: ["src/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next", "next/*"], message: "src/server는 Next.js에 의존하지 않습니다 (_agent/rules/app.md)" },
            { group: ["react", "react-dom", "react/*"], message: "src/server는 React에 의존하지 않습니다" },
            { group: ["@/app/*", "@/components/*"], message: "src/server는 화면 계층을 import하지 않습니다" },
          ],
        },
      ],
    },
  },
  {
    files: ["src/db/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/server/*", "@/app/*", "@/lib/*", "@/components/*"], message: "src/db는 위 계층을 import하지 않습니다" },
            { group: ["next", "next/*"], message: "src/db는 Next.js에 의존하지 않습니다" },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
