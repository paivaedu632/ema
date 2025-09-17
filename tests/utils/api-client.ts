/**
 * API Test Client
 * Supertest wrapper for EmaPay API testing
 */

import * as request from 'supertest'
import { TEST_CONFIG, getAuthHeaders, ApiResponse } from './test-helpers'

// Create a test client instance
export function createTestClient() {
  return request(TEST_CONFIG.API_BASE_URL)
}

// API Client class for organized endpoint testing
export class ApiTestClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = TEST_CONFIG.API_BASE_URL) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }

  // Set authentication token for subsequent requests
  setAuthToken(token: string) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...getAuthHeaders(token)
    }
  }

  // Clear authentication
  clearAuth() {
    delete this.defaultHeaders['Authorization']
  }

  // Make raw request with custom headers (for testing edge cases)
  async makeRawRequest(method: string, path: string, headers: Record<string, string> = {}) {
    const req = request(this.baseUrl)

    switch (method.toUpperCase()) {
      case 'GET':
        return req.get(path).set(headers)
      case 'POST':
        return req.post(path).set(headers)
      case 'PUT':
        return req.put(path).set(headers)
      case 'DELETE':
        return req.delete(path).set(headers)
      default:
        throw new Error(`Unsupported HTTP method: ${method}`)
    }
  }

  // Health endpoints
  async getHealthStatus() {
    return request(this.baseUrl)
      .get('/api/v1/health/status')
      .set(this.defaultHeaders)
  }

  // Auth endpoints
  async getAuthMe(token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .get('/api/v1/auth/me')
      .set(headers)
  }

  // User endpoints
  async searchUsers(query: string, type?: string, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    const params = new URLSearchParams({ query })
    if (type) params.append('type', type)
    
    return request(this.baseUrl)
      .get(`/api/v1/users/search?${params.toString()}`)
      .set(headers)
  }

  // Wallet endpoints
  async getWalletBalance(token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .get('/api/v1/wallets/balance')
      .set(headers)
  }

  async getWalletByCurrency(currency: string, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .get(`/api/v1/wallets/${currency}`)
      .set(headers)
  }

  async getCurrencyBalance(currency: string, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .get(`/api/v1/wallets/${currency}`)
      .set(headers)
  }

  // Transfer endpoints
  async sendTransfer(transferData: any, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .post('/api/v1/transfers/send')
      .set(headers)
      .send(transferData)
  }

  async getTransferHistory(params: { page?: number; limit?: number; currency?: string } = {}, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.currency) queryParams.append('currency', params.currency)
    
    const queryString = queryParams.toString()
    const url = queryString ? `/api/v1/transfers/history?${queryString}` : '/api/v1/transfers/history'
    
    return request(this.baseUrl)
      .get(url)
      .set(headers)
  }

  // Order endpoints
  async placeLimitOrder(orderData: any, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .post('/api/v1/orders/limit')
      .set(headers)
      .send(orderData)
  }

  async placeMarketOrder(orderData: any, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .post('/api/v1/orders/market')
      .set(headers)
      .send(orderData)
  }

  // Generic order placement method
  async placeOrder(orderData: any, token?: string) {
    if (orderData.type === 'limit') {
      return this.placeLimitOrder(orderData, token)
    } else {
      return this.placeMarketOrder(orderData, token)
    }
  }

  async getOrderHistory(params: { page?: number; limit?: number; status?: string } = {}, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.status) queryParams.append('status', params.status)
    
    const queryString = queryParams.toString()
    const url = queryString ? `/api/v1/orders/history?${queryString}` : '/api/v1/orders/history'
    
    return request(this.baseUrl)
      .get(url)
      .set(headers)
  }

  // Exchange Rate endpoints
  async getMidpointExchangeRate(baseCurrency = 'EUR', quoteCurrency = 'AOA') {
    const params = new URLSearchParams({ baseCurrency, quoteCurrency });
    return request(this.baseUrl)
      .get(`/api/v1/exchange-rates/midpoint?${params}`)
      .set(this.defaultHeaders)
  }

  // Legacy endpoints for backward compatibility
  async getMarketSummary() {
    return this.getMidpointExchangeRate('EUR', 'AOA')
  }

  // Alias for getMarketSummary to match test expectations
  async getMarketPairs() {
    return this.getMarketSummary()
  }

  // Note: getMarketDepth removed - endpoint removed for simplicity

  // Security endpoints
  async setPin(pinData: any, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .post('/api/v1/security/pin')
      .set(headers)
      .send(pinData)
  }

  async verifyPin(pinData: any, token?: string) {
    const headers = token ? getAuthHeaders(token) : this.defaultHeaders
    return request(this.baseUrl)
      .post('/api/v1/security/pin/verify')
      .set(headers)
      .send(pinData)
  }
}

// Export a default instance
export const apiClient = new ApiTestClient()
