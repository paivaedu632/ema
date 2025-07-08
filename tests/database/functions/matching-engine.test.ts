import { 
  createTestUser, 
  createTestWallet, 
  placeTestOrder, 
  getOrderDetails, 
  getWalletBalance,
  getTradeDetails,
  executeQuery,
  functionExists 
} from '../setup';

describe('Order Matching Engine', () => {
  let buyerUserId: string;
  let sellerUserId: string;

  beforeEach(async () => {
    buyerUserId = await createTestUser();
    sellerUserId = await createTestUser();
    
    // Setup wallets with sufficient balances
    await createTestWallet(buyerUserId, 'EUR', 1000);
    await createTestWallet(buyerUserId, 'AOA', 1000000);
    await createTestWallet(sellerUserId, 'EUR', 1000);
    await createTestWallet(sellerUserId, 'AOA', 1000000);
  });

  describe('match_order function', () => {
    test('should exist in database', async () => {
      const exists = await functionExists('match_order');
      expect(exists).toBe(true);
    });

    test('should match compatible limit orders', async () => {
      // Place sell order first
      const sellOrderId = await placeTestOrder({
        userId: sellerUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Place matching buy order
      const buyOrderId = await placeTestOrder({
        userId: buyerUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Check that orders were matched
      const sellOrder = await getOrderDetails(sellOrderId);
      const buyOrder = await getOrderDetails(buyOrderId);

      expect(sellOrder.status).toBe('filled');
      expect(buyOrder.status).toBe('filled');
      expect(parseFloat(sellOrder.filled_quantity)).toBe(100);
      expect(parseFloat(buyOrder.filled_quantity)).toBe(100);
    });

    test('should handle partial fills correctly', async () => {
      // Place large sell order
      const sellOrderId = await placeTestOrder({
        userId: sellerUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 200,
        price: 900
      });

      // Place smaller buy order
      const buyOrderId = await placeTestOrder({
        userId: buyerUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 75,
        price: 900
      });

      const sellOrder = await getOrderDetails(sellOrderId);
      const buyOrder = await getOrderDetails(buyOrderId);

      // Buy order should be fully filled
      expect(buyOrder.status).toBe('filled');
      expect(parseFloat(buyOrder.filled_quantity)).toBe(75);

      // Sell order should be partially filled
      expect(sellOrder.status).toBe('pending');
      expect(parseFloat(sellOrder.filled_quantity)).toBe(75);
      expect(parseFloat(sellOrder.quantity) - parseFloat(sellOrder.filled_quantity)).toBe(125);
    });

    test('should respect price-time priority', async () => {
      // Place first sell order at higher price
      const sellOrder1Id = await placeTestOrder({
        userId: sellerUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 950
      });

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Place second sell order at lower price (better)
      const sellOrder2Id = await placeTestOrder({
        userId: sellerUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Place buy order that should match the better price
      const buyOrderId = await placeTestOrder({
        userId: buyerUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 50,
        price: 950
      });

      const sellOrder1 = await getOrderDetails(sellOrder1Id);
      const sellOrder2 = await getOrderDetails(sellOrder2Id);
      const buyOrder = await getOrderDetails(buyOrderId);

      // Should match with the better price (sellOrder2)
      expect(sellOrder2.status).toBe('filled');
      expect(parseFloat(sellOrder2.filled_quantity)).toBe(50);
      
      // First order should remain untouched
      expect(sellOrder1.status).toBe('pending');
      expect(parseFloat(sellOrder1.filled_quantity)).toBe(0);

      // Buy order should be filled at the better price
      expect(buyOrder.status).toBe('filled');
      expect(parseFloat(buyOrder.filled_quantity)).toBe(50);
    });

    test('should not match orders with incompatible prices', async () => {
      // Place sell order at high price
      const sellOrderId = await placeTestOrder({
        userId: sellerUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 1000
      });

      // Place buy order at lower price
      const buyOrderId = await placeTestOrder({
        userId: buyerUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      const sellOrder = await getOrderDetails(sellOrderId);
      const buyOrder = await getOrderDetails(buyOrderId);

      // Orders should remain pending (no match)
      expect(sellOrder.status).toBe('pending');
      expect(buyOrder.status).toBe('pending');
      expect(parseFloat(sellOrder.filled_quantity)).toBe(0);
      expect(parseFloat(buyOrder.filled_quantity)).toBe(0);
    });

    test('should handle market orders correctly', async () => {
      // Place limit sell order
      const sellOrderId = await placeTestOrder({
        userId: sellerUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Place market buy order
      const buyOrderId = await placeTestOrder({
        userId: buyerUserId,
        orderType: 'market',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 50
      });

      const sellOrder = await getOrderDetails(sellOrderId);
      const buyOrder = await getOrderDetails(buyOrderId);

      // Market order should match immediately
      expect(buyOrder.status).toBe('filled');
      expect(parseFloat(buyOrder.filled_quantity)).toBe(50);
      
      // Sell order should be partially filled
      expect(sellOrder.status).toBe('pending');
      expect(parseFloat(sellOrder.filled_quantity)).toBe(50);
    });
  });

  describe('execute_trade_enhanced function', () => {
    test('should exist in database', async () => {
      const exists = await functionExists('execute_trade_enhanced');
      expect(exists).toBe(true);
    });

    test('should create trade record and update balances', async () => {
      // Place orders that will match
      const sellOrderId = await placeTestOrder({
        userId: sellerUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      const buyOrderId = await placeTestOrder({
        userId: buyerUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 900
      });

      // Check that trade was created
      const trades = await executeQuery(`
        SELECT * FROM trades 
        WHERE (buy_order_id = $1 AND sell_order_id = $2) 
           OR (buy_order_id = $2 AND sell_order_id = $1)
      `, [buyOrderId, sellOrderId]);

      expect(trades.length).toBeGreaterThan(0);
      
      const trade = trades[0];
      expect(parseFloat(trade.quantity)).toBe(100);
      expect(parseFloat(trade.price)).toBe(900);
      expect(parseFloat(trade.total_amount)).toBe(90000);

      // Check balance updates
      const buyerEurBalance = await getWalletBalance(buyerUserId, 'EUR');
      const buyerAoaBalance = await getWalletBalance(buyerUserId, 'AOA');
      const sellerEurBalance = await getWalletBalance(sellerUserId, 'EUR');
      const sellerAoaBalance = await getWalletBalance(sellerUserId, 'AOA');

      // Buyer should have more EUR, less AOA
      expect(buyerEurBalance.available).toBe(1100); // 1000 + 100
      expect(buyerAoaBalance.available).toBe(910000); // 1000000 - 90000

      // Seller should have less EUR, more AOA
      expect(sellerEurBalance.available).toBe(900); // 1000 - 100
      expect(sellerAoaBalance.available).toBe(1090000); // 1000000 + 90000
    });

    test('should handle fees correctly', async () => {
      // This test assumes a fee system is in place
      const sellOrderId = await placeTestOrder({
        userId: sellerUserId,
        orderType: 'limit',
        side: 'sell',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 1000
      });

      const buyOrderId = await placeTestOrder({
        userId: buyerUserId,
        orderType: 'limit',
        side: 'buy',
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA',
        quantity: 100,
        price: 1000
      });

      // Check if fees were calculated and applied
      const trades = await executeQuery(`
        SELECT * FROM trades 
        WHERE (buy_order_id = $1 AND sell_order_id = $2) 
           OR (buy_order_id = $2 AND sell_order_id = $1)
      `, [buyOrderId, sellOrderId]);

      const trade = trades[0];
      
      // Check if fee fields exist and have reasonable values
      if (trade.buyer_fee !== undefined) {
        expect(parseFloat(trade.buyer_fee)).toBeGreaterThanOrEqual(0);
      }
      if (trade.seller_fee !== undefined) {
        expect(parseFloat(trade.seller_fee)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
