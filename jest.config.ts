// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  moduleFileExtensions: ["ts", "js", "json"],

  // TS for tests (ESM)
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.jest.json" }],
  },

  // Fix TS->ESM path rewrites like `import './x.js'` in compiled output
  moduleNameMapper: {
    "^shakadb/(.*)$": "<rootDir>/prisma/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  // Required by ts-jest ESM path resolution
  extensionsToTreatAsEsm: [".ts"],

  // Optional but handy
  collectCoverageFrom: [
    "prisma/**/*.{ts,js}",
    "tests/**/*.{ts,js}",
    "!prisma/generated/**",
    "!dist/**",
  ],
  coverageDirectory: "./coverage",
};

export default config;
