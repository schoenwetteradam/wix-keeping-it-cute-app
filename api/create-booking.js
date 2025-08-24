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

  if (
    isNaN(Date.parse(slot.startDate)) ||
    isNaN(Date.parse(slot.endDate))
  ) {
    return res.status(400).json({ error: 'appointment_date is invalid' })
  }

  if (
    contactDetails.email &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactDetails.email)
  ) {
    return res.status(400).json({ error: 'Invalid email format' })
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

    const wix_contact_id =
      contactDetails.wixContactId || bookingInfo?.buyer?.id

    const bookingRecord = {
      wix_booking_id:
        bookingInfo.id || bookingInfo.bookingId || `booking-${Date.now()}`,
      customer_email: contactDetails.email,
      customer_name: `${contactDetails.firstName || ''} ${
        contactDetails.lastName || ''
      }`.trim(),
      customer_phone: contactDetails.phone,
      service_name:
        bookingInfo?.service?.name || bookingInfo?.bookedEntity?.title,
      appointment_date: slot.startDate,
      end_time: slot.endDate,
      payment_status: 'not_paid',
      status: 'pending',
      payload: bookingInfo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Link service for duration and price
    if (bookingRecord.service_name) {
      const { data: serviceLookup } = await supabase
        .from('salon_services')
        .select('id, duration_minutes, price')
        .ilike('name', bookingRecord.service_name)
        .single()

      if (!serviceLookup) {
        return res
          .status(400)
          .json({ error: 'service_name does not exist in salon_services' })
      }

      bookingRecord.service_id = serviceLookup.id
      bookingRecord.service_duration = serviceLookup.duration_minutes
      bookingRecord.total_price = serviceLookup.price
    }

    // Link customer by email or wix_contact_id
    if (bookingRecord.customer_email || wix_contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .or(
          `wix_contact_id.eq.${wix_contact_id},email.eq.${bookingRecord.customer_email}`
        )
        .maybeSingle()

      if (contact) {
        bookingRecord.customer_id = contact.id
      }
    }

    const staffMember =
      rest.staff_member || bookingInfo?.staff_member || bookingInfo?.staffMember
    if (staffMember) {
      const { data: staff } = await supabase
        .from('staff_profiles')
        .select('id')
        .ilike('full_name', staffMember)
        .maybeSingle()

      if (staff) {
        bookingRecord.staff_id = staff.id
      }
    }

    if (
      bookingRecord.total_price !== undefined &&
      Number(bookingRecord.total_price) <= 0
    ) {
      return res.status(400).json({ error: 'total_price must be positive' })
    }

    Object.keys(bookingRecord).forEach(
      (key) => bookingRecord[key] === undefined && delete bookingRecord[key]
    )

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
