// https://jestjs.io/docs/configuration
export default {
  testMatch: ['<rootDir>/src/**/*.test.js'],
  coverageReporters: ['clover'],
  collectCoverageFrom: ['src/**/*.js'],
}
