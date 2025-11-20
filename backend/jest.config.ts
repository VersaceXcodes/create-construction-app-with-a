module.exports = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": [
    "<rootDir>"
  ],
  "testMatch": [
    "**/__tests__/**/*.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  "collectCoverageFrom": [
    "server.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/dist/**"
  ],
  "coverageThresholds": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 85,
      "statements": 85
    }
  },
  "testTimeout": 30000,
  "verbose": true,
  "forceExit": true,
  "detectOpenHandles": true,
  "maxWorkers": 1,
  "setupFilesAfterEnv": [
    "<rootDir>/jest.setup.ts"
  ],
  "globalSetup": "<rootDir>/jest.globalSetup.ts",
  "globalTeardown": "<rootDir>/jest.globalTeardown.ts",
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1"
  },
  "testPathIgnorePatterns": [
    "/node_modules/",
    "/dist/"
  ],
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "/dist/",
    "jest.config.js",
    "jest.setup.ts"
  ]
};