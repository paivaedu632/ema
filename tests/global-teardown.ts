/**
 * Global teardown for Jest tests
 * Runs once after all test suites complete
 */

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Run cleanup if available
    if (global.testCleanup) {
      await global.testCleanup();
    }
    
    // Close any open handles
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Global test teardown completed');
    
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
  }
}
