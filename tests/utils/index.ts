/**
 * Test Utilities Index
 * Exports all test utilities for easy importing
 */

export { UserFactory, userFactory, TestUser, CreateUserOptions } from './user-factory';
export { ApiClient, apiClient, ApiResponse, ApiRequestOptions } from './api-client';
export {
  TestHelpers,
  helpers,
  StandardApiResponse,
  WalletBalance,
  Transfer,
  Order
} from './test-helpers';

// Import the instances
import { userFactory } from './user-factory';
import { apiClient } from './api-client';
import { TestHelpers } from './test-helpers';

// Re-export common test utilities
export const testUtils = {
  // User management
  createUser: userFactory.createUser.bind(userFactory),
  createUsers: userFactory.createUsers.bind(userFactory),
  createUserWithBalance: userFactory.createUserWithBalance.bind(userFactory),
  createUserWithPin: userFactory.createUserWithPin.bind(userFactory),
  createUserWithBalanceAndPin: userFactory.createUserWithBalanceAndPin.bind(userFactory),
  setupPin: userFactory.setupPin.bind(userFactory),
  refreshUserToken: userFactory.refreshUserToken.bind(userFactory),
  deleteUser: userFactory.deleteUser.bind(userFactory),
  cleanup: userFactory.cleanup.bind(userFactory),
  
  // API requests
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  publicGet: apiClient.publicGet.bind(apiClient),
  publicPost: apiClient.publicPost.bind(apiClient),
  testPerformance: apiClient.testPerformance.bind(apiClient),
  testConcurrency: apiClient.testConcurrency.bind(apiClient),
  testWithInvalidToken: apiClient.testWithInvalidToken.bind(apiClient),
  testWithExpiredToken: apiClient.testWithExpiredToken.bind(apiClient),
  
  // Assertions
  assertSuccessResponse: TestHelpers.assertSuccessResponse,
  assertErrorResponse: TestHelpers.assertErrorResponse,
  assertResponseTime: TestHelpers.assertResponseTime,
  assertValidUserData: TestHelpers.assertValidUserData,
  assertValidWalletBalance: TestHelpers.assertValidWalletBalance,
  assertValidTransfer: TestHelpers.assertValidTransfer,
  assertValidOrder: TestHelpers.assertValidOrder,
  assertValidMarketData: TestHelpers.assertValidMarketData,
  assertValidOrderBook: TestHelpers.assertValidOrderBook,
  
  // Data generation
  generateTransferData: TestHelpers.generateTransferData,
  generateLimitOrderData: TestHelpers.generateLimitOrderData,
  generateMarketOrderData: TestHelpers.generateMarketOrderData,
  generateTestPin: TestHelpers.generateTestPin,
  
  // Utilities
  waitFor: TestHelpers.waitFor,
  assertDecimalPrecision: TestHelpers.assertDecimalPrecision,
  assertSortedByDate: TestHelpers.assertSortedByDate
};
