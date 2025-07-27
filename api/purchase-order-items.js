import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'POST', 'PUT', 'DELETE'])

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'GET') {
    try {
      const { id, purchase_order_id, limit = '50' } = req.query
      let query = supabase
        .from('purchase_order_items')
        .select('*')

      if (id) {
        query = query.eq('id', id).single()
      } else {
        query = query.order('created_at', { ascending: false }).limit(parseInt(limit))
        if (purchase_order_id) query = query.eq('purchase_order_id', purchase_order_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Purchase order items fetch error:', error)
        return res.status(500).json({ error: 'Failed to fetch purchase order items', details: error.message })
      }

      const items = id ? (data ? [data] : []) : data || []
      return res.status(200).json({ success: true, purchase_order_items: items, count: items.length })
    } catch (err) {
      console.error('❌ Get purchase order items error:', err)
      return res.status(500).json({ error: 'Unexpected error', details: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const item = req.body || {}
      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert(item)
        .select()
        .single()

      if (error) {
        console.error('❌ Purchase order item insert error:', error)
        return res.status(500).json({ error: 'Failed to create purchase order item', details: error.message })
      }

      return res.status(200).json({ purchase_order_item: data })
    } catch (err) {
      console.error('❌ Purchase order item insert exception:', err)
      return res.status(500).json({ error: 'Unexpected error', details: err.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updates } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }

      const { data, error } = await supabase
        .from('purchase_order_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Purchase order item update error:', error)
        return res.status(500).json({ error: 'Failed to update purchase order item', details: error.message })
      }

      return res.status(200).json({ purchase_order_item: data })
    } catch (err) {
      console.error('❌ Purchase order item update exception:', err)
      return res.status(500).json({ error: 'Unexpected error', details: err.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query parameter is required' })
      }

      const { error } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Purchase order item delete error:', error)
        return res.status(500).json({ error: 'Failed to delete purchase order item', details: error.message })
      }

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('❌ Purchase order item delete exception:', err)
      return res.status(500).json({ error: 'Unexpected error', details: err.message })
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' })
}
