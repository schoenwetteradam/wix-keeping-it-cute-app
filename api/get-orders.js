// api/get-orders.js
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
    const { limit = '50', payment_status, fulfillment_status } = req.query;

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    if (fulfillment_status) {
      query = query.eq('fulfillment_status', fulfillment_status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('❌ Orders fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch orders',
        details: error.message
      });
    }

    res.status(200).json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Get Orders Error:', err);
    res.status(500).json({
      error: 'Unexpected error',
      details: err.message
    });
  }
}
