// api/order-updated.js - Enhanced to link with bookings
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('💰 Processing order updated webhook...');
    
    const webhookData = req.body;
    const order = webhookData.updatedEvent?.currentEntity || 
                  webhookData.createdEvent?.entity ||
                  webhookData;
    
    if (!order) {
      throw new Error('No order data found in webhook');
    }

    console.log('Order details:', {
      id: order.id,
      number: order.number,
      customer: order.buyerInfo?.email,
      total: order.priceSummary?.total?.amount,
      status: order.status,
      paymentStatus: order.paymentStatus
    });

    // === PROCESS ORDER RECORD ===
    const orderRecord = {
      wix_order_id: order.id,
      order_number: order.number,
      
      // Customer information
      customer_email: order.buyerInfo?.email,
      wix_contact_id: order.buyerInfo?.contactId,
      
      // Pricing information
      total_amount: parseFloat(order.priceSummary?.total?.amount || 0),
      subtotal: parseFloat(order.priceSummary?.subtotal?.amount || 0),
      tax_amount: parseFloat(order.priceSummary?.tax?.amount || 0),
      discount_amount: parseFloat(order.priceSummary?.discount?.amount || 0),
      currency: order.currency || 'USD',
      
      // Status information
      status: order.status,
      payment_status: order.paymentStatus,
      fulfillment_status: order.fulfillmentStatus,
      
      // Line items (services)
      line_items: order.lineItems,
      
      // Customer details
      billing_info: {
        firstName: order.billingInfo?.contactDetails?.firstName,
        lastName: order.billingInfo?.contactDetails?.lastName,
        phone: order.billingInfo?.contactDetails?.phone,
        email: order.buyerInfo?.email
      },
      
      // Timestamps
      created_date: order.createdDate,
      updated_date: order.updatedDate,
      
      // Raw data
      payload: order,
      raw_data: webhookData,
      
      // System fields
      sync_status: 'synced',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // === LINK TO CUSTOMER ===
    let customerId = null;
    if (orderRecord.customer_email || orderRecord.wix_contact_id) {
      const { data: existingCustomer } = await supabase
        .from('contacts')
        .select('id')
        .or(`email.eq.${orderRecord.customer_email},wix_contact_id.eq.${orderRecord.wix_contact_id}`)
        .single();
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
        orderRecord.customer_id = customerId;
      }
    }

    // === SAVE/UPDATE ORDER ===
    const { data: savedOrder, error: orderError } = await supabase
      .from('orders')
      .upsert(orderRecord, { 
        onConflict: 'wix_order_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Order save error:', orderError);
      throw orderError;
    }

    console.log('✅ Order saved:', savedOrder.id);

    // === LINK TO RELATED BOOKINGS ===
    // Strategy: Match by customer email, service names, and date proximity
    const linkedBookings = [];
    
    if (orderRecord.customer_email && order.lineItems?.length > 0) {
      // Extract service names from line items
      const serviceNames = order.lineItems
        .filter(item => item.itemType?.preset === 'SERVICE')
        .map(item => item.productName?.original || item.name);
      
      console.log('Looking for bookings with services:', serviceNames);
      
      if (serviceNames.length > 0) {
        // Find bookings with matching customer and services
        // Look for bookings from the past 30 days to the future
        const dateRange = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        for (const serviceName of serviceNames) {
          const { data: matchingBookings } = await supabase
            .from('bookings')
            .select('id, wix_booking_id, service_name, appointment_date, total_price')
            .eq('customer_email', orderRecord.customer_email)
            .ilike('service_name', `%${serviceName}%`)
            .gte('appointment_date', dateRange.start)
            .lte('appointment_date', dateRange.end)
            .is('order_id', null); // Only link bookings not already linked to an order

          if (matchingBookings?.length > 0) {
            console.log(`Found ${matchingBookings.length} matching bookings for service: ${serviceName}`);
            
            // Link the first matching booking for each service
            const booking = matchingBookings[0];
            
            // Get the price for this specific service from the order
            const matchingLineItem = order.lineItems.find(item => 
              item.productName?.original === serviceName || item.name === serviceName
            );
            const servicePrice = matchingLineItem ? 
              parseFloat(matchingLineItem.totalPriceAfterTax?.amount || matchingLineItem.price?.amount || 0) : 0;
            
            // Update the booking with order information and pricing
            const { error: bookingUpdateError } = await supabase
              .from('bookings')
              .update({
                order_id: savedOrder.id,
                wix_order_id: savedOrder.wix_order_id,
                total_price: servicePrice,
                payment_status: orderRecord.payment_status?.toLowerCase(),
                updated_at: new Date().toISOString()
              })
              .eq('id', booking.id);

            if (!bookingUpdateError) {
              linkedBookings.push({
                booking_id: booking.id,
                service_name: serviceName,
                price: servicePrice
              });
              console.log(`✅ Linked booking ${booking.id} with price $${servicePrice}`);
            }
          }
        }
      }
    }

    // === LOG SUCCESS ===
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'order_updated',
        webhook_status: 'success',
        wix_id: savedOrder.wix_order_id,
        data: {
          order_id: savedOrder.id,
          customer_email: savedOrder.customer_email,
          total_amount: savedOrder.total_amount,
          linked_bookings: linkedBookings.length,
          bookings: linkedBookings
        }
      });

    return res.status(200).json({
      success: true,
      message: 'Order processed and linked to bookings',
      order: {
        id: savedOrder.id,
        wix_order_id: savedOrder.wix_order_id,
        total_amount: savedOrder.total_amount,
        customer_email: savedOrder.customer_email
      },
      linked_bookings: linkedBookings
    });

  } catch (error) {
    console.error('❌ Order webhook failed:', error);
    
    // Log error
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          event_type: 'order_updated',
          webhook_status: 'failed',
          error_message: error.message,
          data: { error: error.message, payload: req.body }
        });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }
    
    return res.status(200).json({
      success: false,
      error: 'Order webhook processing failed',
      details: error.message
    });
  }
}
