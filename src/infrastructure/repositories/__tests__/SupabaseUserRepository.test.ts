/**
 * Supabase User Repository Tests
 * 
 * Unit tests for SupabaseUserRepository with mocked Supabase client.
 */

import { SupabaseUserRepository } from '../SupabaseUserRepository'
import { User, UserId } from '../../../domain'
import { RepositoryError, EntityNotFoundError } from '../../../domain/repositories'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      })),
      gte: jest.fn(() => ({
        lte: jest.fn()
      })),
      order: jest.fn(),
      range: jest.fn()
    })),
    upsert: jest.fn(),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
}

describe('SupabaseUserRepository', () => {
  let repository: SupabaseUserRepository
  let mockUser: User

  beforeEach(() => {
    repository = new SupabaseUserRepository(mockSupabaseClient as any)
    mockUser = User.create(
      'user_test123',
      'test@example.com',
      'Test User',
      '+1234567890'
    )
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockDbUser = {
        id: mockUser.id.value,
        clerk_user_id: mockUser.clerkUserId,
        email: mockUser.email,
        full_name: mockUser.fullName,
        phone_number: mockUser.phoneNumber,
        kyc_status: mockUser.kycStatus,
        is_active: mockUser.isActive,
        daily_transaction_limit: 1000,
        monthly_transaction_limit: 10000,
        single_transaction_limit: 500,
        withdrawal_limit: 200,
        created_at: mockUser.createdAt.toISOString(),
        updated_at: mockUser.updatedAt.toISOString()
      }

      const mockQuery = {
        single: jest.fn().mockResolvedValue({ data: mockDbUser, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery)
        })
      })

      const result = await repository.findById(mockUser.id)

      expect(result).toBeDefined()
      expect(result?.email).toBe(mockUser.email)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
    })

    it('should return null when user not found', async () => {
      const mockQuery = {
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        })
      }
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery)
        })
      })

      const result = await repository.findById(UserId.generate())

      expect(result).toBeNull()
    })

    it('should throw RepositoryError on database error', async () => {
      const mockQuery = {
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'OTHER_ERROR', message: 'Database error' } 
        })
      }
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery)
        })
      })

      await expect(repository.findById(UserId.generate()))
        .rejects.toThrow(RepositoryError)
    })
  })

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockDbUser = {
        id: mockUser.id.value,
        clerk_user_id: mockUser.clerkUserId,
        email: mockUser.email,
        full_name: mockUser.fullName,
        phone_number: mockUser.phoneNumber,
        kyc_status: mockUser.kycStatus,
        is_active: mockUser.isActive,
        daily_transaction_limit: 1000,
        monthly_transaction_limit: 10000,
        single_transaction_limit: 500,
        withdrawal_limit: 200,
        created_at: mockUser.createdAt.toISOString(),
        updated_at: mockUser.updatedAt.toISOString()
      }

      const mockQuery = {
        single: jest.fn().mockResolvedValue({ data: mockDbUser, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery)
        })
      })

      const result = await repository.findByEmail('test@example.com')

      expect(result).toBeDefined()
      expect(result?.email).toBe('test@example.com')
    })

    it('should handle email case insensitivity', async () => {
      const mockQuery = {
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      }
      
      const mockEq = jest.fn().mockReturnValue(mockQuery)
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq
        })
      })

      await repository.findByEmail('TEST@EXAMPLE.COM')

      expect(mockEq).toHaveBeenCalledWith('email', 'test@example.com')
    })
  })

  describe('save', () => {
    it('should save user successfully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null })
      })

      await expect(repository.save(mockUser)).resolves.not.toThrow()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
    })

    it('should throw RepositoryError on save failure', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ 
          error: { message: 'Save failed' } 
        })
      })

      await expect(repository.save(mockUser))
        .rejects.toThrow(RepositoryError)
    })
  })

  describe('existsByEmail', () => {
    it('should return true when user exists', async () => {
      const mockQuery = {
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'some-id' }, 
          error: null 
        })
      }
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery)
        })
      })

      const result = await repository.existsByEmail('test@example.com')

      expect(result).toBe(true)
    })

    it('should return false when user does not exist', async () => {
      const mockQuery = {
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        })
      }
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery)
        })
      })

      const result = await repository.existsByEmail('nonexistent@example.com')

      expect(result).toBe(false)
    })
  })

  describe('count', () => {
    it('should return user count', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ 
          count: 42, 
          error: null 
        })
      })

      const result = await repository.count()

      expect(result).toBe(42)
    })

    it('should return 0 when count is null', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ 
          count: null, 
          error: null 
        })
      })

      const result = await repository.count()

      expect(result).toBe(0)
    })
  })

  describe('findWithPagination', () => {
    it('should return paginated results', async () => {
      const mockUsers = [
        {
          id: 'user1',
          clerk_user_id: 'user_1',
          email: 'user1@example.com',
          full_name: 'User One',
          kyc_status: 'not_started',
          is_active: true,
          daily_transaction_limit: 1000,
          monthly_transaction_limit: 10000,
          single_transaction_limit: 500,
          withdrawal_limit: 200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      const mockQuery = {
        range: jest.fn().mockResolvedValue({ 
          data: mockUsers, 
          count: 1, 
          error: null 
        })
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue(mockQuery)
        })
      })

      const result = await repository.findWithPagination(0, 10)

      expect(result.users).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
    })
  })
})
