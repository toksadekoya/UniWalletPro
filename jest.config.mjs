// jest.config.mjs
export default {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  transform: {},

  collectCoverage: true,
  collectCoverageFrom: ["src/js/**/*.js"],
  coverageDirectory: "coverage",

  reporters: [
    "default",
    ["jest-junit", { outputDirectory: "coverage", outputName: "junit.xml" }]
  ],

  moduleNameMapper: {
    "\\.(css|scss)$": "<rootDir>/__mocks__/styleStub.js",
    "\\.(png|jpe?g|svg)$": "<rootDir>/__mocks__/fileStub.js"
  },

  coverageThreshold: {
    global: { statements: 96, branches: 94, functions: 98, lines: 95 }
  }
};