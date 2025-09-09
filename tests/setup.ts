/**
 * Jest setup file
 * Runs after the test framework is set up but before tests run
 */

import { jest } from '@jest/globals';

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeValidCurrency(received: string) {
    const validCurrencies = ['EUR', 'AOA'];
    const pass = validCurrencies.includes(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid currency`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid currency (EUR or AOA)`,
        pass: false,
      };
    }
  },
  
  toBeValidAmount(received: number) {
    const pass = typeof received === 'number' && received >= 0 && Number.isFinite(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid amount`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid amount (positive number)`,
        pass: false,
      };
    }
  },
  
  toHaveResponseTime(received: number, expected: number) {
    const pass = received <= expected;
    
    if (pass) {
      return {
        message: () => `expected response time ${received}ms to be greater than ${expected}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response time ${received}ms to be less than or equal to ${expected}ms`,
        pass: false,
      };
    }
  }
});

// Global test configuration
jest.setTimeout(30000); // 30 second timeout for all tests

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn in tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  // Helper to wait for a specific amount of time
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate random test data
  randomString: (length: number = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Helper to generate random email
  randomEmail: () => {
    const username = global.testUtils.randomString(8);
    const domain = global.testUtils.randomString(6);
    return `${username}@${domain}.test`;
  },
  
  // Helper to generate random amount
  randomAmount: (min: number = 1, max: number = 1000) => {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }
};

console.log('🧪 Jest setup completed');

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidCurrency(): R;
      toBeValidAmount(): R;
      toHaveResponseTime(expected: number): R;
    }
  }
  
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    randomString: (length?: number) => string;
    randomEmail: () => string;
    randomAmount: (min?: number, max?: number) => number;
  };
}
