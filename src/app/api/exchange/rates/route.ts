import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { amount, currency = 'AOA', type = 'buy' } = body

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (type === 'buy' && currency === 'AOA') {
      // Static fallback values
      const STATIC_RATE = 924.0675
      const DEFAULT_FEE_PERCENTAGE = 0.02
      const DEFAULT_FEE_FIXED = 0.00

      let matchResult = null
      let feeData = null

      // Try order matching with graceful fallback
      try {
        const { data, error } = await supabaseAdmin
          .rpc('match_buy_order_aoa', {
            buy_amount_eur: amount
          })

        if (error) {
          console.warn('Order matching failed, using static rate:', error.message)
        } else {
          matchResult = data
        }
      } catch (error) {
        console.warn('Order matching function unavailable, using static rate:', error)
      }

      // Try dynamic fee lookup with graceful fallback
      try {
        const { data, error } = await supabaseAdmin
          .rpc('get_dynamic_fee', {
            p_transaction_type: 'buy',
            p_currency: 'EUR'
          })

        if (error || !data || data.length === 0) {
          console.warn('Fee lookup failed, using default fee:', error?.message)
          feeData = [{
            fee_percentage: DEFAULT_FEE_PERCENTAGE,
            fee_fixed_amount: DEFAULT_FEE_FIXED
          }]
        } else {
          feeData = data
        }
      } catch (error) {
        console.warn('Fee function unavailable, using default fee:', error)
        feeData = [{
          fee_percentage: DEFAULT_FEE_PERCENTAGE,
          fee_fixed_amount: DEFAULT_FEE_FIXED
        }]
      }

      const fee = feeData[0]
      const feeAmount = (amount * fee.fee_percentage) + fee.fee_fixed_amount
      const netAmount = amount - feeAmount

      // Check if order matching was successful
      if (matchResult && matchResult.success && matchResult.is_fully_matched) {
        return NextResponse.json({
          success: true,
          data: {
            amount_eur: amount,
            fee_amount: feeAmount,
            net_amount: netAmount,
            aoa_amount: matchResult.total_aoa,
            exchange_rate: matchResult.average_rate,
            fee_percentage: fee.fee_percentage,
            order_matching: {
              success: true,
              matches: matchResult.matches,
              match_count: matchResult.match_count
            },
            rate_source: 'order_matching'
          }
        })
      } else {
        // Fallback to static rate
        const aoaAmount = netAmount * STATIC_RATE

        return NextResponse.json({
          success: true,
          data: {
            amount_eur: amount,
            fee_amount: feeAmount,
            net_amount: netAmount,
            aoa_amount: aoaAmount,
            exchange_rate: STATIC_RATE,
            fee_percentage: fee.fee_percentage,
            order_matching: {
              success: false,
              reason: matchResult ? 'Insufficient liquidity' : 'Order matching unavailable',
              available_eur: matchResult?.matched_eur || 0
            },
            rate_source: 'static_fallback'
          }
        })
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported currency or transaction type' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Exchange rate calculation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const maxAmount = parseFloat(searchParams.get('max_amount') || '1000')

    // Try to get market depth with graceful fallback
    try {
      const { data: depthResult, error } = await supabaseAdmin
        .rpc('get_market_depth_buy_aoa', {
          max_eur_amount: maxAmount
        })

      if (error) {
        console.warn('Market depth function failed, returning empty depth:', error.message)
        return NextResponse.json({
          success: true,
          data: {
            success: true,
            levels: [],
            total_levels: 0,
            max_eur_available: 0,
            max_aoa_available: 0
          }
        })
      }

      return NextResponse.json({
        success: true,
        data: depthResult
      })

    } catch (error) {
      console.warn('Market depth function unavailable, returning empty depth:', error)
      return NextResponse.json({
        success: true,
        data: {
          success: true,
          levels: [],
          total_levels: 0,
          max_eur_available: 0,
          max_aoa_available: 0
        }
      })
    }

  } catch (error) {
    console.error('Market depth error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
