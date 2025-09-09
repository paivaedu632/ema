/**
 * Buy Currency Use Case
 * 
 * Handles currency exchange operations (buying AOA with EUR).
 * Validates exchange rates, calculates fees, and processes the exchange.
 */

import {
  UseCase,
  Command,
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
  EUR,
  AOA,
  UserId,
  Transaction,
  User,
  Wallet,
  ExchangeRateService,
  FeeCalculationService,
  InsufficientBalanceException,
  UserNotFoundException,
  WalletNotFoundException,
  KycRequiredException,
  UnsupportedCurrencyPairException,
  StaleExchangeRateException
} from '../../domain'

import {
  UserRepository,
  WalletRepository,
  TransactionRepository,
  UnitOfWork
} from '../../domain/repositories'

/**
 * Buy Currency Command
 */
export interface BuyCurrencyCommand extends Command {
  readonly type: 'BUY_CURRENCY'
  readonly userId: string
  readonly fromCurrency: string // Currency to spend (usually EUR)
  readonly toCurrency: string   // Currency to buy (usually AOA)
  readonly fromAmount: number   // Amount to spend
  readonly expectedRate?: number // Expected exchange rate for validation
  readonly maxSlippage?: number  // Maximum acceptable slippage percentage
}

/**
 * Buy Currency Result
 */
export interface BuyCurrencyResult extends SuccessResult<{
  transactionId: string
  fromAmount: number
  toAmount: number
  exchangeRate: number
  fee: number
  netToAmount: number
  executedAt: Date
}> {}

/**
 * Buy Currency Use Case Implementation
 */
