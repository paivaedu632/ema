/**
 * Get User Wallets Use Case
 * 
 * Retrieves all wallets for a user across all supported currencies.
 * Creates missing wallets if they don't exist.
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
  UserNotFoundException
} from '../../domain'

import {
  UserRepository,
  WalletRepository
} from '../../domain/repositories'

/**
 * Get User Wallets Query
 */
export interface GetUserWalletsQuery extends Query {
  readonly type: 'GET_USER_WALLETS'
  readonly userId: string
}

/**
 * User Wallets Result
 */
export interface UserWalletsResult extends SuccessResult<{
  wallets: Array<{
    currency: string
    availableBalance: number
    reservedBalance: number
    totalBalance: number
    lastUpdated: Date
  }>
  totalBalanceInEUR: number
}> {}

/**
 * Get User Wallets Query Handler
 */
export class GetUserWalletsQueryHandler implements QueryHandler<GetUserWalletsQuery, UserWalletsResult | ErrorResult> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository
  ) {}

  async handle(query: GetUserWalletsQuery): Promise<UserWalletsResult | ErrorResult> {
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

      // 2. Verify user exists using Clerk ID
      const user = await this.userRepository.findByClerkId(query.userId)
      if (!user) {
        return ResultFactory.error(
          'User not found',
          ErrorCodes.USER_NOT_FOUND
        )
      }

      // 3. Get existing wallets using the user's actual ID
      const existingWallets = await this.walletRepository.findByUserId(user.id)
      const existingCurrencies = new Set(existingWallets.map(w => w.currency.code))

      // 5. Create missing wallets for supported currencies
      const supportedCurrencies = Currency.getAllSupported()
      const walletsToCreate: Wallet[] = []

      for (const currency of supportedCurrencies) {
        if (!existingCurrencies.has(currency.code)) {
          const newWallet = Wallet.create(user.id, currency)
          walletsToCreate.push(newWallet)
        }
      }

      // Save new wallets if any
      if (walletsToCreate.length > 0) {
        await this.walletRepository.saveMany(walletsToCreate)
      }

      // 6. Combine all wallets
      const allWallets = [...existingWallets, ...walletsToCreate]

      // 7. Calculate total balance in EUR (simplified - would need exchange rates in real implementation)
      let totalBalanceInEUR = 0
      for (const wallet of allWallets) {
        if (wallet.currency.isEUR()) {
          totalBalanceInEUR += wallet.totalBalance.amount
        } else {
          // Simplified conversion - in real implementation, use ExchangeRateService
          totalBalanceInEUR += wallet.totalBalance.amount / 1200 // Assuming 1 EUR = 1200 AOA
        }
      }

      // 8. Format response
      const walletData = allWallets.map(wallet => ({
        currency: wallet.currency.code,
        availableBalance: wallet.availableBalance.amount,
        reservedBalance: wallet.reservedBalance.amount,
        totalBalance: wallet.totalBalance.amount,
        lastUpdated: wallet.updatedAt
      }))

      return ResultFactory.success({
        wallets: walletData,
        totalBalanceInEUR: Math.round(totalBalanceInEUR * 100) / 100 // Round to 2 decimal places
      })

    } catch (error) {
      console.error('Unexpected error in GetUserWalletsQueryHandler:', error)
      return ResultFactory.error(
        'An unexpected error occurred',
        ErrorCodes.UNEXPECTED_ERROR
      )
    }
  }

  /**
   * Validate the get user wallets query
   */
  private validateQuery(query: GetUserWalletsQuery): ValidationResult {
    const errors = []

    // Validate user ID
    if (!query.userId || query.userId.trim().length === 0) {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
        code: 'REQUIRED'
      })
    }

    return errors.length === 0
      ? ValidationResultFactory.success()
      : ValidationResultFactory.failure(errors)
  }
}
