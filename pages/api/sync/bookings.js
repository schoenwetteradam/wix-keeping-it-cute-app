import { SyncService } from '../../../lib/sync-service'
import { withErrorHandler, APIError } from '../../../utils/errorHandler'

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
  }

  const syncService = new SyncService()
  const result = await syncService.syncBookingsFromWix()
  res.status(200).json(result)
}

export default withErrorHandler(handler)
