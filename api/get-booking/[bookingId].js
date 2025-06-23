// api/get-booking/[bookingId].js
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const { bookingId } = req.query;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    
    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    if (error) {
      console.error('❌ Booking fetch error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch booking', 
        details: error.message 
      });
    }
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check if product usage already logged for this booking
    const { data: existingUsage } = await supabase
      .from('product_usage_sessions')
      .select('id, is_completed')
      .eq('booking_id', bookingId)
      .single();
    
    res.status(200).json({
      success: true,
      booking: booking,
      has_existing_usage: !!existingUsage,
      existing_usage_completed: existingUsage?.is_completed || false,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Get Booking Error:', err);
    res.status(500).json({ 
      error: 'Unexpected error', 
      details: err.message 
    });
  }
}
