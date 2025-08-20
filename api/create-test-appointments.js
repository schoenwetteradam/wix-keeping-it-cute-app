import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const supabase = createSupabaseClient()

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
    // Verify authentication
    const user = await requireAuth(req, res)
    if (!user) return

    console.log('🧪 Creating test appointments for user:', user.id, user.email)

    // Find ANY staff record that could work for this user
    let staffRecord = null
    const userEmail = user.email || 'staff@example.com'

    // Try multiple strategies to find a staff record
    const searches = [
      // 1. Exact ID match
      supabase.from('staff').select('*').eq('id', user.id).maybeSingle(),
      // 2. Email match
      supabase.from('staff').select('*').eq('email', userEmail).maybeSingle(),
      // 3. Email starts with username
      supabase.from('staff').select('*').ilike('email', `${userEmail.split('@')[0]}%`).limit(1).maybeSingle(),
      // 4. Any staff record (fallback)
      supabase.from('staff').select('*').limit(1).maybeSingle()
    ]

    for (let i = 0; i < searches.length; i++) {
      try {
        const { data, error } = await searches[i]
        if (!error && data) {
          staffRecord = data
          console.log(`✅ Found staff record using strategy ${i + 1}:`, data.email)
          break
        }
      } catch (err) {
        console.log(`Strategy ${i + 1} failed:`, err.message)
      }
    }

    if (!staffRecord) {
      return res.status(500).json({
        error: 'No staff record found',
        details: 'Unable to find any staff record to assign appointments to'
      })
    }

    // Use the staff record we found
    const userDisplayName = `${staffRecord.first_name || 'Staff'} ${staffRecord.last_name || 'Member'}`.trim()

    // Create sample appointments using the found staff record ID
    const sampleAppointments = [
      {
        wix_booking_id: `test-booking-${Date.now()}-1`,
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah.johnson@example.com',
        customer_phone: '(555) 123-4567',
        service_name: 'Haircut & Style',
        service_duration: 90,
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
        total_price: 85.00,
        payment_status: 'pending',
        status: 'scheduled',
        staff_member: userDisplayName,
        staff_id: staffRecord.id,
        notes: 'First time client - requested layers',
        location: 'Keeping It Cute Salon & Spa',
        number_of_participants: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payload: { test: true, created_by: 'test-data-api', auth_user: user.id }
      },
      {
        wix_booking_id: `test-booking-${Date.now()}-2`,
        customer_name: 'Emily Chen',
        customer_email: 'emily.chen@example.com',
        customer_phone: '(555) 987-6543',
        service_name: 'Color & Highlights',
        service_duration: 120,
        appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString(),
        total_price: 150.00,
        payment_status: 'paid',
        status: 'confirmed',
        staff_member: userDisplayName,
        staff_id: staffRecord.id,
        notes: 'Regular client - blonde highlights as usual',
        location: 'Keeping It Cute Salon & Spa',
        number_of_participants: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payload: { test: true, created_by: 'test-data-api', auth_user: user.id }
      },
      {
        wix_booking_id: `test-booking-${Date.now()}-3`,
        customer_name: 'Maria Garcia',
        customer_email: 'maria.garcia@example.com',
        customer_phone: '(555) 456-7890',
        service_name: 'Manicure & Pedicure',
        service_duration: 75,
        appointment_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
        total_price: 65.00,
        payment_status: 'pending',
        status: 'scheduled',
        staff_member: userDisplayName,
        staff_id: staffRecord.id,
        notes: 'Gel polish - requested pink color',
        location: 'Keeping It Cute Salon & Spa',
        number_of_participants: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payload: { test: true, created_by: 'test-data-api', auth_user: user.id }
      }
    ]

    console.log(`📝 Inserting ${sampleAppointments.length} appointments using staff ID: ${staffRecord.id}`)

    // Insert the sample appointments
    const { data: insertedAppointments, error: insertError } = await supabase
      .from('bookings')
      .insert(sampleAppointments)
      .select()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      return res.status(500).json({
        error: 'Failed to create test appointments',
        details: insertError.message,
        staffUsed: {
          id: staffRecord.id,
          name: userDisplayName,
          email: staffRecord.email
        }
      })
    }

    console.log('✅ Test appointments created:', insertedAppointments.length)

    res.status(200).json({
      success: true,
      message: `Created ${insertedAppointments.length} test appointments`,
      appointments: insertedAppointments,
      staffUsed: {
        id: staffRecord.id,
        name: userDisplayName,
        email: staffRecord.email,
        matchesAuthUser: staffRecord.id === user.id
      },
      authUser: {
        id: user.id,
        email: user.email
      }
    })

  } catch (err) {
    console.error('❌ Test data creation error:', err)
    res.status(500).json({ 
      error: 'Failed to create test data', 
      details: err.message 
    })
  }
}

