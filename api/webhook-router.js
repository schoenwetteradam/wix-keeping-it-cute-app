// api/webhook-router.js - FINAL VERSION with fixed labels and upserts
import jwt from 'jsonwebtoken';
import { createSupabaseClient } from '../utils/supabaseClient';
import { setCorsHeaders } from '../utils/cors';

const supabase = createSupabaseClient()

// Wix public key used to verify signed webhook payloads.
const { WIX_PUBLIC_KEY } = process.env;

// Product usage tracking function
async function checkForProductUsagePrompt(bookingId, customerEmail) {
  try {
    const { data: existingUsage, error: usageError } = await supabase
      .from('product_usage_sessions')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (usageError) {
      console.error('Product usage lookup error:', usageError.message);
    }
    
    if (!existingUsage) {
      await supabase
        .from('system_metrics')
        .insert({
          metric_type: 'product_usage_needed',
          metric_data: {
            booking_id: bookingId,
            customer_email: customerEmail,
            needs_product_usage: true,
            created_at: new Date().toISOString()
          }
        });
      
      console.log('📦 Product usage needed for booking:', bookingId);
    }
  } catch (error) {
    console.error('❌ Error checking product usage:', error);
  }
}

export default async function handler(req, res) {
  console.log('🎯 === WIX WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body type:', typeof req.body);
  console.log('Body preview:', JSON.stringify(req.body).substring(0, 500));
  
  // Set CORS headers
  setCorsHeaders(res, 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wix-webhook-signature');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log webhook attempt
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'webhook_received',
        webhook_status: 'processing',
        data: {
          headers: req.headers,
          body_preview: JSON.stringify(req.body).substring(0, 1000),
          timestamp: new Date().toISOString()
        }
      });

    const webhookData = req.body;
    
    // === FORMAT DETECTION AND ROUTING ===
    
    // 1. Check for TEST webhook (simple object without JWT or entityFqdn)
    if (webhookData && typeof webhookData === 'object' && !webhookData.entityFqdn && typeof webhookData !== 'string') {
      console.log('🧪 Test webhook detected');
      
      await supabase
        .from('webhook_logs')
        .insert({
          event_type: 'webhook_test',
          webhook_status: 'success',
          data: { test_payload: webhookData, timestamp: new Date().toISOString() }
        });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook test successful!' 
      });
    }

    // 2. Check for NEW FORMAT webhook (object with entityFqdn)
    if (webhookData && typeof webhookData === 'object' && webhookData.entityFqdn && webhookData.slug) {
      console.log('📋 New format Wix webhook detected');
      console.log('Entity FQDN:', webhookData.entityFqdn);
      console.log('Slug:', webhookData.slug);
      
      let result = await processNewFormatWebhook(webhookData);

      await supabase
        .from('webhook_logs')
        .insert({
          event_type: webhookData.entityFqdn + '.' + webhookData.slug,
          webhook_status: 'success',
          wix_id: webhookData.entityId,
          data: {
            result: result,
            processed_at: new Date().toISOString()
          }
        });

      console.log('✅ === NEW FORMAT WEBHOOK PROCESSED ===');
      return res.status(200).json({
        success: true,
        eventType: webhookData.entityFqdn + '.' + webhookData.slug,
        result: result,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Check for JWT FORMAT webhook (string starting with 'eyJ')
    if (typeof webhookData === 'string' && webhookData.startsWith('eyJ')) {
      console.log('🔐 JWT Token detected, processing...');

      let rawPayload, event, eventData;

      try {
        // Try to verify JWT first if we have a public key
        if (WIX_PUBLIC_KEY) {
          console.log('🔒 Attempting JWT verification...');
          rawPayload = jwt.verify(webhookData, WIX_PUBLIC_KEY, {
            algorithms: ['RS256']
          });
          console.log('✅ JWT verified successfully');
        } else {
          throw new Error('Missing WIX_PUBLIC_KEY');
        }

      } catch (jwtError) {
        console.log('⚠️ JWT Verification skipped or failed:', jwtError.message);
        console.log('🔄 Attempting to decode without verification...');

        // Decode without verification for processing
        const decoded = jwt.decode(webhookData, { complete: true });
        if (!decoded || !decoded.payload) {
          throw new Error('Failed to decode JWT token');
        }
        rawPayload = decoded.payload;
        console.log('✅ JWT decoded without verification');
      }
      
      console.log('📋 Raw JWT payload keys:', Object.keys(rawPayload));
      
      // Parse the deeply nested data structure
      try {
        // First level: rawPayload.data (usually a JSON string)
        let firstLevel;
        if (typeof rawPayload.data === 'string') {
          firstLevel = JSON.parse(rawPayload.data);
          console.log('📋 First level parsed, keys:', Object.keys(firstLevel));
        } else {
          firstLevel = rawPayload.data;
        }
        
        // Second level: firstLevel.data (another JSON string)
        let secondLevel;
        if (typeof firstLevel.data === 'string') {
          secondLevel = JSON.parse(firstLevel.data);
          console.log('📋 Second level parsed, keys:', Object.keys(secondLevel));
        } else {
          secondLevel = firstLevel.data || firstLevel;
        }
        
        // Now we should have the actual event data
        event = secondLevel;
        
        // Extract the actual entity data
        if (event.updatedEvent?.currentEntity) {
          eventData = event.updatedEvent.currentEntity;
        } else if (event.createdEvent?.entity) {
          eventData = event.createdEvent.entity;
        } else if (event.deletedEvent?.entity) {
          eventData = event.deletedEvent.entity;
        } else {
          eventData = event;
        }
        
        console.log('📋 Final event entityFqdn:', event.entityFqdn);
        console.log('📋 Final event slug:', event.slug);
        console.log('📋 Final event entityId:', event.entityId);
        console.log('📋 Event data keys:', Object.keys(eventData || {}));
        
      } catch (parseError) {
        console.error('❌ Error parsing JWT data structure:', parseError.message);
        throw new Error(`JWT data parsing failed: ${parseError.message}`);
      }
      
      // Process JWT webhook
      let result = await processJWTWebhook(event, eventData);
      
      // Log successful webhook
      await supabase
        .from('webhook_logs')
        .insert({
          event_type: (event.entityFqdn || 'unknown') + '.' + (event.slug || 'unknown'),
          webhook_status: 'success',
          wix_id: event.entityId,
          data: {
            result: result,
            processed_at: new Date().toISOString(),
            jwt_payload_preview: JSON.stringify(rawPayload).substring(0, 1000)
          }
        });
      
      console.log('✅ === JWT WEBHOOK PROCESSED ===');
      return res.status(200).json({
        success: true,
        eventType: (event.entityFqdn || 'unknown') + '.' + (event.slug || 'unknown'),
        result: result,
        timestamp: new Date().toISOString()
      });
    }

    // 4. If we get here, unknown format
    throw new Error('Unknown webhook format: ' + typeof webhookData);

  } catch (error) {
    console.error('❌ === WEBHOOK PROCESSING FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Log the failed webhook
    await logFailedWebhook(error, req.body);
    
    // Always return 200 to prevent Wix retries
    res.status(200).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      note: 'Webhook logged for debugging'
    });
  }
}

