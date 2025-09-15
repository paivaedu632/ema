/**
 * Supabase Transaction Repository Implementation
 * 
 * Implements TransactionRepository interface using Supabase as the data store.
 * Handles mapping between domain entities and database records.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { 
  TransactionRepository, 
  TransactionSearchCriteria 
} from '../../domain/repositories/TransactionRepository'
import { 
  Transaction, 
  TransactionSnapshot, 
  TransactionType, 
  TransactionStatus 
} from '../../domain/entities/Transaction'
import { TransactionId, UserId } from '../../domain/value-objects/EntityId'
import { Currency } from '../../domain/value-objects/Currency'
import { Money } from '../../domain/value-objects/Money'
import { EntityNotFoundError, RepositoryError } from '../../domain/repositories'

interface DatabaseTransaction {
  id: string
  type: string
  status: string
  sender_id: string
  recipient_id?: string
  amount: number
  fee: number
  net_amount: number
  currency: string
  description?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  completed_at?: string
}

export class SupabaseTransactionRepository implements TransactionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: TransactionId): Promise<Transaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('id', id.value)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new RepositoryError(
          `Failed to find transaction by ID: ${error.message}`,
          'findById',
          'Transaction',
          error
        )
      }

      return this.mapToDomain(data)
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transaction by ID`,
        'findById',
        'Transaction',
        error as Error
      )
    }
  }

  async findByUserId(userId: UserId): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .or(`sender_id.eq.${userId.value},recipient_id.eq.${userId.value}`)
        .order('created_at', { ascending: false })

      if (error) {
        throw new RepositoryError(
          `Failed to find transactions by user ID: ${error.message}`,
          'findByUserId',
          'Transaction',
          error
        )
      }

      return data.map(transaction => this.mapToDomain(transaction))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transactions by user ID`,
        'findByUserId',
        'Transaction',
        error as Error
      )
    }
  }

  async findByUserIdWithPagination(
    userId: UserId,
    offset: number,
    limit: number,
    orderBy: 'created_at' | 'updated_at' | 'amount' = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{
    transactions: Transaction[]
    total: number
    hasMore: boolean
  }> {
    try {
      const { data, error, count } = await this.supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .or(`sender_id.eq.${userId.value},recipient_id.eq.${userId.value}`)
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new RepositoryError(
          `Failed to find transactions with pagination: ${error.message}`,
          'findByUserIdWithPagination',
          'Transaction',
          error
        )
      }

      const transactions = data.map(transaction => this.mapToDomain(transaction))
      const total = count || 0
      const hasMore = offset + limit < total

      return { transactions, total, hasMore }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transactions with pagination`,
        'findByUserIdWithPagination',
        'Transaction',
        error as Error
      )
    }
  }

  async save(transaction: Transaction): Promise<void> {
    try {
      const snapshot = transaction.toSnapshot()
      const dbTransaction = this.mapToDatabase(snapshot)

      const { error } = await this.supabase
        .from('transactions')
        .upsert(dbTransaction, {
          onConflict: 'id'
        })

      if (error) {
        throw new RepositoryError(
          `Failed to save transaction: ${error.message}`,
          'save',
          'Transaction',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error saving transaction`,
        'save',
        'Transaction',
        error as Error
      )
    }
  }

  async saveMany(transactions: Transaction[]): Promise<void> {
    try {
      const dbTransactions = transactions.map(transaction => 
        this.mapToDatabase(transaction.toSnapshot())
      )

      const { error } = await this.supabase
        .from('transactions')
        .upsert(dbTransactions, {
          onConflict: 'id'
        })

      if (error) {
        throw new RepositoryError(
          `Failed to save multiple transactions: ${error.message}`,
          'saveMany',
          'Transaction',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error saving multiple transactions`,
        'saveMany',
        'Transaction',
        error as Error
      )
    }
  }

  async delete(id: TransactionId): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('transactions')
        .delete()
        .eq('id', id.value)

      if (error) {
        throw new RepositoryError(
          `Failed to delete transaction: ${error.message}`,
          'delete',
          'Transaction',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error deleting transaction`,
        'delete',
        'Transaction',
        error as Error
      )
    }
  }

  async findByCriteria(criteria: TransactionSearchCriteria): Promise<Transaction[]> {
    try {
      let query = this.supabase.from('transactions').select('*')

      // Apply filters based on criteria
      query = this.applyCriteriaFilters(query, criteria)

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new RepositoryError(
          `Failed to find transactions by criteria: ${error.message}`,
          'findByCriteria',
          'Transaction',
          error
        )
      }

      return data.map(transaction => this.mapToDomain(transaction))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transactions by criteria`,
        'findByCriteria',
        'Transaction',
        error as Error
      )
    }
  }

  async findByCriteriaWithPagination(
    criteria: TransactionSearchCriteria,
    offset: number,
    limit: number,
    orderBy: 'created_at' | 'updated_at' | 'amount' = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{
    transactions: Transaction[]
    total: number
    hasMore: boolean
  }> {
    try {
      let query = this.supabase
        .from('transactions')
        .select('*', { count: 'exact' })

      // Apply filters based on criteria
      query = this.applyCriteriaFilters(query, criteria)

      const { data, error, count } = await query
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new RepositoryError(
          `Failed to find transactions by criteria with pagination: ${error.message}`,
          'findByCriteriaWithPagination',
          'Transaction',
          error
        )
      }

      const transactions = data.map(transaction => this.mapToDomain(transaction))
      const total = count || 0
      const hasMore = offset + limit < total

      return { transactions, total, hasMore }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transactions by criteria with pagination`,
        'findByCriteriaWithPagination',
        'Transaction',
        error as Error
      )
    }
  }

  async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) {
        throw new RepositoryError(
          `Failed to find transactions by status: ${error.message}`,
          'findByStatus',
          'Transaction',
          error
        )
      }

      return data.map(transaction => this.mapToDomain(transaction))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transactions by status`,
        'findByStatus',
        'Transaction',
        error as Error
      )
    }
  }

  async findByType(type: TransactionType): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })

      if (error) {
        throw new RepositoryError(
          `Failed to find transactions by type: ${error.message}`,
          'findByType',
          'Transaction',
          error
        )
      }

      return data.map(transaction => this.mapToDomain(transaction))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transactions by type`,
        'findByType',
        'Transaction',
        error as Error
      )
    }
  }

  async findPendingOlderThan(minutes: number): Promise<Transaction[]> {
    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)

      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', cutoffTime.toISOString())

      if (error) {
        throw new RepositoryError(
          `Failed to find pending transactions older than ${minutes} minutes: ${error.message}`,
          'findPendingOlderThan',
          'Transaction',
          error
        )
      }

      return data.map(transaction => this.mapToDomain(transaction))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding pending transactions older than ${minutes} minutes`,
        'findPendingOlderThan',
        'Transaction',
        error as Error
      )
    }
  }

  async getUserTransactionStatistics(
    userId: UserId,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalTransactions: number
    totalAmountByCurrency: Map<Currency, Money>
    totalFeesByCurrency: Map<Currency, Money>
    transactionsByType: Map<TransactionType, number>
    transactionsByStatus: Map<TransactionStatus, number>
    averageTransactionAmount: Map<Currency, Money>
  }> {
    try {
      let query = this.supabase
        .from('transactions')
        .select('*')
        .or(`sender_id.eq.${userId.value},recipient_id.eq.${userId.value}`)

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw new RepositoryError(
          `Failed to get user transaction statistics: ${error.message}`,
          'getUserTransactionStatistics',
          'Transaction',
          error
        )
      }

      return this.calculateStatistics(data)
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error getting user transaction statistics`,
        'getUserTransactionStatistics',
        'Transaction',
        error as Error
      )
    }
  }

  async getSystemTransactionStatistics(
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalTransactions: number
    totalVolumeByCurrency: Map<Currency, Money>
    totalFeesByCurrency: Map<Currency, Money>
    transactionsByType: Map<TransactionType, number>
    transactionsByStatus: Map<TransactionStatus, number>
    uniqueUsers: number
  }> {
    try {
      let query = this.supabase.from('transactions').select('*')

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw new RepositoryError(
          `Failed to get system transaction statistics: ${error.message}`,
          'getSystemTransactionStatistics',
          'Transaction',
          error
        )
      }

      const stats = this.calculateStatistics(data)
      const uniqueUsers = new Set([
        ...data.map(t => t.sender_id),
        ...data.filter(t => t.recipient_id).map(t => t.recipient_id!)
      ]).size

      return {
        totalTransactions: stats.totalTransactions,
        totalVolumeByCurrency: stats.totalAmountByCurrency,
        totalFeesByCurrency: stats.totalFeesByCurrency,
        transactionsByType: stats.transactionsByType,
        transactionsByStatus: stats.transactionsByStatus,
        uniqueUsers
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error getting system transaction statistics`,
        'getSystemTransactionStatistics',
        'Transaction',
        error as Error
      )
    }
  }

  async findBetweenUsers(
    userId1: UserId,
    userId2: UserId,
    dateRange?: { start: Date; end: Date }
  ): Promise<Transaction[]> {
    try {
      let query = this.supabase
        .from('transactions')
        .select('*')
        .or(`and(sender_id.eq.${userId1.value},recipient_id.eq.${userId2.value}),and(sender_id.eq.${userId2.value},recipient_id.eq.${userId1.value})`)

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new RepositoryError(
          `Failed to find transactions between users: ${error.message}`,
          'findBetweenUsers',
          'Transaction',
          error
        )
      }

      return data.map(transaction => this.mapToDomain(transaction))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transactions between users`,
        'findBetweenUsers',
        'Transaction',
        error as Error
      )
    }
  }

  async getDailyTransactionVolume(
    startDate: Date,
    endDate: Date,
    currency?: Currency
  ): Promise<Array<{
    date: Date
    volume: Money
    transactionCount: number
  }>> {
    try {
      let query = this.supabase
        .from('transactions')
        .select('created_at, amount, currency')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed')

      if (currency) {
        query = query.eq('currency', currency.code)
      }

      const { data, error } = await query

      if (error) {
        throw new RepositoryError(
          `Failed to get daily transaction volume: ${error.message}`,
          'getDailyTransactionVolume',
          'Transaction',
          error
        )
      }

      // Group by date and calculate volume
      const dailyVolume = new Map<string, { volume: number; count: number; currency: string }>()

      for (const transaction of data) {
        const date = new Date(transaction.created_at).toISOString().split('T')[0]
        const existing = dailyVolume.get(date) || { volume: 0, count: 0, currency: transaction.currency }

        dailyVolume.set(date, {
          volume: existing.volume + transaction.amount,
          count: existing.count + 1,
          currency: transaction.currency
        })
      }

      return Array.from(dailyVolume.entries()).map(([dateStr, stats]) => ({
        date: new Date(dateStr),
        volume: Money.fromNumber(stats.volume, Currency.fromCode(stats.currency)),
        transactionCount: stats.count
      }))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error getting daily transaction volume`,
        'getDailyTransactionVolume',
        'Transaction',
        error as Error
      )
    }
  }

  async findTransactionsNeedingProcessing(): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true })

      if (error) {
        throw new RepositoryError(
          `Failed to find transactions needing processing: ${error.message}`,
          'findTransactionsNeedingProcessing',
          'Transaction',
          error
        )
      }

      return data.map(transaction => this.mapToDomain(transaction))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding transactions needing processing`,
        'findTransactionsNeedingProcessing',
        'Transaction',
        error as Error
      )
    }
  }

  async countByStatus(status: TransactionStatus): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)

      if (error) {
        throw new RepositoryError(
          `Failed to count transactions by status: ${error.message}`,
          'countByStatus',
          'Transaction',
          error
        )
      }

      return count || 0
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error counting transactions by status`,
        'countByStatus',
        'Transaction',
        error as Error
      )
    }
  }

  async findRecentByUserId(userId: UserId, limit: number): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .or(`sender_id.eq.${userId.value},recipient_id.eq.${userId.value}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new RepositoryError(
          `Failed to find recent transactions: ${error.message}`,
          'findRecentByUserId',
          'Transaction',
          error
        )
      }

      return data.map(transaction => this.mapToDomain(transaction))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding recent transactions`,
        'findRecentByUserId',
        'Transaction',
        error as Error
      )
    }
  }

  /**
   * Apply search criteria filters to query
   */
  private applyCriteriaFilters(query: any, criteria: TransactionSearchCriteria): any {
    if (criteria.userId) {
      query = query.or(`sender_id.eq.${criteria.userId.value},recipient_id.eq.${criteria.userId.value}`)
    }

    if (criteria.type) {
      query = query.eq('type', criteria.type)
    }

    if (criteria.status) {
      query = query.eq('status', criteria.status)
    }

    if (criteria.currency) {
      query = query.eq('currency', criteria.currency.code)
    }

    if (criteria.amountRange) {
      query = query
        .gte('amount', criteria.amountRange.min.amount)
        .lte('amount', criteria.amountRange.max.amount)
    }

    if (criteria.dateRange) {
      query = query
        .gte('created_at', criteria.dateRange.start.toISOString())
        .lte('created_at', criteria.dateRange.end.toISOString())
    }

    if (criteria.recipientId) {
      query = query.eq('recipient_id', criteria.recipientId.value)
    }

    return query
  }

  /**
   * Calculate statistics from transaction data
   */
  private calculateStatistics(data: DatabaseTransaction[]): {
    totalTransactions: number
    totalAmountByCurrency: Map<Currency, Money>
    totalFeesByCurrency: Map<Currency, Money>
    transactionsByType: Map<TransactionType, number>
    transactionsByStatus: Map<TransactionStatus, number>
    averageTransactionAmount: Map<Currency, Money>
  } {
    const totalAmountByCurrency = new Map<Currency, Money>()
    const totalFeesByCurrency = new Map<Currency, Money>()
    const transactionsByType = new Map<TransactionType, number>()
    const transactionsByStatus = new Map<TransactionStatus, number>()
    const transactionCountByCurrency = new Map<Currency, number>()

    for (const transaction of data) {
      const currency = Currency.fromCode(transaction.currency)
      const type = transaction.type as TransactionType
      const status = transaction.status as TransactionStatus

      // Aggregate amounts
      const currentAmount = totalAmountByCurrency.get(currency) || Money.zero(currency)
      totalAmountByCurrency.set(currency, currentAmount.add(Money.fromNumber(transaction.amount, currency)))

      // Aggregate fees
      const currentFees = totalFeesByCurrency.get(currency) || Money.zero(currency)
      totalFeesByCurrency.set(currency, currentFees.add(Money.fromNumber(transaction.fee, currency)))

      // Count by type
      transactionsByType.set(type, (transactionsByType.get(type) || 0) + 1)

      // Count by status
      transactionsByStatus.set(status, (transactionsByStatus.get(status) || 0) + 1)

      // Count transactions per currency for average calculation
      transactionCountByCurrency.set(currency, (transactionCountByCurrency.get(currency) || 0) + 1)
    }

    // Calculate averages
    const averageTransactionAmount = new Map<Currency, Money>()
    for (const [currency, totalAmount] of totalAmountByCurrency) {
      const count = transactionCountByCurrency.get(currency) || 1
      averageTransactionAmount.set(currency, totalAmount.divide(count))
    }

    return {
      totalTransactions: data.length,
      totalAmountByCurrency,
      totalFeesByCurrency,
      transactionsByType,
      transactionsByStatus,
      averageTransactionAmount
    }
  }

  /**
   * Map database record to domain entity
   */
  private mapToDomain(dbTransaction: DatabaseTransaction): Transaction {
    const currency = Currency.fromCode(dbTransaction.currency)
    const amount = Money.fromNumber(dbTransaction.amount, currency)
    const fee = Money.fromNumber(dbTransaction.fee, currency)

    const snapshot: TransactionSnapshot = {
      id: TransactionId.fromString(dbTransaction.id),
      type: dbTransaction.type as TransactionType,
      status: dbTransaction.status as TransactionStatus,
      senderId: UserId.fromString(dbTransaction.sender_id),
      recipientId: dbTransaction.recipient_id ? UserId.fromString(dbTransaction.recipient_id) : undefined,
      amount,
      fee,
      netAmount: Money.fromNumber(dbTransaction.net_amount, currency),
      currency,
      description: dbTransaction.description,
      metadata: dbTransaction.metadata,
      createdAt: new Date(dbTransaction.created_at),
      updatedAt: new Date(dbTransaction.updated_at),
      completedAt: dbTransaction.completed_at ? new Date(dbTransaction.completed_at) : undefined
    }

    return Transaction.fromSnapshot(snapshot)
  }

  /**
   * Map domain entity to database record
   */
  private mapToDatabase(snapshot: TransactionSnapshot): Partial<DatabaseTransaction> {
    return {
      id: snapshot.id.value,
      type: snapshot.type,
      status: snapshot.status,
      sender_id: snapshot.senderId.value,
      recipient_id: snapshot.recipientId?.value,
      amount: snapshot.amount.amount,
      fee: snapshot.fee.amount,
      net_amount: snapshot.netAmount.amount,
      currency: snapshot.currency.code,
      description: snapshot.description,
      metadata: snapshot.metadata,
      created_at: snapshot.createdAt.toISOString(),
      updated_at: snapshot.updatedAt.toISOString(),
      completed_at: snapshot.completedAt?.toISOString()
    }
  }
}
