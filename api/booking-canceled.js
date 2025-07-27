import { createSupabaseClient } from '../utils/supabaseClient'
import { addNotification } from '../utils/notifications'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const bookingData = req.body;
    console.log('❌ Booking Canceled:', JSON.stringify(bookingData, null, 2));

    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'canceled',
        payload: bookingData,
        updated_at: new Date().toISOString()
      })
      .eq('wix_booking_id', bookingData.id || bookingData.bookingId)
      .select();

    if (error) {
      console.error('❌ Booking Cancel Error:', error);
      return res.status(500).json({ error: 'Failed to cancel booking', details: error.message });
    }

    console.log('✅ Booking Canceled Successfully:', data);
    try {
      await addNotification({
        type: 'appointment',
        booking_id: data.id,
        message: 'Booking canceled',
        created_at: new Date().toISOString()
      })
    } catch (notifyError) {
      console.error('Notification add failed:', notifyError)
    }
    res.status(200).json({ status: 'Booking canceled successfully', data });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
