'use client'

import { useMemo } from 'react'

interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

interface UseFormValidationOptions {
  rules?: ValidationRule[]
  required?: boolean
  requiredMessage?: string
}

interface UseFormValidationReturn {
  isValid: boolean
  canContinue: boolean
  errorMessage?: string
  isEmpty: boolean
}

/**
 * Reusable hook for form field validation
 * Consolidates common validation patterns used across forms
 */
export function useFormValidation(
  value: string,
  { rules = [], required = true, requiredMessage = 'Este campo é obrigatório' }: UseFormValidationOptions = {}
): UseFormValidationReturn {
  return useMemo(() => {
    const trimmedValue = value.trim()
    const isEmpty = trimmedValue === ''

    // Check required validation first
    if (required && isEmpty) {
      return {
        isValid: false,
        canContinue: false,
        errorMessage: requiredMessage,
        isEmpty: true
      }
    }

    // If not required and empty, it's valid
    if (!required && isEmpty) {
      return {
        isValid: true,
        canContinue: true,
        isEmpty: true
      }
    }

    // Check custom validation rules
    for (const rule of rules) {
      if (!rule.validate(trimmedValue)) {
        return {
          isValid: false,
          canContinue: false,
          errorMessage: rule.message,
          isEmpty
        }
      }
    }

    return {
      isValid: true,
      canContinue: true,
      isEmpty
    }
  }, [value, rules, required, requiredMessage])
}

/**
 * Common validation rules for reuse across components
 */
export const ValidationRules = {
  email: {
    validate: (value: string) => value.includes('@') && value.length > 3,
    message: 'Por favor, insira um email válido'
  },

  password: {
    validate: (value: string) => value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value),
    message: 'Senha deve ter pelo menos 8 caracteres, incluindo letras e números'
  },

  phone: {
    validate: (value: string) => value.replace(/\D/g, '').length >= 9,
    message: 'Por favor, insira um número de telefone válido'
  },

  verificationCode: {
    validate: (value: string) => value.trim().length === 6,
    message: 'Código deve ter 6 dígitos'
  },

  biNumber: {
    validate: (value: string) => /^\d{9}[A-Z]{2}\d{3}$/.test(value.replace(/\s/g, '')),
    message: 'Número de BI inválido. Formato: 123456789AB123'
  },

  date: {
    validate: (value: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(value),
    message: 'Data deve estar no formato DD/MM/AAAA'
  },

  nonEmpty: {
    validate: (value: string) => value.trim() !== '',
    message: 'Este campo não pode estar vazio'
  },

  minLength: (length: number) => ({
    validate: (value: string) => value.trim().length >= length,
    message: `Deve ter pelo menos ${length} caracteres`
  }),

  maxLength: (length: number) => ({
    validate: (value: string) => value.trim().length <= length,
    message: `Deve ter no máximo ${length} caracteres`
  })
}

/**
 * Specialized validation hooks for common use cases
 */
export function useEmailValidation(email: string, required = true) {
  return useFormValidation(email, {
    rules: [ValidationRules.email],
    required,
    requiredMessage: 'Email é obrigatório'
  })
}

export function usePasswordValidation(password: string, required = true) {
  return useFormValidation(password, {
    rules: [ValidationRules.password],
    required,
    requiredMessage: 'Senha é obrigatória'
  })
}

export function usePhoneValidation(phone: string, required = true) {
  return useFormValidation(phone, {
    rules: [ValidationRules.phone],
    required,
    requiredMessage: 'Telefone é obrigatório'
  })
}

export function useVerificationCodeValidation(code: string, required = true) {
  return useFormValidation(code, {
    rules: [ValidationRules.verificationCode],
    required,
    requiredMessage: 'Código de verificação é obrigatório'
  })
}

export function useBIValidation(biNumber: string, required = true) {
  return useFormValidation(biNumber, {
    rules: [ValidationRules.biNumber],
    required,
    requiredMessage: 'Número de BI é obrigatório'
  })
}

export function useDateValidation(date: string, required = true) {
  return useFormValidation(date, {
    rules: [ValidationRules.date],
    required,
    requiredMessage: 'Data é obrigatória'
  })
}
