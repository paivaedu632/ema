import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/kyc/progress
 * Update user's KYC progress and step completion
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
    const { step, data: stepData, status = 'in_progress' } = body

    // Validate input
    if (!step || step < 1 || step > 16) {
      return NextResponse.json(
        { success: false, error: 'Invalid step number. Must be between 1 and 16.' },
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

    // Calculate completion percentage
    const completionPercentage = (step / 16) * 100

    // Update KYC record
    const { data: kycRecord, error: kycError } = await supabaseAdmin
      .from('kyc_records')
      .upsert({
        user_id: user.id,
        status: status,
        current_step: step,
        data: stepData || {},
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (kycError) {
      throw new Error(`Failed to update KYC record: ${kycError.message}`)
    }

    // Update users table (this will trigger the sync function)
    const { data: updatedUser, error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        kyc_status: status,
        kyc_current_step: step,
        kyc_completion_percentage: completionPercentage,
        kyc_last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (userUpdateError) {
      throw new Error(`Failed to update user KYC status: ${userUpdateError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        step: step,
        status: status,
        completion_percentage: completionPercentage,
        total_steps: 16,
        next_step_url: getNextStepUrl(step + 1),
        kyc_record_id: kycRecord.id
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error updating KYC progress:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update KYC progress',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/kyc/progress
 * Get user's detailed KYC progress and step data
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

    // Get detailed KYC record
    const { data: kycRecord, error: kycError } = await supabaseAdmin
      .from('kyc_records')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (kycError && kycError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to fetch KYC record: ${kycError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        status: user.kyc_status || 'not_started',
        current_step: user.kyc_current_step || 1,
        total_steps: 16,
        completion_percentage: user.kyc_completion_percentage || 0.00,
        last_updated: user.kyc_last_updated,
        step_data: kycRecord?.data || {},
        verification_results: kycRecord?.verification_results || {},
        documents: kycRecord?.documents || {},
        next_step_url: getNextStepUrl(user.kyc_current_step || 1),
        progress_summary: getProgressSummary(user.kyc_current_step || 1)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error fetching KYC progress:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch KYC progress',
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
function getNextStepUrl(step: number): string {
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

  return stepUrls[step] || '/kyc/success'
}

/**
 * Helper function to get progress summary
 */
function getProgressSummary(currentStep: number) {
  const stepNames = [
    'Notifications Setup',
    'Security Passcode',
    'Personal Information',
    'Country Selection',
    'Address Information',
    'ID Front Photo',
    'ID Back Photo',
    'Document Upload',
    'BI Number Entry',
    'Selfie Photo',
    'Liveness Check',
    'ID Matching',
    'Occupation Details',
    'Income Source',
    'Monthly Income',
    'PEP Declaration',
    'App Usage'
  ]

  return {
    completed_steps: Math.max(0, currentStep - 1),
    current_step_name: stepNames[currentStep - 1] || 'Unknown',
    remaining_steps: Math.max(0, 16 - currentStep + 1),
    estimated_time_remaining: Math.max(0, (16 - currentStep + 1) * 0.5) // 30 seconds per step
  }
}
