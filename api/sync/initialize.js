import { SyncInitializer } from '../../utils/syncInitializer'
import { setCorsHeaders } from '../../utils/cors'

const initializer = new SyncInitializer()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { type = 'all', limit = 100 } = req.body || {}
  await initializer.initialize({ type, limit })
  res.status(200).json({ initialized: true })
}
