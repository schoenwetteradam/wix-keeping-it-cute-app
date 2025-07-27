// api/get-orders.js
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

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
    const { page = '1', limit = '50', payment_status, fulfillment_status } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (!Number.isFinite(pageNum) || pageNum < 1 || !Number.isFinite(limitNum) || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid page or limit parameter' });
    }

    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum - 1;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    if (fulfillment_status) {
      query = query.eq('fulfillment_status', fulfillment_status);
    }

    const { data: orders, error, count: totalCount } = await query;

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
      total_count: typeof totalCount === 'number' ? totalCount : null,
      page: pageNum,
      limit: limitNum,
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
