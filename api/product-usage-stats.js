// api/product-usage-stats.js
import { createClient } from '@supabase/supabase-js'

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
  
  try {
    const { range = 'week' } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    switch (range) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }
    
    // Get usage sessions with product details
    const { data: sessions, error: sessionsError } = await supabase
      .from('product_usage_sessions')
      .select(`
        *,
        product_usage_log(
          *,
          products(product_name, unit_type, cost_per_unit)
        )
      `)
      .gte('session_start_time', startDate.toISOString())
      .order('session_start_time', { ascending: false });
    
    if (sessionsError) {
      throw sessionsError;
    }
    
    // Calculate stats
    const stats = {
      total_sessions: sessions.length,
      total_value: 0,
      total_products_used: 0,
      product_usage_count: {},
      avg_products_per_session: 0
    };
    
    // Process sessions to add product details and calculate stats
    const processedSessions = sessions.map(session => {
      const productsUsed = session.product_usage_log || [];
      let sessionValue = 0;
      
      const productsWithDetails = productsUsed.map(usage => {
        const cost = usage.unit_cost * usage.quantity_used;
        sessionValue += cost;
        stats.total_value += cost;
        stats.total_products_used += usage.quantity_used;
        
        // Count product usage
        const productName = usage.products?.product_name || 'Unknown';
        stats.product_usage_count[productName] = (stats.product_usage_count[productName] || 0) + usage.quantity_used;
        
        return {
          ...usage,
          product_name: usage.products?.product_name,
          unit_type: usage.products?.unit_type,
          session_cost: cost
        };
      });
      
      return {
        ...session,
        products_used: productsWithDetails,
        session_value: sessionValue
      };
    });
    
    // Calculate averages and top products
    if (sessions.length > 0) {
      stats.avg_products_per_session = stats.total_products_used / sessions.length;
      
      // Find most used product
      const topProduct = Object.entries(stats.product_usage_count)
        .sort(([,a], [,b]) => b - a)[0];
      stats.top_product = topProduct ? topProduct[0] : 'None';
    }
    
    res.status(200).json({
      success: true,
      sessions: processedSessions,
      stats: stats,
      date_range: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        range: range
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Product Usage Stats Error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch usage stats', 
      details: err.message 
    });
  }
}
