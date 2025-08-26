/**
 * Comprehensive formatting utilities for EmaPay
 * Consolidates date, currency, number, and text formatting functions
 */

// ===== DATE FORMATTING UTILITIES =====

/**
 * Format date input with DD/MM/AAAA pattern
 * Used across KYC forms and date inputs
 */
export function formatDateInput(value: string): string {
  // Remove non-numeric characters
  const numbers = value.replace(/\D/g, '')
  
  // Format as DD/MM/AAAA
  if (numbers.length <= 2) {
    return numbers
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
  }
}

/**
 * Validate date format DD/MM/AAAA
 * Used across form validation and KYC flows
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
  return dateRegex.test(date)
}

/**
 * Parse date string to Date object
 * Handles DD/MM/AAAA format common in EmaPay
 */
export function parseEmapayDate(dateString: string): Date | null {
  if (!isValidDateFormat(dateString)) return null
  
  const [day, month, year] = dateString.split('/').map(Number)
  const date = new Date(year, month - 1, day) // month is 0-indexed
  
  // Validate the date is actually valid
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null
  }
  
  return date
}

/**
 * Format Date object to DD/MM/AAAA string
 */
export function formatDateToEmapay(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString()
  return `${day}/${month}/${year}`
}

/**
 * Get current date in DD/MM/AAAA format
 */
export function getCurrentDateEmapay(): string {
  return formatDateToEmapay(new Date())
}

// ===== CURRENCY & NUMBER FORMATTING UTILITIES =====

/**
 * DEPRECATED: Use formatAmountWithCurrency() from @/lib/format instead
 * @deprecated This function is deprecated. Use formatAmountWithCurrency() from @/lib/format
 */
export function formatCurrency(amount: number | string, currency: string): string {
  console.warn('formatCurrency from formatting-utils is deprecated. Use formatAmountWithCurrency from @/lib/format')

  // Import the centralized function dynamically to avoid circular imports
  const { formatAmountWithCurrency } = require('@/lib/format')
  return formatAmountWithCurrency(amount, currency)
}

/**
 * DEPRECATED: Use formatAmountForInput() from @/lib/format instead
 * @deprecated This function is deprecated. Use formatAmountForInput() from @/lib/format
 */
export function formatAmount(amount: number | string): string {
  console.warn('formatAmount from formatting-utils is deprecated. Use formatAmountForInput from @/lib/format')

  // Import the centralized function dynamically to avoid circular imports
  const { formatAmountForInput } = require('@/lib/format')
  return formatAmountForInput(amount, 'EUR') // Default to EUR
}

/**
 * Parse amount string to number
 * Handles various input formats
 */
export function parseAmount(amount: string): number {
  const cleaned = amount.replace(/[^\d.,]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format percentage with % symbol
 * Used for confidence scores and fees
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

/**
 * Format large numbers with K/M suffixes
 * Used for displaying large amounts compactly
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}



// ===== TEXT FORMATTING UTILITIES =====

/**
 * Sanitize filename for storage
 * Used for S3 uploads and file handling
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

/**
 * Capitalize first letter of each word
 * Used for names and titles
 */
export function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Format phone number for display
 * Handles various phone number formats
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('244')) {
    // Angola format: +244 XXX XXX XXX
    return `+244 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
  }
  
  // Default format
  return phone
}

/**
 * Mask sensitive information
 * Used for displaying partial account numbers, etc.
 */
export function maskSensitiveInfo(text: string, visibleStart = 4, visibleEnd = 4): string {
  if (text.length <= visibleStart + visibleEnd) return text
  
  const start = text.slice(0, visibleStart)
  const end = text.slice(-visibleEnd)
  const masked = '*'.repeat(text.length - visibleStart - visibleEnd)
  
  return `${start}${masked}${end}`
}

// ===== VALIDATION UTILITIES =====

/**
 * Check if amount is valid for transactions
 * Consolidates amount validation logic
 */
export function isValidAmount(amount: string | number): boolean {
  if (!amount || amount === "0" || amount === "") return false
  
  const numAmount = typeof amount === 'string' ? parseAmount(amount) : amount
  return !isNaN(numAmount) && numAmount > 0
}

/**
 * Check if confidence score meets threshold
 * Used for AWS service validations
 */
export function isConfidenceAcceptable(confidence: number, minThreshold = 80): boolean {
  return confidence >= minThreshold
}

// ===== ID GENERATION UTILITIES =====

/**
 * Generate unique ID with timestamp
 * Used for KYC processes and file uploads
 */
export function generateUniqueId(prefix = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

/**
 * Generate S3 object key with proper structure
 * Consolidates S3 key generation logic
 */
export function generateS3Key(
  folder: string,
  userId: string,
  documentType: string,
  extension: string
): string {
  const timestamp = Date.now()
  const sanitizedUserId = sanitizeFilename(userId)
  const sanitizedDocType = sanitizeFilename(documentType)
  
  return `${folder}${sanitizedUserId}/${sanitizedDocType}-${timestamp}.${extension}`
}

// ===== EXPORT COLLECTIONS =====

export const DateUtils = {
  formatInput: formatDateInput,
  isValid: isValidDateFormat,
  parse: parseEmapayDate,
  format: formatDateToEmapay,
  getCurrent: getCurrentDateEmapay
}

export const CurrencyUtils = {
  format: formatCurrency,
  formatAmount,
  parse: parseAmount,
  isValid: isValidAmount
}

export const TextUtils = {
  sanitizeFilename,
  capitalizeWords,
  formatPhone: formatPhoneDisplay,
  mask: maskSensitiveInfo
}

export const NumberUtils = {
  formatPercentage,
  formatCompact: formatCompactNumber,
  isConfidenceAcceptable
}

export const IdUtils = {
  generate: generateUniqueId,
  generateS3Key
}
