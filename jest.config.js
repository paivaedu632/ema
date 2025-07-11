/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.js'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'tests/database/**/*.ts',
    '!tests/**/*.d.ts',
    '!tests/**/setup.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/database/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  projects: [
    {
      displayName: 'Database Functions',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/database/functions/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/database/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      }
    },
    {
      displayName: 'Order Book Integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/database/orderbook/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/database/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      }
    },
    {
      displayName: 'Performance Tests',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/database/performance/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/database/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      }
    }
  ]
};
