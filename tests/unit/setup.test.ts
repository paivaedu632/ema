/**
 * Setup Test
 * Verifies that the test environment is properly configured
 */

import { describe, test, expect } from '@jest/globals';

describe('Test Environment Setup', () => {
  test('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('should have Supabase configuration', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
  });

  test('should have custom matchers available', () => {
    expect('test@example.com').toBeValidEmail();
    expect('EUR').toBeValidCurrency();
    expect(100.50).toBeValidAmount();
  });

  test('should have test utilities available', () => {
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.randomString).toBeInstanceOf(Function);
    expect(global.testUtils.randomEmail).toBeInstanceOf(Function);
    expect(global.testUtils.randomAmount).toBeInstanceOf(Function);
  });

  test('should generate random test data', () => {
    const randomString = global.testUtils.randomString(10);
    expect(randomString).toHaveLength(10);
    expect(typeof randomString).toBe('string');

    const randomEmail = global.testUtils.randomEmail();
    expect(randomEmail).toBeValidEmail();

    const randomAmount = global.testUtils.randomAmount(1, 100);
    expect(randomAmount).toBeValidAmount();
    expect(randomAmount).toBeGreaterThanOrEqual(1);
    expect(randomAmount).toBeLessThanOrEqual(100);
  });
});
