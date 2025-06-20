import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  getAuthenticatedUser,
  parseRequestBody,
  validateAmount,
  handleApiError,
  createSuccessResponse,
  validateCurrency
} from '@/lib/api-utils'
import { ExchangeRateUtils } from '@/utils/exchange-rate-validation'

/**
 * POST /api/sell
 * Create a peer-to-peer currency exchange offer
 * Moves funds from available_balance to reserved (via offers table)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user } = await getAuthenticatedUser()

    // Parse and validate request body
    const body = await parseRequestBody(request)
    const { amount, exchangeRate, currency = 'AOA' } = body

    // Validate input
    const validAmount = validateAmount(amount)
    const validCurrency = validateCurrency(currency)

    // Handle exchange rate validation - ensure we have a valid number
    if (!exchangeRate || isNaN(Number(exchangeRate)) || Number(exchangeRate) <= 0) {
      return createSuccessResponse(
        {
          success: false,
          error: 'Taxa de câmbio inválida. Deve ser um número positivo.'
        },
        'Taxa de câmbio inválida',
        400
      )
    }

    const validExchangeRate = Number(exchangeRate)

    // Validate exchange rate against market offers or API baseline
    const rateValidation = await ExchangeRateUtils.validate(validCurrency, validExchangeRate)

    if (!rateValidation.isValid) {
      return createSuccessResponse(
        {
          success: false,
          error: ExchangeRateUtils.formatError(rateValidation, validCurrency)
        },
        'Taxa de câmbio inválida',
        400
      )
    }

    // Create the currency offer using the database function
    const { data: offerId, error: offerError } = await supabaseAdmin
      .rpc('create_currency_offer', {
        user_uuid: user.id,
        currency_code: validCurrency,
        amount_to_reserve: validAmount,
        rate: validExchangeRate
      })

    if (offerError) {
      console.error('Error creating offer:', offerError)

      // Handle specific error cases
      if (offerError.message.includes('Insufficient available balance')) {
        return createSuccessResponse(
          {
            success: false,
            error: 'Saldo insuficiente para criar a oferta'
          },
          'Saldo insuficiente',
          400
        )
      }

      if (offerError.message.includes('Exchange rate') && offerError.message.includes('outside acceptable range')) {
        return createSuccessResponse(
          {
            success: false,
            error: 'Taxa de câmbio fora do intervalo aceitável'
          },
          'Taxa de câmbio inválida',
          400
        )
      }

      throw new Error(`Failed to create offer: ${offerError.message}`)
    }

    // Get the created offer details
    const { data: offerDetails, error: fetchError } = await supabaseAdmin
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single()

    if (fetchError) {
      console.error('Error fetching offer details:', fetchError)
      throw new Error('Failed to fetch offer details')
    }

    // Format response similar to transaction response
    const formattedResult = {
      offer_id: offerDetails.id,
      user_id: offerDetails.user_id,
      currency: offerDetails.currency_type,
      amount: parseFloat(offerDetails.reserved_amount.toString()),
      exchange_rate: parseFloat(offerDetails.exchange_rate.toString()),
      status: offerDetails.status,
      created_at: offerDetails.created_at,
      validation_info: {
        source: rateValidation.source,
        market_rate: rateValidation.marketRate,
        allowed_range: rateValidation.allowedRange
      }
    }

    return createSuccessResponse(
      formattedResult,
      'Oferta de venda criada com sucesso'
    )

  } catch (error) {
    console.error('Error in sell endpoint:', error)
    return handleApiError(error)
  }
}
