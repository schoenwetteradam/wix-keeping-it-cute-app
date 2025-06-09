// api/create-usage-session.js - New endpoint for starting sessions
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
    const { customer_id, customer_name, staff_member, service_type } = req.body;
    
    console.log('🆕 Creating new usage session...');
    
    // For now, just return a session object
    // Later you can create a usage_sessions table
    const session = {
      id: `session_${Date.now()}`,
      customer_id: customer_id || 'unknown',
      customer_name: customer_name || 'Walk-in Customer',
      staff_member: staff_member || 'Staff',
      service_type: service_type || 'General Service',
      created_at: new Date().toISOString(),
      status: 'active'
    };
    
    console.log(`✅ Created session: ${session.id}`);
    
    res.status(200).json({ 
      status: 'success',
      session: session,
      message: 'Usage session created successfully'
    });
    
  } catch (err) {
    console.error('❌ Create Session Error:', err);
    res.status(500).json({ 
      error: 'Failed to create usage session', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
