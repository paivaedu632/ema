/**
 * Test User Factory
 * Creates test users with Supabase Auth tokens for testing
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  createdAt: string;
}

export interface CreateUserOptions {
  email?: string;
  password?: string;
  metadata?: Record<string, any>;
  emailConfirmed?: boolean;
}

export class UserFactory {
  private supabaseAdmin: any;
  private supabaseClient: any;
  private createdUsers: TestUser[] = [];

  constructor() {
    // Initialize Supabase clients
    this.supabaseAdmin = createClient(
      global.testConfig.supabaseUrl,
      global.testConfig.supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    this.supabaseClient = createClient(
      global.testConfig.supabaseUrl,
      global.testConfig.supabaseAnonKey
    );
  }

  /**
   * Generate a secure random password
   */
  private generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const bytes = randomBytes(16);
    
    for (let i = 0; i < 16; i++) {
      password += chars[bytes[i] % chars.length];
    }
    
    return password;
  }

  /**
   * Generate a test email address with better uniqueness
   */
  private generateEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const processId = process.pid || Math.floor(Math.random() * 10000);
    return `test-${timestamp}-${processId}-${random}@emapay.test`;
  }

  /**
   * Create a test user with authentication
   */
  async createUser(options: CreateUserOptions = {}): Promise<TestUser> {
    const email = options.email || this.generateEmail();
    const password = options.password || this.generatePassword();
    const emailConfirmed = options.emailConfirmed !== false; // Default to true

    try {
      // Create user using admin API
      const { data: adminData, error: adminError } = await this.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: emailConfirmed,
        user_metadata: {
          name: `Test User ${Date.now()}`,
          purpose: 'API Testing',
          created_for_test: true,
          ...options.metadata
        }
      });

      if (adminError) {
        throw new Error(`Failed to create user: ${adminError.message}`);
      }

      // Sign in as the user to get session tokens
      const { data: signInData, error: signInError } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw new Error(`Failed to sign in user: ${signInError.message}`);
      }

      if (!signInData.session?.access_token) {
        throw new Error('No access token received from sign in');
      }

      const testUser: TestUser = {
        id: adminData.user.id,
        email,
        password,
        accessToken: signInData.session.access_token,
        refreshToken: signInData.session.refresh_token,
        sessionId: signInData.session.user.id, // Use user ID as session identifier
        createdAt: new Date().toISOString()
      };

      // Track created user for cleanup
      this.createdUsers.push(testUser);

      return testUser;

    } catch (error) {
      throw new Error(`User creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create multiple test users
   */
  async createUsers(count: number, options: CreateUserOptions = {}): Promise<TestUser[]> {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const userOptions = {
        ...options,
        email: options.email ? `${i}-${options.email}` : undefined
      };
      
      const user = await this.createUser(userOptions);
      users.push(user);
    }
    
    return users;
  }

  /**
   * Refresh a user's access token
   */
  async refreshUserToken(user: TestUser): Promise<TestUser> {
    try {
      const { data, error } = await this.supabaseClient.auth.refreshSession({
        refresh_token: user.refreshToken
      });

      if (error) {
        throw new Error(`Token refresh failed: ${error.message}`);
      }

      if (!data.session?.access_token) {
        throw new Error('No access token received from refresh');
      }

      // Update user with new tokens
      user.accessToken = data.session.access_token;
      user.refreshToken = data.session.refresh_token;

      return user;

    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a test user
   */
  async deleteUser(user: TestUser): Promise<void> {
    try {
      const { error } = await this.supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (error) {
        console.warn(`Failed to delete user ${user.id}:`, error.message);
      }

      // Remove from tracking
      this.createdUsers = this.createdUsers.filter(u => u.id !== user.id);

    } catch (error) {
      console.warn(`Failed to delete user ${user.id}:`, error);
    }
  }

  /**
   * Clean up test users by email pattern (before tests)
   */
  async cleanupTestUsers(): Promise<void> {
    try {
      // Delete users with test email pattern
      const { data: users } = await this.supabase.auth.admin.listUsers();
      const testUsers = users.users.filter(user =>
        user.email?.includes('@emapay.test')
      );

      for (const user of testUsers) {
        try {
          await this.supabase.auth.admin.deleteUser(user.id);
        } catch (error) {
          console.warn(`Failed to delete test user ${user.id}:`, error);
        }
      }

      console.log(`🧹 Cleaned up ${testUsers.length} existing test users`);
    } catch (error) {
      console.warn('Failed to cleanup existing test users:', error);
    }
  }

  /**
   * Clean up all created users
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.createdUsers.length} test users...`);

    const deletePromises = this.createdUsers.map(user => this.deleteUser(user));
    await Promise.allSettled(deletePromises);

    this.createdUsers = [];
    console.log('✅ User cleanup completed');
  }

  /**
   * Get all created users
   */
  getCreatedUsers(): TestUser[] {
    return [...this.createdUsers];
  }

  /**
   * Create a user with specific wallet balances
   */
  async createUserWithBalance(
    eurBalance: number = 1000,
    aoaBalance: number = 500000,
    options: CreateUserOptions = {}
  ): Promise<TestUser> {
    const user = await this.createUser(options);

    try {
      // Create wallets with initial balances
      await this.supabaseAdmin
        .from('wallets')
        .upsert([
          {
            user_id: user.id,
            currency: 'EUR',
            available_balance: eurBalance,
            reserved_balance: 0,
            total_balance: eurBalance
          },
          {
            user_id: user.id,
            currency: 'AOA',
            available_balance: aoaBalance,
            reserved_balance: 0,
            total_balance: aoaBalance
          }
        ]);

      console.log(`💰 Created user ${user.email} with EUR: ${eurBalance}, AOA: ${aoaBalance}`);

    } catch (error) {
      console.warn(`Failed to set wallet balances for user ${user.id}:`, error);
    }

    return user;
  }
}

// Export singleton instance
export const userFactory = new UserFactory();
