// pages/api/webhook-router.js - CORRECTED VERSION
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
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract the JWT token from request body
    const jwtToken = req.body;
    console.log('🔐 JWT Token received (length):', jwtToken?.length || 'undefined');
    
    if (!jwtToken || typeof jwtToken !== 'string') {
      throw new Error('Invalid JWT token in request body');
    }

    // Verify and decode the JWT token
    console.log('🔍 Verifying JWT with Wix public key...');
    const rawPayload = jwt.verify(jwtToken, WIX_PUBLIC_KEY);
    console.log('✅ JWT verified successfully');
    
    // Parse the nested data structure
    const event = JSON.parse(rawPayload.data);
    console.log('📋 Event type:', event.eventType);
    console.log('📋 Instance ID:', event.instanceId);
    
    const eventData = JSON.parse(event.data);
    console.log('📋 Event data keys:', Object.keys(eventData));

    // Process based on event type
    let result;
    switch (event.eventType) {
      case 'wix.bookings.v2.booking_created':
        console.log('📅 Processing booking created...');
        result = await processBookingCreated(eventData, event);
        break;
        
      case 'wix.bookings.v2.booking_updated':
        console.log('🔄 Processing booking updated...');
        result = await processBookingUpdated(eventData, event);
        break;
        
      case 'wix.contacts.v4.contact_created':
        console.log('👤 Processing contact created...');
        result = await processContactCreated(eventData, event);
        break;
        
      case 'wix.contacts.v4.contact_updated':
        console.log('📝 Processing contact updated...');
        result = await processContactUpdated(eventData, event);
        break;
        
      case 'wix.ecom.v1.order_paid':
        console.log('💰 Processing order paid...');
        result = await processOrderPaid(eventData, event);
        break;
        
      default:
        console.log('❓ Unknown event type:', event.eventType);
        result = await logUnknownEvent(event.eventType, eventData);
    }

    console.log('✅ === WEBHOOK PROCESSED SUCCESSFULLY ===');
    res.status(200).json({
      success: true,
      eventType: event.eventType,
      result: result,
      timestamp: new Date().toISOString()
    });

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

// Process booking created event
async function processBookingCreated(eventData, event) {
  try {
    console.log('📅 Full booking data:', JSON.stringify(eventData, null, 2));
    
    // Extract booking information - Wix v2 structure
    const booking = eventData.booking || eventData;
    
    // Step 1: Extract and process customer information
    let customer = null;
    const contactDetails = booking.contactDetails || {};
    
    if (contactDetails.contactId || contactDetails.email) {
      const customerData = {
        email: contactDetails.email || `customer-${Date.now()}@salon.com`,
        first_name: contactDetails.firstName || 'Customer',
        last_name: contactDetails.lastName || 'Unknown',
        phone: contactDetails.phone,
        business_type: 'salon'
      };
      
      console.log('👤 Upserting customer:', customerData);
      
      const { data: customerResult, error: customerError } = await supabase
        .from('customers')
        .upsert(customerData, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (customerError) {
        console.error('❌ Customer upsert error:', customerError);
      } else {
        customer = customerResult;
        console.log('✅ Customer processed:', customer.id);
      }
    }

    // Step 2: Process service information
    let service = null;
    const bookedService = booking.bookedEntity;
    
    if (bookedService && bookedService.title) {
      // Try to find existing service or create new one
      const serviceData = {
        name: bookedService.title,
        duration_minutes: bookedService.duration || 60,
        price: booking.totalPrice || 0,
        category: 'General',
        is_active: true
      };
      
      console.log('✨ Upserting service:', serviceData);
      
      const { data: serviceResult, error: serviceError } = await supabase
        .from('salon_services')
        .upsert(serviceData, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (serviceError) {
        console.error('❌ Service upsert error:', serviceError);
      } else {
        service = serviceResult;
        console.log('✅ Service processed:', service.id);
      }
    }

    // Step 3: Create the appointment (FIXED LINE)
    const appointmentData = {
      customer_id: customer?.id,
      service_id: service?.id,
      wix_booking_id: booking.id,
      appointment_date: booking.startDate || booking.slot?.startDate,
      duration_minutes: parseInt(booking.duration) || service?.duration_minutes || 60,
      status: (booking.status || 'CONFIRMED').toLowerCase(),
      payment_status: (booking.paymentStatus || 'NOT_PAID').toLowerCase(),
      total_amount: parseFloat(booking.totalPrice || 0),
      notes: extractBookingNotes(booking),
      created_at: new Date().toISOString()
    };
    
    console.log('📅 Creating appointment:', appointmentData);
    
    const { data: appointment, error: appointmentError } = await supabase
      .from('salon_appointments')
      .insert([appointmentData])
      .select(`
        *,
        customers(*),
        salon_services(*)
      `)
      .single();
    
    if (appointmentError) {
      console.error('❌ Appointment creation error:', appointmentError);
      throw appointmentError;
    }
    
    console.log('✅ Appointment created:', appointment.id);

    // Log success metric
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'webhook_booking_created_success',
        metric_data: {
          success: true,
          appointment_id: appointment.id,
          customer_id: customer?.id,
          service_id: service?.id,
          wix_booking_id: booking.id,
          event_instance_id: event.instanceId,
          processed_at: new Date().toISOString()
        }
      });

    return {
      type: 'booking_created',
      appointment: appointment,
      customer: customer,
      service: service
    };

  } catch (error) {
    console.error('❌ Booking creation failed:', error);
    throw error;
  }
}

