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

    // Get user limits with graceful fallback
    let limits = null
    try {
      const { data, error: limitsError } = await getUserLimits(user.id, currency)

      if (limitsError) {
        console.warn('User limits lookup failed, using default limits:', limitsError.message)
        limits = getDefaultLimits(currency)
      } else {
        limits = data
      }
    } catch (error) {
      console.warn('User limits function unavailable, using default limits:', error)
      limits = getDefaultLimits(currency)
    }

    // Get limits for both currencies with graceful fallback
    let eurLimits = null
    let aoaLimits = null

    try {
      if (currency === 'EUR') {
        eurLimits = limits
        const { data } = await getUserLimits(user.id, 'AOA')
        aoaLimits = data || getDefaultLimits('AOA')
      } else {
        aoaLimits = limits
        const { data } = await getUserLimits(user.id, 'EUR')
        eurLimits = data || getDefaultLimits('EUR')
      }
    } catch (error) {
      console.warn('Failed to get limits for both currencies, using defaults:', error)
      eurLimits = currency === 'EUR' ? limits : getDefaultLimits('EUR')
      aoaLimits = currency === 'AOA' ? limits : getDefaultLimits('AOA')
    }

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
 * Helper function to get default limits when database functions fail
 */
function getDefaultLimits(currency: string) {
  if (currency === 'EUR') {
    return {
      current_daily_limit: 500.00,
      current_monthly_limit: 2000.00,
      current_transaction_limit: 100.00,
      daily_used: 0.00,
      monthly_used: 0.00,
      daily_remaining: 500.00,
      monthly_remaining: 2000.00
    }
  } else { // AOA
    return {
      current_daily_limit: 462500.00,
      current_monthly_limit: 1850000.00,
      current_transaction_limit: 92500.00,
      daily_used: 0.00,
      monthly_used: 0.00,
      daily_remaining: 462500.00,
      monthly_remaining: 1850000.00
    }
  }
}
