import { SyncService } from '../../../lib/sync-service'
import { withErrorHandler, APIError } from '../../../utils/errorHandler'

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
  }

  const { eventType, data } = req.body
  const syncService = new SyncService()

  switch (eventType) {
    case 'ContactCreated':
    case 'ContactUpdated':
      await syncService.handleContactWebhook(data)
      break
    case 'BookingCreated':
    case 'BookingUpdated':
      await syncService.handleBookingWebhook(data)
      break
    default:
      console.log('Unhandled webhook event:', eventType)
  }

  res.status(200).json({ success: true })
}

export default withErrorHandler(handler)
