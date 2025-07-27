import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const orderData = req.body
    console.log('🔄 Order Updated:', JSON.stringify(orderData, null, 2))

    const updateData = {
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
      payment_status: orderData.paymentStatus,
      fulfillment_status: orderData.fulfillmentStatus || orderData.status,
      items: orderData.lineItems || orderData.items,
      billing_info: orderData.billingInfo,
      shipping_info: orderData.shippingInfo,
      status: orderData.status,
      payload: orderData,
      updated_at: orderData.updatedDate || new Date().toISOString()
    }

    const wixBookingId =
      orderData.bookingId ||
      orderData.wixBookingId ||
      orderData.wixAppBookingId ||
      orderData.bookings?.[0]?.bookingId

    if (wixBookingId) {
      updateData.wix_booking_id = wixBookingId
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('wix_booking_id', wixBookingId)
        .maybeSingle()
      if (booking) {
        updateData.booking_id = booking.id
      }
    }

    if (orderData.buyerInfo?.contactId || updateData.customer_email) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .or(
          [
            orderData.buyerInfo?.contactId
              ? `wix_contact_id.eq.${orderData.buyerInfo.contactId}`
              : null,
            updateData.customer_email
              ? `email.eq.${updateData.customer_email}`
              : null
          ]
            .filter(Boolean)
            .join(',')
        )
        .maybeSingle()
      if (contact) {
        updateData.customer_id = contact.id
      }
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key]
    })

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('wix_order_id', orderData.id || orderData.orderId)
      .select()

    if (error) {
      console.error('❌ Order Update Error:', error)
      return res.status(500).json({ error: 'Failed to update order', details: error.message })
    }

    console.log('✅ Order Updated Successfully:', data)
    res.status(200).json({ status: 'Order updated successfully', data })

  } catch (err) {
    console.error('❌ Unexpected Error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