// === NEW FORMAT PROCESSING ===
async function processNewFormatWebhook(webhookData) {
  console.log('📋 Processing new format webhook...');
  
  const eventType = webhookData.entityFqdn + '.' + webhookData.slug;
  
  if (webhookData.entityFqdn === 'wix.contacts.v4.contact') {
    return await processContactEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.bookings.v2.booking') {
    return await processBookingEventNewFormat(webhookData);
  } else if (webhookData.entityFqdn === 'wix.ecom.v1.order') {
    return await processOrderEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.loyalty.v1.account') {
    return await processLoyaltyEvent(webhookData);
  } else {
    return await logUnknownEvent(eventType, webhookData);
  }
}

// === JWT FORMAT PROCESSING ===
async function processJWTWebhook(event, eventData) {
  console.log('🔐 Processing JWT webhook...');
  console.log('Event entityFqdn:', event?.entityFqdn);
  console.log('Event slug:', event?.slug);
  
  const eventType = (event?.entityFqdn || 'unknown') + '.' + (event?.slug || 'unknown');
  
  if (event?.eventType === 'com.wix.payment.api.pay.v3.PaymentEvent') {
    return await processPaymentEventJWT(event, eventData);
  } else if (event?.entityFqdn === 'wix.contacts.v4.contact') {
    return await processContactEventJWT(event, eventData);
  } else if (event?.entityFqdn === 'wix.bookings.v2.booking') {
    return await processBookingEventJWT(event, eventData);
  } else if (event?.entityFqdn === 'wix.ecom.v1.order') {
    return await processOrderEventJWT(event, eventData);
  } else if (event?.entityFqdn === 'wix.loyalty.v1.account') {
    return await processLoyaltyEventJWT(event, eventData);
  } else {
    return await logUnknownEvent(eventType, event);
  }
}

