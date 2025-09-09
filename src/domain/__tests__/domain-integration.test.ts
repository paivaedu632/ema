/**
 * Domain Layer Integration Tests
 * 
 * Tests to verify that all domain components work together correctly.
 */

import {
  Money,
  Currency,
  EUR,
  AOA,
  UserId,
  WalletId,
  TransactionId,
  Wallet,
  Transaction,
  User,
  FeeCalculationService,
  ExchangeRateService,
  MockExchangeRateProvider
} from '../index'

describe('Domain Layer Integration', () => {
  let feeService: FeeCalculationService
  let exchangeService: ExchangeRateService
  let mockRateProvider: MockExchangeRateProvider

  beforeEach(() => {
    feeService = new FeeCalculationService()
    mockRateProvider = new MockExchangeRateProvider()
    exchangeService = new ExchangeRateService(mockRateProvider)
  })

  describe('Money and Currency', () => {
    it('should create and manipulate money correctly', () => {
      const eurAmount = Money.fromNumber(100, EUR)
      const aoaAmount = Money.fromNumber(120000, AOA)

      expect(eurAmount.amount).toBe(100)
      expect(eurAmount.currency.code).toBe('EUR')
      expect(eurAmount.toString()).toBe('€100.00')

      expect(aoaAmount.amount).toBe(120000)
      expect(aoaAmount.currency.code).toBe('AOA')
      expect(aoaAmount.toString()).toBe('Kz120000.00')
    })

    it('should perform arithmetic operations correctly', () => {
      const amount1 = Money.fromNumber(100, EUR)
      const amount2 = Money.fromNumber(50, EUR)

      const sum = amount1.add(amount2)
      expect(sum.amount).toBe(150)

      const difference = amount1.subtract(amount2)
      expect(difference.amount).toBe(50)

      const product = amount1.multiply(2)
      expect(product.amount).toBe(200)

      const quotient = amount1.divide(2)
      expect(quotient.amount).toBe(50)
    })

    it('should throw error for different currency operations', () => {
      const eurAmount = Money.fromNumber(100, EUR)
      const aoaAmount = Money.fromNumber(120000, AOA)

      expect(() => eurAmount.add(aoaAmount)).toThrow('Cannot operate on different currencies')
    })
  })

  describe('User Entity', () => {
    it('should create user with default limits', () => {
      const user = User.create(
        'user_123',
        'test@example.com',
        'John Doe',
        '+1234567890'
      )

      expect(user.email).toBe('test@example.com')
      expect(user.fullName).toBe('John Doe')
      expect(user.kycStatus).toBe('not_started')
      expect(user.isActive).toBe(true)
      expect(user.canPerformTransactions()).toBe(true)
    })

    it('should handle KYC status transitions correctly', () => {
      const user = User.create('user_123', 'test@example.com', 'John Doe')

      user.startKyc()
      expect(user.kycStatus).toBe('in_progress')

      user.submitKycForReview()
      expect(user.kycStatus).toBe('pending_review')

      user.approveKyc()
      expect(user.kycStatus).toBe('approved')
      expect(user.isKycApproved()).toBe(true)
      expect(user.canPerformHighValueTransactions()).toBe(true)
    })
  })

  describe('Wallet Entity', () => {
    it('should create wallet and handle balance operations', () => {
      const userId = UserId.generate()
      const wallet = Wallet.create(userId, EUR)

      expect(wallet.availableBalance.isZero()).toBe(true)
      expect(wallet.reservedBalance.isZero()).toBe(true)

      // Deposit money
      const depositAmount = Money.fromNumber(1000, EUR)
      wallet.deposit(depositAmount)
      expect(wallet.availableBalance.amount).toBe(1000)

      // Reserve funds
      const reserveAmount = Money.fromNumber(200, EUR)
      wallet.reserveFunds(reserveAmount)
      expect(wallet.availableBalance.amount).toBe(800)
      expect(wallet.reservedBalance.amount).toBe(200)

      // Withdraw money
      const withdrawAmount = Money.fromNumber(300, EUR)
      wallet.withdraw(withdrawAmount)
      expect(wallet.availableBalance.amount).toBe(500)
    })

    it('should throw error for insufficient balance', () => {
      const userId = UserId.generate()
      const wallet = Wallet.create(userId, EUR)

      const withdrawAmount = Money.fromNumber(100, EUR)
      expect(() => wallet.withdraw(withdrawAmount)).toThrow('Insufficient EUR balance')
    })
  })

  describe('Transaction Entity', () => {
    it('should create send transaction correctly', () => {
      const senderId = UserId.generate()
      const recipientId = UserId.generate()
      const amount = Money.fromNumber(100, EUR)
      const fee = Money.fromNumber(2, EUR)

      const transaction = Transaction.createSend(
        senderId,
        recipientId,
        amount,
        fee,
        'Test payment'
      )

      expect(transaction.type).toBe('send')
      expect(transaction.status).toBe('pending')
      expect(transaction.amount.amount).toBe(100)
      expect(transaction.fee.amount).toBe(2)
      expect(transaction.netAmount.amount).toBe(98)
      expect(transaction.description).toBe('Test payment')
    })

    it('should handle transaction state transitions', () => {
      const senderId = UserId.generate()
      const recipientId = UserId.generate()
      const amount = Money.fromNumber(100, EUR)
      const fee = Money.fromNumber(2, EUR)

      const transaction = Transaction.createSend(senderId, recipientId, amount, fee)

      transaction.markAsProcessing()
      expect(transaction.status).toBe('processing')

      transaction.markAsCompleted()
      expect(transaction.status).toBe('completed')
      expect(transaction.isCompleted()).toBe(true)
      expect(transaction.completedAt).toBeDefined()
    })
  })

  describe('Fee Calculation Service', () => {
    it('should calculate fees correctly for send transactions', () => {
      const amount = Money.fromNumber(1000, EUR)
      const result = feeService.calculateFee(amount, 'send')

      expect(result.totalFee.amount).toBeGreaterThan(0)
      expect(result.netAmount.amount).toBeLessThan(amount.amount)
      expect(result.feeBreakdown.appliedRate).toBeGreaterThan(0)
    })

    it('should apply user discounts for KYC-approved users', () => {
      const user = User.create('user_123', 'test@example.com', 'John Doe')
      user.startKyc()
      user.submitKycForReview()
      user.approveKyc()

      const amount = Money.fromNumber(1000, EUR)
      const regularFee = feeService.calculateFee(amount, 'send')
      const discountedFee = feeService.calculateFee(amount, 'send', user)

      expect(discountedFee.totalFee.amount).toBeLessThan(regularFee.totalFee.amount)
    })
  })

  describe('Exchange Rate Service', () => {
    it('should convert money between currencies', async () => {
      const eurAmount = Money.fromNumber(100, EUR)
      const aoaAmount = await exchangeService.convertMoney(eurAmount, AOA)

      expect(aoaAmount.currency.code).toBe('AOA')
      expect(aoaAmount.amount).toBe(120000) // Based on mock rate 1 EUR = 1200 AOA
    })

    it('should calculate exchange amounts correctly', async () => {
      const eurAmount = Money.fromNumber(100, EUR)
      const result = await exchangeService.calculateExchangeAmount(eurAmount, AOA)

      expect(result.outputAmount.currency.code).toBe('AOA')
      expect(result.outputAmount.amount).toBe(120000)
      expect(result.rate.fromCurrency.code).toBe('EUR')
      expect(result.rate.toCurrency.code).toBe('AOA')
      expect(result.rate.rate).toBe(1200)
    })
  })

  describe('Complete Transaction Flow', () => {
    it('should simulate a complete send transaction', async () => {
      // Create users
      const sender = User.create('user_sender', 'sender@example.com', 'Sender User')
      const recipient = User.create('user_recipient', 'recipient@example.com', 'Recipient User')

      // Create sender wallet with balance
      const senderWallet = Wallet.create(sender.id, EUR)
      senderWallet.deposit(Money.fromNumber(1000, EUR))

      // Calculate fee
      const sendAmount = Money.fromNumber(100, EUR)
      const feeResult = feeService.calculateFee(sendAmount, 'send', sender)

      // Create transaction
      const transaction = Transaction.createSend(
        sender.id,
        recipient.id,
        sendAmount,
        feeResult.totalFee,
        'Test payment'
      )

      // Process transaction
      expect(senderWallet.hasSufficientAvailableBalance(sendAmount.add(feeResult.totalFee))).toBe(true)

      transaction.markAsProcessing()
      senderWallet.withdraw(sendAmount.add(feeResult.totalFee))
      transaction.markAsCompleted()

      // Verify final state
      expect(transaction.isCompleted()).toBe(true)
      expect(senderWallet.availableBalance.amount).toBeLessThan(1000)
    })
  })
})
