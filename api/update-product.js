import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'PATCH')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { productId, product } = req.body || {}
    if (!productId || !product) {
      return res
        .status(400)
        .json({ error: 'productId and product are required' })
    }

    const wixRes = await fetch(
      `https://www.wixapis.com/stores/v1/products/${productId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.WIX_API_TOKEN
        },
        body: JSON.stringify({ product })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to update product', details: wixData })
    }

    const { data, error } = await supabase
      .from('products')
      .update({ ...product, updated_at: new Date().toISOString() })
      .eq('wix_product_id', productId)
      .select()
      .single()

    if (error) {
      console.error('Supabase product update error:', error)
    }

    res
      .status(200)
      .json({ success: true, product: data || wixData.product || wixData })
  } catch (err) {
    console.error('Update product error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
