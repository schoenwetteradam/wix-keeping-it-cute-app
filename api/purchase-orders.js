import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'POST', 'PUT', 'DELETE'])

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'GET') {
    try {
      const { id, vendor_id, limit = '50' } = req.query
      let query = supabase
        .from('purchase_orders')
        .select('*')

      if (id) {
        query = query.eq('id', id).single()
      } else {
        query = query.order('created_at', { ascending: false }).limit(parseInt(limit))
        if (vendor_id) query = query.eq('vendor_id', vendor_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Purchase orders fetch error:', error)
        return res.status(500).json({ error: 'Failed to fetch purchase orders', details: error.message })
      }

      const orders = id ? (data ? [data] : []) : data || []
      return res.status(200).json({ success: true, purchase_orders: orders, count: orders.length })
    } catch (err) {
      console.error('❌ Get purchase orders error:', err)
      return res.status(500).json({ error: 'Unexpected error', details: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const order = req.body || {}
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(order)
        .select()
        .single()

      if (error) {
        console.error('❌ Purchase order insert error:', error)
        return res.status(500).json({ error: 'Failed to create purchase order', details: error.message })
      }

      return res.status(200).json({ purchase_order: data })
    } catch (err) {
      console.error('❌ Purchase order insert exception:', err)
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
        .from('purchase_orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Purchase order update error:', error)
        return res.status(500).json({ error: 'Failed to update purchase order', details: error.message })
      }

      return res.status(200).json({ purchase_order: data })
    } catch (err) {
      console.error('❌ Purchase order update exception:', err)
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
        .from('purchase_orders')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Purchase order delete error:', error)
        return res.status(500).json({ error: 'Failed to delete purchase order', details: error.message })
      }

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('❌ Purchase order delete exception:', err)
      return res.status(500).json({ error: 'Unexpected error', details: err.message })
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' })
}
