// api/get-inventory-alerts.js - Simplified for your current schema
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'
import { addNotification, loadNotifications } from '../utils/notifications'

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
    console.log('🚨 Fetching inventory alerts...');
    
    // Get products where current_stock <= min_threshold using a stored procedure
    let { data: lowStockProducts, error } = await supabase.rpc(
      'get_inventory_alerts'
    )

    // Fall back to querying the table directly if the RPC is missing.
    // Supabase's query builder doesn't support comparing two columns, so we
    // fetch all active products and filter them in Node.js instead.
    if (error) {
      console.warn('RPC failed, falling back to direct query:', error.message)
      const fallback = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('current_stock', { ascending: true })
        .order('product_name', { ascending: true })

      if (fallback.error) {
        error = fallback.error
      } else {
        error = null
      }

      lowStockProducts = (fallback.data || []).filter(p =>
        typeof p.current_stock === 'number' &&
        typeof p.min_threshold === 'number' &&
        p.current_stock <= p.min_threshold
      )
    }

    // The stored procedure should apply the following logic:
    //   SELECT *
    //   FROM products
    //   WHERE is_active = true
    //     AND current_stock <= min_threshold
    //   ORDER BY current_stock ASC, product_name ASC;
    
    if (error) {
      console.error('❌ Alerts Fetch Error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch alerts', 
        details: error.message 
      });
    }
    
    // Calculate alert levels based on how low the stock is
    const alertsWithLevels = lowStockProducts.map(product => {
      const stockPercentage = (product.current_stock / product.min_threshold) * 100;
      let alertLevel = 'warning';
      
      if (product.current_stock <= 0) {
        alertLevel = 'critical';
      } else if (stockPercentage <= 50) {
        alertLevel = 'urgent';
      }
      
      return {
        ...product,
        alert_level: alertLevel,
        stock_percentage: Math.round(stockPercentage),
        shortage: Math.max(0, product.min_threshold - product.current_stock)
      };
    });
    
    const alertStats = {
      critical: alertsWithLevels.filter(alert => alert.alert_level === 'critical').length,
      urgent: alertsWithLevels.filter(alert => alert.alert_level === 'urgent').length,
      warning: alertsWithLevels.filter(alert => alert.alert_level === 'warning').length,
      total: alertsWithLevels.length
    };

    // Persist each alert as a notification if it doesn't already exist
    try {
      const existing = await loadNotifications();
      const existingIds = new Set(
        existing.filter(n => n.type === 'inventory').map(n => n.product_id)
      );
      await Promise.all(
        alertsWithLevels
          .filter(a => !existingIds.has(a.id))
          .map(a =>
            addNotification({
              type: 'inventory',
              product_id: a.id,
              message: `Low stock: ${a.product_name}`,
              created_at: new Date().toISOString()
            })
          )
      );
    } catch (notifyErr) {
      console.error('Failed to store inventory alerts:', notifyErr);
    }
    
    console.log(`✅ Found ${alertsWithLevels.length} inventory alerts`);
    
    res.status(200).json({ 
      status: 'success',
      alerts: alertsWithLevels,
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
