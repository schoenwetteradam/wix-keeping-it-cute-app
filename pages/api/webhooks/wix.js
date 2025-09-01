import { SyncService } from '../../../lib/sync-service';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventType, data } = req.body;
    const syncService = new SyncService();

    switch (eventType) {
      case 'ContactCreated':
      case 'ContactUpdated':
        await syncService.handleContactWebhook(data);
        break;
      case 'BookingCreated':
      case 'BookingUpdated':
        await syncService.handleBookingWebhook(data);
        break;
      default:
        console.log('Unhandled webhook event:', eventType);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
