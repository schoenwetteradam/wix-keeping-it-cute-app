// api/services.js - Get salon services
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

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

