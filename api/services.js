// api/services.js - Get salon services
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

// api/appointments.js - Get appointments with filtering
export async function getAppointments(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const { 
      date, 
      status, 
      payment_status, 
      staff_id, 
      customer_id,
      limit = '50' 
    } = req.query;
    
    let query = supabase
      .from('salon_appointments')
      .select(`
        *,
        customers(*),
        salon_services(*),
        staff(*)
      `)
      .order('appointment_date', { ascending: false })
      .limit(parseInt(limit));
    
    if (date) {
      query = query.gte('appointment_date', `${date}T00:00:00`)
                   .lt('appointment_date', `${date}T23:59:59`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }
    
    if (staff_id) {
      query = query.eq('staff_id', staff_id);
    }
    
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    
    const { data: appointments, error } = await query;
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({ 
      success: true,
      appointments,
      count: appointments.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Appointments API Error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch appointments', 
      details: err.message
    });
  }
}

// api/dashboard-stats.js - Business dashboard statistics
export async function getDashboardStats(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Today's appointments
    const { data: todayAppointments } = await supabase
      .from('salon_appointments')
      .select('*, customers(*), salon_services(*)')
      .gte('appointment_date', `${today}T00:00:00`)
      .lt('appointment_date', `${today}T23:59:59`);
    
    // This month's revenue
    const { data: monthlyRevenue } = await supabase
      .from('business_metrics')
      .select('metric_value')
      .eq('business_type', 'salon')
      .eq('metric_name', 'revenue')
      .gte('metric_date', `${thisMonth}-01`);
    
    // Customer count
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_type', 'salon');
    
    // Popular services this month
    const { data: popularServices } = await supabase
      .from('salon_appointments')
      .select('salon_services(name), count(*)')
      .gte('appointment_date', `${thisMonth}-01T00:00:00`)
      .eq('payment_status', 'paid')
      .group('salon_services.name')
      .order('count', { ascending: false })
      .limit(5);
    
    const stats = {
      today: {
        appointments: todayAppointments?.length || 0,
        confirmed: todayAppointments?.filter(a => a.status === 'confirmed').length || 0,
        revenue: todayAppointments?.filter(a => a.payment_status === 'paid')
          .reduce((sum, a) => sum + (a.payment_amount || 0), 0) || 0
      },
      monthly: {
        revenue: monthlyRevenue?.reduce((sum, m) => sum + (m.metric_value || 0), 0) || 0,
        appointments: todayAppointments?.length || 0 // This would need a proper monthly query
      },
      totals: {
        customers: totalCustomers || 0,
        services: (await supabase.from('salon_services').select('*', { count: 'exact', head: true })).count || 0
      },
      popular_services: popularServices || []
    };
    
    res.status(200).json({ 
      success: true,
      stats,
      generated_at: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Dashboard Stats Error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats', 
      details: err.message
    });
  }
}
