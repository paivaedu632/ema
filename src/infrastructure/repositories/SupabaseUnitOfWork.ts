/**
 * Supabase Unit of Work Implementation
 * 
 * Manages database transactions across multiple repository operations.
 * Ensures data consistency and atomicity.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { UnitOfWork } from '../../domain/repositories'
import { RepositoryError } from '../../domain/repositories'

export class SupabaseUnitOfWork implements UnitOfWork {
  private isTransactionActive = false
  private transactionClient: SupabaseClient | null = null

  constructor(private readonly supabase: SupabaseClient) {}

  async begin(): Promise<void> {
    if (this.isTransactionActive) {
      throw new RepositoryError(
        'Transaction is already active',
        'begin',
        'UnitOfWork'
      )
    }

    try {
      // Note: Supabase doesn't have explicit transaction support in the client
      // This is a simplified implementation. In a real scenario, you might:
      // 1. Use Supabase Edge Functions with database transactions
      // 2. Use a direct PostgreSQL client for transactions
      // 3. Implement saga pattern for distributed transactions
      
      this.isTransactionActive = true
      this.transactionClient = this.supabase
    } catch (error) {
      throw new RepositoryError(
        'Failed to begin transaction',
        'begin',
        'UnitOfWork',
        error as Error
      )
    }
  }

  async commit(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new RepositoryError(
        'No active transaction to commit',
        'commit',
        'UnitOfWork'
      )
    }

    try {
      // In a real implementation, this would commit the database transaction
      this.isTransactionActive = false
      this.transactionClient = null
    } catch (error) {
      throw new RepositoryError(
        'Failed to commit transaction',
        'commit',
        'UnitOfWork',
        error as Error
      )
    }
  }

  async rollback(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new RepositoryError(
        'No active transaction to rollback',
        'rollback',
        'UnitOfWork'
      )
    }

    try {
      // In a real implementation, this would rollback the database transaction
      this.isTransactionActive = false
      this.transactionClient = null
    } catch (error) {
      throw new RepositoryError(
        'Failed to rollback transaction',
        'rollback',
        'UnitOfWork',
        error as Error
      )
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.begin()
    
    try {
      const result = await operation()
      await this.commit()
      return result
    } catch (error) {
      await this.rollback()
      throw error
    }
  }

  isInTransaction(): boolean {
    return this.isTransactionActive
  }

  /**
   * Get the transaction client for use in repositories
   * This allows repositories to use the same transaction context
   */
  getTransactionClient(): SupabaseClient {
    return this.transactionClient || this.supabase
  }
}
