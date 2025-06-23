import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add comprehensive logging
  console.log('🔍 === BOOKING WEBHOOK START ===')
  console.log('Method:', req.method)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('Body type:', typeof req.body)
  console.log('Body content:', JSON.stringify(req.body, null, 2))
  
  setCorsHeaders(res, 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wix-webhook-signature')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  
  try {
    // Log environment variables (without exposing secrets)
    console.log('🔍 Environment Check:')
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')
    
    const bookingData = req.body
    console.log('📅 Processing booking data:', bookingData)
    
    // Step 1: Test basic database connection
    console.log('🔍 Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('customers')
      .select('count(*)')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection failed:', testError)
      throw new Error(`Database connection failed: ${testError.message}`)
    }
    console.log('✅ Database connection successful')
    
    // Step 2: Create/update customer
    let customer = null
    const customerEmail = bookingData.contact?.email || 
                         bookingData.contactDetails?.email || 
                         bookingData.booking_contact_email || 
                         `customer-${Date.now()}@salon.com`
    
    console.log('👤 Processing customer with email:', customerEmail)
    
    const customerData = {
      email: customerEmail,
      first_name: bookingData.contact?.firstName || 
                  bookingData.contactDetails?.firstName || 
                  bookingData.booking_contact_first_name || 
                  'Customer',
      last_name: bookingData.contact?.lastName || 
                 bookingData.contactDetails?.lastName || 
                 bookingData.booking_contact_last_name || 
                 'Unknown',
      phone: bookingData.contact?.phone || 
             bookingData.contactDetails?.phone || 
             bookingData.booking_contact_phone,
      business_type: 'salon'
    }
    
    console.log('👤 Customer data to upsert:', customerData)
    
    const { data: customerResult, error: customerError } = await supabase
      .from('customers')
      .upsert(customerData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select()
      .single()
    
    if (customerError) {
      console.error('❌ Customer upsert error:', customerError)
      // Continue anyway, we'll create appointment without customer link
    } else {
      customer = customerResult
      console.log('✅ Customer processed:', customer.id)
    }
    
    // Step 3: Create appointment
    console.log('📅 Creating appointment...')
    
    const appointmentData = {
      customer_id: customer?.id,
      wix_booking_id: bookingData.booking_id || 
                      bookingData.id || 
                      `booking-${Date.now()}`,
      wix_order_id: bookingData.order_id,
      appointment_date: bookingData.start_date || 
                       bookingData.startDate || 
                       bookingData.appointment_date || 
                       new Date().toISOString(),
      duration_minutes: parseInt(bookingData.duration) || 60,
      status: 'confirmed',
      payment_status: bookingData.payment_status === 'PAID' ? 'paid' : 'pending',
      payment_method: 'wix',
      total_amount: parseFloat(bookingData.price?.value || bookingData.total_price || 0),
      notes: bookingData.notes || 
             bookingData.additional_notes || 
             (bookingData.additional_fields ? JSON.stringify(bookingData.additional_fields) : null),
      created_at: new Date().toISOString()
    }
    
    console.log('📅 Appointment data to insert:', appointmentData)
    
    const { data: appointment, error: appointmentError } = await supabase
      .from('salon_appointments')
      .insert([appointmentData])
      .select()
      .single()
    
    if (appointmentError) {
      console.error('❌ Appointment creation error:', appointmentError)
      throw appointmentError
    }
    
    console.log('✅ Appointment created successfully:', appointment.id)
    
    // Step 4: Log success metric
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'webhook_booking_created_success',
        metric_data: {
          success: true,
          appointment_id: appointment.id,
          customer_id: customer?.id,
          wix_booking_id: appointmentData.wix_booking_id,
          processed_at: new Date().toISOString(),
          original_payload: bookingData
        }
      })
    
    console.log('🔍 === BOOKING WEBHOOK SUCCESS ===')
    
    res.status(200).json({ 
      success: true,
      message: 'Booking processed successfully',
      appointment: {
        id: appointment.id,
        wix_booking_id: appointment.wix_booking_id,
        customer_email: customer?.email,
        appointment_date: appointment.appointment_date
      },
      customer: customer ? {
        id: customer.id,
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`
      } : null,
      timestamp: new Date().toISOString()
    })
    
  } catch (err) {
    console.error('❌ WEBHOOK PROCESSING FAILED:', err)
    console.error('❌ Error stack:', err.stack)
    
    // Log failed webhook
    try {
      await supabase
        .from('system_metrics')
        .insert({
          metric_type: 'webhook_booking_created_failed',
          metric_data: {
            success: false,
            error_message: err.message,
            error_stack: err.stack,
            payload: req.body,
            processed_at: new Date().toISOString()
          }
        })
    } catch (logError) {
      console.error('❌ Failed to log webhook error:', logError)
    }
    
    console.log('🔍 === BOOKING WEBHOOK FAILED ===')
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process booking webhook', 
      details: err.message,
      timestamp: new Date().toISOString()
    })
  }
}
