import { createSupabaseClient } from '../../utils/supabaseClient'
import { setCorsHeaders } from '../../utils/cors'
import { WixAPIManager } from '../../utils/wixApiManager'

const supabase = createSupabaseClient()
const wix = new WixAPIManager()

export default async function handler(req, res) {
  setCorsHeaders(res, ['POST', 'OPTIONS'])
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (req.headers.authorization !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const event = req.body
  const product = event?.record
  if (!product) return res.status(400).json({ error: 'Missing product record' })

  try {
    if (product.wix_product_id) {
      await wix.updateInventory(product.wix_product_id, product.current_stock)
    }

    await supabase
      .from('products')
      .update({ last_wix_sync: new Date().toISOString() })
      .eq('id', product.id)

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Inventory sync failed:', err)
    res.status(500).json({ error: 'Inventory sync failed', details: err.message })
  }
}