// Process contact created event  
async function processContactCreated(eventData, event) {
  try {
    console.log('👤 Full contact data:', JSON.stringify(eventData, null, 2));
    
    const contact = eventData.contact || eventData;
    
    const contactData = {
      email: contact.info?.emails?.items?.[0]?.email || contact.loginEmail,
      first_name: contact.info?.name?.first,
      last_name: contact.info?.name?.last,
      phone: contact.info?.phones?.items?.[0]?.phone,
      business_type: 'salon'
    };
    
    if (!contactData.email) {
      console.log('⚠️ No email found in contact, skipping...');
      return { type: 'contact_created', skipped: true, reason: 'no_email' };
    }
    
    console.log('👤 Creating contact:', contactData);
    
    const { data: result, error } = await supabase
      .from('customers')
      .upsert(contactData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Contact creation error:', error);
      throw error;
    }
    
    console.log('✅ Contact created:', result.id);
    
    return {
      type: 'contact_created',
      customer: result
    };

  } catch (error) {
    console.error('❌ Contact creation failed:', error);
    throw error;
  }
}

// Process booking updated event
async function processBookingUpdated(eventData, event) {
  try {
    console.log('🔄 Processing booking update...');
    
    const booking = eventData.booking || eventData;
    
    // Find existing appointment
    const { data: existingAppointment, error: findError } = await supabase
      .from('salon_appointments')
      .select('*')
      .eq('wix_booking_id', booking.id)
      .single();
    
    if (findError || !existingAppointment) {
      console.log('⚠️ Appointment not found, creating new one...');
      return await processBookingCreated(eventData, event);
    }
    
    // Update existing appointment
    const updateData = {
      appointment_date: booking.startDate || booking.slot?.startDate,
      duration_minutes: parseInt(booking.duration) || existingAppointment.duration_minutes,
      status: (booking.status || 'CONFIRMED').toLowerCase(),
      payment_status: (booking.paymentStatus || 'NOT_PAID').toLowerCase(),
      total_amount: parseFloat(booking.totalPrice || existingAppointment.total_amount),
      notes: extractBookingNotes(booking),
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('salon_appointments')
      .update(updateData)
      .eq('wix_booking_id', booking.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Appointment update error:', updateError);
      throw updateError;
    }
    
    console.log('✅ Appointment updated:', updatedAppointment.id);
    
    return {
      type: 'booking_updated',
      appointment: updatedAppointment
    };
    
  } catch (error) {
    console.error('❌ Booking update failed:', error);
    throw error;
  }
}

// Process contact updated event
async function processContactUpdated(eventData, event) {
  try {
    console.log('📝 Processing contact update...');
    
    const contact = eventData.contact || eventData;
    const email = contact.info?.emails?.items?.[0]?.email || contact.loginEmail;
    
    if (!email) {
      console.log('⚠️ No email found in contact update, skipping...');
      return { type: 'contact_updated', skipped: true, reason: 'no_email' };
    }
    
    const updateData = {
      first_name: contact.info?.name?.first,
      last_name: contact.info?.name?.last,
      phone: contact.info?.phones?.items?.[0]?.phone,
      updated_at: new Date().toISOString()
    };
    
    const { data: result, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('email', email)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Contact update error:', error);
      // If contact doesn't exist, create it
      return await processContactCreated(eventData, event);
    }
    
    console.log('✅ Contact updated:', result.id);
    
    return {
      type: 'contact_updated',
      customer: result
    };
    
  } catch (error) {
    console.error('❌ Contact update failed:', error);
    throw error;
  }
}

// Process order paid event
async function processOrderPaid(eventData, event) {
  try {
    console.log('💰 Processing order payment...');
    
    const order = eventData.order || eventData;
    
    // Try to find associated appointment by order ID
    const { data: appointment, error: findError } = await supabase
      .from('salon_appointments')
      .select('*')
      .eq('wix_order_id', order.id)
      .single();
    
    if (findError || !appointment) {
      console.log('⚠️ No associated appointment found for order:', order.id);
      return { type: 'order_paid', skipped: true, reason: 'no_appointment' };
    }
    
    // Update appointment payment status
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('salon_appointments')
      .update({
        payment_status: 'paid',
        payment_amount: parseFloat(order.totals?.total || order.pricing?.total || 0),
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Payment update error:', updateError);
      throw updateError;
    }
    
    console.log('✅ Payment processed for appointment:', updatedAppointment.id);
    
    return {
      type: 'order_paid',
      appointment: updatedAppointment,
      order: order
    };
    
  } catch (error) {
    console.error('❌ Order payment processing failed:', error);
    throw error;
  }
}

// Log unknown events
async function logUnknownEvent(eventType, eventData) {
  try {
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'webhook_unknown_event',
        metric_data: {
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
      .from('system_metrics')
      .insert({
        metric_type: 'webhook_processing_failed',
        metric_data: {
          success: false,
          error_message: error.message,
          error_stack: error.stack,
          raw_body: typeof rawBody === 'string' ? rawBody.substring(0, 1000) : rawBody,
          processed_at: new Date().toISOString()
        }
      });
  } catch (logError) {
    console.error('❌ Failed to log webhook error:', logError);
  }
}

// Helper function to extract notes from booking
function extractBookingNotes(booking) {
  let notes = [];
  
  if (booking.formInfo?.additionalFields) {
    booking.formInfo.additionalFields.forEach(field => {
      if (field.value) {
        notes.push(`${field.label || 'Note'}: ${field.value}`);
      }
    });
  }
  
  if (booking.notes) {
    notes.push(booking.notes);
  }
  
  return notes.length > 0 ? notes.join(' | ') : null;
}
