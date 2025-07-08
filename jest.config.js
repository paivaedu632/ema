/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'supabase/migrations/**/*.sql',
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
      testMatch: ['<rootDir>/tests/database/functions/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/database/setup.ts']
    },
    {
      displayName: 'Order Book Integration',
      testMatch: ['<rootDir>/tests/database/orderbook/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/database/setup.ts']
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/tests/database/performance/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/database/setup.ts']
    }
  ]
};
