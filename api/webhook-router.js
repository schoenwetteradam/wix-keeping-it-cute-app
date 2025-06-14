// api/webhook-router.js - UPDATED for actual Wix webhook format
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Wix Public Key for JWT verification
const WIX_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp1t69dN5qbUAS00eazDF
MiI1Ek4Ehp78OyZxOkrFCmo8HQYJ1G9ZJOtKNF/zL+TTyAdlbNfvlBpcKVfLDc9U
ZWLnBb1HIVrXDTR68nn/xi9NNLZF6xd5M10sGqDgrLM/6STZlpBA4yafcjet3BPS
HvGQo36RHMxgvmVTkZo/TysaUAlvV4kzuezHvpw7alKQl/TwctVNTpCIVlpBjJN2
2qrhdGPk8kFwdgn1n9XwskzWP+fTiy542NGo/0d1fYOZSFSlwybh7ygi9BtFHfmt
oYciq9XsE/4PlRsA7kdl1aXlL6ZpwW3pti02ewIDAQAB
-----END PUBLIC KEY-----`;

export default async function handler(req, res) {
  console.log('🎯 === WIX WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body type:', typeof req.body);
  console.log('Body preview:', JSON.stringify(req.body).substring(0, 500));
  
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

    // Handle the webhook payload directly (it's already parsed JSON)
    const webhookData = req.body;
    
    // Check if this is a test webhook (simple object without JWT structure)
    if (webhookData && typeof webhookData === 'object' && !webhookData.entityFqdn) {
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

    // Handle actual Wix webhook (new format based on your examples)
    if (webhookData.entityFqdn && webhookData.slug) {
      console.log('📋 Wix webhook detected');
      console.log('Entity FQDN:', webhookData.entityFqdn);
      console.log('Slug:', webhookData.slug);
      
      let result;
      
      // Process based on entity and slug
      if (webhookData.entityFqdn === 'wix.bookings.v2.booking' && webhookData.slug === 'created') {
        console.log('📅 Processing booking created...');
        result = await processBookingCreated(webhookData);
      } else if (webhookData.entityFqdn === 'wix.bookings.v2.booking' && webhookData.slug === 'updated') {
        console.log('🔄 Processing booking updated...');
        result = await processBookingUpdated(webhookData);
      } else if (webhookData.entityFqdn === 'wix.bookings.v2.booking' && webhookData.slug === 'canceled') {
        console.log('❌ Processing booking canceled...');
        result = await processBookingCanceled(webhookData);
      } else {
        console.log('❓ Unknown webhook type:', webhookData.entityFqdn, webhookData.slug);
        result = await logUnknownEvent(webhookData.entityFqdn + '.' + webhookData.slug, webhookData);
      }

      // Log successful webhook
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

      console.log('✅ === WEBHOOK PROCESSED SUCCESSFULLY ===');
      return res.status(200).json({
        success: true,
        eventType: webhookData.entityFqdn + '.' + webhookData.slug,
        result: result,
        timestamp: new Date().toISOString()
      });
    }

    // If we get here, try the old JWT format
    const jwtToken = req.body;
    if (typeof jwtToken === 'string') {
      console.log('🔐 JWT Token detected, processing...');
      
      const rawPayload = jwt.verify(jwtToken, WIX_PUBLIC_KEY);
      const event = JSON.parse(rawPayload.data);
      const eventData = JSON.parse(event.data);
      
      // Process JWT webhook (old format)
      let result = await processOldFormatWebhook(event, eventData);
      
      console.log('✅ === JWT WEBHOOK PROCESSED ===');
      return res.status(200).json({
        success: true,
        eventType: event.eventType,
        result: result,
        timestamp: new Date().toISOString()
      });
    }

    throw new Error('Unknown webhook format');

  } catch (error) {
    console.error('❌ === WEBHOOK PROCESSING FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Log the failed webhook
    await logFailedWebhook(error, req.body);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Process booking created (new format)
async function processBookingCreated(webhookData) {
  try {
    console.log('📅 Processing booking created with new format');
    
    const booking = webhookData.createdEvent.entity;
    const contactDetails = booking.contactDetails;
    const bookedEntity = booking.bookedEntity;
    const slot = bookedEntity.slot;
    
    console.log('Booking ID:', booking.id);
    console.log('Customer:', contactDetails.firstName, contactDetails.lastName);
    console.log('Service:', bookedEntity.title);
    
    // Calculate service duration
    const startDate = new Date(slot.startDate);
    const endDate = new Date(slot.endDate);
    const durationMinutes = Math.round((endDate - startDate) / (1000 * 60));
    
    // Map to your bookings table structure
    const bookingRecord = {
      wix_booking_id: booking.id,
      
      // Customer information
      customer_email: contactDetails.email,
      customer_name: `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim(),
      customer_phone: contactDetails.phone,
      wix_contact_id: contactDetails.contactId,
      
      // Service information
      service_name: bookedEntity.title,
      service_duration: durationMinutes,
      
      // Timing (use the startDate and endDate from slot)
      appointment_date: startDate.toISOString(),
      end_time: endDate.toISOString(),
      
      // Staff and location
      staff_member: slot.resource?.name,
      location: slot.location?.name || 'Keeping It Cute Salon & Spa',
      
      // Booking details
      number_of_participants: booking.numberOfParticipants || 1,
      payment_status: (booking.paymentStatus || 'UNDEFINED').toLowerCase(),
      
      // Pricing (not in this webhook, set to 0 for now)
      total_price: 0,
      
      // System fields
      business_id: null,
      cancelled_date: null,
      revision: parseInt(booking.revision) || 1,
      
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
    
    console.log('📝 Final booking record:', JSON.stringify(bookingRecord, null, 2));
    
    // Insert into bookings table
    const { data: insertedBooking, error: insertError } = await supabase
      .from('bookings')
      .insert([bookingRecord])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Booking insert error:', insertError);
      throw insertError;
    }
    
    console.log('✅ Booking created successfully:', insertedBooking.id);
    
    return {
      type: 'booking_created',
      booking_id: insertedBooking.id,
      wix_booking_id: insertedBooking.wix_booking_id,
      customer_email: insertedBooking.customer_email,
      customer_name: insertedBooking.customer_name,
      service_name: insertedBooking.service_name,
      appointment_date: insertedBooking.appointment_date,
      staff_member: insertedBooking.staff_member
    };

  } catch (error) {
    console.error('❌ Booking creation failed:', error);
    throw error;
  }
}

