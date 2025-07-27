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
      return res.status(400).json({ error: 'product_name, brand and category are required' })
    }

    const productRecord = {
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
      return res.status(500).json({ error: 'Failed to create product', details: error.message })
    }

    res.status(200).json({ success: true, product: data })
  } catch (err) {
    console.error('Create product error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
