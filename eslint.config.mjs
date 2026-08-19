import coreWebVitals from "eslint-config-next/core-web-vitals";

// Regras do react-hooks v6 baseadas em compiler (error-boundaries, set-state-in-effect,
// immutability, refs, static-components etc.) são rebaixadas para "warn": o código
// pré-existente não foi escrito para elas e a migração é gradual. Elas continuam
// visíveis no editor e no lint, sem quebrar o `npm run check`.
const eslintConfig = [
  ...coreWebVitals,
  {
    rules: {
      "react-hooks/error-boundaries": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
    ],
  },
];

export default eslintConfig;
