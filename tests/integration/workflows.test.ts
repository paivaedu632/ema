/**
 * Integration Workflow Tests
 * End-to-end testing of complete user workflows
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { ApiTestClient, getRealSupabaseJWT, expectSuccessResponse, expectErrorResponse, TEST_USERS, generateTransferData, generateLimitOrderData, generatePinData, userFactory } from '../utils'

describe('Integration Workflows', () => {
  let apiClient: ApiTestClient
  let senderToken: string
  let recipientToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()
    senderToken = await getRealSupabaseJWT(TEST_USERS.VALID_USER.id)
    recipientToken = await getRealSupabaseJWT(TEST_USERS.RECIPIENT_USER.id)
  })

  afterAll(async () => {
    await userFactory.cleanup()
  })

  beforeEach(() => {
    // Reset any state between tests
  })

  describe('User Registration to Transfer Flow', () => {
    test('should complete full transfer workflow: auth → set PIN → get balance → search recipient → send transfer', async () => {
      // Step 1: Authenticate sender
      const authResponse = await apiClient.getAuthMe(senderToken)
      expect(authResponse.status).toBe(200)
      expectSuccessResponse(authResponse.body)
      expect(authResponse.body.data.authenticated).toBe(true)

      // Step 2: Set PIN for sender
      const pinData = generatePinData()
      const setPinResponse = await apiClient.setPin(pinData, senderToken)
      expect(setPinResponse.status).toBe(200)
      expectSuccessResponse(setPinResponse.body)
      expect(setPinResponse.body.data.pinSet).toBe(true)

      // Step 3: Get sender's balance
      const balanceResponse = await apiClient.getWalletBalance(senderToken)
      expect(balanceResponse.status).toBe(200)
      expectSuccessResponse(balanceResponse.body)
      expect(balanceResponse.body.data.balances).toHaveProperty('EUR')

      // Step 4: Search for recipient
      const searchResponse = await apiClient.searchUsers(TEST_USERS.RECIPIENT_USER.email, 'email', senderToken)
      expect(searchResponse.status).toBe(200)
      expectSuccessResponse(searchResponse.body)
      expect(Array.isArray(searchResponse.body.data)).toBe(true)

      // Step 5: Send transfer (this might fail due to insufficient balance, but workflow should be complete)
      const transferData = generateTransferData({
        recipientId: TEST_USERS.RECIPIENT_USER.email,
        pin: pinData.pin
      })
      const transferResponse = await apiClient.sendTransfer(transferData, senderToken)
      
      // Accept either success or insufficient balance error
      expect([200, 400]).toContain(transferResponse.status)
      
      if (transferResponse.status === 200) {
        expectSuccessResponse(transferResponse.body)
        expect(transferResponse.body.data.senderId).toBe(TEST_USERS.VALID_USER.id)
      } else {
        expectErrorResponse(transferResponse.body)
        // Should be insufficient balance error
        expect(transferResponse.body.error).toMatch(/insufficient/i)
      }
    })

    test('should handle PIN verification in transfer flow', async () => {
      // Set PIN first
      const pinData = generatePinData()
      await apiClient.setPin(pinData, senderToken)

      // Verify PIN works
      const verifyResponse = await apiClient.verifyPin({ pin: pinData.pin }, senderToken)
      expect(verifyResponse.status).toBe(200)
      expectSuccessResponse(verifyResponse.body)
      expect(verifyResponse.body.data.pinValid).toBe(true)

      // Try transfer with correct PIN
      const transferData = generateTransferData({ pin: pinData.pin })
      const transferResponse = await apiClient.sendTransfer(transferData, senderToken)
      
      // Should not fail due to PIN (might fail due to other reasons like balance)
      if (transferResponse.status === 400) {
        expect(transferResponse.body.error).not.toMatch(/pin/i)
      }
    })
  })

  describe('Trading Workflow Tests', () => {
    test('should complete trading flow: check balance → place limit order → check order status', async () => {
      // Step 1: Check balance
      const balanceResponse = await apiClient.getWalletBalance(senderToken)
      expect(balanceResponse.status).toBe(200)
      expectSuccessResponse(balanceResponse.body)

      // Step 2: Place limit order
      const orderData = generateLimitOrderData()
      const orderResponse = await apiClient.placeLimitOrder(orderData, senderToken)
      
      // Accept either success or insufficient balance
      expect([200, 400]).toContain(orderResponse.status)
      
      if (orderResponse.status === 200) {
        expectSuccessResponse(orderResponse.body)
        expect(orderResponse.body.data.orderType).toBe('limit')
        
        // Step 3: Check order history
        const historyResponse = await apiClient.getOrderHistory({}, senderToken)
        expect(historyResponse.status).toBe(200)
        expectSuccessResponse(historyResponse.body)
        expect(Array.isArray(historyResponse.body.data.orders)).toBe(true)
      }
    })

    test('should handle market order execution', async () => {
      const marketOrderData = {
        side: 'buy' as const,
        amount: 10,
        baseCurrency: 'EUR' as const,
        quoteCurrency: 'AOA' as const,
        slippageLimit: 0.05
      }
      
      const response = await apiClient.placeMarketOrder(marketOrderData, senderToken)
      
      // Accept either success or insufficient balance
      expect([200, 400]).toContain(response.status)
      
      if (response.status === 200) {
        expectSuccessResponse(response.body)
        expect(response.body.data.orderType).toBe('market')
      }
    })
  })

  describe('KYC and Security Flow', () => {
    test('should complete security workflow: set PIN → verify PIN → attempt transfer → check security', async () => {
      // Step 1: Set PIN
      const pinData = generatePinData()
      const setPinResponse = await apiClient.setPin(pinData, senderToken)
      expect(setPinResponse.status).toBe(200)

      // Step 2: Verify PIN
      const verifyResponse = await apiClient.verifyPin({ pin: pinData.pin }, senderToken)
      expect(verifyResponse.status).toBe(200)
      expect(verifyResponse.body.data.pinValid).toBe(true)

      // Step 3: Attempt transfer with verified PIN
      const transferData = generateTransferData({ pin: pinData.pin })
      const transferResponse = await apiClient.sendTransfer(transferData, senderToken)
      
      // Should not fail due to PIN issues
      if (transferResponse.status === 400) {
        expect(transferResponse.body.error).not.toMatch(/pin/i)
      }

      // Step 4: Verify wrong PIN fails
      const wrongPinResponse = await apiClient.verifyPin({ pin: '000000' }, senderToken)
      expect([400, 401]).toContain(wrongPinResponse.status)
    })
  })

  describe('Multi-Currency Operations', () => {
    test('should handle cross-currency operations: EUR balance → place EUR/AOA order → check AOA balance', async () => {
      // Step 1: Check EUR balance
      const eurBalanceResponse = await apiClient.getCurrencyBalance('EUR', senderToken)
      expect(eurBalanceResponse.status).toBe(200)
      expect(eurBalanceResponse.body.data.currency).toBe('EUR')

      // Step 2: Place EUR/AOA order
      const orderData = generateLimitOrderData({
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA'
      })
      const orderResponse = await apiClient.placeLimitOrder(orderData, senderToken)
      
      // Accept either success or insufficient balance
      expect([200, 400]).toContain(orderResponse.status)

      // Step 3: Check AOA balance
      const aoaBalanceResponse = await apiClient.getCurrencyBalance('AOA', senderToken)
      expect(aoaBalanceResponse.status).toBe(200)
      expect(aoaBalanceResponse.body.data.currency).toBe('AOA')

      // Step 4: Check market data for the pair
      const marketDepthResponse = await apiClient.getMarketDepth({
        baseCurrency: 'EUR',
        quoteCurrency: 'AOA'
      })
      expect(marketDepthResponse.status).toBe(200)
      expect(marketDepthResponse.body.data.pair).toBe('EUR/AOA')
    })
  })

  describe('Error Handling Workflows', () => {
    test('should handle error scenarios: insufficient balance → failed transfer → proper error responses', async () => {
      // Step 1: Try transfer with large amount (should fail)
      const largeTransferData = generateTransferData({
        amount: 999999999 // Very large amount
      })
      const transferResponse = await apiClient.sendTransfer(largeTransferData, senderToken)
      
      expect(transferResponse.status).toBe(400)
      expectErrorResponse(transferResponse.body)
      expect(transferResponse.body.error).toMatch(/insufficient|balance/i)

      // Step 2: Try transfer without PIN
      const noPinData = { ...generateTransferData() }
      delete noPinData.pin
      const noPinResponse = await apiClient.sendTransfer(noPinData, senderToken)
      
      expect(noPinResponse.status).toBe(400)
      expectErrorResponse(noPinResponse.body)

      // Step 3: Try transfer to non-existent user
      const invalidRecipientData = generateTransferData({
        recipientId: 'nonexistent@emapay.com'
      })
      const invalidRecipientResponse = await apiClient.sendTransfer(invalidRecipientData, senderToken)
      
      expect([400, 404]).toContain(invalidRecipientResponse.status)
      expectErrorResponse(invalidRecipientResponse.body)
    })

    test('should handle authentication errors gracefully', async () => {
      const invalidToken = 'invalid-token'
      
      // Try various operations with invalid token
      const operations = [
        () => apiClient.getAuthMe(invalidToken),
        () => apiClient.getWalletBalance(invalidToken),
        () => apiClient.searchUsers('test@emapay.com', 'email', invalidToken),
        () => apiClient.sendTransfer(generateTransferData(), invalidToken)
      ]
      
      for (const operation of operations) {
        const response = await operation()
        expect(response.status).toBe(401)
        expectErrorResponse(response.body, 'AUTH_REQUIRED')
      }
    })
  })
})
