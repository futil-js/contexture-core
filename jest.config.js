// https://jestjs.io/docs/configuration
export default {
  testMatch: ['<rootDir>/src/**/*.test.js'],
  transform: {
    '^.+\\.js?$': ['esbuild-jest', { sourcemap: true, target: 'es2022' }],
  },
  coverageProvider: 'v8',
  coverageReporters: ['clover'],
  collectCoverageFrom: ['src/**/*.js'],
}
