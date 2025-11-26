import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createSupabaseClient } from '../utils/supabaseClient';
import { setWebhookCorsHeaders } from '../utils/cors';

const supabase = createSupabaseClient();

// Log failed webhooks so they can be inspected later
async function logFailedWebhook(error, payload) {
  try {
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'webhook_failure',
        webhook_status: 'failed',
        data: {
          error: error.message,
          payload,
          timestamp: new Date().toISOString()
        }
      });
  } catch (logError) {
    console.error('Failed to log webhook error:', logError.message);
  }
}

// Basic contact handling
async function processContactEvent(webhookData) {
  const contact =
    webhookData.updatedEvent?.currentEntity ||
    webhookData.createdEvent?.entity ||
    webhookData;

  const record = {
    wix_contact_id: contact.id,
    email: contact.info?.emails?.items?.[0]?.email || contact.email,
    first_name: contact.info?.name?.first || contact.firstName,
    last_name: contact.info?.name?.last || contact.lastName
  };

  await supabase.from('contacts').upsert(record, {
    onConflict: 'email',
    ignoreDuplicates: false
  });

  return { type: 'contact_event', contact_id: record.wix_contact_id };
}

async function processContactEventJWT(event, eventData) {
  const contact = eventData?.event?.data?.contact || eventData;
  return processContactEvent(contact || {});
}

// Loyalty handling
async function processLoyaltyEvent(webhookData) {
  const loyalty =
    webhookData.updatedEvent?.currentEntity ||
    webhookData.createdEvent?.entity ||
    webhookData;

  const record = {
    loyalty_id: loyalty.id,
    contact_id: loyalty.contactId || loyalty.contact_id,
    points_balance: loyalty.pointsBalance || loyalty.points_balance || loyalty.points?.balance,
    redeemed_points: loyalty.points?.redeemed,
    tier: loyalty.tier?.name || loyalty.tier
  };

  await supabase.from('loyalty').upsert(record, {
    onConflict: 'loyalty_id',
    ignoreDuplicates: false
  });

  return { type: 'loyalty_event', loyalty_id: record.loyalty_id };
}

async function processLoyaltyEventJWT(event, eventData) {
  const loyalty = eventData?.event?.data?.loyalty || eventData;
  return processLoyaltyEvent(loyalty || {});
}

// Booking handling (new format)
async function processBookingEventNewFormat(webhookData) {
  const booking =
    webhookData.updatedEvent?.currentEntity ||
    webhookData.createdEvent?.entity ||
    webhookData;

  const update = {
    status: booking.status,
    customer_email: booking.contactDetails?.email,
    customer_name: `${booking.contactDetails?.firstName || ''} ${booking.contactDetails?.lastName || ''}`.trim()
  };

  await supabase
    .from('bookings')
    .update(update)
    .eq('wix_booking_id', booking.id || booking.bookingId);

  return { type: 'booking_event', booking_id: booking.id || booking.bookingId };
}

async function processBookingEventJWT(event, eventData) {
  const booking = eventData?.event?.data?.booking || eventData;
  return processBookingEventNewFormat(booking || {});
}

// Wix public key - MUST be set in production environment
const WIX_PUBLIC_KEY = process.env.WIX_PUBLIC_KEY;
const WIX_WEBHOOK_SECRET = process.env.WIX_WEBHOOK_SECRET;

// Strict mode: In production, reject unverified webhooks
const STRICT_VERIFICATION = process.env.NODE_ENV === 'production';

// Validate webhook signature using HMAC-SHA256
function verifyWebhookSignature(payload, signature) {
  if (!WIX_WEBHOOK_SECRET) {
    console.warn('⚠️ WIX_WEBHOOK_SECRET not configured - signature verification skipped');
    return !STRICT_VERIFICATION; // Allow in dev, reject in prod
  }

  if (!signature) {
    console.warn('⚠️ No signature provided in webhook request');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', WIX_WEBHOOK_SECRET)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEquals(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('❌ Signature verification error:', error.message);
    return false;
  }
}

// === ALL MISSING EVENT HANDLERS ===

