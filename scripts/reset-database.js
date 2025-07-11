const { Pool } = require('pg');

async function resetDatabase() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Dropping all tables and functions...');
    
    // Drop tables in reverse dependency order
    const dropStatements = [
      'DROP TABLE IF EXISTS kyc_records CASCADE',
      'DROP TABLE IF EXISTS fees CASCADE',
      'DROP TABLE IF EXISTS transactions CASCADE',
      'DROP TABLE IF EXISTS trades CASCADE',
      'DROP TABLE IF EXISTS fund_reservations CASCADE',
      'DROP TABLE IF EXISTS order_book CASCADE',
      'DROP TABLE IF EXISTS wallets CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP SEQUENCE IF EXISTS transaction_sequence CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE',
      'DROP FUNCTION IF EXISTS create_fund_reservation(UUID, VARCHAR, DECIMAL, VARCHAR, UUID) CASCADE',
      'DROP FUNCTION IF EXISTS release_fund_reservation(UUID) CASCADE',
      'DROP FUNCTION IF EXISTS cancel_fund_reservation(UUID) CASCADE',
      'DROP FUNCTION IF EXISTS get_wallet_balance(UUID, VARCHAR) CASCADE',
      'DROP FUNCTION IF EXISTS upsert_wallet(UUID, VARCHAR, DECIMAL, DECIMAL) CASCADE',
      'DROP FUNCTION IF EXISTS place_order(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL) CASCADE',
      'DROP FUNCTION IF EXISTS cancel_order(UUID, UUID) CASCADE',
      'DROP FUNCTION IF EXISTS match_order(UUID) CASCADE',
      'DROP FUNCTION IF EXISTS execute_trade(UUID, UUID, DECIMAL, DECIMAL) CASCADE',
      'DROP FUNCTION IF EXISTS get_best_prices(TEXT, TEXT) CASCADE',
      'DROP FUNCTION IF EXISTS get_order_book_depth(TEXT, TEXT, INTEGER) CASCADE',
      'DROP FUNCTION IF EXISTS get_recent_trades(TEXT, TEXT, INTEGER) CASCADE',
      'DROP FUNCTION IF EXISTS get_user_orders(UUID, TEXT, INTEGER) CASCADE',
      'DROP FUNCTION IF EXISTS get_order_details(UUID) CASCADE'
    ];
    
    for (const statement of dropStatements) {
      try {
        await client.query(statement);
        console.log(`✅ ${statement}`);
      } catch (error) {
        console.log(`⚠️  ${statement} - ${error.message}`);
      }
    }
    
    client.release();
    console.log('🎉 Database reset completed!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
