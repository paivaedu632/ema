// Hook switcher - easily toggle between mock and real API
// Change USE_MOCK_DATA to false when ready to connect to real API

const USE_MOCK_DATA = true

// Import both mock and real hooks
import * as mockHooks from './use-mock-api'
import * as realHooks from './use-api'

// Export the appropriate hooks based on mock mode
export const useUser = USE_MOCK_DATA ? mockHooks.useUser : realHooks.useUser
export const useWallets = USE_MOCK_DATA ? mockHooks.useWallets : realHooks.useWallets
export const useTransactions = USE_MOCK_DATA ? mockHooks.useTransactions : realHooks.useTransactions
export const useSendMoney = USE_MOCK_DATA ? mockHooks.useSendMoney : realHooks.useSendMoney
export const useUserSearch = USE_MOCK_DATA ? mockHooks.useUserSearch : realHooks.useUserSearch
export const useExchangeRates = USE_MOCK_DATA ? mockHooks.useExchangeRates : realHooks.useExchangeRates
export const useTradingOrders = USE_MOCK_DATA ? mockHooks.useTradingOrders : realHooks.useTradingOrders
export const usePlaceLimitOrder = USE_MOCK_DATA ? mockHooks.usePlaceLimitOrder : realHooks.usePlaceLimitOrder
export const useKYCStatus = USE_MOCK_DATA ? mockHooks.useKYCStatus : realHooks.useKYCStatus

// Export utility hooks (always from mock)
export const useMockLoading = mockHooks.useMockLoading
export const useMockError = mockHooks.useMockError

// Export mock data for direct use in components if needed
export { mockUser, mockWalletBalances, mockTransactions, mockSearchUsers } from '@/lib/mock-data'

// Export the current mode for debugging
export const isMockMode = USE_MOCK_DATA