// Product Events
async function processProductEvent(webhookData) {
  try {
    console.log('🛍️ Processing product event:', webhookData.slug);
    
    const product = webhookData.updatedEvent?.currentEntity || 
                   webhookData.createdEvent?.entity || 
                   webhookData;
    
    if (!product) {
      throw new Error('No product data found');
    }
    
    // Log the product event for now - you can expand this later
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'product_event',
        webhook_status: 'logged',
        wix_id: product.id,
        data: {
          slug: webhookData.slug,
          product_name: product.name,
          product_id: product.id,
          processed_at: new Date().toISOString()
        }
      });
    
    return {
      type: 'product_event',
      slug: webhookData.slug,
      product_id: product.id,
      product_name: product.name
    };
    
  } catch (error) {
    console.error('❌ Product event processing failed:', error);
    throw error;
  }
}

// Order events
async function processOrderEvent(webhookData) {
  const order =
    webhookData.updatedEvent?.currentEntity ||
    webhookData.createdEvent?.entity ||
    webhookData;

  await supabase.from('orders').upsert({
    wix_order_id: order?.id,
    payment_status: webhookData.actionEvent?.body?.order?.paymentStatus || order?.paymentStatus || order?.payment_status,
    previous_payment_status: webhookData.actionEvent?.body?.previousPaymentStatus || order?.previousPaymentStatus || order?.previous_payment_status,
    customer_email: order?.buyerInfo?.email,
    total_price: order?.priceSummary?.subtotal?.amount || order?.totals?.subtotal
  }, {
    onConflict: 'wix_order_id',
    ignoreDuplicates: false
  });

  await supabase.from('webhook_logs').insert({
    event_type: 'wix.ecom.v1.order.' + (webhookData.slug || 'unknown'),
    webhook_status: 'logged',
    wix_id: order?.id,
    data: {
      order_preview: order,
      processed_at: new Date().toISOString()
    }
  });

  return {
    type: 'order_event',
    order_id: order?.id,
    slug: webhookData.slug,
    status: 'logged'
  };
}

async function processOrderEventJWT(event, eventData) {
  const order = eventData?.event?.data?.order || eventData || {};

  await supabase.from('orders').upsert({
    wix_order_id: order?.id || event?.entityId,
    payment_status: order?.paymentStatus || order?.payment_status,
    previous_payment_status: order?.previousPaymentStatus || order?.previous_payment_status,
    customer_email: order?.buyerInfo?.email,
    total_price: order?.priceSummary?.subtotal?.amount || order?.totals?.subtotal
  }, {
    onConflict: 'wix_order_id',
    ignoreDuplicates: false
  });

  await supabase.from('webhook_logs').insert({
    event_type: (event?.entityFqdn || 'wix.ecom.v1.order') + '.' + (event?.slug || 'unknown'),
    webhook_status: 'logged',
    wix_id: order?.id || event?.entityId,
    data: {
      order_preview: order,
      processed_at: new Date().toISOString()
    }
  });

  return {
    type: 'order_event_jwt',
    order_id: order?.id || event?.entityId,
    slug: event?.slug,
    status: 'logged'
  };
}

// Schedule Events
async function processScheduleEvent(webhookData) {
  try {
    console.log('📅 Processing schedule event:', webhookData.slug);
    
    const schedule = webhookData.createdEvent?.entity || 
                    webhookData.updatedEvent?.currentEntity || 
                    webhookData;
    
    if (!schedule) {
      throw new Error('No schedule data found');
    }
    
    // Log the schedule event
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'schedule_event',
        webhook_status: 'logged',
        wix_id: schedule.id,
        data: {
          slug: webhookData.slug,
          schedule_id: schedule.id,
          processed_at: new Date().toISOString()
        }
      });
    
    return {
      type: 'schedule_event',
      slug: webhookData.slug,
      schedule_id: schedule.id
    };
    
  } catch (error) {
    console.error('❌ Schedule event processing failed:', error);
    throw error;
  }
}

