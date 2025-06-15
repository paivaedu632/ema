import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, getUserLimits, checkTransactionLimits } from '@/lib/supabase-server'

/**
 * GET /api/user/limits
 * Get user's current transaction limits and usage
 */
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const currency = searchParams.get('currency') || 'EUR'

    // Validate currency
    if (!['EUR', 'AOA'].includes(currency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid currency. Must be EUR or AOA' },
        { status: 400 }
      )
    }

    // Get user from database
    const { data: user, error: userError } = await getUserByClerkId(clerkUserId)
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user limits
    const { data: limits, error: limitsError } = await getUserLimits(user.id, currency)
    
    if (limitsError) {
      throw new Error(`Failed to fetch user limits: ${limitsError.message}`)
    }

    // Get limits for both currencies
    const eurLimits = currency === 'EUR' ? limits : await getUserLimits(user.id, 'EUR')
    const aoaLimits = currency === 'AOA' ? limits : await getUserLimits(user.id, 'AOA')

    return NextResponse.json({
      success: true,
      data: {
        current_currency: currency,
        limits: {
          EUR: eurLimits.data || eurLimits,
          AOA: aoaLimits.data || aoaLimits
        },
        kyc_status: user.kyc_status,
        upgrade_benefits: getUpgradeBenefits(user.kyc_status),
        restrictions: getRestrictions(user.kyc_status)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error fetching user limits:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user limits',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/limits/check
 * Check if a transaction amount is within user limits
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { amount, currency = 'EUR', transaction_type } = body

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!['EUR', 'AOA'].includes(currency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid currency. Must be EUR or AOA' },
        { status: 400 }
      )
    }

    // Get user from database
    const { data: user, error: userError } = await getUserByClerkId(clerkUserId)
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check transaction limits
    const { data: limitCheck, error: checkError } = await checkTransactionLimits(
      user.id, 
      amount, 
      currency
    )
    
    if (checkError) {
      throw new Error(`Failed to check transaction limits: ${checkError.message}`)
    }

    // Get current limits for context
    const { data: currentLimits } = await getUserLimits(user.id, currency)

    const response = {
      success: true,
      data: {
        within_limits: limitCheck.within_limits,
        amount_requested: amount,
        currency: currency,
        transaction_type: transaction_type,
        limit_check: limitCheck,
        current_limits: currentLimits,
        kyc_status: user.kyc_status,
        requires_kyc: !limitCheck.within_limits && user.kyc_status !== 'approved',
        kyc_benefits: user.kyc_status !== 'approved' ? getKYCBenefits() : null,
        suggested_action: getSuggestedAction(limitCheck, user.kyc_status, amount)
      },
      timestamp: new Date().toISOString()
    }

    // Return appropriate status code
    const statusCode = limitCheck.within_limits ? 200 : 422

    return NextResponse.json(response, { status: statusCode })

  } catch (error) {
    console.error('❌ Error checking transaction limits:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check transaction limits',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get upgrade benefits based on KYC status
 */
function getUpgradeBenefits(kycStatus: string) {
  if (kycStatus === 'approved') {
    return null // Already has full benefits
  }

  return {
    transaction_limit: {
      current: '€100',
      after_kyc: '€5,000'
    },
    daily_limit: {
      current: '€500',
      after_kyc: '€10,000'
    },
    monthly_limit: {
      current: '€2,000',
      after_kyc: '€50,000'
    },
    additional_features: [
      'Withdraw to bank accounts',
      'Send to external recipients',
      'Priority customer support',
      'Advanced security features'
    ]
  }
}

/**
 * Helper function to get current restrictions
 */
function getRestrictions(kycStatus: string) {
  if (kycStatus === 'approved') {
    return []
  }

  return [
    'Limited transaction amounts',
    'Cannot withdraw to external accounts',
    'Cannot send to unverified recipients',
    'Reduced daily and monthly limits'
  ]
}

/**
 * Helper function to get KYC benefits
 */
function getKYCBenefits() {
  return {
    time_estimate: '~10 minutes',
    immediate_benefits: [
      'Increase limits by 50x',
      'Access all features',
      'Faster processing',
      'Enhanced security'
    ],
    verification_steps: 16,
    completion_rate: '99.2%'
  }
}

/**
 * Helper function to get suggested action based on limit check
 */
function getSuggestedAction(limitCheck: any, kycStatus: string, amount: number) {
  if (limitCheck.within_limits) {
    return {
      action: 'proceed',
      message: 'Transaction can proceed',
      button_text: 'Continue'
    }
  }

  if (kycStatus === 'approved') {
    return {
      action: 'reduce_amount',
      message: `Amount exceeds your ${limitCheck.limit_type} limit`,
      button_text: 'Reduce Amount',
      max_amount: limitCheck.current_limit
    }
  }

  return {
    action: 'verify_identity',
    message: 'Complete identity verification to proceed',
    button_text: 'Verify Identity',
    kyc_url: '/kyc/notifications',
    benefits: getKYCBenefits()
  }
}
