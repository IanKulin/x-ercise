import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // Files to ignore
  {
    ignores: ["node_modules/**", "data/**", "public/**"],
  },

  // JavaScript files (config files, etc.)
  {
    files: ["**/*.js"],
    ...eslint.configs.recommended,
    ...eslintConfigPrettier,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },

  // TypeScript files with type checking
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
