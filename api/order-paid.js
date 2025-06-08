// api/order-paid.js
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
    console.log('📦 Order Payload Received:', JSON.stringify(orderData, null, 2));

    // Extract relevant fields from Wix order payload
    const orderRecord = {
      // Core order information
      wix_order_id: orderData.id || orderData.orderId,
      order_number: orderData.number || orderData.orderNumber,
      
      // Customer information
      customer_email: orderData.buyerInfo?.email || 
                     orderData.billingInfo?.email || 
                     orderData.contactDetails?.email,
      
      // Financial information
      total_amount: orderData.totals?.total || 
                   orderData.pricing?.total || 
                   orderData.price?.total,
      currency: orderData.currency || 'USD',
      payment_status: orderData.paymentStatus || 'paid',
      fulfillment_status: orderData.fulfillmentStatus || 'pending',
      
      // Detailed information as JSON
      items: orderData.lineItems || orderData.items,
      billing_info: orderData.billingInfo,
      shipping_info: orderData.shippingInfo,
      
      // Full payload for reference
      payload: orderData,
      
      // Timestamps
      updated_at: new Date().toISOString()
    };

    // Remove undefined values to avoid database errors
    Object.keys(orderRecord).forEach(key => {
      if (orderRecord[key] === undefined) {
        delete orderRecord[key];
      }
    });

    console.log('💾 Processed Order Record:', JSON.stringify(orderRecord, null, 2));

    // Try upsert: update if exists, insert if new
    const { data, error } = await supabase
      .from('orders')
      .upsert(orderRecord, { 
        onConflict: 'wix_order_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('❌ Order Upsert Error:', error);
      return res.status(500).json({ 
        error: 'Failed to process order', 
        details: error.message 
      });
    }

    console.log('✅ Order Processed Successfully:', data);
    res.status(200).json({ 
      status: 'Order processed successfully', 
      data: data,
      timestamp: new Date().toISOString()
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
