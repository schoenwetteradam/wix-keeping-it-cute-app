// api/retry-failed-webhooks.js
// Endpoint to retry processing of failed webhooks

import { createClient } from '@supabase/supabase-js';
import { WebhookProcessor } from '../lib/webhook-processor';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { days = 7, limit = 100 } = req.body || {};

  try {
    const { data: failedWebhooks } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_status', 'failed')
      .gte('logged_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('logged_at', { ascending: false })
      .limit(limit);

    const processor = new WebhookProcessor(supabase);
    const results = {
      total: failedWebhooks.length,
      retried: 0,
      succeeded: 0,
      still_failing: 0
    };

    for (const webhook of failedWebhooks) {
      try {
        console.log(`🔄 Retrying: ${webhook.event_type} (ID: ${webhook.id})`);
        await processor.processWebhook(webhook.event_type, webhook.data.event_data);
        await supabase
          .from('webhook_logs')
          .update({
            webhook_status: 'retried_success',
            data: {
              ...webhook.data,
              retried_at: new Date().toISOString()
            }
          })
          .eq('id', webhook.id);
        results.succeeded++;
      } catch (error) {
        console.error(`❌ Retry failed for webhook ${webhook.id}:`, error);
        results.still_failing++;
      }
      results.retried++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.status(200).json({
      success: true,
      message: 'Webhook retry completed',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
