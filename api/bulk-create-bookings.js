import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { createBookingsInfo, returnFullEntity = false } = req.body || {}
  if (!Array.isArray(createBookingsInfo) || createBookingsInfo.length === 0) {
    return res.status(400).json({ error: 'createBookingsInfo array is required' })
  }

  try {
    const wixRes = await fetch(
      'https://www.wixapis.com/bookings/v2/bulk/bookings/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.WIX_API_TOKEN
        },
        body: JSON.stringify({ createBookingsInfo, returnFullEntity })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to bulk create bookings', details: wixData })
    }

    if (returnFullEntity && Array.isArray(wixData.results)) {
      for (const result of wixData.results) {
        const booking = result.item
        if (booking?.id) {
          await supabase
            .from('bookings')
            .upsert({
              id: booking.id,
              wix_booking_id: booking.id,
              status: booking.status?.toLowerCase(),
              payment_status: booking.paymentStatus?.toLowerCase(),
              appointment_date: booking.startDate,
              end_time: booking.endDate,
              customer_email: booking.contactDetails?.email,
              customer_name: `${booking.contactDetails?.firstName || ''} ${booking.contactDetails?.lastName || ''}`.trim(),
              payload: booking,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id', ignoreDuplicates: false })
        }
      }
    }

    res.status(200).json(wixData)
  } catch (err) {
    console.error('Bulk create bookings error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
