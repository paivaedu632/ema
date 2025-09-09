/**
 * Transaction Repository Interface
 * 
 * Defines the contract for transaction data access operations.
 * This interface abstracts the data layer from the domain layer.
 */

import { Transaction, TransactionSnapshot, TransactionType, TransactionStatus } from '../entities/Transaction'
import { TransactionId, UserId } from '../value-objects/EntityId'
import { Currency } from '../value-objects/Currency'
import { Money } from '../value-objects/Money'

export interface TransactionSearchCriteria {
  userId?: UserId
  type?: TransactionType
  status?: TransactionStatus
  currency?: Currency
  amountRange?: {
    min: Money
    max: Money
  }
  dateRange?: {
    start: Date
    end: Date
  }
  recipientId?: UserId
}

export interface TransactionRepository {
  /**
   * Find transaction by ID
   */
  findById(id: TransactionId): Promise<Transaction | null>

  /**
   * Find transactions by user ID
   */
  findByUserId(userId: UserId): Promise<Transaction[]>

  /**
   * Find transactions by user ID with pagination
   */
  findByUserIdWithPagination(
    userId: UserId,
    offset: number,
    limit: number,
    orderBy?: 'created_at' | 'updated_at' | 'amount',
    orderDirection?: 'asc' | 'desc'
  ): Promise<{
    transactions: Transaction[]
    total: number
    hasMore: boolean
  }>

  /**
   * Save transaction (create or update)
   */
  save(transaction: Transaction): Promise<void>

  /**
   * Save multiple transactions in a batch
   */
  saveMany(transactions: Transaction[]): Promise<void>

  /**
   * Delete transaction
   */
  delete(id: TransactionId): Promise<void>

  /**
   * Find transactions by criteria
   */
  findByCriteria(criteria: TransactionSearchCriteria): Promise<Transaction[]>

  /**
   * Find transactions by criteria with pagination
   */
  findByCriteriaWithPagination(
    criteria: TransactionSearchCriteria,
    offset: number,
    limit: number,
    orderBy?: 'created_at' | 'updated_at' | 'amount',
    orderDirection?: 'asc' | 'desc'
  ): Promise<{
    transactions: Transaction[]
    total: number
    hasMore: boolean
  }>

  /**
   * Find transactions by status
   */
  findByStatus(status: TransactionStatus): Promise<Transaction[]>

  /**
   * Find transactions by type
   */
  findByType(type: TransactionType): Promise<Transaction[]>

  /**
   * Find pending transactions older than specified time
   */
  findPendingOlderThan(minutes: number): Promise<Transaction[]>

  /**
   * Get transaction statistics for a user
   */
  getUserTransactionStatistics(
    userId: UserId,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalTransactions: number
    totalAmountByCurrency: Map<Currency, Money>
    totalFeesByCurrency: Map<Currency, Money>
    transactionsByType: Map<TransactionType, number>
    transactionsByStatus: Map<TransactionStatus, number>
    averageTransactionAmount: Map<Currency, Money>
  }>

  /**
   * Get system-wide transaction statistics
   */
  getSystemTransactionStatistics(
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalTransactions: number
    totalVolumeByCurrency: Map<Currency, Money>
    totalFeesByCurrency: Map<Currency, Money>
    transactionsByType: Map<TransactionType, number>
    transactionsByStatus: Map<TransactionStatus, number>
    uniqueUsers: number
  }>

  /**
   * Find transactions between two users
   */
  findBetweenUsers(
    userId1: UserId,
    userId2: UserId,
    dateRange?: { start: Date; end: Date }
  ): Promise<Transaction[]>

  /**
   * Get daily transaction volume for a date range
   */
  getDailyTransactionVolume(
    startDate: Date,
    endDate: Date,
    currency?: Currency
  ): Promise<Array<{
    date: Date
    volume: Money
    transactionCount: number
  }>>

  /**
   * Find transactions that need processing
   */
  findTransactionsNeedingProcessing(): Promise<Transaction[]>

  /**
   * Count transactions by status
   */
  countByStatus(status: TransactionStatus): Promise<number>

  /**
   * Find recent transactions for a user
   */
  findRecentByUserId(
    userId: UserId,
    limit: number
  ): Promise<Transaction[]>
}
