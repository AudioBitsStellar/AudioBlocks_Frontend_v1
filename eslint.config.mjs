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
    rules: {
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "react-hooks/exhaustive-deps": "error",
      "react/hook-use-state": "error",
      "react/jsx-sort-props": ["error", { "callbacksLast": true, "shorthandFirst": true, "reservedFirst": true }],
      "import/order": [
        "error",
        {
          "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
          "pathGroups": [
            { "pattern": "react", "group": "external", "position": "before" },
            { "pattern": "next/**", "group": "external", "position": "before" }
          ],
          "pathGroupsExcludedImportTypes": ["react"],
          "newlines-between": "never",
          "alphabetize": { "order": "asc", "caseInsensitive": true }
        }
      ]
    },
  },
];

export default eslintConfig;
