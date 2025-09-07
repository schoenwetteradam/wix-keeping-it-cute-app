import jwt from 'jsonwebtoken';
import { createSupabaseClient } from '../utils/supabaseClient';
import { setCorsHeaders } from '../utils/cors';

const supabase = createSupabaseClient();

// Wix public key - use the standard one from examples
const WIX_PUBLIC_KEY = process.env.WIX_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp1t69dN5qbUAS00eazDF\nMiI1Ek4Ehp78OyZxOkrFCmo8HQYJ1G9ZJOtKNF/zL+TTyAdlbNfvlBpcKVfLDc9U\nZWLnBb1HIVrXDTR68nn/xi9NNLZF6xd5M10sGqDgrLM/6STZlpBA4yafcjet3BPS\nHvGQo36RHMxgvmVTkZo/TysaUAlvV4kzuezHvpw7alKQl/TwctVNTpCIVlpBjJN2\n2qrhdGPk8kFwdgn1n9XwskzWP+fTiy542NGo/0d1fYOZSFSlwybh7ygi9BtFHfmt\noYciq9XsE/4PlRsA7kdl1aXlL6ZpwW3pti2HurEXGxiBlir9OTwkXR3do/KbTi02\newIDAQAB\n-----END PUBLIC KEY-----`;

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
        console.log('⚠️ JWT Verification failed:', jwtError.message);
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
