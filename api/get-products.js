// api/get-products.js - Corrected for your schema
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../utils/auth'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const allowedOrigin = process.env.CORS_ALLOW_ORIGIN
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const user = await requireAuth(req, res)
  if (!user) return
  
  try {
    console.log('🔍 Fetching products from database...');
    
    const { category, brand } = req.query;
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('product_name');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (brand) {
      query = query.eq('brand', brand);
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
    
    // Group by brand
    const productsByBrand = products.reduce((acc, product) => {
      const brandName = product.brand || 'Other';
      if (!acc[brandName]) acc[brandName] = [];
      acc[brandName].push(product);
      return acc;
    }, {});
    
    console.log(`✅ Fetched ${products.length} products in ${Object.keys(productsByCategory).length} categories`);
    
    res.status(200).json({ 
      status: 'success',
      products: products,
      products_by_category: productsByCategory,
      products_by_brand: productsByBrand,
      total_count: products.length,
      categories: Object.keys(productsByCategory),
      brands: Object.keys(productsByBrand)
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
