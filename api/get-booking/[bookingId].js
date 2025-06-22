// api/get-booking/[bookingId].js
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../../utils/verifyUser.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { user, error: authError } = await verifyUser(req)
  if (authError) {
    return res.status(401).json({ error: 'Unauthorized' })
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
