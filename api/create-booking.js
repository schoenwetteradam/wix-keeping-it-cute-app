import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

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

  const { serviceId, slot, contactDetails, ...rest } = req.body || {}

  if (!serviceId || !slot || !contactDetails) {
    return res
      .status(400)
      .json({ error: 'serviceId, slot and contactDetails are required' })
  }

  try {
    // Call Wix Bookings API to create the booking
    const wixRes = await fetch(
      'https://www.wixapis.com/_api/bookings-service/v2/bookings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.WIX_API_TOKEN
        },
        body: JSON.stringify({
          serviceId,
          slot,
          contactDetails,
          ...rest
        })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to create booking', details: wixData })
    }

    const bookingInfo = wixData.booking || wixData

    const bookingRecord = {
      wix_booking_id: bookingInfo.id || bookingInfo.bookingId,
      service_id: serviceId,
      customer_email: contactDetails.email,
      customer_name: `${contactDetails.firstName || ''} ${
        contactDetails.lastName || ''
      }`.trim(),
      appointment_date: slot.startDate,
      end_time: slot.endDate,
      payment_status: 'not_paid',
      status: 'pending',
      payload: bookingInfo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert([bookingRecord])
      .select()
      .single()

    if (error) {
      console.error('Supabase booking insert error:', error)
    }

    res.status(200).json({ success: true, booking: booking || bookingRecord })
  } catch (err) {
    console.error('Create booking error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
