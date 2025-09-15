/**
 * Wallet Domain Entity
 * 
 * Represents a user's wallet for a specific currency.
 * Contains business logic for balance management, reservations, and transactions.
 */

import { Money } from '../value-objects/Money'
import { Currency } from '../value-objects/Currency'
import { WalletId, UserId } from '../value-objects/EntityId'

export interface WalletSnapshot {
  id: WalletId
  userId: UserId
  currency: Currency
  availableBalance: Money
  reservedBalance: Money
  createdAt: Date
  updatedAt: Date
}

export class Wallet {
  private readonly _id: WalletId
  private readonly _userId: UserId
  private readonly _currency: Currency
  private _availableBalance: Money
  private _reservedBalance: Money
  private readonly _createdAt: Date
  private _updatedAt: Date

  constructor(
    id: WalletId,
    userId: UserId,
    currency: Currency,
    availableBalance: Money,
    reservedBalance: Money,
    createdAt: Date,
    updatedAt: Date
  ) {
    // Validate that money amounts match wallet currency
    if (!availableBalance.currency.equals(currency)) {
      throw new Error('Available balance currency must match wallet currency')
    }
    if (!reservedBalance.currency.equals(currency)) {
      throw new Error('Reserved balance currency must match wallet currency')
    }

    this._id = id
    this._userId = userId
    this._currency = currency
    this._availableBalance = availableBalance
    this._reservedBalance = reservedBalance
    this._createdAt = createdAt
    this._updatedAt = updatedAt
  }

  /**
   * Create a new wallet with zero balance
   */
  static create(userId: UserId, currency: Currency): Wallet {
    const now = new Date()
    return new Wallet(
      WalletId.generate(),
      userId,
      currency,
      Money.zero(currency),
      Money.zero(currency),
      now,
      now
    )
  }

  /**
   * Restore wallet from snapshot (for repository pattern)
   */
  static fromSnapshot(snapshot: WalletSnapshot): Wallet {
    return new Wallet(
      snapshot.id,
      snapshot.userId,
      snapshot.currency,
      snapshot.availableBalance,
      snapshot.reservedBalance,
      snapshot.createdAt,
      snapshot.updatedAt
    )
  }

  // Getters
  get id(): WalletId {
    return this._id
  }

  get userId(): UserId {
    return this._userId
  }

  get currency(): Currency {
    return this._currency
  }

  get availableBalance(): Money {
    return this._availableBalance
  }

  get reservedBalance(): Money {
    return this._reservedBalance
  }

  get totalBalance(): Money {
    return this._availableBalance.add(this._reservedBalance)
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  /**
   * Deposit money into the wallet
   */
  deposit(amount: Money): void {
    this.ensureSameCurrency(amount)
    this._availableBalance = this._availableBalance.add(amount)
    this.touch()
  }

  /**
   * Withdraw money from available balance
   */
  withdraw(amount: Money): void {
    this.ensureSameCurrency(amount)
    
    if (!this.hasSufficientAvailableBalance(amount)) {
      throw new InsufficientBalanceError(
        this._currency,
        amount,
        this._availableBalance
      )
    }
    
    this._availableBalance = this._availableBalance.subtract(amount)
    this.touch()
  }

  /**
   * Reserve funds (move from available to reserved)
   */
  reserveFunds(amount: Money): void {
    this.ensureSameCurrency(amount)
    
    if (!this.hasSufficientAvailableBalance(amount)) {
      throw new InsufficientBalanceError(
        this._currency,
        amount,
        this._availableBalance
      )
    }
    
    this._availableBalance = this._availableBalance.subtract(amount)
    this._reservedBalance = this._reservedBalance.add(amount)
    this.touch()
  }

  /**
   * Release reserved funds (move from reserved to available)
   */
  releaseReservedFunds(amount: Money): void {
    this.ensureSameCurrency(amount)
    
    if (!this.hasSufficientReservedBalance(amount)) {
      throw new InsufficientReservedBalanceError(
        this._currency,
        amount,
        this._reservedBalance
      )
    }
    
    this._reservedBalance = this._reservedBalance.subtract(amount)
    this._availableBalance = this._availableBalance.add(amount)
    this.touch()
  }

  /**
   * Consume reserved funds (remove from reserved balance)
   */
  consumeReservedFunds(amount: Money): void {
    this.ensureSameCurrency(amount)
    
    if (!this.hasSufficientReservedBalance(amount)) {
      throw new InsufficientReservedBalanceError(
        this._currency,
        amount,
        this._reservedBalance
      )
    }
    
    this._reservedBalance = this._reservedBalance.subtract(amount)
    this.touch()
  }

  /**
   * Check if wallet has sufficient available balance
   */
  hasSufficientAvailableBalance(amount: Money): boolean {
    this.ensureSameCurrency(amount)
    return this._availableBalance.isGreaterThanOrEqual(amount)
  }

  /**
   * Check if wallet has sufficient reserved balance
   */
  hasSufficientReservedBalance(amount: Money): boolean {
    this.ensureSameCurrency(amount)
    return this._reservedBalance.isGreaterThanOrEqual(amount)
  }

  /**
   * Check if wallet has sufficient total balance
   */
  hasSufficientTotalBalance(amount: Money): boolean {
    this.ensureSameCurrency(amount)
    return this.totalBalance.isGreaterThanOrEqual(amount)
  }

  /**
   * Check if wallet is empty
   */
  isEmpty(): boolean {
    return this._availableBalance.isZero() && this._reservedBalance.isZero()
  }

  /**
   * Get wallet snapshot for persistence
   */
  toSnapshot(): WalletSnapshot {
    return {
      id: this._id,
      userId: this._userId,
      currency: this._currency,
      availableBalance: this._availableBalance,
      reservedBalance: this._reservedBalance,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    }
  }

  /**
   * Ensure money amount has same currency as wallet
   */
  private ensureSameCurrency(amount: Money): void {
    if (!amount.currency.equals(this._currency)) {
      throw new Error(
        `Currency mismatch: wallet is ${this._currency.code}, amount is ${amount.currency.code}`
      )
    }
  }

  /**
   * Update the updatedAt timestamp
   */
  private touch(): void {
    this._updatedAt = new Date()
  }
}

/**
 * Domain exception for insufficient balance
 */
export class InsufficientBalanceError extends Error {
  constructor(
    public readonly currency: Currency,
    public readonly requestedAmount: Money,
    public readonly availableAmount: Money
  ) {
    super(
      `Insufficient ${currency.code} balance. ` +
      `Requested: ${requestedAmount.toString()}, ` +
      `Available: ${availableAmount.toString()}`
    )
    this.name = 'InsufficientBalanceError'
  }
}

/**
 * Domain exception for insufficient reserved balance
 */
export class InsufficientReservedBalanceError extends Error {
  constructor(
    public readonly currency: Currency,
    public readonly requestedAmount: Money,
    public readonly reservedAmount: Money
  ) {
    super(
      `Insufficient ${currency.code} reserved balance. ` +
      `Requested: ${requestedAmount.toString()}, ` +
      `Reserved: ${reservedAmount.toString()}`
    )
    this.name = 'InsufficientReservedBalanceError'
  }
}
