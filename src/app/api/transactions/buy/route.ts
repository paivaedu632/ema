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
    const { amount, exchangeRate, useOrderMatching = false } = body

    // Validate input
    const validAmount = validateAmount(amount)
    const validExchangeRate = validateExchangeRate(exchangeRate)

    // Call the appropriate RPC function based on order matching preference
    const rpcFunction = useOrderMatching ? 'process_buy_transaction_with_matching' : 'process_buy_transaction'
    const rpcParams = useOrderMatching
      ? {
          user_uuid: user.id,
          amount_eur: validAmount,
          use_order_matching: true,
          max_rate: null
        }
      : {
          user_uuid: user.id,
          amount_eur: validAmount,
          exchange_rate_value: validExchangeRate
        }

    const { data: result, error: transactionError } = await supabaseAdmin
      .rpc(rpcFunction, rpcParams)

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
