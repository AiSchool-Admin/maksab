import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "coverage/",
      "public/sw.js",
      "public/workbox-*.js",
    ],
  },
  {
    rules: {
      // New React 19 / React Compiler rules — downgrade to warn for gradual migration
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/gating": "warn",
      "react-hooks/config": "warn",
    },
  },
];

export default eslintConfig;
