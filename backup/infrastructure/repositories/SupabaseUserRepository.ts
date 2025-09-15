/**
 * Supabase User Repository Implementation
 * 
 * Implements UserRepository interface using Supabase as the data store.
 * Handles mapping between domain entities and database records.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { UserRepository } from '../../domain/repositories/UserRepository'
import { User, UserSnapshot, KycStatus, UserLimits } from '../../domain/entities/User'
import { UserId } from '../../domain/value-objects/EntityId'
import { Money } from '../../domain/value-objects/Money'
import { Currency } from '../../domain/value-objects/Currency'
import { EntityNotFoundError, RepositoryError } from '../../domain/repositories'

interface DatabaseUser {
  id: string
  clerk_user_id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  kyc_status?: string
  created_at: string
  updated_at: string
  // Note: limit fields don't exist in current database schema
  // Using default values in mapToDomain method
}

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: UserId): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id.value)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new RepositoryError(
          `Failed to find user by ID: ${error.message}`,
          'findById',
          'User',
          error
        )
      }

      return this.mapToDomain(data)
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding user by ID`,
        'findById',
        'User',
        error as Error
      )
    }
  }

  async findByClerkId(clerkUserId: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new RepositoryError(
          `Failed to find user by Clerk ID: ${error.message}`,
          'findByClerkId',
          'User',
          error
        )
      }

      return this.mapToDomain(data)
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding user by Clerk ID`,
        'findByClerkId',
        'User',
        error as Error
      )
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new RepositoryError(
          `Failed to find user by email: ${error.message}`,
          'findByEmail',
          'User',
          error
        )
      }

      return this.mapToDomain(data)
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding user by email`,
        'findByEmail',
        'User',
        error as Error
      )
    }
  }

  async save(user: User): Promise<void> {
    try {
      const snapshot = user.toSnapshot()
      const dbUser = this.mapToDatabase(snapshot)

      const { error } = await this.supabase
        .from('users')
        .upsert(dbUser, {
          onConflict: 'id'
        })

      if (error) {
        throw new RepositoryError(
          `Failed to save user: ${error.message}`,
          'save',
          'User',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error saving user`,
        'save',
        'User',
        error as Error
      )
    }
  }

  async delete(id: UserId): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id.value)

      if (error) {
        throw new RepositoryError(
          `Failed to delete user: ${error.message}`,
          'delete',
          'User',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error deleting user`,
        'delete',
        'User',
        error as Error
      )
    }
  }

  async existsByEmail(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new RepositoryError(
          `Failed to check user existence by email: ${error.message}`,
          'existsByEmail',
          'User',
          error
        )
      }

      return data !== null
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error checking user existence by email`,
        'existsByEmail',
        'User',
        error as Error
      )
    }
  }

  async existsByClerkId(clerkUserId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new RepositoryError(
          `Failed to check user existence by Clerk ID: ${error.message}`,
          'existsByClerkId',
          'User',
          error
        )
      }

      return data !== null
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error checking user existence by Clerk ID`,
        'existsByClerkId',
        'User',
        error as Error
      )
    }
  }

  async findByKycStatus(status: string): Promise<User[]> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('kyc_status', status)

      if (error) {
        throw new RepositoryError(
          `Failed to find users by KYC status: ${error.message}`,
          'findByKycStatus',
          'User',
          error
        )
      }

      return data.map(user => this.mapToDomain(user))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding users by KYC status`,
        'findByKycStatus',
        'User',
        error as Error
      )
    }
  }

  async findByCreatedDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) {
        throw new RepositoryError(
          `Failed to find users by date range: ${error.message}`,
          'findByCreatedDateRange',
          'User',
          error
        )
      }

      return data.map(user => this.mapToDomain(user))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding users by date range`,
        'findByCreatedDateRange',
        'User',
        error as Error
      )
    }
  }

  async count(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (error) {
        throw new RepositoryError(
          `Failed to count users: ${error.message}`,
          'count',
          'User',
          error
        )
      }

      return count || 0
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error counting users`,
        'count',
        'User',
        error as Error
      )
    }
  }

  async findWithPagination(
    offset: number,
    limit: number,
    orderBy: 'created_at' | 'updated_at' | 'email' = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{
    users: User[]
    total: number
    hasMore: boolean
  }> {
    try {
      const { data, error, count } = await this.supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new RepositoryError(
          `Failed to find users with pagination: ${error.message}`,
          'findWithPagination',
          'User',
          error
        )
      }

      const users = data.map(user => this.mapToDomain(user))
      const total = count || 0
      const hasMore = offset + limit < total

      return { users, total, hasMore }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding users with pagination`,
        'findWithPagination',
        'User',
        error as Error
      )
    }
  }

  /**
   * Map database record to domain entity
   */
  private mapToDomain(dbUser: DatabaseUser): User {
    // Use default limits since the database doesn't have limit columns yet
    const limits: UserLimits = {
      dailyTransactionLimit: Money.fromNumber(10000, Currency.EUR()), // €10,000 daily limit
      monthlyTransactionLimit: Money.fromNumber(50000, Currency.EUR()), // €50,000 monthly limit
      singleTransactionLimit: Money.fromNumber(5000, Currency.EUR()), // €5,000 single transaction limit
      withdrawalLimit: Money.fromNumber(2000, Currency.EUR()) // €2,000 withdrawal limit
    }

    const snapshot: UserSnapshot = {
      id: UserId.fromString(dbUser.id),
      clerkUserId: dbUser.clerk_user_id,
      email: dbUser.email,
      fullName: dbUser.first_name && dbUser.last_name ? `${dbUser.first_name} ${dbUser.last_name}` : dbUser.email,
      phoneNumber: dbUser.phone,
      kycStatus: (dbUser.kyc_status as KycStatus) || 'PENDING',
      kycCompletedAt: undefined, // Not available in current schema
      isActive: true, // Default to active since is_active field doesn't exist
      limits,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
      lastLoginAt: undefined // Not available in current schema
    }

    return User.fromSnapshot(snapshot)
  }

  /**
   * Map domain entity to database record
   */
  private mapToDatabase(snapshot: UserSnapshot): Partial<DatabaseUser> {
    return {
      id: snapshot.id.value,
      clerk_user_id: snapshot.clerkUserId,
      email: snapshot.email.toLowerCase(),
      full_name: snapshot.fullName,
      phone_number: snapshot.phoneNumber,
      kyc_status: snapshot.kycStatus,
      kyc_completed_at: snapshot.kycCompletedAt?.toISOString(),
      is_active: snapshot.isActive,
      daily_transaction_limit: snapshot.limits.dailyTransactionLimit.amount,
      monthly_transaction_limit: snapshot.limits.monthlyTransactionLimit.amount,
      single_transaction_limit: snapshot.limits.singleTransactionLimit.amount,
      withdrawal_limit: snapshot.limits.withdrawalLimit.amount,
      created_at: snapshot.createdAt.toISOString(),
      updated_at: snapshot.updatedAt.toISOString(),
      last_login_at: snapshot.lastLoginAt?.toISOString()
    }
  }
}
