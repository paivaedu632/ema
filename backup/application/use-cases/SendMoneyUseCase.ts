/**
 * Send Money Use Case
 * 
 * Handles the business logic for sending money between users.
 * Validates business rules, calculates fees, and processes the transaction.
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
  UserId,
  TransactionId,
  Transaction,
  User,
  Wallet,
  FeeCalculationService,
  InsufficientBalanceException,
  UserNotFoundException,
  WalletNotFoundException,
  KycRequiredException,
  TransactionLimitExceededException,
  SelfTransactionException
} from '../../domain'

import {
  UserRepository,
  WalletRepository,
  TransactionRepository,
  UnitOfWork
} from '../../domain/repositories'

import { createClient } from '@supabase/supabase-js'

/**
 * Send Money Command
 */
export interface SendMoneyCommand extends Command {
  readonly type: 'SEND_MONEY'
  readonly senderId: string
  readonly recipientEmail: string
  readonly amount: number
  readonly currency: string
  readonly pin: string // 6-digit PIN required for all transfers
  readonly description?: string
}

/**
 * Send Money Result
 */
export interface SendMoneyResult extends SuccessResult<{
  transactionId: string
  netAmount: number
  fee: number
  estimatedArrival: Date
}> {}

/**
 * Send Money Use Case Implementation
 */
export class SendMoneyUseCase implements UseCase<SendMoneyCommand, SendMoneyResult | ErrorResult> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly feeCalculationService: FeeCalculationService
  ) {}

  async execute(command: SendMoneyCommand): Promise<SendMoneyResult | ErrorResult> {
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

      // 2. Get Supabase client (in production, this should be injected)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
      )

      // 3. Get sender user ID from Clerk ID
      const { data: senderData, error: senderError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', command.senderId)
        .single()

      if (senderError || !senderData) {
        return ResultFactory.error(
          'Sender not found',
          ErrorCodes.NOT_FOUND,
          { senderId: command.senderId }
        )
      }

      // 4. Execute unified secure transfer with mandatory PIN verification
      const { data: transferResult, error: transferError } = await supabase.rpc('send_p2p_transfer', {
        p_sender_id: senderData.id,
        p_recipient_identifier: command.recipientEmail,
        p_currency: command.currency,
        p_amount: command.amount,
        p_pin: command.pin,
        p_description: command.description
      })

      if (transferError) {
        return ResultFactory.error(
          `Transfer failed: ${transferError.message}`,
          ErrorCodes.OPERATION_FAILED,
          { transferError: transferError.message }
        )
      }

      const transfer = transferResult

      // 5. Handle transfer result
      if (transfer.status === 'failed') {
        // Map security-related errors to appropriate error codes
        const securityReason = transfer.security_info?.reason
        let errorCode = ErrorCodes.OPERATION_FAILED

        if (securityReason === 'invalid_pin' || securityReason === 'invalid_pin_format') {
          errorCode = ErrorCodes.UNAUTHORIZED
        } else if (securityReason === 'pin_locked') {
          errorCode = ErrorCodes.FORBIDDEN
        } else if (securityReason === 'daily_limit_exceeded') {
          errorCode = ErrorCodes.LIMIT_EXCEEDED
        }

        return ResultFactory.error(
          transfer.message,
          errorCode,
          {
            securityInfo: transfer.security_info,
            transferStatus: transfer.status
          }
        )
      }

      // 6. Return success result
      const estimatedArrival = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now

      return ResultFactory.success({
        transactionId: transfer.transfer_id,
        netAmount: command.amount, // No fees in current implementation
        fee: 0, // No fees in current implementation
        estimatedArrival
    } catch (error) {
      // Handle unexpected errors
      return ResultFactory.error(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    }
  }

  /**
   * Validate the send money command
   */
  private validateCommand(command: SendMoneyCommand): ValidationResult {
    const errors = []

    // Validate sender ID
    if (!command.senderId || command.senderId.trim().length === 0) {
      errors.push({
        field: 'senderId',
        message: 'Sender ID is required',
        code: 'REQUIRED'
      })
    }

    // Validate recipient email
    if (!command.recipientEmail || command.recipientEmail.trim().length === 0) {
      errors.push({
        field: 'recipientEmail',
        message: 'Recipient email is required',
        code: 'REQUIRED'
      })
    } else if (!this.isValidEmail(command.recipientEmail)) {
      errors.push({
        field: 'recipientEmail',
        message: 'Invalid email format',
        code: 'INVALID_FORMAT'
      })
    }

    // Validate amount
    if (!command.amount || command.amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Amount must be greater than zero',
        code: 'INVALID_VALUE'
      })
    }

    if (command.amount && command.amount > 1000000) {
      errors.push({
        field: 'amount',
        message: 'Amount exceeds maximum limit',
        code: 'EXCEEDS_LIMIT'
      })
    }

    // Validate currency
    if (!command.currency || !Currency.isSupported(command.currency)) {
      errors.push({
        field: 'currency',
        message: 'Invalid or unsupported currency',
        code: 'INVALID_VALUE'
      })
    }

    // Validate PIN (6-digit PIN required for all transfers)
    if (!command.pin || command.pin.trim().length === 0) {
      errors.push({
        field: 'pin',
        message: '6-digit PIN is required for all transfers',
        code: 'REQUIRED'
      })
    } else if (!/^[0-9]{6}$/.test(command.pin)) {
      errors.push({
        field: 'pin',
        message: 'PIN must be exactly 6 digits',
        code: 'INVALID_FORMAT'
      })
    }

    // Validate description length
    if (command.description && command.description.length > 500) {
      errors.push({
        field: 'description',
        message: 'Description cannot exceed 500 characters',
        code: 'TOO_LONG'
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
}
