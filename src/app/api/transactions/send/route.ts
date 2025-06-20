import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  getAuthenticatedUser,
  parseRequestBody,
  validateAmount,
  validateCurrency,
  validateRecipient,
  handleApiError,
  handleTransactionError,
  createSuccessResponse,
  formatTransactionResponse
} from '@/lib/api-utils'

/**
 * POST /api/transactions/send
 * Process a send transaction
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user } = await getAuthenticatedUser()

    // Parse and validate request body
    const body = await parseRequestBody(request)
    const { amount, currency, recipient } = body

    // Validate input
    const validAmount = validateAmount(amount)
    const validCurrency = validateCurrency(currency)
    const validRecipient = validateRecipient(recipient)

    // Prepare recipient info
    const recipientInfo = {
      name: validRecipient.name,
      email: validRecipient.email,
      phone: recipient.phone || null,
      notes: recipient.notes || null
    }

    // Call the RPC function to process the send transaction
    const { data: result, error: transactionError } = await supabaseAdmin
      .rpc('process_send_transaction', {
        sender_uuid: user.id,
        recipient_info: recipientInfo,
        amount_value: validAmount,
        currency_code: validCurrency
      })

    if (transactionError) {
      handleTransactionError(transactionError, 'send')
    }

    // Format and return response
    const formattedResult = formatTransactionResponse(result, 'send')

    return createSuccessResponse(
      formattedResult,
      'Transação de envio processada com sucesso'
    )

  } catch (error) {
    return handleApiError(error)
  }
}
