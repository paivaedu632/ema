/**
 * Entity ID Value Objects
 * 
 * Strongly-typed ID value objects for domain entities.
 * Prevents mixing up different types of IDs and provides type safety.
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * Base class for all entity IDs
 */
abstract class EntityId {
  protected readonly _value: string

  protected constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ID cannot be empty')
    }
    this._value = value.trim()
  }

  /**
   * Get the string value of the ID
   */
  get value(): string {
    return this._value
  }

  /**
   * Check if this ID equals another
   */
  equals(other: EntityId): boolean {
    return this._value === other._value && this.constructor === other.constructor
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this._value
  }

  /**
   * Convert to JSON
   */
  toJSON(): string {
    return this._value
  }
}

/**
 * User ID value object
 */
export class UserId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  /**
   * Create UserId from string
   */
  static fromString(value: string): UserId {
    return new UserId(value)
  }

  /**
   * Generate new random UserId
   */
  static generate(): UserId {
    return new UserId(uuidv4())
  }

  /**
   * Create UserId from Clerk user ID
   */
  static fromClerkId(clerkId: string): UserId {
    if (!clerkId.startsWith('user_')) {
      throw new Error('Invalid Clerk user ID format')
    }
    return new UserId(clerkId)
  }

  /**
   * Check if this is a Clerk ID
   */
  isClerkId(): boolean {
    return this._value.startsWith('user_')
  }
}

/**
 * Wallet ID value object
 */
export class WalletId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  /**
   * Create WalletId from string
   */
  static fromString(value: string): WalletId {
    return new WalletId(value)
  }

  /**
   * Generate new random WalletId
   */
  static generate(): WalletId {
    return new WalletId(uuidv4())
  }
}

/**
 * Transaction ID value object
 */
export class TransactionId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  /**
   * Create TransactionId from string
   */
  static fromString(value: string): TransactionId {
    return new TransactionId(value)
  }

  /**
   * Generate new random TransactionId
   */
  static generate(): TransactionId {
    return new TransactionId(uuidv4())
  }

  /**
   * Create TransactionId with prefix for better readability
   */
  static generateWithPrefix(prefix: 'TXN' | 'DEP' | 'WTH' | 'SND' | 'BUY' | 'SEL'): TransactionId {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()
    return new TransactionId(`${prefix}_${uuid}`)
  }
}

/**
 * Order ID value object (for trading orders)
 */
export class OrderId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  /**
   * Create OrderId from string
   */
  static fromString(value: string): OrderId {
    return new OrderId(value)
  }

  /**
   * Generate new random OrderId
   */
  static generate(): OrderId {
    return new OrderId(uuidv4())
  }

  /**
   * Create OrderId with prefix for order type
   */
  static generateWithPrefix(prefix: 'BUY' | 'SELL'): OrderId {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()
    return new OrderId(`${prefix}_${uuid}`)
  }
}

/**
 * KYC Record ID value object
 */
export class KycRecordId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  /**
   * Create KycRecordId from string
   */
  static fromString(value: string): KycRecordId {
    return new KycRecordId(value)
  }

  /**
   * Generate new random KycRecordId
   */
  static generate(): KycRecordId {
    return new KycRecordId(uuidv4())
  }
}

/**
 * Document ID value object (for KYC documents)
 */
export class DocumentId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  /**
   * Create DocumentId from string
   */
  static fromString(value: string): DocumentId {
    return new DocumentId(value)
  }

  /**
   * Generate new random DocumentId
   */
  static generate(): DocumentId {
    return new DocumentId(uuidv4())
  }

  /**
   * Create DocumentId with document type prefix
   */
  static generateWithType(type: 'ID_FRONT' | 'ID_BACK' | 'SELFIE' | 'PROOF_ADDR'): DocumentId {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()
    return new DocumentId(`${type}_${uuid}`)
  }
}

// Export all ID types
export type AnyEntityId = UserId | WalletId | TransactionId | OrderId | KycRecordId | DocumentId
