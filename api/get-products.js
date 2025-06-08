// api/get-products.js - Fixed version for your webhook app
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add CORS headers for cross-origin requests
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
    console.log('🔍 Fetching products from database...');

    const { category } = req.query;

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('product_name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('❌ Products Fetch Error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch products', 
        details: error.message 
      });
    }

    // Group by category for easier display
    const productsByCategory = products.reduce((acc, product) => {
      const cat = product.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {});

    console.log(`✅ Fetched ${products.length} products in ${Object.keys(productsByCategory).length} categories`);

    res.status(200).json({ 
      status: 'success',
      products: products,
      products_by_category: productsByCategory,
      total_count: products.length,
      categories: Object.keys(productsByCategory)
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
