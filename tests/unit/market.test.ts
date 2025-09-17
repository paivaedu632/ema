/**
 * Market Data API Tests
 * Tests for market endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { ApiTestClient, expectSuccessResponse, expectErrorResponse } from '../utils'

describe('Market Data API', () => {
  let apiClient: ApiTestClient

  beforeAll(() => {
    apiClient = new ApiTestClient()
  })

  afterAll(() => {
    // Cleanup if needed
  })

  describe('GET /api/v1/exchange-rates/midpoint - Midpoint Exchange Rate', () => {
    test('should return 200 with midpoint exchange rate data', async () => {
      const response = await apiClient.getMidpointExchangeRate('EUR', 'AOA')

      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)

      // Verify response structure
      expect(response.body.data).toHaveProperty('pair')
      expect(response.body.data).toHaveProperty('baseCurrency')
      expect(response.body.data).toHaveProperty('quoteCurrency')
      expect(response.body.data).toHaveProperty('midpointRate')
      expect(response.body.data).toHaveProperty('bidRate')
      expect(response.body.data).toHaveProperty('askRate')
      expect(response.body.data).toHaveProperty('spread')
      expect(response.body.data).toHaveProperty('source')
      expect(response.body.data).toHaveProperty('lastUpdated')
      expect(response.body.data).toHaveProperty('status')

      // Verify data types
      expect(typeof response.body.data.midpointRate).toBe('number')
      expect(typeof response.body.data.bidRate).toBe('number')
      expect(typeof response.body.data.askRate).toBe('number')
      expect(typeof response.body.data.spread).toBe('number')

      expect(response.body.message).toBe('Midpoint exchange rate retrieved successfully')
    })

    test('should not require authentication', async () => {
      const response = await apiClient.getMidpointExchangeRate('EUR', 'AOA')
      expect(response.status).toBe(200)
    })

    test('should handle different currency pairs', async () => {
      const response = await apiClient.getMidpointExchangeRate('AOA', 'EUR')
      expect(response.status).toBe(200)
      expect(response.body.data.baseCurrency).toBe('AOA')
      expect(response.body.data.quoteCurrency).toBe('EUR')
    })
  })

  describe('GET /api/v1/market/depth - Market Depth', () => {
    test('should return 200 with market depth data', async () => {
      const response = await apiClient.getMarketDepth()
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Verify response structure
      expect(response.body.data).toHaveProperty('pair')
      expect(response.body.data).toHaveProperty('baseCurrency')
      expect(response.body.data).toHaveProperty('quoteCurrency')
      expect(response.body.data).toHaveProperty('bids')
      expect(response.body.data).toHaveProperty('asks')
      expect(response.body.data).toHaveProperty('spread')
      expect(response.body.data).toHaveProperty('lastUpdated')
      expect(response.body.data).toHaveProperty('levels')
      
      // Verify arrays
      expect(Array.isArray(response.body.data.bids)).toBe(true)
      expect(Array.isArray(response.body.data.asks)).toBe(true)
      
      // Verify spread object
      expect(response.body.data.spread).toHaveProperty('absolute')
      expect(response.body.data.spread).toHaveProperty('percentage')
      
      expect(response.body.message).toBe('Market depth retrieved successfully')
    })

    test('should support currency parameters', async () => {
      const response = await apiClient.getMarketDepth({ 
        baseCurrency: 'EUR', 
        quoteCurrency: 'AOA' 
      })
      
      expect(response.status).toBe(200)
      expect(response.body.data.baseCurrency).toBe('EUR')
      expect(response.body.data.quoteCurrency).toBe('AOA')
    })

    test('should support levels parameter', async () => {
      const response = await apiClient.getMarketDepth({ levels: 5 })
      
      expect(response.status).toBe(200)
      expect(response.body.data.levels).toBe(5)
      expect(response.body.data.bids.length).toBeLessThanOrEqual(5)
      expect(response.body.data.asks.length).toBeLessThanOrEqual(5)
    })

    test('should validate levels parameter', async () => {
      const response = await apiClient.getMarketDepth({ levels: 100 }) // Max is 50
      
      expect(response.status).toBe(400)
      expectErrorResponse(response.body)
    })

    test('should not require authentication', async () => {
      const response = await apiClient.getMarketDepth()
      expect(response.status).toBe(200)
    })
  })
})
