/**
 * Global Jest Setup
 * Runs once before all tests
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

export default async function globalSetup() {
  // Load environment variables
  dotenv.config({ path: '.env.local' })
  
  console.log('🚀 Starting global test setup...')
  
  // Verify environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }
  
  // Test database connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { error } = await supabase.from('users').select('count').limit(1)
    
    if (error && !error.message.includes('permission')) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
    
    console.log('✅ Database connection verified')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
  
  console.log('✅ Global test setup completed')
}
