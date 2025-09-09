/**
 * Performance & Load Testing
 * Tests for system performance under various load conditions
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('Performance & Load Testing', () => {
  let testUsers: TestUser[] = [];
  let performanceUser: TestUser;

  beforeAll(async () => {
    // Create multiple test users for load testing
    performanceUser = await testUtils.createUserWithBalance({
      email: 'performance-test@emapay.test',
      metadata: { purpose: 'Performance Testing' },
      balances: {
        EUR: { available: 10000.00, reserved: 0 },
        AOA: { available: 5000000.00, reserved: 0 }
      }
    });

    // Create additional users for concurrent testing
    for (let i = 0; i < 10; i++) {
      const user = await testUtils.createUserWithBalance({
        email: `load-test-${i}@emapay.test`,
        metadata: { purpose: `Load Testing User ${i}` },
        balances: {
          EUR: { available: 1000.00, reserved: 0 },
          AOA: { available: 500000.00, reserved: 0 }
        }
      });
      testUsers.push(user);
    }
  });

  afterAll(async () => {
    await testUtils.cleanup();
  });

  describe('Concurrent User Load Testing', () => {
    test('should handle 50 concurrent authentication requests', async () => {
      const startTime = Date.now();
      
      const promises = Array(50).fill(null).map(() =>
        testUtils.get('/api/v1/auth/me', performanceUser)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 200);
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 requests
      
      console.log(`✓ 50 concurrent auth requests completed in ${totalTime}ms`);
    });

    test('should handle 30 concurrent wallet balance requests', async () => {
      const startTime = Date.now();
      
      const promises = Array(30).fill(null).map(() =>
        testUtils.get('/api/v1/wallets/balance', performanceUser)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 100);
      });

      expect(totalTime).toBeLessThan(3000); // 3 seconds for 30 requests
      
      console.log(`✓ 30 concurrent wallet requests completed in ${totalTime}ms`);
    });

    test('should handle 20 concurrent user search requests', async () => {
      const startTime = Date.now();
      
      const promises = Array(20).fill(null).map((_, index) =>
        testUtils.get(`/api/v1/users/search?q=load-test-${index % 10}`, performanceUser)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 300);
      });

      expect(totalTime).toBeLessThan(4000); // 4 seconds for 20 requests
      
      console.log(`✓ 20 concurrent search requests completed in ${totalTime}ms`);
    });

    test('should handle 10 concurrent transfer operations', async () => {
      const startTime = Date.now();
      
      const promises = Array(10).fill(null).map((_, index) => {
        const transferData = testUtils.generateTransferData(
          testUsers[index % testUsers.length].id,
          'EUR',
          10.00,
          `Load test transfer ${index}`
        );
        
        return testUtils.post('/api/v1/transfers/send', transferData, performanceUser);
      });

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Some transfers might fail due to balance constraints, that's acceptable
      const successful = responses.filter(r => r.status === 201);
      const failed = responses.filter(r => r.status >= 400);

      expect(successful.length).toBeGreaterThan(0);
      expect(successful.length + failed.length).toBe(10);

      successful.forEach(response => {
        testUtils.assertResponseTime(response, 800);
      });

      expect(totalTime).toBeLessThan(8000); // 8 seconds for 10 transfers
      
      console.log(`✓ 10 concurrent transfers: ${successful.length} successful, ${failed.length} failed in ${totalTime}ms`);
    });

    test('should handle mixed concurrent operations', async () => {
      const startTime = Date.now();
      const promises = [];

      // Mix different types of operations
      for (let i = 0; i < 5; i++) {
        promises.push(testUtils.get('/api/v1/auth/me', testUsers[i]));
        promises.push(testUtils.get('/api/v1/wallets/balance', testUsers[i]));
        promises.push(testUtils.get('/api/v1/transfers/history', testUsers[i]));
        promises.push(testUtils.get('/api/v1/users/search?q=test', testUsers[i]));
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect([200, 400]).toContain(response.status);
        testUtils.assertResponseTime(response, 500);
      });

      expect(totalTime).toBeLessThan(6000); // 6 seconds for 20 mixed requests
      
      console.log(`✓ 20 mixed concurrent operations completed in ${totalTime}ms`);
    });
  });

  describe('Database Performance Testing', () => {
    test('should maintain query performance under load', async () => {
      const queryTimes = [];
      
      // Execute multiple database-heavy operations
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        
        const response = await testUtils.get('/api/v1/transfers/history?limit=50', performanceUser);
        
        const queryTime = Date.now() - start;
        queryTimes.push(queryTime);
        
        testUtils.assertSuccessResponse(response, 200);
      }

      // Calculate statistics
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxQueryTime = Math.max(...queryTimes);
      const minQueryTime = Math.min(...queryTimes);

      expect(avgQueryTime).toBeLessThan(200); // Average under 200ms
      expect(maxQueryTime).toBeLessThan(500); // Max under 500ms
      
      console.log(`✓ Query performance: avg=${avgQueryTime.toFixed(2)}ms, max=${maxQueryTime}ms, min=${minQueryTime}ms`);
    });

    test('should handle connection pooling efficiently', async () => {
      // Simulate high connection usage
      const promises = Array(100).fill(null).map(() =>
        testUtils.get('/api/v1/health/status')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 100);
      });
      
      console.log(`✓ 100 concurrent health checks completed successfully`);
    });

    test('should maintain data consistency under concurrent writes', async () => {
      const initialBalance = await testUtils.get('/api/v1/wallets/EUR', performanceUser);
      const initialAmount = testUtils.assertSuccessResponse(initialBalance, 200).balance;

      // Perform multiple small transfers concurrently
      const transferPromises = Array(5).fill(null).map((_, index) => {
        const transferData = testUtils.generateTransferData(
          testUsers[0].id,
          'EUR',
          1.00,
          `Consistency test ${index}`
        );
        
        return testUtils.post('/api/v1/transfers/send', transferData, performanceUser);
      });

      const transferResponses = await Promise.all(transferPromises);
      const successfulTransfers = transferResponses.filter(r => r.status === 201);

      // Check final balance
      const finalBalance = await testUtils.get('/api/v1/wallets/EUR', performanceUser);
      const finalAmount = testUtils.assertSuccessResponse(finalBalance, 200).balance;

      // Balance should be reduced by exactly the number of successful transfers
      const expectedAmount = initialAmount - (successfulTransfers.length * 1.00);
      expect(finalAmount).toBeCloseTo(expectedAmount, 2);
      
      console.log(`✓ Data consistency maintained: ${successfulTransfers.length} transfers processed correctly`);
    });
  });

  describe('Response Time Consistency', () => {
    test('should maintain consistent response times for authentication', async () => {
      const responseTimes = [];
      
      for (let i = 0; i < 50; i++) {
        const start = Date.now();
        const response = await testUtils.get('/api/v1/auth/me', performanceUser);
        const responseTime = Date.now() - start;
        
        responseTimes.push(responseTime);
        testUtils.assertSuccessResponse(response, 200);
      }

      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      const variance = maxTime - minTime;

      expect(avgTime).toBeLessThan(100);
      expect(variance).toBeLessThan(200); // Response time variance should be reasonable
      
      console.log(`✓ Auth response times: avg=${avgTime.toFixed(2)}ms, variance=${variance}ms`);
    });

    test('should maintain consistent response times for wallet operations', async () => {
      const responseTimes = [];
      
      for (let i = 0; i < 30; i++) {
        const start = Date.now();
        const response = await testUtils.get('/api/v1/wallets/balance', performanceUser);
        const responseTime = Date.now() - start;
        
        responseTimes.push(responseTime);
        testUtils.assertSuccessResponse(response, 200);
      }

      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const variance = maxTime - Math.min(...responseTimes);

      expect(avgTime).toBeLessThan(50);
      expect(variance).toBeLessThan(100);
      
      console.log(`✓ Wallet response times: avg=${avgTime.toFixed(2)}ms, variance=${variance}ms`);
    });

    test('should handle burst traffic gracefully', async () => {
      // Simulate burst traffic pattern
      const burstSizes = [10, 20, 30, 20, 10];
      const results = [];

      for (const burstSize of burstSizes) {
        const startTime = Date.now();
        
        const promises = Array(burstSize).fill(null).map(() =>
          testUtils.get('/api/v1/health/status')
        );

        const responses = await Promise.all(promises);
        const burstTime = Date.now() - startTime;

        responses.forEach(response => {
          testUtils.assertSuccessResponse(response, 200);
        });

        results.push({
          size: burstSize,
          time: burstTime,
          avgPerRequest: burstTime / burstSize
        });

        // Small delay between bursts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // All bursts should complete in reasonable time
      results.forEach(result => {
        expect(result.avgPerRequest).toBeLessThan(100);
      });
      
      console.log(`✓ Burst traffic handled: ${results.map(r => `${r.size}req/${r.time}ms`).join(', ')}`);
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not leak memory during extended operations', async () => {
      // Simulate extended usage pattern
      const iterations = 100;
      const memoryUsage = [];

      for (let i = 0; i < iterations; i++) {
        // Perform various operations
        await testUtils.get('/api/v1/auth/me', performanceUser);
        await testUtils.get('/api/v1/wallets/balance', performanceUser);
        
        // Sample memory usage periodically
        if (i % 20 === 0) {
          const usage = process.memoryUsage();
          memoryUsage.push(usage.heapUsed);
        }
      }

      // Memory usage should not grow significantly
      if (memoryUsage.length > 2) {
        const initialMemory = memoryUsage[0];
        const finalMemory = memoryUsage[memoryUsage.length - 1];
        const memoryGrowth = (finalMemory - initialMemory) / initialMemory;

        // Allow some memory growth but not excessive
        expect(memoryGrowth).toBeLessThan(0.5); // Less than 50% growth
      }
      
      console.log(`✓ Memory usage stable over ${iterations} operations`);
    });

    test('should handle resource cleanup properly', async () => {
      // Create and cleanup multiple users rapidly
      const cleanupUsers = [];
      
      for (let i = 0; i < 10; i++) {
        const user = await testUtils.createUser({
          email: `cleanup-test-${i}@emapay.test`,
          metadata: { purpose: 'Cleanup Testing' }
        });
        cleanupUsers.push(user);
      }

      // Perform operations with these users
      const promises = cleanupUsers.map(user =>
        testUtils.get('/api/v1/auth/me', user)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
      });

      // Cleanup should work without issues
      await testUtils.cleanup();
      
      console.log(`✓ Resource cleanup handled properly for ${cleanupUsers.length} users`);
    });
  });

  describe('System Recovery Testing', () => {
    test('should recover gracefully from overload conditions', async () => {
      // Simulate overload with many concurrent requests
      const overloadPromises = Array(200).fill(null).map(() =>
        testUtils.get('/api/v1/health/status')
      );

      const overloadResponses = await Promise.all(overloadPromises);
      
      // Some requests might fail under overload, that's acceptable
      const successful = overloadResponses.filter(r => r.status === 200);
      const failed = overloadResponses.filter(r => r.status >= 400);

      // At least 80% should succeed
      const successRate = successful.length / overloadResponses.length;
      expect(successRate).toBeGreaterThan(0.8);

      // System should still respond after overload
      const recoveryResponse = await testUtils.get('/api/v1/health/status');
      testUtils.assertSuccessResponse(recoveryResponse, 200);
      
      console.log(`✓ System recovery: ${successRate * 100}% success rate under overload`);
    });

    test('should maintain service during high error rates', async () => {
      // Generate mix of valid and invalid requests
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        if (i % 3 === 0) {
          // Invalid request (should fail)
          promises.push(testUtils.get('/api/v1/invalid/endpoint', performanceUser));
        } else {
          // Valid request (should succeed)
          promises.push(testUtils.get('/api/v1/health/status'));
        }
      }

      const responses = await Promise.all(promises);
      
      const validRequests = responses.filter((_, index) => index % 3 !== 0);
      const invalidRequests = responses.filter((_, index) => index % 3 === 0);

      // Valid requests should mostly succeed
      const validSuccessRate = validRequests.filter(r => r.status === 200).length / validRequests.length;
      expect(validSuccessRate).toBeGreaterThan(0.9);

      // Invalid requests should fail appropriately
      const invalidFailureRate = invalidRequests.filter(r => r.status >= 400).length / invalidRequests.length;
      expect(invalidFailureRate).toBeGreaterThan(0.8);
      
      console.log(`✓ Service maintained: ${validSuccessRate * 100}% valid success, ${invalidFailureRate * 100}% invalid failure`);
    });
  });
});
