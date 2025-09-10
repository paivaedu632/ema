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

      const data = testUtils.assertSuccessResponse(response, 200);

      // Verify market summary structure - API returns single pair object, not array
      expect(data).toHaveProperty('pair');
      expect(data).toHaveProperty('baseCurrency');
      expect(data).toHaveProperty('quoteCurrency');
      expect(data).toHaveProperty('currentPrice');
      expect(data).toHaveProperty('bestBid');
      expect(data).toHaveProperty('bestAsk');
      expect(data).toHaveProperty('volume24h');
      expect(data).toHaveProperty('high24h');
      expect(data).toHaveProperty('low24h');
      expect(data).toHaveProperty('change24h');
      expect(data).toHaveProperty('changePercent24h');
      expect(data).toHaveProperty('tradeCount24h');
      expect(data).toHaveProperty('lastUpdated');
      expect(data).toHaveProperty('status');

      // Check EUR/AOA pair data
      expect(data.pair).toBe('EUR/AOA');
      expect(data.baseCurrency).toBe('EUR');
      expect(data.quoteCurrency).toBe('AOA');

      // Validate numeric values
      expect(typeof data.currentPrice).toBe('number');
      expect(typeof data.volume24h).toBe('number');
      expect(typeof data.change24h).toBe('number');
      expect(data.currentPrice).toBeGreaterThan(0);
      expect(data.volume24h).toBeGreaterThanOrEqual(0);

      testUtils.assertResponseTime(response, 150);
    });

    test('should return consistent data structure', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary');

      const data = testUtils.assertSuccessResponse(response, 200);

      expect(data).toHaveProperty('lastUpdated');
      expect(typeof data.lastUpdated).toBe('string');
      expect(new Date(data.lastUpdated).getTime()).not.toBeNaN();

      // Validate all required fields
      expect(data).toHaveProperty('pair');
      expect(data).toHaveProperty('currentPrice');
      expect(data).toHaveProperty('volume24h');
      expect(data).toHaveProperty('change24h');

      // Validate bid/ask fields
      if (data.bestBid !== null) {
        expect(typeof data.bestBid).toBe('number');
        expect(data.bestBid).toBeGreaterThan(0);
      }

      if (data.bestAsk !== null) {
        expect(typeof data.bestAsk).toBe('number');
        expect(data.bestAsk).toBeGreaterThan(0);
      }

      // Bid should be less than ask (if both exist)
      if (data.bestBid && data.bestAsk) {
        expect(data.bestBid).toBeLessThan(data.bestAsk);
      }

      // Validate status
      expect(data.status).toBe('active');
    });

    test('should include all supported trading pairs', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary');
      
      const summary = testUtils.assertSuccessResponse(response, 200);
      
      // API returns single pair object, not array
      expect(summary).toHaveProperty('pair');
      expect(summary.pair).toBe('EUR/AOA');
      expect(summary.pair).toMatch(/^[A-Z]{3}\/[A-Z]{3}$/);
    });

    test('should handle query parameters for specific pairs', async () => {
      const response = await testUtils.publicGet('/api/v1/market/summary?pair=EUR/AOA');
      
      const summary = testUtils.assertSuccessResponse(response, 200);
      
      // API returns single pair object
      expect(summary).toHaveProperty('pair');
      expect(summary.pair).toBe('EUR/AOA');
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
      const response = await testUtils.publicGet('/api/v1/market/depth?baseCurrency=EUR&quoteCurrency=AOA');

      const data = testUtils.assertSuccessResponse(response, 200);

      // Verify order book structure
      expect(data).toHaveProperty('pair');
      expect(data).toHaveProperty('baseCurrency');
      expect(data).toHaveProperty('quoteCurrency');
      expect(data).toHaveProperty('bids');
      expect(data).toHaveProperty('asks');
      expect(data).toHaveProperty('spread');
      expect(data).toHaveProperty('lastUpdated');
      expect(data).toHaveProperty('levels');

      expect(data.pair).toBe('EUR/AOA');
      expect(data.baseCurrency).toBe('EUR');
      expect(data.quoteCurrency).toBe('AOA');
      expect(Array.isArray(data.bids)).toBe(true);
      expect(Array.isArray(data.asks)).toBe(true);
      expect(new Date(data.lastUpdated).getTime()).not.toBeNaN();

      testUtils.assertResponseTime(response, 150);
    });

    test('should return properly formatted bid/ask data', async () => {
      const response = await testUtils.publicGet('/api/v1/market/depth?baseCurrency=EUR&quoteCurrency=AOA');

      const data = testUtils.assertSuccessResponse(response, 200);

      // Check bids format - API returns objects with price, amount, total
      data.bids.forEach((bid: any) => {
        expect(bid).toHaveProperty('price');
        expect(bid).toHaveProperty('amount');
        expect(bid).toHaveProperty('total');
        expect(typeof bid.price).toBe('number');
        expect(typeof bid.amount).toBe('number');
        expect(typeof bid.total).toBe('number');
        expect(bid.price).toBeGreaterThan(0);
        expect(bid.amount).toBeGreaterThan(0);
        expect(bid.total).toBeGreaterThan(0);
        // Verify total calculation
        expect(Math.abs(bid.total - (bid.price * bid.amount))).toBeLessThan(0.01);
      });

      // Check asks format - API returns objects with price, amount, total
      data.asks.forEach((ask: any) => {
        expect(ask).toHaveProperty('price');
        expect(ask).toHaveProperty('amount');
        expect(ask).toHaveProperty('total');
        expect(typeof ask.price).toBe('number');
        expect(typeof ask.amount).toBe('number');
        expect(typeof ask.total).toBe('number');
        expect(ask.price).toBeGreaterThan(0);
        expect(ask.amount).toBeGreaterThan(0);
        expect(ask.total).toBeGreaterThan(0);
        // Verify total calculation
        expect(Math.abs(ask.total - (ask.price * ask.amount))).toBeLessThan(0.01);
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
      const response = await testUtils.publicGet('/api/v1/market/depth?baseCurrency=EUR&quoteCurrency=AOA&levels=5');
      
      const data = testUtils.assertSuccessResponse(response, 200);

      expect(data.bids.length).toBeLessThanOrEqual(5);
      expect(data.asks.length).toBeLessThanOrEqual(5);
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
