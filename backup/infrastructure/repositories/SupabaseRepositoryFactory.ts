/**
 * Supabase Repository Factory
 * 
 * Factory implementation for creating Supabase-based repositories.
 * Provides dependency injection and configuration management.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  RepositoryFactory,
  UserRepository,
  WalletRepository,
  TransactionRepository,
  UnitOfWork
} from '../../domain/repositories'
import { SupabaseUserRepository } from './SupabaseUserRepository'
import { SupabaseWalletRepository } from './SupabaseWalletRepository'
import { SupabaseTransactionRepository } from './SupabaseTransactionRepository'
import { SupabaseUnitOfWork } from './SupabaseUnitOfWork'

export class SupabaseRepositoryFactory implements RepositoryFactory {
  constructor(private readonly supabase: SupabaseClient) {}

  createUserRepository(): UserRepository {
    return new SupabaseUserRepository(this.supabase)
  }

  createWalletRepository(): WalletRepository {
    return new SupabaseWalletRepository(this.supabase)
  }

  createTransactionRepository(): TransactionRepository {
    return new SupabaseTransactionRepository(this.supabase)
  }

  createUnitOfWork(): UnitOfWork {
    return new SupabaseUnitOfWork(this.supabase)
  }
}
