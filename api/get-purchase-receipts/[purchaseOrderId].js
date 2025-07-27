import { createSupabaseClient } from '../../utils/supabaseClient'
import { setCorsHeaders } from '../../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { purchaseOrderId } = req.query
    if (!purchaseOrderId) {
      return res.status(400).json({ error: 'purchaseOrderId is required' })
    }

    const { data, error } = await supabase
      .from('purchase_receipts')
      .select('*')
      .eq('purchase_order_id', purchaseOrderId)
      .order('uploaded_at', { ascending: true })

    if (error) throw error

    res.status(200).json({ success: true, receipts: data || [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
