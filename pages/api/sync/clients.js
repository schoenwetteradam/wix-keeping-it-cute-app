import { SyncService } from '../../../lib/sync-service';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const syncService = new SyncService();
    const result = await syncService.syncClientsFromWix();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
