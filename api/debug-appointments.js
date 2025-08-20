import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const user = await requireAuth(req, res)
    if (!user) return

    console.log('🔍 Diagnosing appointments for user:', user.id, user.email)

    // 1. Check total appointments in bookings table
    const { data: allAppointments, error: allError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (allError) {
      throw allError
    }

    // 2. Group appointments by staff_id
    const staffGroups = {}
    allAppointments.forEach(apt => {
      const staffId = apt.staff_id || 'NULL'
      if (!staffGroups[staffId]) {
        staffGroups[staffId] = []
      }
      staffGroups[staffId].push(apt)
    })

    // 3. Check staff table
    const { data: allStaff, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, email')

    // 4. Check if user has appointments with different criteria
    const queries = {
      exactUserId: await supabase
        .from('bookings')
        .select('*')
        .eq('staff_id', user.id)
        .limit(10),
      
      byEmail: await supabase
        .from('bookings')
        .select('*')
        .eq('staff_member', user.email)
        .limit(10),
        
      nullStaffId: await supabase
        .from('bookings')
        .select('*')
        .is('staff_id', null)
        .limit(10)
    }

    const results = {}
    for (const [key, query] of Object.entries(queries)) {
      const { data, error } = await query
      results[key] = {
        count: data?.length || 0,
        data: data || [],
        error: error?.message || null
      }
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      summary: {
        totalAppointments: allAppointments.length,
        staffGroupCounts: Object.keys(staffGroups).map(staffId => ({
          staffId,
          count: staffGroups[staffId].length,
          sampleAppointment: staffGroups[staffId][0]
        }))
      },
      allStaff: allStaff || [],
      staffError: staffError?.message || null,
      queryResults: results,
      sampleAppointments: allAppointments.slice(0, 5).map(apt => ({
        id: apt.id,
        customer_name: apt.customer_name,
        staff_id: apt.staff_id,
        staff_member: apt.staff_member,
        appointment_date: apt.appointment_date,
        status: apt.status
      }))
    })

  } catch (err) {
    console.error('❌ Diagnostic error:', err)
    res.status(500).json({ 
      error: 'Diagnostic failed', 
      details: err.message 
    })
  }
}
