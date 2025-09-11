/**
 * User Factory
 * Creates test users and manages test data
 */

import { createClient } from '@supabase/supabase-js'
import { TEST_CONFIG } from './test-helpers'

export interface TestUser {
  id: string
  email: string
  phone?: string
  fullName?: string
  pin?: string
  token?: string
}

export class UserFactory {
  private supabase
  private createdUsers: TestUser[] = []

  constructor() {
    this.supabase = createClient(
      TEST_CONFIG.SUPABASE_URL,
      TEST_CONFIG.SUPABASE_SERVICE_KEY
    )
  }

  // Create a test user with realistic data
  async createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const timestamp = Date.now()
    const defaultUser: TestUser = {
      id: `test-user-${timestamp}`,
      email: `test-${timestamp}@emapay.com`,
      phone: `+244900${String(timestamp).slice(-6)}`,
      fullName: `Test User ${timestamp}`,
      pin: '123456',
      ...overrides
    }

    // In a real implementation, you would create the user in the database
    // For now, we'll just track the user data
    this.createdUsers.push(defaultUser)
    
    return defaultUser
  }

  // Create multiple test users
  async createTestUsers(count: number): Promise<TestUser[]> {
    const users: TestUser[] = []
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser({
        email: `test-user-${i}-${Date.now()}@emapay.com`,
        fullName: `Test User ${i + 1}`
      })
      users.push(user)
    }
    return users
  }

  // Get a user by email
  getUserByEmail(email: string): TestUser | undefined {
    return this.createdUsers.find(user => user.email === email)
  }

  // Clean up all created test users
  async cleanup(): Promise<void> {
    // In a real implementation, you would delete users from the database
    // For now, we'll just clear the local array
    this.createdUsers = []
    console.log('Test users cleaned up')
  }

  // Get all created users
  getCreatedUsers(): TestUser[] {
    return [...this.createdUsers]
  }

  // Create a user with specific wallet balances
  async createUserWithBalance(
    currency: string,
    availableBalance: number,
    reservedBalance: number = 0,
    userOverrides: Partial<TestUser> = {}
  ): Promise<TestUser> {
    const user = await this.createTestUser(userOverrides)
    
    // In a real implementation, you would set up wallet balances in the database
    // For testing purposes, we'll add this info to the user object
    ;(user as any).walletBalances = {
      [currency]: {
        availableBalance,
        reservedBalance,
        totalBalance: availableBalance + reservedBalance
      }
    }
    
    return user
  }

  // Create a user with PIN already set
  async createUserWithPin(pin: string = '123456', userOverrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = await this.createTestUser({
      pin,
      ...userOverrides
    })
    
    // In a real implementation, you would set the PIN in the database
    ;(user as any).pinSet = true
    
    return user
  }

  // Create a pair of users for transfer testing
  async createTransferPair(): Promise<{ sender: TestUser; recipient: TestUser }> {
    const [sender, recipient] = await this.createTestUsers(2)
    
    // Set up sender with balance
    const senderWithBalance = await this.createUserWithBalance('EUR', 1000, 0, {
      id: sender.id,
      email: sender.email,
      fullName: 'Sender User',
      pin: '123456'
    })
    
    // Set up recipient
    const recipientUser: TestUser = {
      ...recipient,
      fullName: 'Recipient User',
      pin: '654321'
    }
    
    return {
      sender: senderWithBalance,
      recipient: recipientUser
    }
  }
}

// Export a default instance
export const userFactory = new UserFactory()