// Participation Events
async function processParticipationEvent(webhookData) {
  try {
    console.log('👥 Processing participation event:', webhookData.slug);
    
    const participation = webhookData.updatedEvent?.currentEntity || 
                         webhookData.createdEvent?.entity || 
                         webhookData;
    
    if (!participation) {
      throw new Error('No participation data found');
    }
    
    // Log the participation event
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'participation_event',
        webhook_status: 'logged',
        wix_id: participation.id,
        data: {
          slug: webhookData.slug,
          participation_id: participation.id,
          processed_at: new Date().toISOString()
        }
      });

    return {
      type: 'participation_event',
      slug: webhookData.slug,
      participation_id: participation.id
    };
  } catch (error) {
    console.error('❌ Participation event processing failed:', error);
    throw error;
  }
}

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

  // Set CORS headers for webhooks (allows all origins for Wix)
  setWebhookCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookData = req.body;
    const signature = req.headers['x-wix-webhook-signature'] || req.headers['x-wix-signature'];

    // Verify webhook signature for non-JWT payloads
    if (typeof webhookData === 'object' && !STRICT_VERIFICATION) {
      // In development, log but don't block
      if (!verifyWebhookSignature(req.body, signature)) {
        console.warn('⚠️ Webhook signature verification failed (dev mode - continuing)');
      }
    } else if (typeof webhookData === 'object' && STRICT_VERIFICATION) {
      // In production, verify signature for object payloads
      if (!verifyWebhookSignature(req.body, signature)) {
        console.error('❌ Webhook signature verification failed - rejecting');
        await logFailedWebhook(new Error('Signature verification failed'), req.body);
        return res.status(200).json({
          success: false,
          error: 'Signature verification failed',
          timestamp: new Date().toISOString()
        });
      }
      console.log('✅ Webhook signature verified');
    }

    // Log webhook attempt (sanitized - no sensitive data)
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'webhook_received',
        webhook_status: 'processing',
        data: {
          content_type: req.headers['content-type'],
          has_signature: !!signature,
          body_type: typeof webhookData,
          timestamp: new Date().toISOString()
        }
      });
    
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
        // Verify JWT with public key
        if (WIX_PUBLIC_KEY) {
          console.log('🔒 Attempting JWT verification...');
          rawPayload = jwt.verify(webhookData, WIX_PUBLIC_KEY, {
            algorithms: ['RS256']
          });
          console.log('✅ JWT verified successfully');
        } else if (STRICT_VERIFICATION) {
          // In production, reject if no public key configured
          throw new Error('WIX_PUBLIC_KEY not configured - cannot verify JWT webhooks');
        } else {
          // In development, decode without verification but log warning
          console.warn('⚠️ WIX_PUBLIC_KEY not configured - decoding JWT without verification (dev mode)');
          const decoded = jwt.decode(webhookData, { complete: true });
          if (!decoded || !decoded.payload) {
            throw new Error('Failed to decode JWT token');
          }
          rawPayload = decoded.payload;
        }

      } catch (jwtError) {
        console.error('❌ JWT Verification failed:', jwtError.message);

        if (STRICT_VERIFICATION) {
          // In production, reject unverified JWTs
          await logFailedWebhook(new Error(`JWT verification failed: ${jwtError.message}`), webhookData);
          return res.status(200).json({
            success: false,
            error: 'JWT verification failed',
            timestamp: new Date().toISOString()
          });
        }

        // In development, decode without verification but log warning
        console.warn('🔄 Decoding JWT without verification (dev mode)...');
        const decoded = jwt.decode(webhookData, { complete: true });
        if (!decoded || !decoded.payload) {
          throw new Error('Failed to decode JWT token');
        }
        rawPayload = decoded.payload;
        console.warn('⚠️ Processing unverified JWT - this would be rejected in production');
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
  
  // Enhanced routing for ALL your registered webhook types
  if (webhookData.entityFqdn === 'wix.contacts.v4.contact') {
    return await processContactEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.bookings.v2.booking') {
    return await processBookingEventNewFormat(webhookData);
  } else if (webhookData.entityFqdn === 'wix.ecom.v1.order') {
    return await processOrderEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.loyalty.v1.account') {
    return await processLoyaltyEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.stores.v1.product') {
    return await processProductEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.calendar.v1.schedule') {
    return await processScheduleEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.calendar.v1.participation') {
    return await processParticipationEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.events.v1.event') {
    return await processEventEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.bookings.v2.staff_member') {
    return await processStaffMemberEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.bookings.v2.resource') {
    return await processResourceEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.bookings.v2.category') {
    return await processCategoryEvent(webhookData);
  } else if (webhookData.entityFqdn === 'wix.ecom.v1.checkout') {
    return await processCheckoutEvent(webhookData);
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
  
  // Enhanced routing for JWT webhooks
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
  } else if (event?.eventType?.includes('com.wixpress.bookings.services.api.v1.ServiceNotification')) {
    return await processServiceEventJWT(event, eventData);
  } else if (event?.eventType?.includes('com.wixpress.bookings.resources.core.api.v1.resource.ResourceNotification')) {
    return await processResourceEventJWT(event, eventData);
  } else {
    return await logUnknownEvent(eventType, event);
  }
}
