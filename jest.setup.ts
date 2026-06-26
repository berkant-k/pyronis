import '@testing-library/jest-dom'
import { server } from './src/__tests__/mocks/server'

// Suppress act() warnings from TanStack Query background updates in component tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return
    originalConsoleError(...args)
  }
  server.listen({ onUnhandledRequest: 'warn' })
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  console.error = originalConsoleError
  server.close()
})

// Prevent localStorage leaking between tests (only available in jsdom environment)
beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
})
