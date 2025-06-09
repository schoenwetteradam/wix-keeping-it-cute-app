// api/complete-usage-session.js - Updated for your schema
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const { session_id, products_used, customer_name, staff_member } = req.body;
    
    console.log('🔄 Processing usage session completion...');
    
    // Update product stock levels
    const stockUpdates = [];
    for (const product of products_used) {
      const { error: stockError } = await supabase
        .from('products')
        .update({ 
          current_stock: product.new_stock_level,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.product_id);
      
      if (stockError) {
        console.error('❌ Stock Update Error:', stockError);
        throw stockError;
      }
      
      stockUpdates.push({
        product_id: product.product_id,
        amount_used: product.amount_used,
        new_stock: product.new_stock_level
      });
    }
    
    // Log the usage session (you can create a usage_sessions table later)
    console.log(`✅ Updated stock for ${products_used.length} products`);
    console.log('Stock updates:', stockUpdates);
    
    res.status(200).json({ 
      status: 'success',
      message: 'Usage session completed successfully',
      stock_updates: stockUpdates,
      session_summary: {
        customer: customer_name,
        staff: staff_member,
        products_count: products_used.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('❌ Usage Session Error:', err);
    res.status(500).json({ 
      error: 'Failed to complete usage session', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
