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
    let wixRes
    if (product.wix_product_id) {
      wixRes = await wix.updateProduct(product.wix_product_id, {
        name: product.product_name,
        description: product.description,
        sku: product.sku
      })
    } else {
      const created = await wix.createProduct({
        name: product.product_name,
        productType: 'physical',
        description: product.description,
        sku: product.sku
      })
      const wixId = created?.product?.id
      if (wixId) {
        await supabase.from('products').update({ wix_product_id: wixId }).eq('id', product.id)
      }
      wixRes = created
    }

    await supabase
      .from('products')
      .update({ last_wix_sync: new Date().toISOString() })
      .eq('id', product.id)

    res.status(200).json({ success: true, wix: wixRes })
  } catch (err) {
    console.error('Product sync failed:', err)
    res.status(500).json({ error: 'Product sync failed', details: err.message })
  }
}
