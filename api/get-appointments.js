// api/get-appointments.js
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean)

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

const supabase = createSupabaseClient()

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

    const { page = '1', limit = '1000', status, payment_status, scope } = req.query

    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    if (!Number.isFinite(pageNum) || pageNum < 1 || !Number.isFinite(limitNum) || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid page or limit parameter' })
    }

    const start = (pageNum - 1) * limitNum
    const end = start + limitNum - 1

    let query = supabase
      .from('bookings')
      .select('*')
      .order('appointment_date', { ascending: false })
      .range(start, end)

    if (status) {
      query = query.eq('status', status);
    }

    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    // fetch user profile for name-based filtering
    let userFullName = null
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      userFullName = profileData?.full_name || null
    } catch (_) {
      userFullName = null
    }

    const isAdmin =
      ADMIN_IDS.includes(user.id) ||
      (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))
    if (scope === 'mine') {
      if (userFullName) {
        const encodedName = encodeURIComponent(userFullName)
        query = query.or(`staff_id.eq.${user.id},staff_member.eq.${encodedName}`)
      } else {
        query = query.eq('staff_id', user.id)
      }
    } else if (scope !== 'all' && !isAdmin) {
      if (userFullName) {
        const encodedName = encodeURIComponent(userFullName)
        query = query.or(`staff_id.eq.${user.id},staff_member.eq.${encodedName}`)
      } else {
        query = query.eq('staff_id', user.id)
      }
    }

    
    const { data: appointments, error } = await query;
    if (error) {
      console.error('❌ Appointments fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch appointments',
        details: error.message
      });
    }

    const formatted = appointments || []

    // Cache upcoming bookings for the next week
    if (formatted.length) {
      const now = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(now.getDate() + 7)

      const upcoming = formatted.filter(a => {
        const dt = new Date(a.appointment_date)
        return dt >= now && dt < nextWeek
      })

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
            )
        } catch (cacheErr) {
          console.error('❌ Upcoming bookings cache error:', cacheErr)
        }
      }
    }

    res.status(200).json({
      success: true,
      appointments: formatted,
      count: formatted.length,
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
