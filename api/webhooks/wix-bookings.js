// /api/webhooks/wix-bookings.js
import { createSupabaseClient } from '../../utils/supabaseClient'
import { withErrorHandler, APIError } from '../../utils/errorHandler'

const supabase = createSupabaseClient()

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
  }

  const webhookPayload = req.body

  // Log the webhook for debugging
  await supabase
    .from('webhook_logs')
    .insert({
      event_type: `${webhookPayload.entityFqdn}-${webhookPayload.slug}`,
      payload: webhookPayload,
      logged_at: new Date().toISOString()
    })

  // Only process booking events
  if (webhookPayload.entityFqdn !== 'wix.bookings.v2.booking') {
    return res.json({ 
      success: true, 
      message: 'Non-booking event ignored',
      event_type: webhookPayload.entityFqdn 
    })
  }

  try {
    // Process the booking webhook
    const { data, error } = await supabase
      .rpc('process_wix_booking_webhook', { payload: webhookPayload })

    if (error) {
      throw new APIError('Webhook processing failed', 500, 'WEBHOOK_ERROR')
    }

    const result = data

    if (!result.success) {
      throw new APIError(result.error, 400, 'BOOKING_PROCESSING_ERROR')
    }

    res.json({
      success: true,
      processed: result,
      webhook_id: webhookPayload.id,
      event_type: `${webhookPayload.entityFqdn}-${webhookPayload.slug}`
    })

  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    throw new APIError('Webhook processing failed', 500, 'INTERNAL_ERROR')
  }
}

export default withErrorHandler(handler)
