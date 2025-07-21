
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, ['POST', 'OPTIONS'])

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = req.body

  try {
    await supabase.from('webhook_logs').insert({
      event_type: req.headers['x-wix-event'] || 'unknown',
      payload,
      logged_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('Webhook log insert error:', err)
  }

  console.log('✅ Webhook received')
  res.status(200).json({ status: 'Webhook received' })
}
