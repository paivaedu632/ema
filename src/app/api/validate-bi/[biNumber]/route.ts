import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

/**
 * GET /api/validate-bi/[biNumber]
 * Validate Angolan BI (Bilhete de Identidade) number format
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { biNumber: string } }
) {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const biNumber = params.biNumber

    // Validate input
    if (!biNumber) {
      return NextResponse.json(
        { success: false, error: 'BI number is required' },
        { status: 400 }
      )
    }

    // Perform BI validation
    const validationResult = validateBINumber(biNumber)

    return NextResponse.json({
      success: true,
      data: {
        biNumber: biNumber,
        isValid: validationResult.isValid,
        format: validationResult.format,
        validation: validationResult.validation,
        extractedInfo: validationResult.extractedInfo,
        validatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error validating BI number:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate BI number',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to validate Angolan BI number format
 */
function validateBINumber(biNumber: string): any {
  const validation = {
    isValid: false,
    format: '',
    validation: {
      errors: [] as string[],
      warnings: [] as string[],
      checks: {} as any
    },
    extractedInfo: {} as any
  }

  // Clean the BI number (remove spaces and convert to uppercase)
  const cleanBI = biNumber.replace(/\s+/g, '').toUpperCase()

  // Check basic format requirements
  validation.validation.checks.length = {
    expected: 14,
    actual: cleanBI.length,
    valid: cleanBI.length === 14
  }

  if (cleanBI.length !== 14) {
    validation.validation.errors.push(`BI number must be exactly 14 characters (current: ${cleanBI.length})`)
    return validation
  }

  // Angolan BI format: 9 digits + 2 letters + 3 digits
  // Example: 123456789AB123
  const biPattern = /^(\d{9})([A-Z]{2})(\d{3})$/
  const match = cleanBI.match(biPattern)

  validation.validation.checks.pattern = {
    expected: '9 digits + 2 letters + 3 digits',
    actual: cleanBI,
    valid: !!match
  }

  if (!match) {
    validation.validation.errors.push('BI number format is invalid. Expected format: 9 digits + 2 letters + 3 digits')
    return validation
  }

  // Extract components
  const [, firstPart, letterPart, lastPart] = match
  validation.extractedInfo = {
    firstPart: firstPart,
    letterPart: letterPart,
    lastPart: lastPart,
    fullNumber: cleanBI
  }

  // Validate first part (9 digits)
  validation.validation.checks.firstPart = {
    value: firstPart,
    length: firstPart.length,
    valid: firstPart.length === 9 && /^\d{9}$/.test(firstPart)
  }

  // Check for sequential or repeated digits (common invalid patterns)
  if (/^(\d)\1{8}$/.test(firstPart)) {
    validation.validation.warnings.push('BI number contains all identical digits in the first part')
  }

  if (/^(012345678|123456789|987654321)$/.test(firstPart)) {
    validation.validation.warnings.push('BI number appears to be a sequential pattern')
  }

  // Validate letter part (2 letters)
  validation.validation.checks.letterPart = {
    value: letterPart,
    length: letterPart.length,
    valid: letterPart.length === 2 && /^[A-Z]{2}$/.test(letterPart)
  }

  // Common invalid letter combinations
  const invalidLetterCombos = ['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II', 'JJ', 'KK', 'LL', 'MM', 'NN', 'OO', 'PP', 'QQ', 'RR', 'SS', 'TT', 'UU', 'VV', 'WW', 'XX', 'YY', 'ZZ']
  if (invalidLetterCombos.includes(letterPart)) {
    validation.validation.warnings.push('BI number contains repeated letters which may be invalid')
  }

  // Validate last part (3 digits)
  validation.validation.checks.lastPart = {
    value: lastPart,
    length: lastPart.length,
    valid: lastPart.length === 3 && /^\d{3}$/.test(lastPart)
  }

  // Check for common test/dummy numbers
  const testNumbers = [
    '000000000AA000',
    '111111111BB111',
    '123456789AB123',
    '999999999ZZ999'
  ]

  if (testNumbers.includes(cleanBI)) {
    validation.validation.warnings.push('BI number appears to be a test or dummy number')
  }

  // Additional validation: Check digit validation (if algorithm is known)
  // Note: The actual check digit algorithm for Angolan BI is not publicly documented
  // This is a placeholder for when the algorithm becomes available
  validation.validation.checks.checkDigit = {
    implemented: false,
    note: 'Check digit validation not implemented (algorithm not publicly available)'
  }

  // Determine overall validity
  const hasErrors = validation.validation.errors.length > 0
  const allChecksValid = Object.values(validation.validation.checks)
    .filter((check: any) => typeof check.valid === 'boolean')
    .every((check: any) => check.valid)

  validation.isValid = !hasErrors && allChecksValid
  validation.format = 'ANGOLAN_BI'

  // Add success message if valid
  if (validation.isValid) {
    if (validation.validation.warnings.length === 0) {
      validation.validation.checks.overall = 'BI number format is valid'
    } else {
      validation.validation.checks.overall = 'BI number format is valid but has warnings'
    }
  }

  return validation
}
