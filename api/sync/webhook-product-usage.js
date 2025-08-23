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
  const usage = event?.record
  if (!usage) return res.status(400).json({ error: 'Missing usage record' })

  try {
    const { data: product } = await supabase
      .from('products')
      .select('id, current_stock, wix_product_id')
      .eq('id', usage.product_id)
      .single()

    if (!product) throw new Error('Product not found')

    const newStock = Math.max(0, (product.current_stock || 0) - Number(usage.quantity_used))

    await supabase
      .from('products')
      .update({ current_stock: newStock, last_wix_sync: new Date().toISOString() })
      .eq('id', product.id)

    if (product.wix_product_id) {
      await wix.updateInventory(product.wix_product_id, newStock)
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Product usage sync failed:', err)
    res.status(500).json({ error: 'Product usage sync failed', details: err.message })
  }
}
