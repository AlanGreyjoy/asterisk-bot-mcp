module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'], // Include src for future unit tests of services etc.
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/?(*.)+(spec|test).ts', // Also allow test files directly in src for co-location if desired
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8', // or "babel"
  coverageReporters: ['json', 'text', 'lcov', 'clover'],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
}
