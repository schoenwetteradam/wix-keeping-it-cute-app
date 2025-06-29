// api/start-usage-session.js
// Start a new product usage session (when service begins)
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
    const sessionData = req.body;
    console.log('🎬 Starting Usage Session:', JSON.stringify(sessionData, null, 2));

    const usageSession = {
      booking_id: sessionData.booking_id,
      staff_member_id: sessionData.staff_member_id,
      service_performed: sessionData.service_performed,
      session_start_time: new Date().toISOString(),
      customer_email: sessionData.customer_email,
      customer_name: sessionData.customer_name,
      session_notes: sessionData.session_notes,
      total_service_cost: sessionData.total_service_cost,
      is_completed: false
    };

    const { data, error } = await supabase
      .from('product_usage_sessions')
      .insert([usageSession])
      .select();

    if (error) {
      console.error('❌ Usage Session Error:', error);
      return res.status(500).json({ error: 'Failed to start usage session', details: error.message });
    }

    console.log('✅ Usage Session Started:', data);
    res.status(200).json({ 
      status: 'Usage session started successfully', 
      session: data[0] 
    });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
