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
    const orderData = req.body;

    const { error } = await supabase
      .from('orders')
      .insert([{ payload: orderData }]);

    if (error) {
      console.error('❌ Supabase Insert Error:', error);
      return res.status(500).json({ error: 'Failed to insert order' });
    }

    console.log('✅ Order stored successfully');
    res.status(200).json({ status: 'Order stored successfully' });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error' });
  }
}

