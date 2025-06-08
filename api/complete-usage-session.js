// api/complete-usage-session.js
// Complete a usage session (when service ends)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const completionData = req.body;
    console.log('🏁 Completing Usage Session:', JSON.stringify(completionData, null, 2));

    const { data, error } = await supabase
      .from('product_usage_sessions')
      .update({
        session_end_time: new Date().toISOString(),
        is_completed: true,
        completed_at: new Date().toISOString(),
        session_notes: completionData.session_notes,
        total_service_cost: completionData.total_service_cost
      })
      .eq('id', completionData.session_id)
      .select(`
        *,
        product_usage_log (
          *,
          products (product_name, current_stock, min_threshold)
        )
      `);

    if (error) {
      console.error('❌ Session Completion Error:', error);
      return res.status(500).json({ error: 'Failed to complete session', details: error.message });
    }

    console.log('✅ Usage Session Completed:', data);
    res.status(200).json({ 
      status: 'Usage session completed successfully', 
      session: data[0] 
    });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
