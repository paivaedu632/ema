/**
 * Environment setup for tests
 * Loads test-specific environment variables
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });

// Fallback to local environment if test env doesn't exist
config({ path: path.resolve(process.cwd(), '.env.local') });

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_ENV = 'test';

// Database configuration for tests
process.env.SUPABASE_TEST_MODE = 'true';

// Disable external services in tests
process.env.DISABLE_WEBHOOKS = 'true';
process.env.DISABLE_EMAILS = 'true';
process.env.DISABLE_SMS = 'true';

// Test timeouts
process.env.TEST_TIMEOUT = '30000';
process.env.API_TIMEOUT = '10000';

// Logging configuration for tests
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output

// JWT configuration for tests
process.env.JWT_TEST_EXPIRY = '1h'; // Shorter expiry for tests

console.log('🧪 Test environment configured');
console.log(`📊 Database URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing'}`);
console.log(`🔑 Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing'}`);
