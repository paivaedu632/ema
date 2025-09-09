/**
 * Global setup for Jest tests
 * Runs once before all test suites
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });
config({ path: path.resolve(process.cwd(), '.env.local') });

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Verify Supabase connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log('✅ Database connection verified');
    
    // Create test data cleanup function
    global.testCleanup = async () => {
      console.log('🧹 Cleaning up test data...');
      
      try {
        // Clean up test users (those with test emails)
        await supabase
          .from('users')
          .delete()
          .like('email', '%.test');
        
        // Clean up test wallets
        await supabase
          .from('wallets')
          .delete()
          .in('user_id', []);
        
        console.log('✅ Test data cleanup completed');
      } catch (error) {
        console.error('❌ Test cleanup failed:', error);
      }
    };
    
    // Store test configuration globally
    global.testConfig = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      testTimeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
      apiTimeout: parseInt(process.env.API_TIMEOUT || '10000')
    };
    
    console.log('✅ Global test setup completed');
    
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}

// Type declarations
declare global {
  var testCleanup: () => Promise<void>;
  var testConfig: {
    supabaseUrl: string;
    supabaseServiceKey: string;
    supabaseAnonKey: string;
    apiBaseUrl: string;
    testTimeout: number;
    apiTimeout: number;
  };
}
