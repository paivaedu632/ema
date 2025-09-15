/**
 * Supabase Wallet Repository Implementation
 * 
 * Implements WalletRepository interface using Supabase as the data store.
 * Handles mapping between domain entities and database records.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { WalletRepository } from '../../domain/repositories/WalletRepository'
import { Wallet, WalletSnapshot } from '../../domain/entities/Wallet'
import { WalletId, UserId } from '../../domain/value-objects/EntityId'
import { Currency } from '../../domain/value-objects/Currency'
import { Money } from '../../domain/value-objects/Money'
import { EntityNotFoundError, RepositoryError } from '../../domain/repositories'

interface DatabaseWallet {
  id: string
  user_id: string
  currency: string
  available_balance: number
  reserved_balance: number
  created_at: string
  updated_at: string
}

export class SupabaseWalletRepository implements WalletRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: WalletId): Promise<Wallet | null> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('*')
        .eq('id', id.value)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new RepositoryError(
          `Failed to find wallet by ID: ${error.message}`,
          'findById',
          'Wallet',
          error
        )
      }

      return this.mapToDomain(data)
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding wallet by ID`,
        'findById',
        'Wallet',
        error as Error
      )
    }
  }

  async findByUserIdAndCurrency(userId: UserId, currency: Currency): Promise<Wallet | null> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId.value)
        .eq('currency', currency.code)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new RepositoryError(
          `Failed to find wallet by user and currency: ${error.message}`,
          'findByUserIdAndCurrency',
          'Wallet',
          error
        )
      }

      return this.mapToDomain(data)
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding wallet by user and currency`,
        'findByUserIdAndCurrency',
        'Wallet',
        error as Error
      )
    }
  }

  async findByUserId(userId: UserId): Promise<Wallet[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId.value)
        .order('currency')

      if (error) {
        throw new RepositoryError(
          `Failed to find wallets by user ID: ${error.message}`,
          'findByUserId',
          'Wallet',
          error
        )
      }

      return data.map(wallet => this.mapToDomain(wallet))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding wallets by user ID`,
        'findByUserId',
        'Wallet',
        error as Error
      )
    }
  }

  async save(wallet: Wallet): Promise<void> {
    try {
      const snapshot = wallet.toSnapshot()
      const dbWallet = this.mapToDatabase(snapshot)

      const { error } = await this.supabase
        .from('wallets')
        .upsert(dbWallet, {
          onConflict: 'id'
        })

      if (error) {
        throw new RepositoryError(
          `Failed to save wallet: ${error.message}`,
          'save',
          'Wallet',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error saving wallet`,
        'save',
        'Wallet',
        error as Error
      )
    }
  }

  async saveMany(wallets: Wallet[]): Promise<void> {
    try {
      const dbWallets = wallets.map(wallet => this.mapToDatabase(wallet.toSnapshot()))

      const { error } = await this.supabase
        .from('wallets')
        .upsert(dbWallets, {
          onConflict: 'id'
        })

      if (error) {
        throw new RepositoryError(
          `Failed to save multiple wallets: ${error.message}`,
          'saveMany',
          'Wallet',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error saving multiple wallets`,
        'saveMany',
        'Wallet',
        error as Error
      )
    }
  }

  async delete(id: WalletId): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('wallets')
        .delete()
        .eq('id', id.value)

      if (error) {
        throw new RepositoryError(
          `Failed to delete wallet: ${error.message}`,
          'delete',
          'Wallet',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error deleting wallet`,
        'delete',
        'Wallet',
        error as Error
      )
    }
  }

  async existsByUserIdAndCurrency(userId: UserId, currency: Currency): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId.value)
        .eq('currency', currency.code)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new RepositoryError(
          `Failed to check wallet existence: ${error.message}`,
          'existsByUserIdAndCurrency',
          'Wallet',
          error
        )
      }

      return data !== null
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error checking wallet existence`,
        'existsByUserIdAndCurrency',
        'Wallet',
        error as Error
      )
    }
  }

  async getTotalBalanceByUserId(userId: UserId): Promise<Map<Currency, Money>> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('currency, available_balance, reserved_balance')
        .eq('user_id', userId.value)

      if (error) {
        throw new RepositoryError(
          `Failed to get total balance by user ID: ${error.message}`,
          'getTotalBalanceByUserId',
          'Wallet',
          error
        )
      }

      const balanceMap = new Map<Currency, Money>()
      
      for (const wallet of data) {
        const currency = Currency.fromCode(wallet.currency)
        const totalBalance = wallet.available_balance + wallet.reserved_balance
        balanceMap.set(currency, Money.fromNumber(totalBalance, currency))
      }

      return balanceMap
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error getting total balance by user ID`,
        'getTotalBalanceByUserId',
        'Wallet',
        error as Error
      )
    }
  }

  async findWithBalanceAbove(currency: Currency, threshold: Money): Promise<Wallet[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('*')
        .eq('currency', currency.code)
        .gt('available_balance', threshold.amount)

      if (error) {
        throw new RepositoryError(
          `Failed to find wallets with balance above threshold: ${error.message}`,
          'findWithBalanceAbove',
          'Wallet',
          error
        )
      }

      return data.map(wallet => this.mapToDomain(wallet))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding wallets with balance above threshold`,
        'findWithBalanceAbove',
        'Wallet',
        error as Error
      )
    }
  }

  async findWithReservedBalance(currency: Currency): Promise<Wallet[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('*')
        .eq('currency', currency.code)
        .gt('reserved_balance', 0)

      if (error) {
        throw new RepositoryError(
          `Failed to find wallets with reserved balance: ${error.message}`,
          'findWithReservedBalance',
          'Wallet',
          error
        )
      }

      return data.map(wallet => this.mapToDomain(wallet))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding wallets with reserved balance`,
        'findWithReservedBalance',
        'Wallet',
        error as Error
      )
    }
  }

  async getWalletStatistics(): Promise<{
    totalWallets: number
    totalBalanceByCurrency: Map<Currency, Money>
    totalReservedByurrency: Map<Currency, Money>
    activeWallets: number
  }> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('currency, available_balance, reserved_balance')

      if (error) {
        throw new RepositoryError(
          `Failed to get wallet statistics: ${error.message}`,
          'getWalletStatistics',
          'Wallet',
          error
        )
      }

      const totalBalanceByCurrency = new Map<Currency, Money>()
      const totalReservedByurrency = new Map<Currency, Money>()
      let activeWallets = 0

      for (const wallet of data) {
        const currency = Currency.fromCode(wallet.currency)
        
        // Aggregate total balances
        const currentTotal = totalBalanceByCurrency.get(currency) || Money.zero(currency)
        const newTotal = currentTotal.add(Money.fromNumber(wallet.available_balance, currency))
        totalBalanceByCurrency.set(currency, newTotal)

        // Aggregate reserved balances
        const currentReserved = totalReservedByurrency.get(currency) || Money.zero(currency)
        const newReserved = currentReserved.add(Money.fromNumber(wallet.reserved_balance, currency))
        totalReservedByurrency.set(currency, newReserved)

        // Count active wallets (with any balance)
        if (wallet.available_balance > 0 || wallet.reserved_balance > 0) {
          activeWallets++
        }
      }

      return {
        totalWallets: data.length,
        totalBalanceByCurrency,
        totalReservedByurrency,
        activeWallets
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error getting wallet statistics`,
        'getWalletStatistics',
        'Wallet',
        error as Error
      )
    }
  }

  async findUpdatedWithinRange(startDate: Date, endDate: Date): Promise<Wallet[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('*')
        .gte('updated_at', startDate.toISOString())
        .lte('updated_at', endDate.toISOString())

      if (error) {
        throw new RepositoryError(
          `Failed to find wallets updated within range: ${error.message}`,
          'findUpdatedWithinRange',
          'Wallet',
          error
        )
      }

      return data.map(wallet => this.mapToDomain(wallet))
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error finding wallets updated within range`,
        'findUpdatedWithinRange',
        'Wallet',
        error as Error
      )
    }
  }

  async updateBalance(
    walletId: WalletId,
    availableBalanceChange: Money,
    reservedBalanceChange: Money
  ): Promise<void> {
    try {
      // This would ideally use a stored procedure for atomic updates
      const { error } = await this.supabase.rpc('update_wallet_balance', {
        wallet_id: walletId.value,
        available_change: availableBalanceChange.amount,
        reserved_change: reservedBalanceChange.amount
      })

      if (error) {
        throw new RepositoryError(
          `Failed to update wallet balance: ${error.message}`,
          'updateBalance',
          'Wallet',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error updating wallet balance`,
        'updateBalance',
        'Wallet',
        error as Error
      )
    }
  }

  async transferFunds(
    fromWalletId: WalletId,
    toWalletId: WalletId,
    amount: Money
  ): Promise<void> {
    try {
      // This would use a stored procedure for atomic transfer
      const { error } = await this.supabase.rpc('transfer_wallet_funds', {
        from_wallet_id: fromWalletId.value,
        to_wallet_id: toWalletId.value,
        transfer_amount: amount.amount
      })

      if (error) {
        throw new RepositoryError(
          `Failed to transfer funds: ${error.message}`,
          'transferFunds',
          'Wallet',
          error
        )
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error
      }
      throw new RepositoryError(
        `Unexpected error transferring funds`,
        'transferFunds',
        'Wallet',
        error as Error
      )
    }
  }

  /**
   * Map database record to domain entity
   */
  private mapToDomain(dbWallet: DatabaseWallet): Wallet {
    const currency = Currency.fromCode(dbWallet.currency)
    const availableBalance = Money.fromNumber(dbWallet.available_balance, currency)
    const reservedBalance = Money.fromNumber(dbWallet.reserved_balance, currency)

    const snapshot: WalletSnapshot = {
      id: WalletId.fromString(dbWallet.id),
      userId: UserId.fromString(dbWallet.user_id),
      currency,
      availableBalance,
      reservedBalance,
      createdAt: new Date(dbWallet.created_at),
      updatedAt: new Date(dbWallet.updated_at)
    }

    return Wallet.fromSnapshot(snapshot)
  }

  /**
   * Map domain entity to database record
   */
  private mapToDatabase(snapshot: WalletSnapshot): Partial<DatabaseWallet> {
    return {
      id: snapshot.id.value,
      user_id: snapshot.userId.value,
      currency: snapshot.currency.code,
      available_balance: snapshot.availableBalance.amount,
      reserved_balance: snapshot.reservedBalance.amount,
      created_at: snapshot.createdAt.toISOString(),
      updated_at: snapshot.updatedAt.toISOString()
    }
  }
}
