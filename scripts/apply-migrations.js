const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigrations() {
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
    
    // Apply all migrations in order
    const migrations = [
      '20250709000001_create_order_book_schema.sql',
      '20250709000002_create_fund_management_functions.sql',
      '20250709000003_create_matching_engine_functions.sql',
      '20250709000004_create_market_data_functions.sql'
    ];

    for (const migration of migrations) {
      console.log(`Applying migration: ${migration}...`);
      const migrationSql = fs.readFileSync(
        path.join(__dirname, '../supabase/migrations', migration),
        'utf8'
      );
      await client.query(migrationSql);
      console.log(`✅ ${migration} applied successfully`);
    }
    
    client.release();
    console.log('🎉 All migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigrations();
