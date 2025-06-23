// api/complete-usage-session.js
// Mark a product usage session as completed or create it if it doesn't exist
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const sessionData = req.body

    console.log('✅ Completing usage session...', JSON.stringify(sessionData, null, 2))

    const mappedSession = {
      booking_id: sessionData.booking_id,
      staff_member_id: sessionData.staff_member_id,
      service_performed: sessionData.service_performed,
      customer_email: sessionData.customer_email,
      customer_name: sessionData.customer_name,
      session_notes: sessionData.session_notes,
      total_service_cost: sessionData.total_service_cost
    }

    // Check if a session already exists for this booking
    const { data: existingSession, error: fetchError } = await supabase
      .from('product_usage_sessions')
      .select('id')
      .eq('booking_id', sessionData.booking_id)
      .single()

    let data, error

    if (existingSession) {
      ;({ data, error } = await supabase
        .from('product_usage_sessions')
        .update({ ...mappedSession, is_completed: true })
        .eq('id', existingSession.id)
        .select()
        .single())
    } else if (fetchError && fetchError.code !== 'PGRST116') {
      error = fetchError
    } else {
      ;({ data, error } = await supabase
        .from('product_usage_sessions')
        .insert([{ ...mappedSession, session_start_time: new Date().toISOString(), is_completed: true }])
        .select()
        .single())
    }

    if (error) {
      console.error('❌ Complete Usage Session Error:', error)
      return res.status(500).json({ error: 'Failed to complete usage session', details: error.message })
    }

    res.status(200).json({
      status: 'Usage session completed successfully',
      session: data
    })

  } catch (err) {
    console.error('❌ Complete Session Error:', err)
    res.status(500).json({
      error: 'Failed to complete usage session',
      details: err.message,
      timestamp: new Date().toISOString()
    })
  }
}
