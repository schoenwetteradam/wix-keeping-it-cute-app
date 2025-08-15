import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wix-webhook-signature')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const bookingData = req.body
    const customerEmail =
      bookingData.customerEmail ||
      bookingData.contact?.email ||
      bookingData.contactDetails?.email

    const customerData = {
      email: customerEmail,
      first_name:
        bookingData.contact?.firstName ||
        bookingData.contactDetails?.firstName ||
        'Customer',
      last_name:
        bookingData.contact?.lastName ||
        bookingData.contactDetails?.lastName ||
        'Unknown',
      phone: bookingData.contact?.phone || bookingData.contactDetails?.phone,
      business_type: 'salon',
    }

    console.log('👤 Creating customer record:', customerData)

    const { data: existingCustomer, error: customerSearchError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', customerEmail)
      .maybeSingle()

    if (customerSearchError) {
      console.error('❌ Customer search error:', customerSearchError)
      throw customerSearchError
    }

    let customer
    if (existingCustomer) {
      customer = existingCustomer
      console.log('✅ Found existing customer:', customer.id)
    } else {
      const { data: newCustomer, error: customerCreateError } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single()

      if (customerCreateError) {
        console.error('❌ Customer creation error:', customerCreateError)
        throw customerCreateError
      }

      customer = newCustomer
      console.log('✅ Created new customer:', customer.id)
    }

    // Continue with booking creation...
    const bookingRecord = {
      wix_booking_id: bookingData.booking_id || bookingData.id,
      customer_id: customer.id,
      customer_email: customerEmail,
      service_name:
        bookingData.service?.name ||
        bookingData.serviceName ||
        'Unknown Service',
      appointment_date:
        bookingData.appointment_date ||
        bookingData.startTime ||
        new Date().toISOString(),
      status: bookingData.status || 'confirmed',
      total_amount: bookingData.total_amount || bookingData.price || 0,
      created_at: new Date().toISOString(),
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .upsert(bookingRecord, { onConflict: 'wix_booking_id' })
      .select()
      .single()

    if (bookingError) {
      console.error('❌ Booking creation error:', bookingError)
      throw bookingError
    }

    console.log('✅ Booking processed successfully:', booking.id)

    res.status(200).json({
      success: true,
      booking_id: booking.id,
      customer_id: customer.id,
      message: 'Booking processed successfully',
    })
  } catch (error) {
    console.error('❌ Booking webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack,
    })
  }
}
