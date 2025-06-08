// api/get-inventory-alerts.js - Fixed version
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add CORS headers
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

  try {
    console.log('🚨 Fetching inventory alerts...');

    const { data, error } = await supabase
      .from('inventory_alerts')
      .select(`
        *,
        products (
          product_name,
          brand,
          current_stock,
          min_threshold,
          unit_type,
          supplier,
          reorder_quantity
        )
      `)
      .eq('is_resolved', false)
      .order('alert_level', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Alerts Fetch Error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch alerts', 
        details: error.message 
      });
    }

    const alertStats = {
      critical: data.filter(alert => alert.alert_level === 'critical').length,
      urgent: data.filter(alert => alert.alert_level === 'urgent').length,
      warning: data.filter(alert => alert.alert_level === 'warning').length,
      total: data.length
    };

    console.log(`✅ Found ${data.length} active alerts`);

    res.status(200).json({ 
      status: 'success',
      alerts: data,
      alert_stats: alertStats,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ 
      error: 'Unexpected error', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
