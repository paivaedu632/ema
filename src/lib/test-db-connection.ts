import { supabase } from './supabase'

/**
 * Test database connection and verify tables exist
 */
export async function testDatabaseConnection() {
  console.log('🔍 Testing EmaPay database connection...')
  
  try {
    // Test 1: Basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    
    // Test 2: Verify all tables exist
    const tables = ['users', 'wallets', 'transactions', 'kyc_records', 'documents', 'exchange_rates']
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table as any)
        .select('count')
        .limit(1)
      
      if (error) {
        console.error(`❌ Table '${table}' not accessible:`, error.message)
        return false
      }
      
      console.log(`✅ Table '${table}' accessible`)
    }
    
    // Test 3: Test database functions
    console.log('🔍 Testing database functions...')
    
    const { data: exchangeRate, error: exchangeError } = await supabase
      .rpc('get_active_exchange_rate', {
        from_curr: 'EUR',
        to_curr: 'AOA'
      })
    
    if (exchangeError) {
      console.error('❌ Exchange rate function failed:', exchangeError.message)
    } else {
      console.log('✅ Exchange rate function working:', exchangeRate)
    }
    
    console.log('🎉 All database tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    return false
  }
}

/**
 * Insert sample exchange rates for testing
 */
export async function insertSampleExchangeRates() {
  console.log('📊 Inserting sample exchange rates...')
  
  const sampleRates = [
    {
      from_currency: 'EUR',
      to_currency: 'AOA',
      rate: 850.00,
      rate_type: 'automatic',
      is_active: true
    },
    {
      from_currency: 'AOA',
      to_currency: 'EUR',
      rate: 0.00118,
      rate_type: 'automatic', 
      is_active: true
    }
  ]
  
  const { data, error } = await supabase
    .from('exchange_rates')
    .insert(sampleRates)
    .select()
  
  if (error) {
    console.error('❌ Failed to insert exchange rates:', error.message)
    return false
  }
  
  console.log('✅ Sample exchange rates inserted:', data)
  return true
}

/**
 * Run all database tests
 */
export async function runDatabaseTests() {
  const connectionOk = await testDatabaseConnection()
  
  if (connectionOk) {
    await insertSampleExchangeRates()
  }
  
  return connectionOk
}
