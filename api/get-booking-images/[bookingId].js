import { createSupabaseClient } from '../../utils/supabaseClient'
import { setCorsHeaders } from '../../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { bookingId } = req.query
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' })
    }

    const { data, error } = await supabase
      .from('booking_images')
      .select('*')
      .eq('booking_id', bookingId)
      .order('uploaded_at', { ascending: true })

    if (error) throw error

    res.status(200).json({ success: true, images: data || [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
