module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module"
  },
  env: {
    node: true,
    es2021: true,
    mocha: true
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist", "out", "node_modules", "media"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off"
  }
};
