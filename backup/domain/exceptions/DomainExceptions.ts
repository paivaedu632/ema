/**
 * Domain Exceptions
 * 
 * Custom exceptions for domain business rule violations.
 * These exceptions represent business logic errors, not technical errors.
 */

import { Currency } from '../value-objects/Currency'
import { Money } from '../value-objects/Money'
import { UserId, TransactionId, WalletId } from '../value-objects/EntityId'
import { TransactionStatus, TransactionType } from '../entities/Transaction'
import { KycStatus } from '../entities/User'

/**
 * Base class for all domain exceptions
 */
abstract class DomainException extends Error {
  abstract readonly code: string
  abstract readonly category: 'BUSINESS_RULE' | 'VALIDATION' | 'AUTHORIZATION' | 'NOT_FOUND'

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Insufficient balance exceptions
 */
class InsufficientBalanceException extends DomainException {
  readonly code = 'INSUFFICIENT_BALANCE'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly currency: Currency,
    public readonly requestedAmount: Money,
    public readonly availableAmount: Money,
    public readonly walletId?: WalletId
  ) {
    super(
      `Insufficient ${currency.code} balance. ` +
      `Requested: ${requestedAmount.toString()}, ` +
      `Available: ${availableAmount.toString()}`
    )
  }
}

class InsufficientReservedBalanceException extends DomainException {
  readonly code = 'INSUFFICIENT_RESERVED_BALANCE'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly currency: Currency,
    public readonly requestedAmount: Money,
    public readonly reservedAmount: Money,
    public readonly walletId?: WalletId
  ) {
    super(
      `Insufficient ${currency.code} reserved balance. ` +
      `Requested: ${requestedAmount.toString()}, ` +
      `Reserved: ${reservedAmount.toString()}`
    )
  }
}

/**
 * Transaction limit exceptions
 */
class TransactionLimitExceededException extends DomainException {
  readonly code = 'TRANSACTION_LIMIT_EXCEEDED'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly limitType: 'DAILY' | 'MONTHLY' | 'SINGLE' | 'WITHDRAWAL',
    public readonly requestedAmount: Money,
    public readonly limitAmount: Money,
    public readonly userId: UserId
  ) {
    super(
      `${limitType.toLowerCase()} transaction limit exceeded. ` +
      `Requested: ${requestedAmount.toString()}, ` +
      `Limit: ${limitAmount.toString()}`
    )
  }
}

/**
 * KYC-related exceptions
 */
class KycRequiredException extends DomainException {
  readonly code = 'KYC_REQUIRED'
  readonly category = 'AUTHORIZATION' as const

  constructor(
    public readonly userId: UserId,
    public readonly currentKycStatus: KycStatus,
    public readonly requiredAction: string
  ) {
    super(
      `KYC verification required. Current status: ${currentKycStatus}. ` +
      `Required action: ${requiredAction}`
    )
  }
}

class InvalidKycStatusTransitionException extends DomainException {
  readonly code = 'INVALID_KYC_STATUS_TRANSITION'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly currentStatus: KycStatus,
    public readonly targetStatus: KycStatus,
    public readonly userId: UserId
  ) {
    super(`Cannot transition KYC status from ${currentStatus} to ${targetStatus}`)
  }
}

/**
 * Transaction state exceptions
 */
class InvalidTransactionStateException extends DomainException {
  readonly code = 'INVALID_TRANSACTION_STATE'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly transactionId: TransactionId,
    public readonly currentState: TransactionStatus,
    public readonly targetState: TransactionStatus
  ) {
    super(`Cannot transition transaction from ${currentState} to ${targetState}`)
  }
}

class TransactionAlreadyProcessedException extends DomainException {
  readonly code = 'TRANSACTION_ALREADY_PROCESSED'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly transactionId: TransactionId,
    public readonly currentStatus: TransactionStatus
  ) {
    super(`Transaction ${transactionId.toString()} is already processed with status: ${currentStatus}`)
  }
}

/**
 * Currency and exchange rate exceptions
 */
class UnsupportedCurrencyException extends DomainException {
  readonly code = 'UNSUPPORTED_CURRENCY'
  readonly category = 'VALIDATION' as const

  constructor(public readonly currencyCode: string) {
    super(`Currency ${currencyCode} is not supported`)
  }
}

class UnsupportedCurrencyPairException extends DomainException {
  readonly code = 'UNSUPPORTED_CURRENCY_PAIR'
  readonly category = 'VALIDATION' as const

  constructor(
    public readonly fromCurrency: Currency,
    public readonly toCurrency: Currency
  ) {
    super(`Currency pair ${fromCurrency.code}/${toCurrency.code} is not supported`)
  }
}

