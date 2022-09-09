/* eslint-env node */

/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  testMatch: ['<rootDir>/test/**/*.test.js'],
  coverageReporters: ['clover'],
  collectCoverageFrom: ['src/**/*.js'],
}
