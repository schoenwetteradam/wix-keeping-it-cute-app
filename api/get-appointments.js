// api/get-appointments.js
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {

    const {
      limit = '50',
      page = '1',
      status,
      payment_status,
      staff_member,
      start_date,
      end_date
    } = req.query;

    const lim = parseInt(limit);
    const pg = parseInt(page);

    let query = supabase
      .from('bookings')
      .select('*, salon_services(*)')
      .order('appointment_date', { ascending: false });

    if (!Number.isNaN(lim) && !Number.isNaN(pg)) {
      const from = (pg - 1) * lim;
      const to = from + lim - 1;
      query = query.range(from, to);
    } else if (!Number.isNaN(lim)) {
      query = query.limit(lim);
    }

    const { page = '1', limit = '50', status, payment_status } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (!Number.isFinite(pageNum) || pageNum < 1 || !Number.isFinite(limitNum) || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid page or limit parameter' });
    }
    
    let query = supabase
      .from('bookings')
      .select('*, salon_services(*)')
      .order('appointment_date', { ascending: false })
      .limit(limitNum);

    
    if (status) {
      query = query.eq('status', status);
    }

    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    if (staff_member) {
      query = query.eq('staff_member', staff_member);
    }

    if (start_date) {
      query = query.gte('appointment_date', start_date);
    }

    if (end_date) {
      query = query.lte('appointment_date', end_date);
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
