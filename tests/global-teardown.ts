/**
 * Global Jest Teardown
 * Runs once after all tests
 */

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...')
  
  // Clean up any global resources
  // Note: Individual test cleanup should be handled in afterEach/afterAll hooks
  
  console.log('✅ Global test teardown completed')
}
