/**
 * Wallet Repository Interface
 * 
 * Defines the contract for wallet data access operations.
 * This interface abstracts the data layer from the domain layer.
 */

import { Wallet, WalletSnapshot } from '../entities/Wallet'
import { WalletId, UserId } from '../value-objects/EntityId'
import { Currency } from '../value-objects/Currency'
import { Money } from '../value-objects/Money'

export interface WalletRepository {
  /**
   * Find wallet by ID
   */
  findById(id: WalletId): Promise<Wallet | null>

  /**
   * Find wallet by user ID and currency
   */
  findByUserIdAndCurrency(userId: UserId, currency: Currency): Promise<Wallet | null>

  /**
   * Find all wallets for a user
   */
  findByUserId(userId: UserId): Promise<Wallet[]>

  /**
   * Save wallet (create or update)
   */
  save(wallet: Wallet): Promise<void>

  /**
   * Save multiple wallets in a transaction
   */
  saveMany(wallets: Wallet[]): Promise<void>

  /**
   * Delete wallet
   */
  delete(id: WalletId): Promise<void>

  /**
   * Check if wallet exists for user and currency
   */
  existsByUserIdAndCurrency(userId: UserId, currency: Currency): Promise<boolean>

  /**
   * Get total balance across all wallets for a user
   */
  getTotalBalanceByUserId(userId: UserId): Promise<Map<Currency, Money>>

  /**
   * Find wallets with balance above threshold
   */
  findWithBalanceAbove(currency: Currency, threshold: Money): Promise<Wallet[]>

  /**
   * Find wallets with reserved balance
   */
  findWithReservedBalance(currency: Currency): Promise<Wallet[]>

  /**
   * Get wallet statistics
   */
  getWalletStatistics(): Promise<{
    totalWallets: number
    totalBalanceByCurrency: Map<Currency, Money>
    totalReservedByurrency: Map<Currency, Money>
    activeWallets: number
  }>

  /**
   * Find wallets updated within date range
   */
  findUpdatedWithinRange(startDate: Date, endDate: Date): Promise<Wallet[]>

  /**
   * Atomic balance update operation
   */
  updateBalance(
    walletId: WalletId,
    availableBalanceChange: Money,
    reservedBalanceChange: Money
  ): Promise<void>

  /**
   * Transfer funds between wallets atomically
   */
  transferFunds(
    fromWalletId: WalletId,
    toWalletId: WalletId,
    amount: Money
  ): Promise<void>
}
