// api/record-stock-adjustment.js - Log manual stock corrections
import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { product_id, quantity_change, reason, staff_id } = req.body || {}

    if (!product_id || typeof quantity_change !== 'number' || !reason) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data: adjustment, error } = await supabase
      .from('stock_adjustments')
      .insert({ product_id, quantity_change, reason, staff_id })
      .select()
      .single()

    if (error) {
      console.error('❌ Stock adjustment error:', error)
      return res.status(500).json({
        error: 'Failed to record stock adjustment',
        details: error.message
      })
    }

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', product_id)
      .single()

    if (!fetchError && product) {
      await supabase
        .from('products')
        .update({ current_stock: product.current_stock + quantity_change })
        .eq('id', product_id)
    }

    res.status(200).json({
      success: true,
      adjustment,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('❌ Stock adjustment exception:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
