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
    console.log('💰 Order Paid:', JSON.stringify(orderData, null, 2));

    const orderRecord = {
      wix_order_id: orderData.id || orderData.orderId,
      order_number: orderData.number || orderData.orderNumber,
      customer_email: orderData.buyerInfo?.email || orderData.billingInfo?.email || orderData.contactDetails?.email,
      total_amount: orderData.totals?.total || orderData.pricing?.total || orderData.price?.total,
      currency: orderData.currency || 'USD',
      payment_status: orderData.paymentStatus || 'paid',
      fulfillment_status: orderData.fulfillmentStatus || 'pending',
      items: orderData.lineItems || orderData.items,
      billing_info: orderData.billingInfo,
      shipping_info: orderData.shippingInfo,
      payload: orderData,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(orderRecord).forEach(key => {
      if (orderRecord[key] === undefined) delete orderRecord[key];
    });

    const { data, error } = await supabase
      .from('orders')
      .upsert(orderRecord, { onConflict: 'wix_order_id', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error('❌ Order Upsert Error:', error);
      return res.status(500).json({ error: 'Failed to process order', details: error.message });
    }

    console.log('✅ Order Processed Successfully:', data);
    res.status(200).json({ status: 'Order processed successfully', data });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
