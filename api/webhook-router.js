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
    const webhookData = req.body;
    const eventType = req.headers['x-wix-event-type'] || 'unknown';
    
    console.log(`🎯 Webhook Received (${eventType}):`, JSON.stringify(webhookData, null, 2));

    // Create a generic webhook log entry
    const webhookRecord = {
      event_type: eventType,
      wix_entity_id: webhookData.id || webhookData.entityId,
      event_timestamp: webhookData.eventTime || new Date().toISOString(),
      payload: webhookData
    };

    // Store in webhook_logs table for analysis
    const { data, error } = await supabase
      .from('webhook_logs')
      .insert([webhookRecord])
      .select();

    if (error) {
      console.error('❌ Webhook Log Error:', error);
      // Don't fail the webhook, just log the error
    }

    console.log('✅ Webhook Processed:', eventType);
    res.status(200).json({ 
      status: 'Webhook received successfully', 
      eventType: eventType,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Webhook Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
