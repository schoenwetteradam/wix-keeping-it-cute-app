import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

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
      customer_email:
        orderData.buyerInfo?.email ||
        orderData.billingInfo?.email ||
        orderData.contactDetails?.email,
      total_amount:
        orderData.totals?.total ||
        orderData.pricing?.total ||
        orderData.price?.total,
      currency: orderData.currency || 'USD',
      payment_status: orderData.paymentStatus || 'paid',
      fulfillment_status: orderData.fulfillmentStatus || 'pending',
      items: orderData.lineItems || orderData.items,
      billing_info: orderData.billingInfo,
      shipping_info: orderData.shippingInfo,
      payload: orderData,
      created_at: orderData.createdDate || new Date().toISOString(),
      updated_at: orderData.updatedDate || new Date().toISOString()
    };

    // Attempt to link to related booking if present
    const wixBookingId =
      orderData.bookingId ||
      orderData.wixBookingId ||
      orderData.wixAppBookingId ||
      orderData.bookings?.[0]?.bookingId;

    if (wixBookingId) {
      orderRecord.wix_booking_id = wixBookingId;
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('wix_booking_id', wixBookingId)
        .maybeSingle();
      if (booking) {
        orderRecord.booking_id = booking.id;
      }
    }

    // Link to existing customer if possible
    if (orderData.buyerInfo?.contactId || orderRecord.customer_email) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .or(
          [
            orderData.buyerInfo?.contactId
              ? `wix_contact_id.eq.${orderData.buyerInfo.contactId}`
              : null,
            orderRecord.customer_email
              ? `email.eq.${orderRecord.customer_email}`
              : null
          ]
            .filter(Boolean)
            .join(',')
        )
        .maybeSingle();
      if (contact) {
        orderRecord.customer_id = contact.id;
      }
    }

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
