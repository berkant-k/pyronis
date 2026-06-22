import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  // node is the default: unit tests don't need DOM and msw/node works natively in Node.js.
  // Component tests that need the DOM add /** @jest-environment jsdom */ at the top of the file.
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/lib/fhir/**/*.ts',
    'src/components/**/*.tsx',
    '!src/**/*.d.ts',
  ],
}

export default createJestConfig(config)