// === CONTACT PROCESSING ===
async function processContactEvent(webhookData) {
  return await processContactEventJWT(webhookData, null);
}

async function processContactEventJWT(event, eventData = null) {
  try {
    console.log('👤 Processing contact event...');
    
    // Extract contact data (handles both new and JWT formats)
    const contactData = eventData || event?.updatedEvent?.currentEntity || event?.createdEvent?.entity || event;
    
    console.log('👤 Contact ID:', contactData?.id);
    console.log('👤 Contact revision:', contactData?.revision);
    console.log('👤 Contact keys:', Object.keys(contactData || {}));
    
    if (!contactData || !contactData.id) {
      throw new Error('No valid contact data found in webhook');
    }
    
    // FIXED: Properly handle labels field
    let labels = null;
    if (contactData.info?.labelKeys) {
      if (Array.isArray(contactData.info.labelKeys)) {
        labels = contactData.info.labelKeys;
      } else if (typeof contactData.info.labelKeys === 'string') {
        try {
          labels = JSON.parse(contactData.info.labelKeys);
        } catch (e) {
          labels = [contactData.info.labelKeys]; // Make it an array
        }
      }
    }
    
    const contactRecord = {
      wix_contact_id: contactData.id,
      email: contactData.info?.emails?.items?.[0]?.email || contactData.loginEmail || contactData.primaryEmail,
      first_name: contactData.info?.name?.first || contactData.primaryInfo?.name?.first,
      last_name: contactData.info?.name?.last || contactData.primaryInfo?.name?.last,
      phone: contactData.info?.phones?.items?.[0]?.phone || contactData.primaryInfo?.phone,
      birth_date: contactData.info?.birthdate,
      labels: labels, // Now properly formatted as array or null
      subscriber_status: contactData.info?.extendedFields?.emailSubscriptions?.deliverabilityStatus,
      payload: contactData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(contactRecord).forEach(key => {
      if (contactRecord[key] === undefined) delete contactRecord[key];
    });
    
    console.log('👤 Contact record to upsert:', {
      wix_contact_id: contactRecord.wix_contact_id,
      email: contactRecord.email,
      first_name: contactRecord.first_name,
      last_name: contactRecord.last_name,
      phone: contactRecord.phone,
      labels: contactRecord.labels
    });

    const { data, error } = await supabase
      .from('contacts')
      .upsert(contactRecord, { onConflict: 'wix_contact_id', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error('❌ Contact upsert error:', error);
      throw error;
    }

    console.log('✅ Contact processed successfully:', data[0]?.id);
    
    return {
      type: 'contact_processed',
      contact_id: data[0]?.id,
      wix_contact_id: contactRecord.wix_contact_id,
      email: contactRecord.email,
      first_name: contactRecord.first_name,
      last_name: contactRecord.last_name
    };
    
  } catch (error) {
    console.error('❌ Contact processing failed:', error);
    throw error;
  }
}

// === ORDER PROCESSING ===
async function processOrderEvent(webhookData) {
  return await processOrderEventJWT(webhookData, null);
}

async function processOrderEventJWT(event, eventData = null) {
  try {
    console.log('💰 Processing order event...');

    // Handle both created and updated events
    const orderData =
      eventData ||
      event?.updatedEvent?.currentEntity ||
      event?.createdEvent?.entity ||
      event?.actionEvent?.body?.order ||
      event;

    const orderRecord = {
      wix_order_id: orderData.id || orderData.orderId,
      order_number: orderData.number || orderData.orderNumber,
      customer_email:
        orderData.buyerInfo?.email ||
        orderData.billingInfo?.email ||
        orderData.contactDetails?.email,
      total_amount:
        orderData.priceSummary?.total?.amount ||
        orderData.totalAmount ||
        orderData.totals?.total ||
        orderData.total,
      currency: orderData.currency || 'USD',
      payment_status: orderData.paymentStatus || 'NOT_PAID',
      previous_payment_status:
        event?.actionEvent?.body?.previousPaymentStatus,
      fulfillment_status: orderData.fulfillmentStatus || orderData.status,
      items: orderData.lineItems || orderData.items,
      billing_info: orderData.billingInfo,
      shipping_info: orderData.shippingInfo,
      payload: orderData,
      created_at: orderData.createdDate || new Date().toISOString(),
      updated_at: orderData.updatedDate || new Date().toISOString()
    };

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

    Object.keys(orderRecord).forEach(key => {
      if (orderRecord[key] === undefined) delete orderRecord[key];
    });

    const { data, error } = await supabase
      .from('orders')
      .upsert(orderRecord, { onConflict: 'wix_order_id', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error('❌ Order upsert error:', error);
      throw error;
    }

    console.log('✅ Order processed successfully:', data[0]?.id);

    return {
      type: 'order_processed',
      order_id: data[0]?.id,
      wix_order_id: orderRecord.wix_order_id,
      order_number: orderRecord.order_number
    };

  } catch (error) {
    console.error('❌ Order processing failed:', error);
    throw error;
  }
}

// === LOYALTY PROCESSING ===
async function processLoyaltyEvent(webhookData) {
  return await processLoyaltyEventJWT(
    webhookData,
    webhookData.updatedEvent?.currentEntity || webhookData.createdEvent?.entity || webhookData
  );
}

async function processLoyaltyEventJWT(event, eventData = null) {
  try {
    console.log('🏆 Processing loyalty event...');

    const loyalty = eventData || event;

    const loyaltyRecord = {
      contact_id: loyalty.contactId,
      name: loyalty.contact?.name || loyalty.contact?.displayName,
      email: loyalty.contact?.email,
      points_balance: loyalty.points?.balance,
      redeemed_points: loyalty.points?.redeemed,
      last_activity: loyalty.lastActivityDate || loyalty.updatedDate
    };

    Object.keys(loyaltyRecord).forEach(key => {
      if (loyaltyRecord[key] === undefined) delete loyaltyRecord[key];
    });

    const { data, error } = await supabase
      .from('loyalty')
      .upsert(loyaltyRecord, { onConflict: 'contact_id', ignoreDuplicates: false })
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ Loyalty upsert error:', error);
      throw error;
    }

    console.log('✅ Loyalty event processed:', data?.id);

    return { type: 'loyalty_processed', loyalty_id: data?.id, contact_id: loyaltyRecord.contact_id };
  } catch (error) {
    console.error('❌ Loyalty processing failed:', error);
    throw error;
  }
}

async function processPaymentEventJWT(event, eventData = null) {
  try {
    console.log('💸 Processing payment event...');

    const data = eventData || event;
    const detail =
      data.transactionStatusChangedEvent ||
      data.refundStatusChangedEvent ||
      data.recurringPaymentStatusChangedEvent ||
      data.transactionUpdatedEvent ||
      data.transactionCreatedEvent ||
      {};

    const orderInfo = detail.order || {};
    const txn = detail.transaction || detail.refund || {};
    const amountInfo = txn.amount || txn.refundedAmount || {};
    const status =
      txn.status || detail.status || detail.previousStatus || 'UNKNOWN';

    const paymentRecord = {
      wix_payment_id: txn.id || detail.id || data.id,
      wix_order_id: orderInfo.id || txn.verticalOrderId,
      wix_booking_id: orderInfo.bookingId || orderInfo.wixAppBookingId,
      provider_transaction_id: txn.providerTransactionId,
      payment_method: txn.paymentMethod,
      amount: amountInfo.amount,
      currency: amountInfo.currency,
      status,
      payload: data,
      processed_at: new Date().toISOString()
    };

    Object.keys(paymentRecord).forEach(key => {
      if (paymentRecord[key] === undefined) delete paymentRecord[key];
    });

    const { data: paymentRow, error } = await supabase
      .from('wix_payments')
      .upsert(paymentRecord, { onConflict: 'wix_payment_id', ignoreDuplicates: false })
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ Payment upsert error:', error);
      throw error;
    }

    if (paymentRecord.wix_order_id) {
      await supabase
        .from('orders')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('wix_order_id', paymentRecord.wix_order_id);
    }

    if (paymentRecord.wix_order_id || paymentRecord.wix_booking_id) {
      const update = {
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
        wix_payment_id: paymentRecord.wix_payment_id
      };
      const query = supabase.from('salon_appointments').update(update);
      if (paymentRecord.wix_order_id && paymentRecord.wix_booking_id) {
        query.or(`wix_order_id.eq.${paymentRecord.wix_order_id},wix_booking_id.eq.${paymentRecord.wix_booking_id}`);
      } else if (paymentRecord.wix_order_id) {
        query.eq('wix_order_id', paymentRecord.wix_order_id);
      } else if (paymentRecord.wix_booking_id) {
        query.eq('wix_booking_id', paymentRecord.wix_booking_id);
      }
      await query;
    }

    console.log('✅ Payment event processed:', paymentRow?.id);

    return {
      type: 'payment_event',
      payment_id: paymentRow?.id,
      wix_payment_id: paymentRecord.wix_payment_id
    };
  } catch (error) {
    console.error('❌ Payment event processing failed:', error);
    throw error;
  }
}

// === BOOKING PROCESSING (NEW FORMAT) ===
async function processBookingEventNewFormat(webhookData) {
  console.log('📅 Processing booking event (new format)...');
  
  if (webhookData.slug === 'created') {
    return await processBookingCreated(webhookData);
  } else if (webhookData.slug === 'updated') {
    return await processBookingUpdated(webhookData);
  } else if (webhookData.slug === 'canceled') {
    return await processBookingCanceled(webhookData);
  } else {
    return await logUnknownEvent('booking.' + webhookData.slug, webhookData);
  }
}

// === BOOKING PROCESSING (JWT FORMAT) ===
async function processBookingEventJWT(event, eventData) {
  console.log('📅 Processing booking event (JWT format)...');
  
  if (event.slug === 'created') {
    return await processBookingCreated({ createdEvent: { entity: eventData || event } });
  } else if (event.slug === 'updated') {
    return await processBookingUpdated({ updatedEvent: { entity: eventData || event } });
  } else if (event.slug === 'canceled') {
    return await processBookingCanceled({ deletedEvent: { entity: eventData || event } });
  } else {
    return await logUnknownEvent('booking.' + event.slug, event);
  }
}

// === BOOKING FUNCTIONS (FIXED WITH UPSERTS) ===

// Process booking created (FIXED: Use UPSERT instead of INSERT)
async function processBookingCreated(webhookData) {
  try {
    console.log('📅 Processing booking created');
    
    const booking = webhookData.createdEvent?.entity || webhookData;
    const contactDetails = booking.contactDetails;
    const bookedEntity = booking.bookedEntity;
    const slot = bookedEntity?.slot || booking; // Handle different structures
    
    console.log('Booking ID:', booking.id);
    console.log('Customer:', contactDetails?.firstName, contactDetails?.lastName);
    console.log('Service:', bookedEntity?.title || bookedEntity?.name);
    
    // Calculate service duration
    let durationMinutes = 60; // default
    if (booking.startDate && booking.endDate) {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      durationMinutes = Math.round((endDate - startDate) / (1000 * 60));
    } else if (slot?.startDate && slot?.endDate) {
      const startDate = new Date(slot.startDate);
      const endDate = new Date(slot.endDate);
      durationMinutes = Math.round((endDate - startDate) / (1000 * 60));
    }
    
    // Map to your bookings table structure
    const bookingRecord = {
      wix_booking_id: booking.id,
      
      // Customer information
      customer_email: contactDetails?.email,
      customer_name: contactDetails ? `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim() : 'Unknown Customer',
      customer_phone: contactDetails?.phone,
      wix_contact_id: contactDetails?.contactId || contactDetails?.id,
      
      // Service information
      service_name: bookedEntity?.title || bookedEntity?.name || 'Unknown Service',
      service_duration: durationMinutes,
      
      // Timing
      appointment_date: booking.startDate || slot?.startDate || new Date().toISOString(),
      end_time: booking.endDate || slot?.endDate,
      
      // Staff and location
      staff_member: slot?.resource?.name || booking.resource?.name,
      location: slot?.location?.name || booking.location?.name || 'Keeping It Cute Salon & Spa',
      
      // Booking details
      number_of_participants: booking.numberOfParticipants || booking.totalParticipants || 1,
      payment_status: (booking.paymentStatus || 'UNDEFINED').toLowerCase(),
      
      // Pricing (not in this webhook, set to 0 for now)
      total_price: 0,
      
      // System fields
      business_id: null,
      cancelled_date: null,
      revision: parseInt(booking.revision) || 1,
      status: booking.status || 'confirmed',
      
      // Raw data storage
      payload: booking,
      raw_data: webhookData,
      
      // Timestamps
      created_at: new Date().toISOString(),
      created_date: booking.createdDate,
      updated_at: new Date().toISOString(),
      updated_date: booking.updatedDate
    };
    
    // Remove undefined values
    Object.keys(bookingRecord).forEach(key => {
      if (bookingRecord[key] === undefined) {
        delete bookingRecord[key];
      }
    });
    
    console.log('📝 Final booking record keys:', Object.keys(bookingRecord));
    
    // FIXED: Use UPSERT instead of INSERT to handle duplicates
    const { data: upsertedBooking, error: upsertError } = await supabase
      .from('bookings')
      .upsert(bookingRecord, { onConflict: 'wix_booking_id', ignoreDuplicates: false })
      .select()
      .maybeSingle();
    
    if (upsertError) {
      console.error('❌ Booking upsert error:', upsertError);
      throw upsertError;
    }

    if (!upsertedBooking) {
      throw new Error('Booking upsert failed');
    }

    console.log('✅ Booking created/updated successfully:', upsertedBooking.id);
    
    // Product usage tracking
    await checkForProductUsagePrompt(upsertedBooking.id, upsertedBooking.customer_email);
    
    return {
      type: 'booking_created',
      booking_id: upsertedBooking.id,
      wix_booking_id: upsertedBooking.wix_booking_id,
      customer_email: upsertedBooking.customer_email,
      customer_name: upsertedBooking.customer_name,
      service_name: upsertedBooking.service_name,
      appointment_date: upsertedBooking.appointment_date,
      staff_member: upsertedBooking.staff_member
    };

  } catch (error) {
    console.error('❌ Booking creation failed:', error);
    throw error;
  }
}

// Process booking updated (unchanged)
async function processBookingUpdated(webhookData) {
  try {
    console.log('🔄 Processing booking updated');
    
    const booking =
      webhookData.updatedEvent?.currentEntity ||
      webhookData.updatedEvent?.entity ||
      webhookData.createdEvent?.entity ||
      webhookData;
    
    const updateData = {
      customer_email: booking.contactDetails?.email,
      customer_name: booking.contactDetails ? 
        `${booking.contactDetails.firstName || ''} ${booking.contactDetails.lastName || ''}`.trim() : 
        undefined,
      customer_phone: booking.contactDetails?.phone,
      service_name: booking.bookedEntity?.title || booking.bookedEntity?.name,
      appointment_date: booking.startDate || booking.bookedEntity?.slot?.startDate,
      end_time: booking.endDate || booking.bookedEntity?.slot?.endDate,
      staff_member: booking.bookedEntity?.slot?.resource?.name || booking.resource?.name,
      payment_status: booking.paymentStatus?.toLowerCase(),
      number_of_participants: booking.numberOfParticipants || booking.totalParticipants,
      status: booking.status,
      updated_at: new Date().toISOString(),
      updated_date: booking.updatedDate,
      revision: parseInt(booking.revision) || 1
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('wix_booking_id', booking.id)
      .select()
      .maybeSingle();
    
    if (updateError) {
      console.error('❌ Booking update error:', updateError);
      throw updateError;
    }

    if (!updatedBooking) {
      throw new Error('Booking not found');
    }

    console.log('✅ Booking updated:', updatedBooking.id);
    
    return {
      type: 'booking_updated',
      booking_id: updatedBooking.id,
      wix_booking_id: updatedBooking.wix_booking_id
    };
    
  } catch (error) {
    console.error('❌ Booking update failed:', error);
    throw error;
  }
}

// Process booking canceled (unchanged)
async function processBookingCanceled(webhookData) {
  try {
    console.log('❌ Processing booking canceled');
    
    const booking = webhookData.deletedEvent?.entity || webhookData.createdEvent?.entity || webhookData;
    
    const { data: canceledBooking, error: cancelError } = await supabase
      .from('bookings')
      .update({
        cancelled_date: new Date().toISOString(),
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('wix_booking_id', booking.id)
      .select()
      .maybeSingle();
    
    if (cancelError) {
      console.error('❌ Booking cancellation error:', cancelError);
      throw cancelError;
    }

    if (!canceledBooking) {
      throw new Error('Booking not found');
    }

    console.log('✅ Booking canceled:', canceledBooking.id);
    
    return {
      type: 'booking_canceled',
      booking_id: canceledBooking.id,
      wix_booking_id: canceledBooking.wix_booking_id
    };
    
  } catch (error) {
    console.error('❌ Booking cancellation failed:', error);
    throw error;
  }
}

// === UTILITY FUNCTIONS ===

// Log unknown events
async function logUnknownEvent(eventType, eventData) {
  try {
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'unknown_webhook_event',
        webhook_status: 'logged',
        data: {
          event_type: eventType,
          event_data: eventData,
          processed_at: new Date().toISOString()
        }
      });
    
    console.log('📊 Unknown event logged:', eventType);
    
    return { type: 'unknown', eventType, logged: true };
  } catch (error) {
    console.error('❌ Failed to log unknown event:', error);
    return { type: 'unknown', eventType, logged: false };
  }
}

// Log failed webhooks
async function logFailedWebhook(error, rawBody) {
  try {
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'webhook_processing_failed',
        webhook_status: 'failed',
        error_message: error.message,
        data: {
          error_message: error.message,
          error_stack: error.stack,
          raw_body_preview: typeof rawBody === 'string' ? rawBody.substring(0, 1000) : JSON.stringify(rawBody).substring(0, 1000),
          processed_at: new Date().toISOString()
        }
      });
  } catch (logError) {
    console.error('❌ Failed to log webhook error:', logError);
  }
}
