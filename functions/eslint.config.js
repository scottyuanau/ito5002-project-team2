const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    name: "functions/files-to-lint",
    files: ["**/*.js"],
    ignores: ["node_modules/**"],
  },
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "script",
      globals: {
        ...globals.node,
        fetch: "readonly",
        AbortController: "readonly",
      },
    },
  },
  js.configs.recommended,
];
