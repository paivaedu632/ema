/**
 * API Client for Testing
 * Provides utilities for making authenticated API requests in tests
 */

import request from 'supertest';
import { TestUser } from './user-factory';

export interface ApiResponse<T = any> {
  status: number;
  body: T;
  headers: Record<string, string>;
  responseTime: number;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  expectStatus?: number;
}

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || global.testConfig.apiBaseUrl;
    this.defaultTimeout = global.testConfig.apiTimeout;
  }

  /**
   * Make an authenticated GET request
   */
  async get<T = any>(
    endpoint: string,
    user?: TestUser,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest('GET', endpoint, undefined, user, options);
  }

  /**
   * Make an authenticated POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    user?: TestUser,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest('POST', endpoint, data, user, options);
  }

  /**
   * Make an authenticated PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    user?: TestUser,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest('PUT', endpoint, data, user, options);
  }

  /**
   * Make an authenticated DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    user?: TestUser,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest('DELETE', endpoint, undefined, user, options);
  }

  /**
   * Make a request without authentication
   */
  async publicGet<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest('GET', endpoint, undefined, undefined, options);
  }

  /**
   * Make a request with custom headers
   */
  async requestWithHeaders<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const customOptions = {
      ...options,
      headers: { ...options.headers, ...headers }
    };
    return this.makeRequest(method, endpoint, data, undefined, customOptions);
  }

  /**
   * Core request method
   */
  private async makeRequest<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    user?: TestUser,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    // Create the request
    let req = request(this.baseUrl)[method.toLowerCase()](endpoint);

    // Set timeout
    const timeout = options.timeout || this.defaultTimeout;
    req = req.timeout(timeout);

    // Set authentication header
    if (user) {
      req = req.set('Authorization', `Bearer ${user.accessToken}`);
    }

    // Set custom headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Set content type for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && data) {
      req = req.set('Content-Type', 'application/json');
      req = req.send(data);
    }

    try {
      const response = await req;
      const responseTime = Date.now() - startTime;

      // Check expected status if provided
      if (options.expectStatus && response.status !== options.expectStatus) {
        throw new Error(
          `Expected status ${options.expectStatus} but got ${response.status}. Response: ${JSON.stringify(response.body)}`
        );
      }

      return {
        status: response.status,
        body: response.body,
        headers: response.headers,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error.response) {
        // HTTP error response
        return {
          status: error.response.status,
          body: error.response.body,
          headers: error.response.headers,
          responseTime
        };
      }
      
      // Network or other error
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  /**
   * Test endpoint performance
   */
  async testPerformance<T = any>(
    method: string,
    endpoint: string,
    expectedMaxTime: number,
    user?: TestUser,
    data?: any
  ): Promise<{ response: ApiResponse<T>; passed: boolean }> {
    const response = await this.makeRequest(method, endpoint, data, user);
    const passed = response.responseTime <= expectedMaxTime;
    
    return { response, passed };
  }

  /**
   * Test concurrent requests
   */
  async testConcurrency<T = any>(
    method: string,
    endpoint: string,
    concurrentRequests: number,
    user?: TestUser,
    data?: any
  ): Promise<ApiResponse<T>[]> {
    const promises = Array(concurrentRequests)
      .fill(null)
      .map(() => this.makeRequest(method, endpoint, data, user));

    return Promise.all(promises);
  }

  /**
   * Test with invalid JWT token
   */
  async testWithInvalidToken<T = any>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    const options: ApiRequestOptions = {
      headers: {
        'Authorization': 'Bearer invalid-token-12345'
      }
    };
    
    return this.makeRequest(method, endpoint, data, undefined, options);
  }

  /**
   * Test with expired JWT token
   */
  async testWithExpiredToken<T = any>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    // Create an expired JWT token (this is a mock expired token)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
    
    const options: ApiRequestOptions = {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    };
    
    return this.makeRequest(method, endpoint, data, undefined, options);
  }

  /**
   * Test with malformed authorization header
   */
  async testWithMalformedAuth<T = any>(
    method: string,
    endpoint: string,
    authHeader: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    const options: ApiRequestOptions = {
      headers: {
        'Authorization': authHeader
      }
    };
    
    return this.makeRequest(method, endpoint, data, undefined, options);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
