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

    console.log('🧪 Creating test appointments for user:', user.id)

    // Get user profile info for proper assignment
    let userFullName = 'Test Staff'
    try {
      const { data: profile } = await supabase
        .from('staff_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      if (profile?.full_name) {
        userFullName = profile.full_name
      }
    } catch (profileError) {
      console.log('Profile lookup failed, using default name')
    }

    // Create sample appointments
    const sampleAppointments = [
      {
        wix_booking_id: `test-booking-${Date.now()}-1`,
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah.johnson@example.com',
        customer_phone: '(555) 123-4567',
        service_name: 'Haircut & Style',
        service_duration: 90,
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
        total_price: 85.00,
        payment_status: 'pending',
        status: 'scheduled',
        staff_member: userFullName,
        staff_id: user.id,
        notes: 'First time client - requested layers',
        location: 'Keeping It Cute Salon & Spa',
        number_of_participants: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payload: { test: true, created_by: 'test-data-api' }
      },
      {
        wix_booking_id: `test-booking-${Date.now()}-2`,
        customer_name: 'Emily Chen',
        customer_email: 'emily.chen@example.com',
        customer_phone: '(555) 987-6543',
        service_name: 'Color & Highlights',
        service_duration: 120,
        appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString(),
        total_price: 150.00,
        payment_status: 'paid',
        status: 'confirmed',
        staff_member: userFullName,
        staff_id: user.id,
        notes: 'Regular client - blonde highlights as usual',
        location: 'Keeping It Cute Salon & Spa',
        number_of_participants: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payload: { test: true, created_by: 'test-data-api' }
      },
      {
        wix_booking_id: `test-booking-${Date.now()}-3`,
        customer_name: 'Maria Garcia',
        customer_email: 'maria.garcia@example.com',
        customer_phone: '(555) 456-7890',
        service_name: 'Manicure & Pedicure',
        service_duration: 75,
        appointment_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
        total_price: 65.00,
        payment_status: 'pending',
        status: 'scheduled',
        staff_member: userFullName,
        staff_id: user.id,
        notes: 'Gel polish - requested pink color',
        location: 'Keeping It Cute Salon & Spa',
        number_of_participants: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payload: { test: true, created_by: 'test-data-api' }
      },
      {
        wix_booking_id: `test-booking-${Date.now()}-4`,
        customer_name: 'Jennifer Wilson',
        customer_email: 'jennifer.wilson@example.com',
        customer_phone: '(555) 321-9876',
        service_name: 'Deep Conditioning Treatment',
        service_duration: 60,
        appointment_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday (past appointment)
        end_time: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        total_price: 45.00,
        payment_status: 'paid',
        status: 'completed',
        staff_member: userFullName,
        staff_id: user.id,
        notes: 'Completed successfully - customer very happy',
        location: 'Keeping It Cute Salon & Spa',
        number_of_participants: 1,
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        payload: { test: true, created_by: 'test-data-api' }
      },
      {
        wix_booking_id: `test-booking-${Date.now()}-5`,
        customer_name: 'Ashley Brown',
        customer_email: 'ashley.brown@example.com',
        customer_phone: '(555) 654-3210',
        service_name: 'Eyebrow Shaping & Tinting',
        service_duration: 45,
        appointment_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
        total_price: 35.00,
        payment_status: 'pending',
        status: 'scheduled',
        staff_member: userFullName,
        staff_id: user.id,
        notes: 'New client - consultation needed',
        location: 'Keeping It Cute Salon & Spa',
        number_of_participants: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payload: { test: true, created_by: 'test-data-api' }
      }
    ]

    // Insert the sample appointments
    const { data: insertedAppointments, error: insertError } = await supabase
      .from('bookings')
      .insert(sampleAppointments)
      .select()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      return res.status(500).json({
        error: 'Failed to create test appointments',
        details: insertError.message
      })
    }

    console.log('✅ Test appointments created:', insertedAppointments.length)

    res.status(200).json({
      success: true,
      message: `Created ${insertedAppointments.length} test appointments`,
      appointments: insertedAppointments,
      assignedTo: {
        userId: user.id,
        staffName: userFullName
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