class StaleExchangeRateException extends DomainException {
  readonly code = 'STALE_EXCHANGE_RATE'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly fromCurrency: Currency,
    public readonly toCurrency: Currency,
    public readonly rateAge: number
  ) {
    super(
      `Exchange rate for ${fromCurrency.code}/${toCurrency.code} is stale. ` +
      `Age: ${rateAge} minutes`
    )
  }
}

/**
 * User and account exceptions
 */
class UserNotFoundException extends DomainException {
  readonly code = 'USER_NOT_FOUND'
  readonly category = 'NOT_FOUND' as const

  constructor(public readonly userId: UserId) {
    super(`User not found: ${userId.toString()}`)
  }
}

class UserNotActiveException extends DomainException {
  readonly code = 'USER_NOT_ACTIVE'
  readonly category = 'AUTHORIZATION' as const

  constructor(public readonly userId: UserId) {
    super(`User account is not active: ${userId.toString()}`)
  }
}

class WalletNotFoundException extends DomainException {
  readonly code = 'WALLET_NOT_FOUND'
  readonly category = 'NOT_FOUND' as const

  constructor(
    public readonly userId: UserId,
    public readonly currency: Currency
  ) {
    super(`Wallet not found for user ${userId.toString()} and currency ${currency.code}`)
  }
}

/**
 * Validation exceptions
 */
class InvalidAmountException extends DomainException {
  readonly code = 'INVALID_AMOUNT'
  readonly category = 'VALIDATION' as const

  constructor(
    public readonly amount: number,
    public readonly reason: string
  ) {
    super(`Invalid amount ${amount}: ${reason}`)
  }
}

class InvalidRecipientException extends DomainException {
  readonly code = 'INVALID_RECIPIENT'
  readonly category = 'VALIDATION' as const

  constructor(
    public readonly recipientId: UserId,
    public readonly reason: string
  ) {
    super(`Invalid recipient ${recipientId.toString()}: ${reason}`)
  }
}

class SelfTransactionException extends DomainException {
  readonly code = 'SELF_TRANSACTION'
  readonly category = 'BUSINESS_RULE' as const

  constructor(public readonly userId: UserId) {
    super(`Cannot send money to yourself: ${userId.toString()}`)
  }
}

/**
 * Business rule exceptions
 */
class MinimumTransactionAmountException extends DomainException {
  readonly code = 'MINIMUM_TRANSACTION_AMOUNT'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly requestedAmount: Money,
    public readonly minimumAmount: Money,
    public readonly transactionType: TransactionType
  ) {
    super(
      `Transaction amount below minimum for ${transactionType}. ` +
      `Requested: ${requestedAmount.toString()}, ` +
      `Minimum: ${minimumAmount.toString()}`
    )
  }
}

class MaximumTransactionAmountException extends DomainException {
  readonly code = 'MAXIMUM_TRANSACTION_AMOUNT'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly requestedAmount: Money,
    public readonly maximumAmount: Money,
    public readonly transactionType: TransactionType
  ) {
    super(
      `Transaction amount exceeds maximum for ${transactionType}. ` +
      `Requested: ${requestedAmount.toString()}, ` +
      `Maximum: ${maximumAmount.toString()}`
    )
  }
}

/**
 * External service exceptions
 */
class ExchangeRateUnavailableException extends DomainException {
  readonly code = 'EXCHANGE_RATE_UNAVAILABLE'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly fromCurrency: Currency,
    public readonly toCurrency: Currency,
    public readonly provider: string
  ) {
    super(
      `Exchange rate unavailable from ${provider} for ` +
      `${fromCurrency.code}/${toCurrency.code}`
    )
  }
}

class PaymentProcessingException extends DomainException {
  readonly code = 'PAYMENT_PROCESSING_ERROR'
  readonly category = 'BUSINESS_RULE' as const

  constructor(
    public readonly transactionId: TransactionId,
    public readonly provider: string,
    public readonly reason: string
  ) {
    super(
      `Payment processing failed for transaction ${transactionId.toString()} ` +
      `via ${provider}: ${reason}`
    )
  }
}

// Export all exceptions for easy importing
export {
  DomainException,
  InsufficientBalanceException,
  InsufficientReservedBalanceException,
  TransactionLimitExceededException,
  KycRequiredException,
  InvalidKycStatusTransitionException,
  InvalidTransactionStateException,
  TransactionAlreadyProcessedException,
  UnsupportedCurrencyException,
  UnsupportedCurrencyPairException,
  StaleExchangeRateException,
  UserNotFoundException,
  UserNotActiveException,
  WalletNotFoundException,
  InvalidAmountException,
  InvalidRecipientException,
  SelfTransactionException,
  MinimumTransactionAmountException,
  MaximumTransactionAmountException,
  ExchangeRateUnavailableException,
  PaymentProcessingException
}
