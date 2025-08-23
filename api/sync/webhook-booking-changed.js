import { createSupabaseClient } from '../../utils/supabaseClient'
import { setCorsHeaders } from '../../utils/cors'
import { WixAPIManager } from '../../utils/wixApiManager'

const supabase = createSupabaseClient()
const wix = new WixAPIManager()

export default async function handler(req, res) {
  setCorsHeaders(res, ['POST', 'OPTIONS'])
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (req.headers.authorization !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const event = req.body
  const booking = event?.record
  if (!booking) return res.status(400).json({ error: 'Missing booking record' })

  try {
    if (booking.wix_booking_id) {
      await wix.updateBooking(booking.wix_booking_id, {
        status: booking.status,
        paymentStatus: booking.payment_status,
        start: booking.appointment_date
      })
    }

    await supabase
      .from('bookings')
      .update({ last_wix_sync: new Date().toISOString() })
      .eq('id', booking.id)

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Booking sync failed:', err)
    res.status(500).json({ error: 'Booking sync failed', details: err.message })
  }
}
