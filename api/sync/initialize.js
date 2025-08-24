import syncInitializer from '../../utils/syncInitializer'

export default async function handler (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { type = 'all', limit = 100 } = req.body || {}
  const result = await syncInitializer.initialize({ type, limit })
  res.status(200).json(result)
}
