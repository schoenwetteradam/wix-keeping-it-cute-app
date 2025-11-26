import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { product_name, brand, category, ...rest } = req.body || {}

    if (!product_name || !brand || !category) {
      return res
        .status(400)
        .json({ error: 'product_name, brand and category are required' })
    }

    // Create product in Wix Stores
    const wixRes = await fetch('https://www.wixapis.com/stores/v1/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.WIX_API_TOKEN
      },
      body: JSON.stringify({
        product: {
          name: product_name,
          productType: 'physical',
          brand,
          category,
          ...rest
        }
      })
    })

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to create product', details: wixData })
    }

    const productInfo = wixData.product || wixData

    // Store basic product info in Supabase
    const productRecord = {
      wix_product_id: productInfo.id,
      product_name,
      brand,
      category,
      ...rest,
      business_id: '550e8400-e29b-41d4-a716-446655440000'
    }

    const { data, error } = await supabase
      .from('products')
      .insert([productRecord])
      .select()
      .single()

    if (error) {
      console.error('Supabase product insert error:', error)
    }

    res
      .status(200)
      .json({ success: true, product: data || productRecord })
  } catch (err) {
    console.error('Create product error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
