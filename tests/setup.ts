/**
 * Jest Setup File
 * Configures global test environment and utilities
 */

import { createClient } from '@supabase/supabase-js'

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      }
    }
  },
  
  toBeValidTimestamp(received: string) {
    const date = new Date(received)
    const pass = !isNaN(date.getTime()) && received.includes('T') && received.includes('Z')
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO timestamp`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO timestamp`,
        pass: false,
      }
    }
  },
  
  toHaveValidApiResponse(received: any) {
    const hasSuccess = typeof received.success === 'boolean'
    const hasData = received.success ? received.data !== undefined : true
    const hasMessage = typeof received.message === 'string'
    const hasError = !received.success ? typeof received.error === 'string' : true
    
    const pass = hasSuccess && hasData && hasMessage && hasError
    
    if (pass) {
      return {
        message: () => `expected response not to have valid API structure`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected response to have valid API structure with success, data/error, and message fields`,
        pass: false,
      }
    }
  }
})

// Global test configuration
global.testConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  testTimeout: 30000,
}

// Console log suppression for cleaner test output
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('React')) {
      return
    }
    originalConsoleError(...args)
  }
  
  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('React')) {
      return
    }
    originalConsoleWarn(...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R
      toBeValidTimestamp(): R
      toHaveValidApiResponse(): R
    }
  }
  
  var testConfig: {
    apiUrl: string
    supabaseUrl: string
    supabaseAnonKey: string
    testTimeout: number
  }
}
