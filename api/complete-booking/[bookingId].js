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
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (error) {
      console.error('Complete booking error:', error)
      return res.status(500).json({ error: 'Failed to update booking', details: error.message })
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Complete booking unexpected error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
