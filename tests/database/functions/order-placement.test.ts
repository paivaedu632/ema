import { 
  createTestUser, 
  createTestWallet, 
  placeTestOrder, 
  getOrderDetails, 
  getWalletBalance,
  executeQuery,
  functionExists 
} from '../setup';

describe('Order Placement Functions', () => {
  let testUserId: string;

  beforeEach(async () => {
    testUserId = await createTestUser();
    await createTestWallet(testUserId, 'EUR', 1000);
    await createTestWallet(testUserId, 'AOA', 500000);
  });

  describe('place_order function', () => {
    test('should exist in database', async () => {
      const exists = await functionExists('place_order');
      expect(exists).toBe(true);
    });

    test('should place valid limit buy order', async () => {
      const orderId = await placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      expect(orderId).toBeDefined();
      expect(typeof orderId).toBe('string');

      const order = await getOrderDetails(orderId);
      expect(order).toBeDefined();
      expect(order.user_id).toBe(testUserId);
      expect(order.order_type).toBe('limit');
      expect(order.side).toBe('buy');
      expect(order.base_currency).toBe('EUR');
      expect(order.quote_currency).toBe('AOA');
      expect(parseFloat(order.quantity)).toBe(100);
      expect(parseFloat(order.price)).toBe(900);
      expect(order.status).toBe('pending');
    });

    test('should place valid limit sell order', async () => {
      const orderId = await placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 50,
        price: 950
      });

      const order = await getOrderDetails(orderId);
      expect(order.side).toBe('sell');
      expect(parseFloat(order.quantity)).toBe(50);
      expect(parseFloat(order.price)).toBe(950);
    });

    test('should place valid market buy order', async () => {
      const orderId = await placeTestOrder({
        userId: testUserId,
        orderType: 'market',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 75
      });

      const order = await getOrderDetails(orderId);
      expect(order.order_type).toBe('market');
      expect(order.price).toBeNull();
      expect(parseFloat(order.quantity)).toBe(75);
    });

    test('should reserve funds for buy order', async () => {
      const initialBalance = await getWalletBalance(testUserId, 'AOA');
      
      await placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      const finalBalance = await getWalletBalance(testUserId, 'AOA');
      
      // Should reserve 100 * 900 = 90,000 AOA
      expect(finalBalance.reserved).toBe(90000);
      expect(finalBalance.available).toBe(initialBalance.available - 90000);
    });

    test('should reserve funds for sell order', async () => {
      const initialBalance = await getWalletBalance(testUserId, 'EUR');
      
      await placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 50,
        price: 950
      });

      const finalBalance = await getWalletBalance(testUserId, 'EUR');
      
      // Should reserve 50 EUR
      expect(finalBalance.reserved).toBe(50);
      expect(finalBalance.available).toBe(initialBalance.available - 50);
    });

    test('should reject order with insufficient balance', async () => {
      // Try to place order larger than available balance
      await expect(placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 2000, // More than 1000 EUR available
        price: 900
      })).rejects.toThrow();
    });

    test('should reject order with invalid currency pair', async () => {
      await expect(placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'USD', // Invalid currency
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      })).rejects.toThrow();
    });

    test('should reject order with negative quantity', async () => {
      await expect(placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: -100, // Negative quantity
        price: 900
      })).rejects.toThrow();
    });

    test('should reject limit order with negative price', async () => {
      await expect(placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: -900 // Negative price
      })).rejects.toThrow();
    });

    test('should reject limit order without price', async () => {
      await expect(executeQuery(`
        SELECT place_order($1, 'limit', 'buy', 'EUR', 'AOA', 100, NULL)
      `, [testUserId])).rejects.toThrow();
    });

    test('should accept market order without price', async () => {
      const result = await executeQuery(`
        SELECT place_order($1, 'market', 'buy', 'EUR', 'AOA', 100, NULL) as order_id
      `, [testUserId]);
      
      expect(result[0].order_id).toBeDefined();
    });
  });

  describe('cancel_order function', () => {
    test('should exist in database', async () => {
      const exists = await functionExists('cancel_order');
      expect(exists).toBe(true);
    });

    test('should cancel pending order and release funds', async () => {
      // Place order
      const orderId = await placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      const balanceAfterOrder = await getWalletBalance(testUserId, 'AOA');
      expect(balanceAfterOrder.reserved).toBe(90000);

      // Cancel order
      await executeQuery(`SELECT cancel_order($1, $2)`, [orderId, testUserId]);

      // Check order status
      const order = await getOrderDetails(orderId);
      expect(order.status).toBe('cancelled');

      // Check funds released
      const balanceAfterCancel = await getWalletBalance(testUserId, 'AOA');
      expect(balanceAfterCancel.reserved).toBe(0);
      expect(balanceAfterCancel.available).toBe(500000); // Back to original
    });

    test('should reject cancellation by wrong user', async () => {
      const otherUserId = await createTestUser();
      
      const orderId = await placeTestOrder({
        userId: testUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      await expect(executeQuery(`
        SELECT cancel_order($1, $2)
      `, [orderId, otherUserId])).rejects.toThrow();
    });

    test('should reject cancellation of non-existent order', async () => {
      const fakeOrderId = '00000000-0000-0000-0000-000000000000';
      
      await expect(executeQuery(`
        SELECT cancel_order($1, $2)
      `, [fakeOrderId, testUserId])).rejects.toThrow();
    });
  });
});
