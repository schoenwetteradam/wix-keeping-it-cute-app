// api/services.js - Get salon services
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../utils/verifyUser.js'

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

  const { error: authError } = await verifyUser(req)
  if (authError) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  try {
    const { category, active_only = 'true' } = req.query;
    
    let query = supabase
      .from('salon_services')
      .select('*')
      .order('category')
      .order('price');
    
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: services, error } = await query;
    
    if (error) {
      console.error('❌ Services fetch error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch services', 
        details: error.message 
      });
    }
    
    // Group by category
    const servicesByCategory = services.reduce((acc, service) => {
      const cat = service.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    }, {});
    
    // Calculate stats
    const stats = {
      total_services: services.length,
      categories: Object.keys(servicesByCategory).length,
      price_range: {
        min: Math.min(...services.map(s => s.price)),
        max: Math.max(...services.map(s => s.price)),
        average: services.reduce((sum, s) => sum + s.price, 0) / services.length
      }
    };
    
    res.status(200).json({ 
      success: true,
      services,
      services_by_category: servicesByCategory,
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Services API Error:', err);
    res.status(500).json({ 
      error: 'Unexpected error', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

