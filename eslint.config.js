import tseslint from "typescript-eslint";

// Mise en place du lint — ticket INFRA-212.
// Regles recommandees de typescript-eslint, plus un garde-fou sur les variables
// inutilisees. Le parser seul ne verifiait rien (rules: {}).
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".opencode/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  }
);
