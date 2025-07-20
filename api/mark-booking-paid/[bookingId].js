import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { bookingId } = req.query

  if (!bookingId) {
    return res.status(400).json({ error: 'bookingId is required' })
  }

  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('wix_order_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (error) {
      console.error('Fetch booking error:', error)
      return res.status(500).json({ error: 'Failed to fetch booking', details: error.message })
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    await supabase
      .from('bookings')
      .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (booking.wix_order_id) {
      await supabase
        .from('orders')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('wix_order_id', booking.wix_order_id)
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Mark paid error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
