// api/get-appointments.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
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
