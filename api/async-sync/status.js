/**
 * Async Sync Status API
 * Get the status of recent sync jobs
 */

const { createSupabaseClient } = require('../../utils/supabaseClient');
const { setCorsHeaders } = require('../../utils/cors');

const supabase = createSupabaseClient();

module.exports = async function handler(req, res) {
  setCorsHeaders(res, 'GET');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 20, sync_type = null, status = null } = req.query;

    // Get user from auth
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Build query
    let query = supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(parseInt(limit));

    // Filter by user if authenticated (non-service role)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (sync_type) {
      query = query.eq('sync_type', sync_type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: syncLogs, error } = await query;

    if (error) throw error;

    // Get summary stats
    const { data: stats } = await supabase
      .from('sync_logs')
      .select('status, sync_type')
      .order('started_at', { ascending: false })
      .limit(100);

    const summary = {
      total: syncLogs?.length || 0,
      running: stats?.filter(s => s.status === 'running').length || 0,
      completed: stats?.filter(s => s.status === 'completed').length || 0,
      failed: stats?.filter(s => s.status === 'failed').length || 0
    };

    return res.status(200).json({
      success: true,
      syncLogs: syncLogs || [],
      summary
    });

  } catch (error) {
    console.error('Error fetching sync status:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

