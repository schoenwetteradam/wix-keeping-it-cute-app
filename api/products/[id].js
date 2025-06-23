import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Product ID is required' })
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Product fetch error:', error)
      return res.status(500).json({
        error: 'Failed to fetch product',
        details: error.message
      })
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.status(200).json({ success: true, product })
  } catch (err) {
    console.error('❌ Get Product Error:', err)
    res.status(500).json({
      error: 'Unexpected error',
      details: err.message
    })
  }
}
