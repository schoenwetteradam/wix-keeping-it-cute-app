// api/update-appointment-notes.js - Save appointment notes
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../utils/verifyUser.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { user, error: authError } = await verifyUser(req)
  if (authError) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { appointment_id, notes } = req.body;
    
    if (!appointment_id) {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }
    
    console.log('📝 Updating appointment notes...', { appointment_id, notes: notes?.substring(0, 50) });
    
    // Update the appointment notes
    const { data: updatedAppointment, error } = await supabase
      .from('bookings')
      .update({ 
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment_id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Notes update error:', error);
      return res.status(500).json({ 
        error: 'Failed to update appointment notes', 
        details: error.message 
      });
    }
    
    console.log('✅ Appointment notes updated:', updatedAppointment.id);
    
    // Log the note update for tracking
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'appointment_notes_updated',
        metric_data: {
          appointment_id: appointment_id,
          notes_length: notes?.length || 0,
          updated_by: 'staff',
          timestamp: new Date().toISOString()
        }
      });
    
    res.status(200).json({ 
      success: true,
      message: 'Appointment notes updated successfully',
      appointment: updatedAppointment,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Update Notes Error:', err);
    res.status(500).json({ 
      error: 'Unexpected error', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
