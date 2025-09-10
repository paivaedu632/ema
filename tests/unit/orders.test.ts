/**
 * Trading Orders Endpoint Tests
 * Tests for /api/v1/orders/* endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('Trading Orders Endpoints', () => {
  let traderUser: TestUser;
  let userWithBalance: TestUser;
  let recipientUser: TestUser;

  beforeAll(async () => {
    // Create test users for trading
    traderUser = await testUtils.createUserWithBalance({
      email: 'trader@emapay.test',
      metadata: { purpose: 'Trading Testing' },
      balances: {
        EUR: { available: 10000.00, reserved: 0 },
        AOA: { available: 5000000.00, reserved: 0 }
      }
    });

    userWithBalance = await testUtils.createUserWithBalance({
      email: 'trader-balance@emapay.test',
      metadata: { purpose: 'Trading Balance Testing' },
      balances: {
        EUR: { available: 5000.00, reserved: 0 },
        AOA: { available: 2500000.00, reserved: 0 }
      }
    });

    recipientUser = await testUtils.createUser({
      email: 'trader-recipient@emapay.test',
      metadata: { purpose: 'Trading Recipient' }
    });
  });

  afterAll(async () => {
    // Clean up test users
    await testUtils.cleanup();
  });

  describe('POST /api/v1/orders/limit - Limit Orders', () => {
    test('should create EUR/AOA buy limit order', async () => {
      const orderData = {
        side: 'buy' as const,
        amount: 100.00,
        price: 655.00,
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA'
      };

      const response = await testUtils.post(
        '/api/v1/orders/limit',
        orderData,
        traderUser
      );

      const data = testUtils.assertSuccessResponse(response, 200);

      expect(data).toHaveProperty('orderId');
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('orderType');
      expect(data).toHaveProperty('side');
      expect(data).toHaveProperty('baseCurrency');
      expect(data).toHaveProperty('quoteCurrency');
      expect(data).toHaveProperty('amount');
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('createdAt');

      expect(data.userId).toBe(traderUser.id);
      expect(data.orderType).toBe('limit');
      expect(data.side).toBe('buy');
      expect(data.baseCurrency).toBe('EUR');
      expect(data.quoteCurrency).toBe('AOA');
      expect(data.amount).toBe(100.00);
      expect(data.price).toBe(655.00);
      expect(['pending', 'open']).toContain(data.status);

      // Assert response time
      testUtils.assertResponseTime(response, 400);
    });

    test('should create EUR/AOA sell limit order', async () => {
      const orderData = {
        side: 'sell' as const,
        amount: 50.00,
        price: 656.00,
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA'
      };

      const response = await testUtils.post(
        '/api/v1/orders/limit',
        orderData,
        traderUser
      );

      const data = testUtils.assertSuccessResponse(response, 200);

      expect(data).toHaveProperty('orderId');
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('orderType');
      expect(data).toHaveProperty('side');
      expect(data).toHaveProperty('baseCurrency');
      expect(data).toHaveProperty('quoteCurrency');
      expect(data).toHaveProperty('amount');
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('createdAt');

      expect(data.userId).toBe(traderUser.id);
      expect(data.orderType).toBe('limit');
      expect(data.side).toBe('sell');
      expect(data.baseCurrency).toBe('EUR');
      expect(data.quoteCurrency).toBe('AOA');
      expect(data.amount).toBe(50.00);
      expect(data.price).toBe(656.00);
      expect(order.status).toBe('open');
    });

    test('should create order with immediate or cancel (IOC)', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        25.00,
        6550.00,
        'Immediate Or Cancel'
      );

      const response = await testUtils.post(
        '/api/v1/orders/limit',
        orderData,
        traderUser
      );
      
      const order = testUtils.assertSuccessResponse(response, 201);
      
      expect(order.timeInForce).toBe('IOC');
      expect(['open', 'cancelled', 'filled']).toContain(order.status);
    });

    test('should create order with fill or kill (FOK)', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        10.00,
        6500.00,
        'Fill Or Kill'
      );

      const response = await testUtils.post(
        '/api/v1/orders/limit',
        orderData,
        traderUser
      );
      
      const order = testUtils.assertSuccessResponse(response, 201);
      
      expect(order.timeInForce).toBe('FOK');
      expect(['cancelled', 'filled']).toContain(order.status);
    });

    test('should reject order with insufficient balance', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        20000.00, // More than available balance
        6500.00,
        'Good Till Cancelled'
      );

      const response = await testUtils.post(
        '/api/v1/orders/limit',
        orderData,
        traderUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('insufficient');
    });

    test('should reject order with invalid trading pair', async () => {
      const invalidPairs = ['USD/EUR', 'BTC/AOA', 'EUR/USD', 'INVALID/PAIR'];

      for (const pair of invalidPairs) {
        const orderData = testUtils.generateLimitOrderData(
          pair,
          'buy',
          100.00,
          6500.00,
          'Good Till Cancelled'
        );

        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['pair', 'invalid']);
      }
    });

    test('should reject order with invalid side', async () => {
      const invalidSides = ['long', 'short', 'invalid', ''];

      for (const side of invalidSides) {
        const orderData = testUtils.generateLimitOrderData(
          'EUR/AOA',
          side,
          100.00,
          6500.00,
          'Good Till Cancelled'
        );

        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('side');
      }
    });

    test('should reject order with invalid amount', async () => {
      const invalidAmounts = [0, -10, 0.001, 999999999];

      for (const amount of invalidAmounts) {
        const orderData = testUtils.generateLimitOrderData(
          'EUR/AOA',
          'buy',
          amount,
          6500.00,
          'Good Till Cancelled'
        );

        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('amount');
      }
    });

    test('should reject order with invalid price', async () => {
      const invalidPrices = [0, -100, 0.001, 999999999];

      for (const price of invalidPrices) {
        const orderData = testUtils.generateLimitOrderData(
          'EUR/AOA',
          'buy',
          100.00,
          price,
          'Good Till Cancelled'
        );

        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('price');
      }
    });

    test('should handle decimal precision correctly', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        123.45, // 2 decimal places
        6543.21, // 2 decimal places
        'Good Till Cancelled'
      );

      const response = await testUtils.post(
        '/api/v1/orders/limit',
        orderData,
        traderUser
      );
      
      const order = testUtils.assertSuccessResponse(response, 201);
      
      testUtils.assertDecimalPrecision(order.amount, 2);
      testUtils.assertDecimalPrecision(order.price, 2);
      expect(order.amount).toBe(123.45);
      expect(order.price).toBe(6543.21);
    });

    test('should generate unique order IDs', async () => {
      const orderData1 = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        10.00,
        6500.00,
        'Good Till Cancelled'
      );
      
      const orderData2 = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        20.00,
        6500.00,
        'Good Till Cancelled'
      );

      const [response1, response2] = await Promise.all([
        testUtils.post('/api/v1/orders/limit', orderData1, traderUser),
        testUtils.post('/api/v1/orders/limit', orderData2, traderUser)
      ]);
      
      const order1 = testUtils.assertSuccessResponse(response1, 201);
      const order2 = testUtils.assertSuccessResponse(response2, 201);
      
      expect(order1.id).not.toBe(order2.id);
      expect(order1.id).toBeValidUUID();
      expect(order2.id).toBeValidUUID();
    });
  });

  describe('POST /api/v1/orders/market - Market Orders', () => {
    test('should create EUR/AOA buy market order', async () => {
      const orderData = {
        side: 'buy' as const,
        amount: 50.00,
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA'
      };

      const response = await testUtils.post(
        '/api/v1/orders/market',
        orderData,
        userWithBalance
      );

      const data = testUtils.assertSuccessResponse(response, 200);

      expect(data).toHaveProperty('orderId');
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('orderType');
      expect(data).toHaveProperty('side');
      expect(data).toHaveProperty('baseCurrency');
      expect(data).toHaveProperty('quoteCurrency');
      expect(data).toHaveProperty('amount');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('createdAt');

      expect(data.userId).toBe(userWithBalance.id);
      expect(data.orderType).toBe('market');
      expect(data.side).toBe('buy');
      expect(data.baseCurrency).toBe('EUR');
      expect(data.quoteCurrency).toBe('AOA');
      expect(data.amount).toBe(50.00);
      expect(['filled', 'partially_filled', 'rejected', 'pending']).toContain(data.status);

      // Market orders should execute quickly
      testUtils.assertResponseTime(response, 400);
    });

    test('should create EUR/AOA sell market order', async () => {
      const orderData = testUtils.generateMarketOrderData(
        'EUR/AOA',
        'sell',
        25.00 // amount in EUR
      );

      const response = await testUtils.post(
        '/api/v1/orders/market',
        orderData,
        userWithBalance
      );
      
      const order = testUtils.assertSuccessResponse(response, 201);
      
      expect(order.side).toBe('sell');
      expect(order.type).toBe('market');
      expect(['filled', 'partially_filled', 'rejected']).toContain(order.status);
    });

    test('should reject market order with insufficient balance', async () => {
      const orderData = testUtils.generateMarketOrderData(
        'EUR/AOA',
        'buy',
        10000.00 // More than available balance
      );

      const response = await testUtils.post(
        '/api/v1/orders/market',
        orderData,
        userWithBalance
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('insufficient');
    });

    test('should reject market order with no liquidity', async () => {
      // This test assumes there might be no liquidity for certain pairs
      const orderData = testUtils.generateMarketOrderData(
        'EUR/AOA',
        'buy',
        1000.00 // Large amount that might exceed available liquidity
      );

      const response = await testUtils.post(
        '/api/v1/orders/market',
        orderData,
        userWithBalance
      );
      
      // Should either succeed or fail gracefully
      if (response.status === 201) {
        const order = testUtils.assertSuccessResponse(response, 201);
        expect(['filled', 'partially_filled', 'rejected']).toContain(order.status);
      } else {
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['liquidity', 'market']);
      }
    });

    test('should handle market order slippage', async () => {
      const orderData = testUtils.generateMarketOrderData(
        'EUR/AOA',
        'buy',
        100.00
      );

      const response = await testUtils.post(
        '/api/v1/orders/market',
        orderData,
        userWithBalance
      );
      
      if (response.status === 201) {
        const order = testUtils.assertSuccessResponse(response, 201);
        
        if (order.status === 'filled') {
          expect(order).toHaveProperty('executedPrice');
          expect(order).toHaveProperty('executedAmount');
          expect(order.executedAmount).toBeGreaterThan(0);
          expect(order.executedPrice).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('GET /api/v1/orders/history - Order History', () => {
    test('should return order history', async () => {
      const response = await testUtils.get('/api/v1/orders/history', traderUser);
      
      const history = testUtils.assertSuccessResponse(response, 200);
      
      expect(history).toHaveProperty('orders');
      expect(history).toHaveProperty('pagination');
      expect(Array.isArray(history.orders)).toBe(true);
      
      // Check order structure
      if (history.orders.length > 0) {
        history.orders.forEach((order: any) => {
          testUtils.assertValidOrder(order);
        });
      }
      
      testUtils.assertResponseTime(response, 200);
    });

    test('should support pagination', async () => {
      const response = await testUtils.get(
        '/api/v1/orders/history?limit=5&offset=0',
        traderUser
      );
      
      const history = testUtils.assertSuccessResponse(response, 200);
      
      expect(history.orders.length).toBeLessThanOrEqual(5);
      expect(history.pagination).toHaveProperty('limit');
      expect(history.pagination).toHaveProperty('offset');
      expect(history.pagination).toHaveProperty('total');
    });

    test('should filter by trading pair', async () => {
      const response = await testUtils.get(
        '/api/v1/orders/history?pair=EUR/AOA',
        traderUser
      );
      
      const history = testUtils.assertSuccessResponse(response, 200);
      
      history.orders.forEach((order: any) => {
        expect(order.pair).toBe('EUR/AOA');
      });
    });

    test('should filter by order status', async () => {
      const response = await testUtils.get(
        '/api/v1/orders/history?status=open',
        traderUser
      );
      
      const history = testUtils.assertSuccessResponse(response, 200);
      
      history.orders.forEach((order: any) => {
        expect(order.status).toBe('open');
      });
    });

    test('should filter by order type', async () => {
      const response = await testUtils.get(
        '/api/v1/orders/history?type=limit',
        traderUser
      );
      
      const history = testUtils.assertSuccessResponse(response, 200);
      
      history.orders.forEach((order: any) => {
        expect(order.type).toBe('limit');
      });
    });

    test('should sort by date descending by default', async () => {
      const response = await testUtils.get('/api/v1/orders/history', traderUser);
      
      const history = testUtils.assertSuccessResponse(response, 200);
      
      if (history.orders.length > 1) {
        testUtils.assertSortedByDate(history.orders, 'createdAt', true);
      }
    });

    test('should only return user own orders', async () => {
      const response = await testUtils.get('/api/v1/orders/history', traderUser);
      
      const history = testUtils.assertSuccessResponse(response, 200);
      
      history.orders.forEach((order: any) => {
        expect(order.userId).toBe(traderUser.id);
      });
    });
  });

  describe('Order Validation', () => {
    test('should validate required fields', async () => {
      const incompleteOrders = [
        { side: 'buy', amount: 100, price: 6500 }, // Missing pair
        { pair: 'EUR/AOA', amount: 100, price: 6500 }, // Missing side
        { pair: 'EUR/AOA', side: 'buy', price: 6500 }, // Missing amount
        { pair: 'EUR/AOA', side: 'buy', amount: 100 } // Missing price (for limit)
      ];

      for (const orderData of incompleteOrders) {
        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );

        testUtils.assertErrorResponse(response, 400);
      }
    });

    test('should validate trading pair format', async () => {
      const invalidPairs = [
        'EUR-AOA', // Wrong separator
        'EUR_AOA', // Wrong separator
        'EUROA', // No separator
        'EUR/AOA/USD', // Too many parts
        'EUR/', // Missing quote currency
        '/AOA', // Missing base currency
        'eur/aoa', // Wrong case
        'EUR/aoa' // Mixed case
      ];

      for (const pair of invalidPairs) {
        const orderData = testUtils.generateLimitOrderData(
          pair,
          'buy',
          100.00,
          6500.00,
          'Good Till Cancelled'
        );

        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );

        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('pair');
      }
    });

    test('should validate amount precision', async () => {
      const invalidAmounts = [
        100.123, // Too many decimals
        100.1234,
        0.001, // Below minimum
        999999999.99 // Above maximum
      ];

      for (const amount of invalidAmounts) {
        const orderData = testUtils.generateLimitOrderData(
          'EUR/AOA',
          'buy',
          amount,
          6500.00,
          'Good Till Cancelled'
        );

        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );

        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['amount', 'precision']);
      }
    });

    test('should validate price precision', async () => {
      const invalidPrices = [
        6500.123, // Too many decimals
        6500.1234,
        0.001, // Below minimum
        999999999.99 // Above maximum
      ];

      for (const price of invalidPrices) {
        const orderData = testUtils.generateLimitOrderData(
          'EUR/AOA',
          'buy',
          100.00,
          price,
          'Good Till Cancelled'
        );

        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );

        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['price', 'precision']);
      }
    });

    test('should validate time in force values', async () => {
      const invalidTIF = [
        'invalid',
        'gtc', // Wrong case
        'ioc', // Wrong case
        'fok', // Wrong case
        'Good Till Cancel', // Typo
        ''
      ];

      for (const tif of invalidTIF) {
        const orderData = testUtils.generateLimitOrderData(
          'EUR/AOA',
          'buy',
          100.00,
          6500.00,
          tif
        );

        const response = await testUtils.post(
          '/api/v1/orders/limit',
          orderData,
          traderUser
        );

        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['timeInForce', 'time']);
      }
    });

    test('should enforce minimum order size', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        0.001, // Below minimum
        6500.00,
        'Good Till Cancelled'
      );

      const response = await testUtils.post(
        '/api/v1/orders/limit',
        orderData,
        traderUser
      );

      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['minimum', 'size']);
    });

    test('should enforce maximum order size', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        1000000.00, // Above maximum
        6500.00,
        'Good Till Cancelled'
      );

      const response = await testUtils.post(
        '/api/v1/orders/limit',
        orderData,
        traderUser
      );

      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['maximum', 'size']);
    });
  });

  describe('Order Authorization', () => {
    test('should require authentication for limit orders', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        100.00,
        6500.00,
        'Good Till Cancelled'
      );

      const response = await testUtils.publicPost('/api/v1/orders/limit', orderData);

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should require authentication for market orders', async () => {
      const orderData = testUtils.generateMarketOrderData(
        'EUR/AOA',
        'buy',
        100.00
      );

      const response = await testUtils.publicPost('/api/v1/orders/market', orderData);

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should require authentication for order history', async () => {
      const response = await testUtils.publicGet('/api/v1/orders/history');

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should reject invalid JWT tokens', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        100.00,
        6500.00,
        'Good Till Cancelled'
      );

      const response = await testUtils.testWithInvalidToken(
        'POST',
        '/api/v1/orders/limit',
        orderData
      );

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('token');
    });
  });

  describe('Order Performance', () => {
    test('should process limit orders within 400ms', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        10.00,
        6500.00,
        'Good Till Cancelled'
      );

      const { response, passed } = await testUtils.testPerformance(
        'POST',
        '/api/v1/orders/limit',
        400,
        traderUser,
        orderData
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 201);
    });

    test('should process market orders within 400ms', async () => {
      const orderData = testUtils.generateMarketOrderData(
        'EUR/AOA',
        'buy',
        10.00
      );

      const { response, passed } = await testUtils.testPerformance(
        'POST',
        '/api/v1/orders/market',
        400,
        traderUser,
        orderData
      );

      expect(passed).toBe(true);
      // Market orders might fail due to liquidity, that's acceptable
      expect([201, 400]).toContain(response.status);
    });

    test('should respond quickly for order history', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/orders/history',
        200,
        traderUser
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should handle concurrent order submissions', async () => {
      const orderData = testUtils.generateLimitOrderData(
        'EUR/AOA',
        'buy',
        1.00,
        6500.00,
        'Good Till Cancelled'
      );

      const responses = await testUtils.testConcurrency(
        'POST',
        '/api/v1/orders/limit',
        5, // Limit concurrent orders
        traderUser,
        orderData
      );

      expect(responses).toHaveLength(5);

      responses.forEach(response => {
        // Some may succeed, some may fail due to balance
        expect([201, 400]).toContain(response.status);
        testUtils.assertResponseTime(response, 1000);
      });
    });

    test('should maintain performance under load', async () => {
      const promises = [];

      // Mix of order operations
      for (let i = 0; i < 10; i++) {
        promises.push(testUtils.get('/api/v1/orders/history', traderUser));
      }

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 300);
      });
    });
  });
});
