// api/get-appointments.js
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

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
    const user = await requireAuth(req, res)
    if (!user) return

    const isAdmin = ADMIN_IDS.includes(user.id)

    const {
      page = '1',
      limit = '50',
      status,
      payment_status,
      staff_id
    } = req.query

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (!Number.isFinite(pageNum) || pageNum < 1 || !Number.isFinite(limitNum) || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid page or limit parameter' });
    }
    
    let staffId
    if (isAdmin) {
      staffId = staff_id
      if (staffId === undefined || staffId === '' || staffId === 'null') {
        staffId = null
      }
    } else {
      staffId = user.id
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

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }
    
    const { data: appointments, error } = await query;

    // Cache upcoming bookings for the next week
    if (appointments) {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      const upcoming = appointments.filter(a => {
        const dt = new Date(a.appointment_date);
        return dt >= now && dt < nextWeek;
      });

      if (upcoming.length) {
        try {
          await supabase
            .from('upcoming_bookings')
            .upsert(
              upcoming.map(a => ({
                booking_id: a.id,
                appointment_date: a.appointment_date,
                staff_id: a.staff_id,
                status: a.status,
                payment_status: a.payment_status
              })),
              { onConflict: 'booking_id', ignoreDuplicates: false }
            );
        } catch (cacheErr) {
          console.error('❌ Upcoming bookings cache error:', cacheErr);
        }
      }
    }
    
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
