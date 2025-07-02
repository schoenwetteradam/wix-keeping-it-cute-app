// api/update-loyalty-points.js - add or redeem loyalty points
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    const { loyalty_id, points = 0, action = 'add' } = req.body || {}

    if (!loyalty_id || typeof points !== 'number') {
      return res.status(400).json({ error: 'loyalty_id and numeric points are required' })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('loyalty')
      .select('*')
      .eq('id', loyalty_id)
      .single()

    if (fetchError) {
      console.error('❌ Loyalty fetch error:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch loyalty record', details: fetchError.message })
    }

    let newBalance = existing.points_balance || 0
    let newRedeemed = existing.redeemed_points || 0

    if (action === 'redeem') {
      newBalance -= points
      newRedeemed += points
    } else {
      newBalance += points
    }

    if (newBalance < 0) newBalance = 0

    const { data: updated, error: updateError } = await supabase
      .from('loyalty')
      .update({
        points_balance: newBalance,
        redeemed_points: newRedeemed,
        last_activity: new Date().toISOString()
      })
      .eq('id', loyalty_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Loyalty update error:', updateError)
      return res.status(500).json({ error: 'Failed to update loyalty', details: updateError.message })
    }

    res.status(200).json({
      success: true,
      record: updated,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('❌ Update Loyalty Error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