export class BuyCurrencyUseCase implements UseCase<BuyCurrencyCommand, BuyCurrencyResult | ErrorResult> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly feeCalculationService: FeeCalculationService
  ) {}

  async execute(command: BuyCurrencyCommand): Promise<BuyCurrencyResult | ErrorResult> {
    try {
      // 1. Validate input
      const validationResult = this.validateCommand(command)
      if (!validationResult.isValid) {
        return ResultFactory.error(
          `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
          ErrorCodes.INVALID_INPUT,
          { validationErrors: validationResult.errors }
        )
      }

      // 2. Parse domain objects
      const userId = UserId.fromString(command.userId)
      const fromCurrency = Currency.fromCode(command.fromCurrency)
      const toCurrency = Currency.fromCode(command.toCurrency)
      const fromAmount = Money.fromNumber(command.fromAmount, fromCurrency)

      // 3. Validate currency pair is supported
      if (!this.exchangeRateService.isPairSupported(fromCurrency, toCurrency)) {
        return ResultFactory.error(
          `Currency pair ${fromCurrency.code}/${toCurrency.code} is not supported`,
          ErrorCodes.INVALID_INPUT
        )
      }

      // 4. Execute business logic within transaction
      const result = await this.unitOfWork.execute(async () => {
        // Get user
        const user = await this.userRepository.findById(userId)
        if (!user) {
          throw new UserNotFoundException(userId)
        }

        // Validate user can perform transactions
        if (!user.canPerformTransactions()) {
          throw new KycRequiredException(
            userId,
            user.kycStatus,
            'Complete KYC verification to exchange currency'
          )
        }

        // Get current exchange rate
        const exchangeResult = await this.exchangeRateService.calculateExchangeAmount(
          fromAmount,
          toCurrency
        )

        // Validate exchange rate if expected rate provided
        if (command.expectedRate) {
          const slippage = Math.abs(exchangeResult.rate.rate - command.expectedRate) / command.expectedRate * 100
          const maxSlippage = command.maxSlippage || 2 // Default 2% max slippage
          
          if (slippage > maxSlippage) {
            throw new StaleExchangeRateException(fromCurrency, toCurrency, slippage)
          }
        }

        // Get user's wallets
        const fromWallet = await this.walletRepository.findByUserIdAndCurrency(userId, fromCurrency)
        if (!fromWallet) {
          throw new WalletNotFoundException(userId, fromCurrency)
        }

        let toWallet = await this.walletRepository.findByUserIdAndCurrency(userId, toCurrency)
        if (!toWallet) {
          toWallet = Wallet.create(userId, toCurrency)
        }

        // Calculate fee (on the from currency)
        const feeResult = this.feeCalculationService.calculateFee(fromAmount, 'buy', user)
        const totalFromAmount = fromAmount.add(feeResult.totalFee)

        // Validate user has sufficient balance
        if (!fromWallet.hasSufficientAvailableBalance(totalFromAmount)) {
          throw new InsufficientBalanceException(
            fromCurrency,
            totalFromAmount,
            fromWallet.availableBalance,
            fromWallet.id
          )
        }

        // Create buy transaction
        const transaction = Transaction.createBuy(
          userId,
          fromAmount,
          feeResult.totalFee,
          exchangeResult.rate.rate,
          `Buy ${toCurrency.code} with ${fromCurrency.code}`
        )

        // Process the exchange
        transaction.markAsProcessing()

        // Deduct from source wallet (including fee)
        fromWallet.withdraw(totalFromAmount)

        // Credit to destination wallet (exchange amount only, no fee)
        toWallet.deposit(exchangeResult.outputAmount)

        // Mark transaction as completed
        transaction.markAsCompleted()

        // Save all changes
        await this.walletRepository.save(fromWallet)
        await this.walletRepository.save(toWallet)
        await this.transactionRepository.save(transaction)

        return {
          transaction,
          exchangeResult,
          feeResult
        }
      })

      // 5. Return success result
      return ResultFactory.success({
        transactionId: result.transaction.id.value,
        fromAmount: fromAmount.amount,
        toAmount: result.exchangeResult.outputAmount.amount,
        exchangeRate: result.exchangeResult.rate.rate,
        fee: result.feeResult.totalFee.amount,
        netToAmount: result.exchangeResult.outputAmount.amount,
        executedAt: result.transaction.completedAt || new Date()
      })

    } catch (error) {
      // Handle domain exceptions
      if (error instanceof UserNotFoundException) {
        return ResultFactory.error(
          'User not found',
          ErrorCodes.USER_NOT_FOUND
        )
      }

      if (error instanceof WalletNotFoundException) {
        return ResultFactory.error(
          `Wallet not found for currency ${error.currency.code}`,
          ErrorCodes.WALLET_NOT_FOUND
        )
      }

      if (error instanceof InsufficientBalanceException) {
        return ResultFactory.error(
          error.message,
          ErrorCodes.INSUFFICIENT_BALANCE,
          {
            currency: error.currency.code,
            requestedAmount: error.requestedAmount.amount,
            availableAmount: error.availableAmount.amount
          }
        )
      }

      if (error instanceof KycRequiredException) {
        return ResultFactory.error(
          error.message,
          ErrorCodes.KYC_REQUIRED,
          {
            currentStatus: error.currentKycStatus,
            requiredAction: error.requiredAction
          }
        )
      }

      if (error instanceof UnsupportedCurrencyPairException) {
        return ResultFactory.error(
          error.message,
          ErrorCodes.INVALID_INPUT
        )
      }

      if (error instanceof StaleExchangeRateException) {
        return ResultFactory.error(
          `Exchange rate has moved too much. Current slippage: ${error.rateAge}%`,
          ErrorCodes.INVALID_INPUT,
          {
            slippage: error.rateAge,
            fromCurrency: error.fromCurrency.code,
            toCurrency: error.toCurrency.code
          }
        )
      }

      // Handle unexpected errors
      console.error('Unexpected error in BuyCurrencyUseCase:', error)
      return ResultFactory.error(
        'An unexpected error occurred',
        ErrorCodes.UNEXPECTED_ERROR
      )
    }
  }

  /**
   * Validate the buy currency command
   */
  private validateCommand(command: BuyCurrencyCommand): ValidationResult {
    const errors = []

    // Validate user ID
    if (!command.userId || command.userId.trim().length === 0) {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
        code: 'REQUIRED'
      })
    }

    // Validate from currency
    if (!command.fromCurrency || !Currency.isSupported(command.fromCurrency)) {
      errors.push({
        field: 'fromCurrency',
        message: 'Invalid or unsupported from currency',
        code: 'INVALID_VALUE'
      })
    }

    // Validate to currency
    if (!command.toCurrency || !Currency.isSupported(command.toCurrency)) {
      errors.push({
        field: 'toCurrency',
        message: 'Invalid or unsupported to currency',
        code: 'INVALID_VALUE'
      })
    }

    // Validate currencies are different
    if (command.fromCurrency === command.toCurrency) {
      errors.push({
        field: 'toCurrency',
        message: 'From and to currencies must be different',
        code: 'INVALID_VALUE'
      })
    }

    // Validate from amount
    if (!command.fromAmount || command.fromAmount <= 0) {
      errors.push({
        field: 'fromAmount',
        message: 'From amount must be greater than zero',
        code: 'INVALID_VALUE'
      })
    }

    if (command.fromAmount && command.fromAmount > 100000) {
      errors.push({
        field: 'fromAmount',
        message: 'From amount exceeds maximum limit',
        code: 'EXCEEDS_LIMIT'
      })
    }

    // Validate expected rate if provided
    if (command.expectedRate && command.expectedRate <= 0) {
      errors.push({
        field: 'expectedRate',
        message: 'Expected rate must be greater than zero',
        code: 'INVALID_VALUE'
      })
    }

    // Validate max slippage if provided
    if (command.maxSlippage && (command.maxSlippage < 0 || command.maxSlippage > 10)) {
      errors.push({
        field: 'maxSlippage',
        message: 'Max slippage must be between 0 and 10 percent',
        code: 'INVALID_VALUE'
      })
    }

    return errors.length === 0
      ? ValidationResultFactory.success()
      : ValidationResultFactory.failure(errors)
  }
}
