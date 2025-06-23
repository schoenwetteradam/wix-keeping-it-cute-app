// api/get-appointments.js
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const user = await requireAuth(req, res)
  if (!user) return
  
  try {
    const { limit = '50', status, payment_status } = req.query;
    
    let query = supabase
      .from('bookings')
      .select('*')
      .order('appointment_date', { ascending: false })
      .limit(parseInt(limit));
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }
    
    const { data: appointments, error } = await query;
    
    if (error) {
      console.error('❌ Appointments fetch error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch appointments', 
        details: error.message 
      });
    }
    
    res.status(200).json({
      success: true,
      appointments: appointments || [],
      count: appointments?.length || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Get Appointments Error:', err);
    res.status(500).json({ 
      error: 'Unexpected error', 
      details: err.message 
    });
  }
}
