import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, supabaseAdmin } from '@/lib/supabase-server'

/**
 * POST /api/kyc/progress
 * Save KYC progress to database
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { step, data, status = 'in_progress' } = body

    // Validate input
    if (!step || !data) {
      return NextResponse.json(
        { success: false, error: 'Step and data are required' },
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

    // Check if KYC record exists
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('kyc_records')
      .select('id, form_data, current_step')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching KYC record:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    // Prepare form data - merge with existing data if record exists
    const existingFormData = existingRecord?.form_data || {}
    const updatedFormData = { ...existingFormData, ...data }

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('kyc_records')
        .update({
          current_step: step,
          form_data: updatedFormData,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)

      if (updateError) {
        console.error('Error updating KYC record:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to update KYC progress' },
          { status: 500 }
        )
      }
    } else {
      // Create new record
      const { error: insertError } = await supabaseAdmin
        .from('kyc_records')
        .insert({
          user_id: user.id,
          current_step: step,
          form_data: updatedFormData,
          status: status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error creating KYC record:', insertError)
        return NextResponse.json(
          { success: false, error: 'Failed to save KYC progress' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'KYC progress saved successfully',
      data: {
        step,
        status,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error saving KYC progress:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/kyc/progress
 * Get KYC progress from database
 */
export async function GET(request: NextRequest) {
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

    // Get KYC record
    const { data: kycRecord, error: fetchError } = await supabaseAdmin
      .from('kyc_records')
      .select('current_step, form_data, status, created_at, updated_at')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching KYC record:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    if (!kycRecord) {
      // No KYC record found - return empty state
      return NextResponse.json({
        success: true,
        data: {
          currentStep: null,
          formData: {},
          status: 'not_started',
          createdAt: null,
          updatedAt: null
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        currentStep: kycRecord.current_step,
        formData: kycRecord.form_data,
        status: kycRecord.status,
        createdAt: kycRecord.created_at,
        updatedAt: kycRecord.updated_at
      }
    })

  } catch (error) {
    console.error('Error fetching KYC progress:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