// Process booking updated
async function processBookingUpdated(webhookData) {
  try {
    console.log('🔄 Processing booking updated');
    
    const booking = webhookData.updatedEvent?.entity || webhookData.createdEvent?.entity;
    
    const updateData = {
      customer_email: booking.contactDetails?.email,
      customer_name: booking.contactDetails ? 
        `${booking.contactDetails.firstName || ''} ${booking.contactDetails.lastName || ''}`.trim() : 
        undefined,
      customer_phone: booking.contactDetails?.phone,
      service_name: booking.bookedEntity?.title,
      appointment_date: booking.bookedEntity?.slot?.startDate,
      end_time: booking.bookedEntity?.slot?.endDate,
      staff_member: booking.bookedEntity?.slot?.resource?.name,
      payment_status: booking.paymentStatus?.toLowerCase(),
      number_of_participants: booking.numberOfParticipants,
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
      .single();
    
    if (updateError) {
      console.error('❌ Booking update error:', updateError);
      throw updateError;
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

// Process booking canceled
async function processBookingCanceled(webhookData) {
  try {
    console.log('❌ Processing booking canceled');
    
    const booking = webhookData.deletedEvent?.entity || webhookData.createdEvent?.entity;
    
    const { data: canceledBooking, error: cancelError } = await supabase
      .from('bookings')
      .update({
        cancelled_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        revision: supabase.raw('revision + 1')
      })
      .eq('wix_booking_id', booking.id)
      .select()
      .single();
    
    if (cancelError) {
      console.error('❌ Booking cancellation error:', cancelError);
      throw cancelError;
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

// Handle old JWT format (fallback)
async function processOldFormatWebhook(event, eventData) {
  console.log('📊 Processing old format webhook');
  // Your existing JWT processing logic here
  return { type: 'old_format', eventType: event.eventType };
}

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
