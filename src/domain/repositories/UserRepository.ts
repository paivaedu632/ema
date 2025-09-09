/**
 * User Repository Interface
 * 
 * Defines the contract for user data access operations.
 * This interface abstracts the data layer from the domain layer.
 */

import { User, UserSnapshot } from '../entities/User'
import { UserId } from '../value-objects/EntityId'

export interface UserRepository {
  /**
   * Find user by ID
   */
  findById(id: UserId): Promise<User | null>

  /**
   * Find user by Clerk user ID
   */
  findByClerkId(clerkUserId: string): Promise<User | null>

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>

  /**
   * Save user (create or update)
   */
  save(user: User): Promise<void>

  /**
   * Delete user
   */
  delete(id: UserId): Promise<void>

  /**
   * Check if user exists by email
   */
  existsByEmail(email: string): Promise<boolean>

  /**
   * Check if user exists by Clerk ID
   */
  existsByClerkId(clerkUserId: string): Promise<boolean>

  /**
   * Find users by KYC status
   */
  findByKycStatus(status: string): Promise<User[]>

  /**
   * Find users created within date range
   */
  findByCreatedDateRange(startDate: Date, endDate: Date): Promise<User[]>

  /**
   * Count total users
   */
  count(): Promise<number>

  /**
   * Find users with pagination
   */
  findWithPagination(
    offset: number,
    limit: number,
    orderBy?: 'created_at' | 'updated_at' | 'email',
    orderDirection?: 'asc' | 'desc'
  ): Promise<{
    users: User[]
    total: number
    hasMore: boolean
  }>
}
