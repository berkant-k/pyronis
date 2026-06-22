import '@testing-library/jest-dom'
import { server } from './src/__tests__/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Prevent localStorage leaking between tests (only available in jsdom environment)
beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
})
