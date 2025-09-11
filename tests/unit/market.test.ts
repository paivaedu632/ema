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

  describe('GET /api/v1/market/summary - Market Summary', () => {
    test('should return 200 with market summary data', async () => {
      const response = await apiClient.getMarketSummary()
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Verify response structure
      expect(response.body.data).toHaveProperty('pairs')
      expect(response.body.data).toHaveProperty('timestamp')
      
      expect(Array.isArray(response.body.data.pairs)).toBe(true)
      expect(response.body.data.timestamp).toBeValidTimestamp()
      
      // Verify pair data structure
      if (response.body.data.pairs.length > 0) {
        const pair = response.body.data.pairs[0]
        expect(pair).toHaveProperty('pair')
        expect(pair).toHaveProperty('lastPrice')
        expect(pair).toHaveProperty('change24h')
        expect(pair).toHaveProperty('volume24h')
        expect(pair).toHaveProperty('high24h')
        expect(pair).toHaveProperty('low24h')
      }
      
      expect(response.body.message).toBe('Market summary retrieved successfully')
    })

    test('should not require authentication', async () => {
      const response = await apiClient.getMarketSummary()
      expect(response.status).toBe(200)
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
