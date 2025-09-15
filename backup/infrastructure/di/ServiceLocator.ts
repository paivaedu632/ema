/**
 * Service Locator Pattern
 * 
 * Provides a simplified interface for dependency resolution.
 * Useful for components that need to access services without direct injection.
 */

import { Container, getContainer } from './Container'
import {
  SendMoneyUseCase
} from '../../application/use-cases/SendMoneyUseCase'
import {
  GetWalletBalanceQueryHandler
} from '../../application/use-cases/GetWalletBalanceUseCase'
import {
  GetUserWalletsQueryHandler
} from '../../application/use-cases/GetUserWalletsUseCase'
import {
  BuyCurrencyUseCase
} from '../../application/use-cases/BuyCurrencyUseCase'
import {
  RegisterUserUseCase
} from '../../application/use-cases/RegisterUserUseCase'
import {
  UserRepository,
  WalletRepository,
  TransactionRepository
} from '../../domain/repositories'
import {
  FeeCalculationService,
  ExchangeRateService
} from '../../domain'

/**
 * Service Locator for easy dependency resolution
 */
export class ServiceLocator {
  private static container: Container

  /**
   * Initialize the service locator with a container
   */
  static initialize(container?: Container): void {
    ServiceLocator.container = container || getContainer()
  }

  /**
   * Get the underlying container
   */
  static getContainer(): Container {
    if (!ServiceLocator.container) {
      ServiceLocator.initialize()
    }
    return ServiceLocator.container
  }

  /**
   * Resolve a service by name
   */
  static resolve<T>(serviceName: string, scopeId?: string): T {
    return ServiceLocator.getContainer().resolve<T>(serviceName, scopeId)
  }

  /**
   * Check if a service is registered
   */
  static isRegistered(serviceName: string): boolean {
    return ServiceLocator.getContainer().isRegistered(serviceName)
  }

  /**
   * Get services by tag
   */
  static getServicesByTag(tag: string): string[] {
    return ServiceLocator.getContainer().getServicesByTag(tag)
  }

  // Use Cases
  static getSendMoneyUseCase(): SendMoneyUseCase {
    return ServiceLocator.resolve<SendMoneyUseCase>('sendMoneyUseCase')
  }

  static getGetWalletBalanceQueryHandler(): GetWalletBalanceQueryHandler {
    return ServiceLocator.resolve<GetWalletBalanceQueryHandler>('getWalletBalanceQueryHandler')
  }

  static getGetUserWalletsQueryHandler(): GetUserWalletsQueryHandler {
    return ServiceLocator.resolve<GetUserWalletsQueryHandler>('getUserWalletsQueryHandler')
  }

  static getBuyCurrencyUseCase(): BuyCurrencyUseCase {
    return ServiceLocator.resolve<BuyCurrencyUseCase>('buyCurrencyUseCase')
  }

  static getRegisterUserUseCase(): RegisterUserUseCase {
    return ServiceLocator.resolve<RegisterUserUseCase>('registerUserUseCase')
  }

  // Repositories
  static getUserRepository(): UserRepository {
    return ServiceLocator.resolve<UserRepository>('userRepository')
  }

  static getWalletRepository(): WalletRepository {
    return ServiceLocator.resolve<WalletRepository>('walletRepository')
  }

  static getTransactionRepository(): TransactionRepository {
    return ServiceLocator.resolve<TransactionRepository>('transactionRepository')
  }

  // Domain Services
  static getFeeCalculationService(): FeeCalculationService {
    return ServiceLocator.resolve<FeeCalculationService>('feeCalculationService')
  }

  static getExchangeRateService(): ExchangeRateService {
    return ServiceLocator.resolve<ExchangeRateService>('exchangeRateService')
  }
}

/**
 * React Hook for using services in components
 */
export function useService<T>(serviceName: string, scopeId?: string): T {
  return ServiceLocator.resolve<T>(serviceName, scopeId)
}

/**
 * React Hook for use cases
 */
export function useUseCases() {
  return {
    sendMoney: ServiceLocator.getSendMoneyUseCase(),
    getWalletBalance: ServiceLocator.getGetWalletBalanceQueryHandler(),
    getUserWallets: ServiceLocator.getGetUserWalletsQueryHandler(),
    buyCurrency: ServiceLocator.getBuyCurrencyUseCase(),
    registerUser: ServiceLocator.getRegisterUserUseCase()
  }
}

/**
 * React Hook for repositories
 */
export function useRepositories() {
  return {
    users: ServiceLocator.getUserRepository(),
    wallets: ServiceLocator.getWalletRepository(),
    transactions: ServiceLocator.getTransactionRepository()
  }
}

/**
 * React Hook for domain services
 */
export function useDomainServices() {
  return {
    feeCalculation: ServiceLocator.getFeeCalculationService(),
    exchangeRate: ServiceLocator.getExchangeRateService()
  }
}

/**
 * Decorator for automatic service injection
 */
export function Injectable(serviceName: string) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args)
        // Inject the service
        Object.defineProperty(this, serviceName, {
          get: () => ServiceLocator.resolve(serviceName),
          enumerable: true,
          configurable: false
        })
      }
    }
  }
}

/**
 * Property decorator for service injection
 */
export function Inject(serviceName: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: () => ServiceLocator.resolve(serviceName),
      enumerable: true,
      configurable: false
    })
  }
}

/**
 * Scoped service manager for request-scoped services
 */
export class ScopedServiceManager {
  private scopeId: string

  constructor(scopeId: string) {
    this.scopeId = scopeId
  }

  resolve<T>(serviceName: string): T {
    return ServiceLocator.resolve<T>(serviceName, this.scopeId)
  }

  clearScope(): void {
    ServiceLocator.getContainer().clearScope(this.scopeId)
  }

  static createRequestScope(requestId: string): ScopedServiceManager {
    return new ScopedServiceManager(`request_${requestId}`)
  }

  static createUserScope(userId: string): ScopedServiceManager {
    return new ScopedServiceManager(`user_${userId}`)
  }
}

// Initialize service locator on module load
ServiceLocator.initialize()
