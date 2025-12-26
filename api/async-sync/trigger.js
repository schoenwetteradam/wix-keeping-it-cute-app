/**
 * Async Sync Trigger API
 * Triggers background sync jobs without blocking the request
 * Returns immediately while sync runs in the background
 */

const { createSupabaseClient } = require('../../utils/supabaseClient');
const { AsyncSyncAgent } = require('../../lib/async-sync-agent');
const { setCorsHeaders } = require('../../utils/cors');

const supabase = createSupabaseClient();

module.exports = async function handler(req, res) {
  setCorsHeaders(res, 'POST,GET');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Get sync status
    try {
      const { data: recentSyncs, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        recentSyncs: recentSyncs || []
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      table = 'all', // 'customers', 'appointments', 'orders', or 'all'
      supabaseUserId = null,
      dateRange = null
    } = req.body;

    // Get user ID from auth if not provided
    let userId = supabaseUserId;
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: table,
        status: 'running',
        started_at: new Date().toISOString(),
        user_id: userId
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create sync log:', logError);
      // Continue anyway - logging is not critical
    }

    const syncAgent = new AsyncSyncAgent();
    
    // Trigger async sync (don't await - let it run in background)
    const syncPromise = (async () => {
      try {
        let results;
        
        switch (table) {
          case 'customers':
            results = await syncAgent.syncCustomers(userId);
            break;
          case 'appointments':
            results = await syncAgent.syncAppointments(userId, dateRange);
            break;
          case 'orders':
            results = await syncAgent.syncOrders(userId);
            break;
          case 'all':
            results = await syncAgent.syncAll(userId);
            break;
          default:
            throw new Error(`Unknown table: ${table}`);
        }

        // Update sync log
        if (syncLog?.id) {
          await supabase
            .from('sync_logs')
            .update({
              status: 'completed',
                completed_at: new Date().toISOString(),
                results: results,
                synced_count: getTotalSynced(results),
                error_count: getTotalErrors(results)
            })
            .eq('id', syncLog.id);
        }

        console.log(`✅ Sync completed for ${table}:`, results);
      } catch (error) {
        console.error(`❌ Sync failed for ${table}:`, error);
        
        // Update sync log with error
        if (syncLog?.id) {
          await supabase
            .from('sync_logs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error: error.message
            })
            .eq('id', syncLog.id);
        }
      }
    })();

    // Don't await - return immediately
    // The sync will continue running in the background
    
    return res.status(202).json({
      success: true,
      message: `Sync started for ${table}`,
      syncId: syncLog?.id,
      status: 'running'
    });

  } catch (error) {
    console.error('Sync trigger error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function getTotalSynced(results) {
  if (typeof results === 'object' && results.synced !== undefined) {
    return results.synced;
  }
  if (results.customers && results.appointments && results.orders) {
    return (results.customers.synced || 0) + 
           (results.appointments.synced || 0) + 
           (results.orders.synced || 0);
  }
  return 0;
}

function getTotalErrors(results) {
  if (typeof results === 'object' && results.errors !== undefined) {
    return results.errors;
  }
  if (results.customers && results.appointments && results.orders) {
    return (results.customers.errors || 0) + 
           (results.appointments.errors || 0) + 
           (results.orders.errors || 0);
  }
  return 0;
}

