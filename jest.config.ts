import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        // Skip type checking in tests for speed
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "!src/lib/**/*.d.ts",
    "!src/lib/**/index.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },
};

export default config;
