import { createSupabaseClient } from '../../utils/supabaseClient'
import { setCorsHeaders } from '../../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, ['POST', 'OPTIONS'])
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (process.env.WIX_WEBHOOK_SECRET && req.headers['x-wix-signature'] !== process.env.WIX_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const payload = req.body
  const inventory = payload?.entity || payload?.data?.entity || payload

  try {
    const wixId = inventory?.productId || inventory?.id
    const quantity = inventory?.inventory?.quantity ?? inventory?.quantity
    if (wixId !== undefined && quantity !== undefined) {
      await supabase
        .from('products')
        .update({ current_stock: quantity, last_wix_sync: new Date().toISOString() })
        .eq('wix_product_id', wixId)
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Wix inventory webhook failed:', err)
    res.status(500).json({ error: 'Webhook processing failed', details: err.message })
  }
}
