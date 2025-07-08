import { Pool, Client } from 'pg';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'emapay_test',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
};

// Global database pool for tests
let pool: Pool;
let client: Client;

// Setup database connection before all tests
beforeAll(async () => {
  pool = new Pool(dbConfig);
  client = new Client(dbConfig);
  await client.connect();
  
  // Verify database connection
  const result = await client.query('SELECT NOW()');
  console.log('Database connected at:', result.rows[0].now);
  
  // Ensure we're using the test database
  const dbName = await client.query('SELECT current_database()');
  if (!dbName.rows[0].current_database.includes('test')) {
    throw new Error(`Not connected to test database! Connected to: ${dbName.rows[0].current_database}`);
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (client) {
    await client.end();
  }
  if (pool) {
    await pool.end();
  }
});

// Clean up test data before each test
beforeEach(async () => {
  await cleanupTestData();
});

// Clean up test data after each test
afterEach(async () => {
  await cleanupTestData();
});

// Helper function to clean up test data
async function cleanupTestData() {
  if (!client) return;
  
  try {
    // Delete in reverse dependency order to avoid foreign key conflicts
    await client.query('DELETE FROM trades WHERE created_at > NOW() - INTERVAL \'1 hour\'');
    await client.query('DELETE FROM fund_reservations WHERE created_at > NOW() - INTERVAL \'1 hour\'');
    await client.query('DELETE FROM order_book WHERE created_at > NOW() - INTERVAL \'1 hour\'');
    await client.query('DELETE FROM transactions WHERE created_at > NOW() - INTERVAL \'1 hour\'');
    await client.query('DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test_%@example.com\')');
    await client.query('DELETE FROM users WHERE email LIKE \'test_%@example.com\'');
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

// Helper function to create test user
export async function createTestUser(email?: string): Promise<string> {
  const testEmail = email || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  const result = await client.query(`
    INSERT INTO users (id, email, full_name, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, 'Test User', NOW(), NOW())
    RETURNING id
  `, [testEmail]);
  
  return result.rows[0].id;
}

// Helper function to create test wallet
export async function createTestWallet(userId: string, currency: string, availableBalance: number = 1000): Promise<void> {
  await client.query(`
    INSERT INTO wallets (user_id, currency, available_balance, reserved_balance, created_at, updated_at)
    VALUES ($1, $2, $3, 0, NOW(), NOW())
    ON CONFLICT (user_id, currency) 
    DO UPDATE SET 
      available_balance = $3,
      updated_at = NOW()
  `, [userId, currency, availableBalance]);
}

// Helper function to get wallet balance
export async function getWalletBalance(userId: string, currency: string): Promise<{ available: number; reserved: number }> {
  const result = await client.query(`
    SELECT available_balance, reserved_balance 
    FROM wallets 
    WHERE user_id = $1 AND currency = $2
  `, [userId, currency]);
  
  if (result.rows.length === 0) {
    return { available: 0, reserved: 0 };
  }
  
  return {
    available: parseFloat(result.rows[0].available_balance),
    reserved: parseFloat(result.rows[0].reserved_balance)
  };
}

// Helper function to place test order
export async function placeTestOrder(params: {
  userId: string;
  orderType: 'market' | 'limit';
  side: 'buy' | 'sell';
  baseCurrency: string;
  quoteCurrency: string;
  quantity: number;
  price?: number;
}): Promise<string> {
  const result = await client.query(`
    SELECT place_order($1, $2, $3, $4, $5, $6, $7) as order_id
  `, [
    params.userId,
    params.orderType,
    params.side,
    params.baseCurrency,
    params.quoteCurrency,
    params.quantity,
    params.price || null
  ]);
  
  return result.rows[0].order_id;
}

// Helper function to get order details
export async function getOrderDetails(orderId: string): Promise<any> {
  const result = await client.query(`
    SELECT * FROM order_book WHERE id = $1
  `, [orderId]);
  
  return result.rows[0] || null;
}

// Helper function to get trade details
export async function getTradeDetails(tradeId: string): Promise<any> {
  const result = await client.query(`
    SELECT * FROM trades WHERE id = $1
  `, [tradeId]);
  
  return result.rows[0] || null;
}

// Helper function to execute raw SQL
export async function executeQuery(query: string, params: any[] = []): Promise<any> {
  const result = await client.query(query, params);
  return result.rows;
}

// Helper function to check if function exists
export async function functionExists(functionName: string): Promise<boolean> {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = $1 AND routine_schema = 'public'
    )
  `, [functionName]);
  
  return result.rows[0].exists;
}

// Helper function to check if table exists
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = 'public'
    )
  `, [tableName]);
  
  return result.rows[0].exists;
}

// Export the client for direct access in tests
export { client, pool };
