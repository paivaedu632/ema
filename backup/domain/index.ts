/**
 * Domain Layer Exports
 * 
 * Central export point for all domain layer components.
 * This provides a clean interface for other layers to import domain objects.
 */

// Value Objects
export { Money } from './value-objects/Money'
export { Currency, EUR, AOA, type CurrencyCode } from './value-objects/Currency'
export {
  UserId,
  WalletId,
  TransactionId,
  OrderId,
  KycRecordId,
  DocumentId,
  type AnyEntityId
} from './value-objects/EntityId'

// Entities
export {
  Wallet,
  InsufficientBalanceError,
  InsufficientReservedBalanceError,
  type WalletSnapshot
} from './entities/Wallet'

export {
  Transaction,
  InvalidTransactionStateError,
  type TransactionType,
  type TransactionStatus,
  type TransactionSnapshot
} from './entities/Transaction'

export {
  User,
  type KycStatus,
  type UserLimits,
  type UserSnapshot
} from './entities/User'

// Domain Services
export {
  ExchangeRateService,
  MockExchangeRateProvider,
  type ExchangeRate,
  type ExchangeRateProvider
} from './services/ExchangeRateService'

export {
  FeeCalculationService,
  type FeeStructure,
  type FeeCalculationResult
} from './services/FeeCalculationService'

// Domain Exceptions
export * from './exceptions/DomainExceptions'

// Re-export commonly used types
export type {
  TransactionType,
  TransactionStatus,
  KycStatus,
  CurrencyCode
}
