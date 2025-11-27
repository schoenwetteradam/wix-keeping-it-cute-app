import { createClient } from '@supabase/supabase-js';
import { getWixRequestHeaders } from '../../utils/wixAccessToken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log('🔍 Starting webhook configuration diagnostic...');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {},
    wix_config: {},
    database_status: {},
    webhook_endpoints: {},
    recommendations: []
  };

  try {
    // Check 1: Environment Variables
    console.log('📋 Checking environment variables...');
    diagnostics.environment = {
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      wix_api_token: !!process.env.WIX_API_TOKEN,
      wix_site_id: !!process.env.WIX_SITE_ID,
      wix_webhook_secret: !!process.env.WIX_WEBHOOK_SECRET,
      vercel_url: process.env.VERCEL_URL || 'Not set'
    };

    // Check 2: Database connectivity and recent data
    console.log('🗃️ Checking database status...');
    
    // Check bookings
    const { data: bookingsStats, error: bookingsError } = await supabase
      .from('bookings')
      .select('sync_status, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (bookingsError) {
      diagnostics.database_status.bookings_error = bookingsError.message;
    } else {
      const pendingCount = bookingsStats.filter(b => b.sync_status === 'pending').length;
      const syncedCount = bookingsStats.filter(b => b.sync_status === 'synced').length;
      const failedCount = bookingsStats.filter(b => b.sync_status === 'failed').length;
      
      diagnostics.database_status.bookings = {
        total_last_7d: bookingsStats.length,
        pending: pendingCount,
        synced: syncedCount,
        failed: failedCount,
        sync_rate: bookingsStats.length > 0 ? Math.round(syncedCount / bookingsStats.length * 100) : 0
      };
    }

    // Check webhook logs
    const { data: webhookStats, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('event_type, webhook_status, logged_at')
      .gte('logged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (webhookError) {
      diagnostics.database_status.webhooks_error = webhookError.message;
    } else {
      const successCount = webhookStats.filter(w => w.webhook_status === 'success').length;
      const failedCount = webhookStats.filter(w => w.webhook_status === 'failed').length;
      
      diagnostics.database_status.webhooks = {
        total_last_7d: webhookStats.length,
        success: successCount,
        failed: failedCount,
        success_rate: webhookStats.length > 0 ? Math.round(successCount / webhookStats.length * 100) : 0,
        recent_events: [...new Set(webhookStats.map(w => w.event_type))],
        last_webhook: webhookStats.length > 0 ? Math.max(...webhookStats.map(w => new Date(w.logged_at).getTime())) : null
      };
    }

    // Check 3: Test Wix API connectivity
    console.log('🔗 Testing Wix API connectivity...');
    
    if ((process.env.WIX_API_TOKEN || process.env.WIX_APP_ID) && process.env.WIX_SITE_ID) {
      try {
        const wixTestResponse = await fetch('https://www.wixapis.com/bookings/v2/bookings/query', {
          method: 'POST',
          headers: await getWixRequestHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            query: {
              paging: { limit: 1 }
            }
          })
        });

        diagnostics.wix_config.api_connectivity = {
          status: wixTestResponse.ok ? 'SUCCESS' : 'FAILED',
          status_code: wixTestResponse.status,
          can_fetch_bookings: wixTestResponse.ok
        };

        if (wixTestResponse.ok) {
          const wixData = await wixTestResponse.json();
          diagnostics.wix_config.api_connectivity.sample_data_available = wixData.bookings?.length > 0;
        }

      } catch (wixError) {
        diagnostics.wix_config.api_connectivity = {
          status: 'ERROR',
          error: wixError.message
        };
      }
    } else {
      diagnostics.wix_config.api_connectivity = {
        status: 'MISCONFIGURED',
        error: 'Missing Wix credentials (WIX_API_TOKEN or OAuth app vars) or WIX_SITE_ID'
      };
    }

    // Check 4: Webhook endpoint accessibility
    console.log('🌐 Testing webhook endpoint accessibility...');
    
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const webhookEndpoints = [
      '/api/booking-created',
      '/api/booking-updated',
      '/api/contact-created',
      '/api/webhook-router'
    ];

    for (const endpoint of webhookEndpoints) {
      try {
        const testResponse = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true })
        });

        diagnostics.webhook_endpoints[endpoint] = {
          accessible: testResponse.status !== 404,
          status_code: testResponse.status,
          response_received: true
        };

      } catch (endpointError) {
        diagnostics.webhook_endpoints[endpoint] = {
          accessible: false,
          error: endpointError.message
        };
      }
    }

    // Generate recommendations based on findings
    console.log('💡 Generating recommendations...');

    if (diagnostics.database_status.bookings?.pending > 0) {
      diagnostics.recommendations.push({
        priority: 'HIGH',
        issue: `${diagnostics.database_status.bookings.pending} bookings stuck in pending status`,
        action: 'Run manual sync or check webhook configuration',
        sql_fix: 'UPDATE bookings SET sync_status = \'needs_retry\' WHERE sync_status = \'pending\';'
      });
    }

    if (diagnostics.database_status.webhooks?.total_last_7d === 0) {
      diagnostics.recommendations.push({
        priority: 'CRITICAL',
        issue: 'No webhook activity in the last 7 days',
        action: 'Check Wix webhook configuration and verify endpoints are publicly accessible',
        next_steps: [
          '1. Verify webhook URLs in Wix Developer Console',
          '2. Check webhook endpoint logs',
          '3. Test webhook endpoints manually'
        ]
      });
    }

    if (!diagnostics.wix_config.api_connectivity?.can_fetch_bookings) {
      diagnostics.recommendations.push({
        priority: 'CRITICAL',
        issue: 'Cannot connect to Wix API',
        action: 'Verify WIX_API_TOKEN has correct permissions and WIX_SITE_ID is correct'
      });
    }

    if (diagnostics.database_status.webhooks?.success_rate < 50) {
      diagnostics.recommendations.push({
        priority: 'HIGH',
        issue: `Low webhook success rate (${diagnostics.database_status.webhooks.success_rate}%)`,
        action: 'Review webhook error logs and fix processing issues'
      });
    }

    // Overall health assessment
    let overallHealth = 'HEALTHY';
    const criticalIssues = diagnostics.recommendations.filter(r => r.priority === 'CRITICAL');
    const highIssues = diagnostics.recommendations.filter(r => r.priority === 'HIGH');

    if (criticalIssues.length > 0) {
      overallHealth = 'CRITICAL';
    } else if (highIssues.length > 0) {
      overallHealth = 'DEGRADED';
    }

    diagnostics.overall_health = overallHealth;
    diagnostics.summary = {
      critical_issues: criticalIssues.length,
      high_priority_issues: highIssues.length,
      total_recommendations: diagnostics.recommendations.length
    };

    console.log('✅ Diagnostic complete');

    res.status(200).json({
      success: true,
      diagnostics,
      next_action: criticalIssues.length > 0 ? 'Address critical issues immediately' : 
                   highIssues.length > 0 ? 'Review and fix high priority issues' : 
                   'System appears healthy'
    });

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Diagnostic failed',
      details: error.message,
      partial_diagnostics: diagnostics
    });
  }
}
