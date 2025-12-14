const nextJest = require('next/jest')

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  dir: './',
})

// Configuration specifically for integration tests
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Only run integration tests
  testMatch: [
    '<rootDir>/src/__tests__/integration/**/*.{js,jsx,ts,tsx}',
  ],

  // Don't ignore integration tests in this config
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/__tests__/helpers/',
    'testSequencer.js',
  ],

  // Module name mapping for Next.js imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^.+\\.(svg|css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Longer timeout for integration tests (database operations)
  testTimeout: 30000,

  // Run tests serially to avoid database state conflicts
  maxWorkers: 1,

  // Run test files in a specific order for predictable cleanup
  testSequencer: '<rootDir>/src/__tests__/integration/testSequencer.js',
}

module.exports = createJestConfig(config)
