import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  getAuthenticatedUser,
  parseRequestBody,
  validateAmount,
  validateExchangeRate,
  handleApiError,
  handleTransactionError,
  createSuccessResponse,
  formatTransactionResponse
} from '@/lib/api-utils'

/**
 * POST /api/transactions/buy
 * Process a buy transaction (EUR -> AOA)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user } = await getAuthenticatedUser()

    // Parse and validate request body
    const body = await parseRequestBody(request)
    const { amount, exchangeRate } = body

    // Validate input
    const validAmount = validateAmount(amount)
    const validExchangeRate = validateExchangeRate(exchangeRate)

    // Call the RPC function to process the buy transaction
    const { data: result, error: transactionError } = await supabaseAdmin
      .rpc('process_buy_transaction', {
        user_uuid: user.id,
        amount_eur: validAmount,
        exchange_rate_value: validExchangeRate
      })

    if (transactionError) {
      handleTransactionError(transactionError, 'buy')
    }

    // Format and return response
    const formattedResult = formatTransactionResponse(result, 'buy')

    return createSuccessResponse(
      formattedResult,
      'Transação de compra processada com sucesso'
    )

  } catch (error) {
    return handleApiError(error)
  }
}
