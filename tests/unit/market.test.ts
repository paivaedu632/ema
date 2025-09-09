/**
 * Market Data Endpoint Tests
 * Tests for /api/v1/market/* endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('Market Data Endpoints', () => {
  let testUser: TestUser;

  beforeAll(async () => {
    // Create a test user for authenticated tests (if needed)
    testUser = await testUtils.createUser({
      email: 'market-test@emapay.test',
      metadata: { purpose: 'Market Data Testing' }
    });
  });

  afterAll(async () => {
    await testUtils.cleanup();
  });

  describe('GET /api/v1/market/summary - Market Statistics', () => {
    test('should return market summary without authentication', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary');
      
      const summary = testUtils.assertSuccessResponse(response, 200);
      
      // Verify market summary structure
      expect(summary).toHaveProperty('pairs');
      expect(Array.isArray(summary.pairs)).toBe(true);
      
      // Check EUR/AOA pair data
      const eurAoaPair = summary.pairs.find((pair: any) => pair.symbol === 'EUR/AOA');
      if (eurAoaPair) {
        testUtils.assertValidMarketPair(eurAoaPair);
        expect(eurAoaPair.symbol).toBe('EUR/AOA');
        expect(eurAoaPair).toHaveProperty('lastPrice');
        expect(eurAoaPair).toHaveProperty('volume24h');
        expect(eurAoaPair).toHaveProperty('change24h');
        expect(eurAoaPair).toHaveProperty('high24h');
        expect(eurAoaPair).toHaveProperty('low24h');
        expect(eurAoaPair).toHaveProperty('bid');
        expect(eurAoaPair).toHaveProperty('ask');
        
        // Validate numeric values
        expect(typeof eurAoaPair.lastPrice).toBe('number');
        expect(typeof eurAoaPair.volume24h).toBe('number');
        expect(typeof eurAoaPair.change24h).toBe('number');
        expect(eurAoaPair.lastPrice).toBeGreaterThan(0);
        expect(eurAoaPair.volume24h).toBeGreaterThanOrEqual(0);
      }
      
      testUtils.assertResponseTime(response, 150);
    });

    test('should return consistent data structure', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary');
      
      const summary = testUtils.assertSuccessResponse(response, 200);
      
      expect(summary).toHaveProperty('timestamp');
      expect(summary).toHaveProperty('pairs');
      expect(typeof summary.timestamp).toBe('string');
      expect(new Date(summary.timestamp)).toBeValidDate();
      
      // Each pair should have consistent structure
      summary.pairs.forEach((pair: any) => {
        testUtils.assertValidMarketPair(pair);
        
        // Required fields
        expect(pair).toHaveProperty('symbol');
        expect(pair).toHaveProperty('lastPrice');
        expect(pair).toHaveProperty('volume24h');
        expect(pair).toHaveProperty('change24h');
        
        // Optional but common fields
        if (pair.bid !== null) {
          expect(typeof pair.bid).toBe('number');
          expect(pair.bid).toBeGreaterThan(0);
        }
        
        if (pair.ask !== null) {
          expect(typeof pair.ask).toBe('number');
          expect(pair.ask).toBeGreaterThan(0);
        }
        
        // Bid should be less than ask (if both exist)
        if (pair.bid && pair.ask) {
          expect(pair.bid).toBeLessThan(pair.ask);
        }
      });
    });

    test('should include all supported trading pairs', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary');
      
      const summary = testUtils.assertSuccessResponse(response, 200);
      
      const symbols = summary.pairs.map((pair: any) => pair.symbol);
      
      // Should include EUR/AOA pair
      expect(symbols).toContain('EUR/AOA');
      
      // All symbols should follow correct format
      symbols.forEach((symbol: string) => {
        expect(symbol).toMatch(/^[A-Z]{3}\/[A-Z]{3}$/);
      });
    });

    test('should handle query parameters for specific pairs', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary?pair=EUR/AOA');
      
      const summary = testUtils.assertSuccessResponse(response, 200);
      
      if (summary.pairs.length > 0) {
        summary.pairs.forEach((pair: any) => {
          expect(pair.symbol).toBe('EUR/AOA');
        });
      }
    });

    test('should return empty or error for invalid pairs', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary?pair=INVALID/PAIR');
      
      if (response.status === 200) {
        const summary = testUtils.assertSuccessResponse(response, 200);
        expect(summary.pairs).toHaveLength(0);
      } else {
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('pair');
      }
    });

    test('should work with authentication (optional)', async () => {
      const response = await testUtils.get('/api/v1/market/summary', testUser);
      
      const summary = testUtils.assertSuccessResponse(response, 200);
      
      expect(summary).toHaveProperty('pairs');
      expect(Array.isArray(summary.pairs)).toBe(true);
    });

    test('should maintain performance under load', async () => {
      const promises = Array(10).fill(null).map(() => 
        testUtils.publicGet('/api/v1/market/summary')
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 200);
      });
    });
  });

  describe('GET /api/v1/market/depth - Order Book', () => {
    test('should return order book depth without authentication', async () => {
      const response = await testUtils.publicGet('/api/v1/market/depth?pair=EUR/AOA');
      
      const depth = testUtils.assertSuccessResponse(response, 200);
      
      // Verify order book structure
      expect(depth).toHaveProperty('pair');
      expect(depth).toHaveProperty('bids');
      expect(depth).toHaveProperty('asks');
      expect(depth).toHaveProperty('timestamp');
      
      expect(depth.pair).toBe('EUR/AOA');
      expect(Array.isArray(depth.bids)).toBe(true);
      expect(Array.isArray(depth.asks)).toBe(true);
      expect(new Date(depth.timestamp)).toBeValidDate();
      
      testUtils.assertResponseTime(response, 150);
    });

    test('should return properly formatted bid/ask data', async () => {
      const response = await testUtils.publicGet('/api/v1/market/depth?pair=EUR/AOA');
      
      const depth = testUtils.assertSuccessResponse(response, 200);
      
      // Check bids format [price, quantity]
      depth.bids.forEach((bid: any) => {
        expect(Array.isArray(bid)).toBe(true);
        expect(bid).toHaveLength(2);
        expect(typeof bid[0]).toBe('number'); // price
        expect(typeof bid[1]).toBe('number'); // quantity
        expect(bid[0]).toBeGreaterThan(0);
        expect(bid[1]).toBeGreaterThan(0);
        testUtils.assertDecimalPrecision(bid[0], 2); // price precision
        testUtils.assertDecimalPrecision(bid[1], 2); // quantity precision
      });
      
      // Check asks format [price, quantity]
      depth.asks.forEach((ask: any) => {
        expect(Array.isArray(ask)).toBe(true);
        expect(ask).toHaveLength(2);
        expect(typeof ask[0]).toBe('number'); // price
        expect(typeof ask[1]).toBe('number'); // quantity
        expect(ask[0]).toBeGreaterThan(0);
        expect(ask[1]).toBeGreaterThan(0);
        testUtils.assertDecimalPrecision(ask[0], 2);
        testUtils.assertDecimalPrecision(ask[1], 2);
      });
    });

    test('should sort bids and asks correctly', async () => {
      const response = await testUtils.publicGet('/api/v1/market/depth?pair=EUR/AOA');
      
      const depth = testUtils.assertSuccessResponse(response, 200);
      
      // Bids should be sorted by price descending (highest first)
      if (depth.bids.length > 1) {
        for (let i = 0; i < depth.bids.length - 1; i++) {
          expect(depth.bids[i][0]).toBeGreaterThanOrEqual(depth.bids[i + 1][0]);
        }
      }
      
      // Asks should be sorted by price ascending (lowest first)
      if (depth.asks.length > 1) {
        for (let i = 0; i < depth.asks.length - 1; i++) {
          expect(depth.asks[i][0]).toBeLessThanOrEqual(depth.asks[i + 1][0]);
        }
      }
      
      // Best bid should be less than best ask (if both exist)
      if (depth.bids.length > 0 && depth.asks.length > 0) {
        const bestBid = depth.bids[0][0];
        const bestAsk = depth.asks[0][0];
        expect(bestBid).toBeLessThan(bestAsk);
      }
    });

    test('should support depth limit parameter', async () => {
      const response = await testUtils.publicGet('/api/v1/market/depth?pair=EUR/AOA&limit=5');
      
      const depth = testUtils.assertSuccessResponse(response, 200);
      
      expect(depth.bids.length).toBeLessThanOrEqual(5);
      expect(depth.asks.length).toBeLessThanOrEqual(5);
    });

    test('should require trading pair parameter', async () => {
      const response = await testUtils.publicGet('/api/v1/market/depth');
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('pair');
    });

    test('should validate trading pair format', async () => {
      const invalidPairs = ['EUR-AOA', 'EUROA', 'EUR/AOA/USD', 'INVALID'];
      
      for (const pair of invalidPairs) {
        const response = await testUtils.publicGet(`/api/v1/market/depth?pair=${pair}`);
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('pair');
      }
    });

    test('should handle non-existent trading pairs', async () => {
      const response = await testUtils.publicGet('/api/v1/market/depth?pair=USD/GBP');
      
      if (response.status === 200) {
        const depth = testUtils.assertSuccessResponse(response, 200);
        expect(depth.bids).toHaveLength(0);
        expect(depth.asks).toHaveLength(0);
      } else {
        testUtils.assertErrorResponse(response, 404);
        expect(response.body.error).toContain(['pair', 'not found']);
      }
    });

    test('should work with authentication (optional)', async () => {
      const response = await testUtils.get('/api/v1/market/depth?pair=EUR/AOA', testUser);
      
      const depth = testUtils.assertSuccessResponse(response, 200);
      
      expect(depth).toHaveProperty('pair');
      expect(depth).toHaveProperty('bids');
      expect(depth).toHaveProperty('asks');
    });
  });

  describe('Market Data Edge Cases', () => {
    test('should handle empty order book gracefully', async () => {
      // This might happen for new or inactive pairs
      const response = await testUtils.publicGet('/api/v1/market/depth?pair=EUR/AOA');
      
      const depth = testUtils.assertSuccessResponse(response, 200);
      
      // Empty order book should still have proper structure
      expect(depth).toHaveProperty('pair');
      expect(depth).toHaveProperty('bids');
      expect(depth).toHaveProperty('asks');
      expect(Array.isArray(depth.bids)).toBe(true);
      expect(Array.isArray(depth.asks)).toBe(true);
    });

    test('should handle market summary with no trades', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary');
      
      const summary = testUtils.assertSuccessResponse(response, 200);
      
      // Should still return structure even with no recent trades
      expect(summary).toHaveProperty('pairs');
      expect(Array.isArray(summary.pairs)).toBe(true);
      
      summary.pairs.forEach((pair: any) => {
        // Volume might be 0 for inactive pairs
        expect(pair.volume24h).toBeGreaterThanOrEqual(0);
        
        // Price should still be valid (last known price)
        if (pair.lastPrice !== null) {
          expect(pair.lastPrice).toBeGreaterThan(0);
        }
      });
    });

    test('should handle invalid limit parameters', async () => {
      const invalidLimits = [-1, 0, 1001, 'invalid', ''];
      
      for (const limit of invalidLimits) {
        const response = await testUtils.publicGet(`/api/v1/market/depth?pair=EUR/AOA&limit=${limit}`);
        
        if (response.status === 400) {
          testUtils.assertErrorResponse(response, 400);
          expect(response.body.error).toContain('limit');
        } else {
          // Some invalid limits might be ignored and use defaults
          testUtils.assertSuccessResponse(response, 200);
        }
      }
    });

    test('should handle concurrent requests efficiently', async () => {
      const promises = Array(20).fill(null).map(() => 
        testUtils.publicGet('/api/v1/market/summary')
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 200);
      });
    });
  });

  describe('Market Data Performance', () => {
    test('should respond quickly for market summary', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/market/summary',
        150
      );
      
      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should respond quickly for order book depth', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/market/depth?pair=EUR/AOA',
        150
      );
      
      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should maintain performance with large order books', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/market/depth?pair=EUR/AOA&limit=100',
        200
      );
      
      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should handle burst requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array(50).fill(null).map(() => 
        testUtils.publicGet('/api/v1/market/summary')
      );
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 requests
      
      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
      });
    });
  });
});
