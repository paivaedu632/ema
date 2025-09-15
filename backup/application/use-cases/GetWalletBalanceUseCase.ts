/**
 * Get Wallet Balance Use Case
 * 
 * Retrieves wallet balance information for a user and currency.
 * Handles wallet creation if it doesn't exist.
 */

import {
  QueryHandler,
  Query,
  Result,
  SuccessResult,
  ErrorResult,
  ResultFactory,
  ValidationResult,
  ValidationResultFactory,
  ErrorCodes
} from '../common/UseCase'

import {
  Money,
  Currency,
  UserId,
  Wallet,
  UserNotFoundException,
  WalletNotFoundException
} from '../../domain'

import {
  UserRepository,
  WalletRepository
} from '../../domain/repositories'

/**
 * Get Wallet Balance Query
 */
export interface GetWalletBalanceQuery extends Query {
  readonly type: 'GET_WALLET_BALANCE'
  readonly userId: string
  readonly currency: string
}

/**
 * Wallet Balance Result
 */
export interface WalletBalanceResult extends SuccessResult<{
  currency: string
  availableBalance: number
  reservedBalance: number
  totalBalance: number
  lastUpdated: Date
}> {}

/**
 * Get Wallet Balance Query Handler
 */
export class GetWalletBalanceQueryHandler implements QueryHandler<GetWalletBalanceQuery, WalletBalanceResult | ErrorResult> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository
  ) {}

  async handle(query: GetWalletBalanceQuery): Promise<WalletBalanceResult | ErrorResult> {
    try {
      // 1. Validate input
      const validationResult = this.validateQuery(query)
      if (!validationResult.isValid) {
        return ResultFactory.error(
          `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
          ErrorCodes.INVALID_INPUT,
          { validationErrors: validationResult.errors }
        )
      }

      // 2. Parse domain objects
      const currency = Currency.fromCode(query.currency)

      // 3. Verify user exists using Clerk ID
      const user = await this.userRepository.findByClerkId(query.userId)
      if (!user) {
        return ResultFactory.error(
          'User not found',
          ErrorCodes.USER_NOT_FOUND
        )
      }

      // 4. Get or create wallet
      let wallet = await this.walletRepository.findByUserIdAndCurrency(user.id, currency)

      if (!wallet) {
        // Create wallet with zero balance if it doesn't exist
        wallet = Wallet.create(user.id, currency)
        await this.walletRepository.save(wallet)
      }

      // 5. Return balance information
      return ResultFactory.success({
        currency: currency.code,
        availableBalance: wallet.availableBalance.amount,
        reservedBalance: wallet.reservedBalance.amount,
        totalBalance: wallet.totalBalance.amount,
        lastUpdated: wallet.updatedAt
      })

    } catch (error) {
      console.error('Unexpected error in GetWalletBalanceQueryHandler:', error)
      return ResultFactory.error(
        'An unexpected error occurred',
        ErrorCodes.UNEXPECTED_ERROR
      )
    }
  }

  /**
   * Validate the get wallet balance query
   */
  private validateQuery(query: GetWalletBalanceQuery): ValidationResult {
    const errors = []

    // Validate user ID
    if (!query.userId || query.userId.trim().length === 0) {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
        code: 'REQUIRED'
      })
    }

    // Validate currency
    if (!query.currency || !Currency.isSupported(query.currency)) {
      errors.push({
        field: 'currency',
        message: 'Invalid or unsupported currency',
        code: 'INVALID_VALUE'
      })
    }

    return errors.length === 0
      ? ValidationResultFactory.success()
      : ValidationResultFactory.failure(errors)
  }
}
