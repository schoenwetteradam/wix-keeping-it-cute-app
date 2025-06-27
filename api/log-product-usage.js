// api/log-product-usage.js
// Log individual product usage during a session
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
    const usageData = req.body;
    console.log('📦 Logging Product Usage:', JSON.stringify(usageData, null, 2));

    // Can log single product or multiple products at once
    const productsUsed = Array.isArray(usageData.products) ? usageData.products : [usageData];

    const usageRecords = productsUsed.map(product => ({
      usage_session_id: product.usage_session_id,
      booking_id: product.booking_id,
      product_id: product.product_id,
      quantity_used: product.quantity_used,
      unit_cost: product.unit_cost,
      usage_reason: product.usage_reason,
      notes: product.notes,
      logged_by_staff_id: product.logged_by_staff_id
    }));

    const { data, error } = await supabase
      .from('product_usage_log')
      .insert(usageRecords)
      .select(`
        *,
        products (product_name, current_stock, min_threshold, unit_type),
        product_usage_sessions (customer_name, service_performed)
      `);

    if (error) {
      console.error('❌ Product Usage Log Error:', error);
      return res.status(500).json({ error: 'Failed to log product usage', details: error.message });
    }

    // Check for low stock alerts
    const lowStockProducts = data.filter(record => 
      record.products.current_stock <= record.products.min_threshold
    );

    console.log('✅ Product Usage Logged:', data);
    
    res.status(200).json({ 
      status: 'Product usage logged successfully', 
      usage_records: data,
      low_stock_alerts: lowStockProducts.length > 0 ? lowStockProducts : null
    });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
