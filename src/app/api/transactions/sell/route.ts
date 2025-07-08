import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  getAuthenticatedUser,
  parseRequestBody,
  validateAmount,
  validateCurrency,
  validateRequiredExchangeRate,
  handleApiError,
  handleSellOfferError,
  createSuccessResponse,
  formatSellOfferResponse
} from '@/lib/api-utils'
import { ExchangeRateUtils } from '@/utils/exchange-rate-validation'

/**
 * POST /api/transactions/sell
 * Create a peer-to-peer currency exchange offer
 * Moves funds from available_balance to reserved (via offers table)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[SELL] Starting sell offer creation request')

    // Get authenticated user
    const { user } = await getAuthenticatedUser()
    console.log(`[SELL] Authenticated user: ${user.id}`)

    // Parse and validate request body
    const body = await parseRequestBody(request)
    const { amount, exchangeRate, currency = 'AOA', useDynamicRate = false } = body
    console.log(`[SELL] Request data: amount=${amount}, currency=${currency}, exchangeRate=${exchangeRate}, useDynamicRate=${useDynamicRate}`)

    // Validate input with currency-specific limits
    const validCurrency = validateCurrency(currency)
    const validAmount = validateAmount(amount, validCurrency)
    const validExchangeRate = validateRequiredExchangeRate(exchangeRate)
    console.log(`[SELL] Validated: amount=${validAmount}, currency=${validCurrency}, rate=${validExchangeRate}`)

    // Validate exchange rate against market offers or API baseline
    console.log(`[SELL] Validating exchange rate: ${validExchangeRate} for ${validCurrency}`)
    const rateValidation = await ExchangeRateUtils.validate(validCurrency, validExchangeRate)
    console.log(`[SELL] Rate validation result: ${JSON.stringify(rateValidation)}`)

    if (!rateValidation.isValid) {
      console.error(`[SELL] Exchange rate validation failed: ${rateValidation.reason}`)
      throw new Error(`Exchange rate validation failed: ${ExchangeRateUtils.formatError(rateValidation, validCurrency)}`)
    }

    // Create the currency offer using the database function
    console.log(`[SELL] Creating offer: user=${user.id}, currency=${validCurrency}, amount=${validAmount}, rate=${validExchangeRate}, dynamic=${useDynamicRate}`)

    // For now, use the standard create_currency_offer function
    // TODO: Update to use dynamic rate functions once types are updated
    const { data: offerId, error: offerError } = await supabaseAdmin
      .rpc('create_currency_offer', {
        user_uuid: user.id,
        currency_code: validCurrency,
        amount_to_reserve: validAmount,
        rate: validExchangeRate
      })

    if (offerError) {
      console.error(`[SELL] Error creating offer:`, offerError)
      handleSellOfferError(offerError)
    }

    console.log(`[SELL] Offer created successfully with ID: ${offerId}`)

    // Get the created offer details
    const { data: offerDetails, error: fetchError } = await supabaseAdmin
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single()

    if (fetchError) {
      console.error(`[SELL] Error fetching offer details:`, fetchError)
      throw new Error('Failed to fetch offer details')
    }

    // Format response using standardized formatter
    const formattedResult = formatSellOfferResponse(offerDetails, rateValidation)
    console.log(`[SELL] Sell offer created successfully: ${JSON.stringify(formattedResult)}`)

    return createSuccessResponse(
      formattedResult,
      'Oferta de venda criada com sucesso'
    )

  } catch (error) {
    console.error(`[SELL] Error in sell endpoint:`, error)
    return handleApiError(error)
  }
}
