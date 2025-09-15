/**
 * Register User Use Case
 * 
 * Handles user registration and initial wallet creation.
 * Validates user data and creates default wallets for supported currencies.
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
  Currency,
  UserId,
  User,
  Wallet
} from '../../domain'

import {
  UserRepository,
  WalletRepository,
  UnitOfWork,
  ConstraintViolationError
} from '../../domain/repositories'

/**
 * Register User Command
 */
export interface RegisterUserCommand extends Command {
  readonly type: 'REGISTER_USER'
  readonly clerkUserId: string
  readonly email: string
  readonly fullName: string
  readonly phoneNumber?: string
}

/**
 * Register User Result
 */
export interface RegisterUserResult extends SuccessResult<{
  userId: string
  email: string
  fullName: string
  kycStatus: string
  walletsCreated: string[]
}> {}

/**
 * Register User Use Case Implementation
 */
export class RegisterUserUseCase implements UseCase<RegisterUserCommand, RegisterUserResult | ErrorResult> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult | ErrorResult> {
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

      // 2. Check if user already exists
      const existingUserByEmail = await this.userRepository.existsByEmail(command.email)
      if (existingUserByEmail) {
        return ResultFactory.error(
          'User with this email already exists',
          ErrorCodes.INVALID_INPUT,
          { field: 'email' }
        )
      }

      const existingUserByClerkId = await this.userRepository.existsByClerkId(command.clerkUserId)
      if (existingUserByClerkId) {
        return ResultFactory.error(
          'User with this Clerk ID already exists',
          ErrorCodes.INVALID_INPUT,
          { field: 'clerkUserId' }
        )
      }

      // 3. Execute registration within transaction
      const result = await this.unitOfWork.execute(async () => {
        // Create user
        const user = User.createFromClerkId(
          command.clerkUserId,
          command.email,
          command.fullName,
          command.phoneNumber
        )

        // Save user
        await this.userRepository.save(user)

        // Create default wallets for all supported currencies
        const supportedCurrencies = Currency.getAllSupported()
        const wallets: Wallet[] = []

        for (const currency of supportedCurrencies) {
          const wallet = Wallet.create(user.id, currency)
          wallets.push(wallet)
        }

        // Save all wallets
        await this.walletRepository.saveMany(wallets)

        return {
          user,
          wallets
        }
      })

      // 4. Return success result
      return ResultFactory.success({
        userId: result.user.id.value,
        email: result.user.email,
        fullName: result.user.fullName,
        kycStatus: result.user.kycStatus,
        walletsCreated: result.wallets.map(w => w.currency.code)
      })

    } catch (error) {
      // Handle constraint violations (duplicate email, etc.)
      if (error instanceof ConstraintViolationError) {
        return ResultFactory.error(
          'User registration failed due to constraint violation',
          ErrorCodes.INVALID_INPUT,
          { constraint: error.message }
        )
      }

      // Handle unexpected errors
      console.error('Unexpected error in RegisterUserUseCase:', error)
      return ResultFactory.error(
        'An unexpected error occurred during registration',
        ErrorCodes.UNEXPECTED_ERROR
      )
    }
  }

  /**
   * Validate the register user command
   */
  private validateCommand(command: RegisterUserCommand): ValidationResult {
    const errors = []

    // Validate Clerk user ID
    if (!command.clerkUserId || command.clerkUserId.trim().length === 0) {
      errors.push({
        field: 'clerkUserId',
        message: 'Clerk user ID is required',
        code: 'REQUIRED'
      })
    } else if (!command.clerkUserId.startsWith('user_')) {
      errors.push({
        field: 'clerkUserId',
        message: 'Invalid Clerk user ID format',
        code: 'INVALID_FORMAT'
      })
    }

    // Validate email
    if (!command.email || command.email.trim().length === 0) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'REQUIRED'
      })
    } else if (!this.isValidEmail(command.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_FORMAT'
      })
    }

    // Validate full name
    if (!command.fullName || command.fullName.trim().length === 0) {
      errors.push({
        field: 'fullName',
        message: 'Full name is required',
        code: 'REQUIRED'
      })
    } else if (command.fullName.trim().length < 2) {
      errors.push({
        field: 'fullName',
        message: 'Full name must be at least 2 characters',
        code: 'TOO_SHORT'
      })
    } else if (command.fullName.length > 100) {
      errors.push({
        field: 'fullName',
        message: 'Full name cannot exceed 100 characters',
        code: 'TOO_LONG'
      })
    }

    // Validate phone number if provided
    if (command.phoneNumber && !this.isValidPhoneNumber(command.phoneNumber)) {
      errors.push({
        field: 'phoneNumber',
        message: 'Invalid phone number format',
        code: 'INVALID_FORMAT'
      })
    }

    return errors.length === 0
      ? ValidationResultFactory.success()
      : ValidationResultFactory.failure(errors)
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Simple validation - starts with + and contains only digits and spaces
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''))
  }
}
