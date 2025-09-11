/**
 * Repository Interfaces Export
 * 
 * Central export point for all repository interfaces.
 */

export { UserRepository } from './UserRepository'
export { WalletRepository } from './WalletRepository'
export { TransactionRepository, type TransactionSearchCriteria } from './TransactionRepository'

/**
 * Unit of Work interface for managing transactions across repositories
 */
export interface UnitOfWork {
  /**
   * Begin a database transaction
   */
  begin(): Promise<void>

  /**
   * Commit the current transaction
   */
  commit(): Promise<void>

  /**
   * Rollback the current transaction
   */
  rollback(): Promise<void>

  /**
   * Execute a function within a transaction
   */
  execute<T>(operation: () => Promise<T>): Promise<T>

  /**
   * Check if currently in a transaction
   */
  isInTransaction(): boolean
}

/**
 * Repository factory interface for dependency injection
 */
export interface RepositoryFactory {
  /**
   * Create user repository
   */
  createUserRepository(): UserRepository

  /**
   * Create wallet repository
   */
  createWalletRepository(): WalletRepository

  /**
   * Create transaction repository
   */
  createTransactionRepository(): TransactionRepository

  /**
   * Create unit of work
   */
  createUnitOfWork(): UnitOfWork
}

/**
 * Repository error types
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly entity: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entity: string, id: string, cause?: Error) {
    super(`${entity} with ID ${id} not found`, 'find', entity, cause)
    this.name = 'EntityNotFoundError'
  }
}

export class ConcurrencyError extends RepositoryError {
  constructor(entity: string, id: string, cause?: Error) {
    super(`Concurrency conflict for ${entity} with ID ${id}`, 'save', entity, cause)
    this.name = 'ConcurrencyError'
  }
}

export class ConstraintViolationError extends RepositoryError {
  constructor(entity: string, constraint: string, cause?: Error) {
    super(`Constraint violation for ${entity}: ${constraint}`, 'save', entity, cause)
    this.name = 'ConstraintViolationError'
  }
}
