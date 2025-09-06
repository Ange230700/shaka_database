// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  moduleFileExtensions: ["ts", "js", "json", "mjs", "cjs"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.jest.json" }],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^shakadb/(.*)$": "<rootDir>/prisma/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverageFrom: [
    "prisma/**/*.{ts,js}",
    "tests/**/*.{ts,js}",
    "!prisma/generated/**",
    "!dist/**",
  ],
  coverageDirectory: "./coverage",
  globalSetup: "<rootDir>/prisma/testSetup.ts",
};

export default config;
