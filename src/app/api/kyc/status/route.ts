import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, getUserKYCStatus } from '@/lib/supabase-server'

/**
 * GET /api/kyc/status
 * Get user's KYC verification status and progress
 */
export async function GET() {
  try {
    // Get authenticated user
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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

    // Get KYC status
    const { data: kycStatus, error: kycError } = await getUserKYCStatus(user.id)
    
    if (kycError) {
      throw new Error(`Failed to fetch KYC status: ${kycError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        status: kycStatus?.kyc_status || 'not_started',
        current_step: kycStatus?.kyc_current_step || 1,
        total_steps: 16,
        completion_percentage: kycStatus?.kyc_completion_percentage || 0.00,
        last_updated: kycStatus?.kyc_last_updated,
        next_step_url: getNextStepUrl(kycStatus?.kyc_current_step || 1),
        benefits: getKYCBenefits(kycStatus?.kyc_status || 'not_started')
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error fetching KYC status:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch KYC status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/kyc/status
 * Update user's KYC status (for admin or system use)
 */
export async function PUT(req: NextRequest) {
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
    const { status, current_step, completion_percentage } = body

    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'requires_update']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid KYC status' },
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

    // Update KYC status in users table
    const updateData: {
      updated_at: string;
      kyc_status?: string;
      kyc_current_step?: string;
      kyc_completion_percentage?: number;
    } = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.kyc_status = status
    if (current_step) updateData.kyc_current_step = current_step
    if (completion_percentage !== undefined) updateData.kyc_completion_percentage = completion_percentage

    const { data: updatedUser, error: updateError } = await getUserByClerkId(clerkUserId)
    
    if (updateError) {
      throw new Error(`Failed to update KYC status: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        status: updatedUser?.kyc_status || 'not_started',
        current_step: updatedUser?.kyc_current_step || 1,
        completion_percentage: updatedUser?.kyc_completion_percentage || 0.00,
        last_updated: updatedUser?.kyc_last_updated
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error updating KYC status:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update KYC status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get next step URL based on current step
 */
function getNextStepUrl(currentStep: number): string {
  const stepUrls: { [key: number]: string } = {
    1: '/kyc/notifications',
    2: '/kyc/passcode',
    3: '/kyc/personal-info',
    4: '/kyc/country',
    5: '/kyc/address',
    6: '/kyc/id-front',
    7: '/kyc/id-back',
    8: '/kyc/id-upload',
    9: '/kyc/bi-number',
    10: '/kyc/selfie',
    11: '/kyc/liveness-check',
    12: '/kyc/id-matching',
    13: '/kyc/occupation',
    14: '/kyc/income-source',
    15: '/kyc/monthly-income',
    16: '/kyc/pep',
    17: '/kyc/app-use'
  }

  return stepUrls[currentStep] || '/kyc/notifications'
}

/**
 * Helper function to get KYC benefits based on status
 */
function getKYCBenefits(status: string): string[] {
  const baseBenefits = [
    'Increase transaction limits',
    'Access all features',
    'Faster processing',
    'Enhanced security'
  ]

  switch (status) {
    case 'not_started':
      return [...baseBenefits, 'Complete verification in ~10 minutes']
    case 'in_progress':
      return [...baseBenefits, 'Continue where you left off']
    case 'pending_review':
      return ['Review in progress', 'You will be notified soon']
    case 'approved':
      return ['All features unlocked', 'Maximum transaction limits']
    case 'rejected':
      return ['Resubmit required documents', 'Contact support for help']
    default:
      return baseBenefits
  }
}
