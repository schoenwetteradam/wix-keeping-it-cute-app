// api/webhook-router.js - Updated with proper JWT decoding and data processing

import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Business ID for Keeping It Cute Salon & Spa
const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

// Main webhook handler
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📝 Webhook received - Method:', req.method);
    console.log('📝 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📝 Raw body type:', typeof req.body);
    console.log('📝 Raw body content:', req.body);

    // Ensure business exists
    await ensureBusinessExists();

    // Extract JWT token from request body
    let jwtToken;
    if (typeof req.body === 'string') {
      jwtToken = req.body;
    } else if (req.body && typeof req.body === 'object') {
      // If it's an object, convert to string or extract the token
      jwtToken = req.body.token || JSON.stringify(req.body);
    } else {
      throw new Error('Invalid webhook payload format');
    }

    console.log('🔐 JWT Token (first 100 chars):', jwtToken.substring(0, 100) + '...');

    // Decode JWT token (without verification for now)
    const decoded = jwt.decode(jwtToken);
    if (!decoded) {
      throw new Error('Failed to decode JWT token');
    }

    console.log('🔓 Decoded JWT payload:', JSON.stringify(decoded, null, 2));

    // Parse the nested JSON data structure
    const eventData = JSON.parse(decoded.data);
    console.log('📋 Event data:', JSON.stringify(eventData, null, 2));

    const webhookData = JSON.parse(eventData.data);
    console.log('📋 Webhook data structure:', Object.keys(webhookData));

    // Process based on event type
    let result;
    switch (eventData.eventType) {
      case 'wix.bookings.v2.booking_updated':
      case 'wix.bookings.v2.booking_created':
        console.log('🔄 Processing booking event...');
        result = await processBookingEvent(webhookData);
        break;
        
      case 'wix.contacts.v4.contact_created':
      case 'wix.contacts.v4.contact_updated':
        console.log('👤 Processing contact event...');
        result = await processContactEvent(webhookData);
        break;
        
      default:
        console.log('🤷 Unhandled event type:', eventData.eventType);
        result = { message: `Event type ${eventData.eventType} not processed` };
    }

    console.log('✅ Webhook processed successfully:', result);
    res.status(200).json({ 
      success: true, 
      eventType: eventData.eventType,
      result: result 
    });

  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Process booking events (created/updated)
async function processBookingEvent(webhookData) {
  try {
    // Extract booking data from the webhook structure
    const booking = webhookData.updatedEvent?.currentEntity || webhookData.currentEntity || webhookData;
    
    console.log('📅 Processing booking:', booking.id);
    console.log('📅 Booking details:', {
      id: booking.id,
      title: booking.bookedEntity?.title || booking.title,
      status: booking.status,
      contactId: booking.contactDetails?.contactId
    });

    // Process contact first if it exists
    let contactResult = null;
    if (booking.contactDetails) {
      contactResult = await upsertContact(booking.contactDetails);
    }

    // Process the booking
    const bookingResult = await upsertBooking(booking);

    // Try to link booking to contact if we have both
    if (contactResult && bookingResult && contactResult.length > 0 && bookingResult.length > 0) {
      await linkBookingToContact(bookingResult[0].id, contactResult[0].id);
    }

    return {
      contact: contactResult,
      booking: bookingResult,
      message: 'Booking processed successfully'
    };

  } catch (error) {
    console.error('❌ Booking processing failed:', error);
    throw error;
  }
}

// Process contact events (created/updated)
async function processContactEvent(webhookData) {
  try {
    const contact = webhookData.updatedEvent?.currentEntity || webhookData.currentEntity || webhookData;
    
    console.log('👤 Processing contact:', contact.id);
    
    const contactResult = await upsertContact(contact);
    
    return {
      contact: contactResult,
      message: 'Contact processed successfully'
    };

  } catch (error) {
    console.error('❌ Contact processing failed:', error);
    throw error;
  }
}

// Upsert contact data
async function upsertContact(contactData) {
  try {
    const transformedContact = {
      wix_contact_id: contactData.contactId || contactData.id,
      business_id: BUSINESS_ID,
      first_name: contactData.firstName || contactData.name?.first,
      last_name: contactData.lastName || contactData.name?.last,
      email: contactData.email || contactData.loginEmail,
      phone: contactData.phone || contactData.phones?.[0]?.phone,
      timezone: contactData.timeZone,
      address: contactData.addresses?.[0] ? {
        street: contactData.addresses[0].street,
        city: contactData.addresses[0].city,
        state: contactData.addresses[0].subdivision,
        postalCode: contactData.addresses[0].postalCode,
        country: contactData.addresses[0].country
      } : null,
      custom_fields: contactData.customFields || {},
      tags: contactData.labels || [],
      created_date: contactData.createdDate,
      updated_date: contactData.updatedDate,
      raw_data: contactData
    };

    console.log('👤 Upserting contact data:', transformedContact);

    const { data, error } = await supabase
      .from('contacts')
      .upsert(transformedContact, {
        onConflict: 'wix_contact_id',
        ignoreDuplicates: false
      })
      .select('*');

    if (error) {
      console.error('❌ Contact upsert error:', error);
      throw error;
    }

    console.log('✅ Contact upserted successfully:', data);
    return data;

  } catch (error) {
    console.error('❌ Contact upsert failed:', error);
    throw error;
  }
}

// Upsert booking data
async function upsertBooking(bookingData) {
  try {
    const transformedBooking = {
      wix_booking_id: bookingData.id,
      business_id: BUSINESS_ID,
      wix_contact_id: bookingData.contactDetails?.contactId,
      service_name: bookingData.bookedEntity?.title || bookingData.title,
      staff_member: bookingData.bookedEntity?.slot?.resource?.name,
      scheduled_at: bookingData.startDate || bookingData.bookedEntity?.slot?.startDate,
      end_time: bookingData.endDate || bookingData.bookedEntity?.slot?.endDate,
      duration_minutes: calculateDuration(
        bookingData.startDate || bookingData.bookedEntity?.slot?.startDate,
        bookingData.endDate || bookingData.bookedEntity?.slot?.endDate
      ),
      status: bookingData.status?.toLowerCase() || 'unknown',
      payment_status: bookingData.paymentStatus?.toLowerCase() || 'not_paid',
      payment_option: bookingData.selectedPaymentOption?.toLowerCase(),
      number_of_participants: bookingData.numberOfParticipants || bookingData.totalParticipants || 1,
      notes: extractNotes(bookingData.additionalFields),
      location: bookingData.bookedEntity?.slot?.location?.name || 'Keeping It Cute Salon & Spa',
      created_date: bookingData.createdDate,
      updated_date: bookingData.updatedDate,
      cancelled_date: bookingData.cancelledDate,
      booking_source: `${bookingData.bookingSource?.platform || 'WEB'}_${bookingData.bookingSource?.actor || 'CUSTOMER'}`,
      revision: parseInt(bookingData.revision) || 1,
      raw_data: bookingData
    };

    console.log('📅 Upserting booking data:', transformedBooking);

    const { data, error } = await supabase
      .from('bookings')
      .upsert(transformedBooking, {
        onConflict: 'wix_booking_id',
        ignoreDuplicates: false
      })
      .select('*');

    if (error) {
      console.error('❌ Booking upsert error:', error);
      throw error;
    }

    console.log('✅ Booking upserted successfully:', data);
    return data;

  } catch (error) {
    console.error('❌ Booking upsert failed:', error);
    throw error;
  }
}

// Link booking to contact
async function linkBookingToContact(bookingId, contactId) {
  try {
    console.log(`🔗 Linking booking ${bookingId} to contact ${contactId}`);
    
    const { data, error } = await supabase
      .from('bookings')
      .update({ contact_id: contactId })
      .eq('id', bookingId)
      .select('*');

    if (error) {
      console.error('❌ Linking failed:', error);
      throw error;
    }

    console.log('✅ Booking linked to contact successfully');
    return data;

  } catch (error) {
    console.error('❌ Linking booking to contact failed:', error);
    // Don't throw here, as the main operation succeeded
    return null;
  }
}

// Helper function to calculate duration
function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }
    
    return Math.floor((end - start) / (1000 * 60)); // Duration in minutes
  } catch (error) {
    console.error('❌ Error calculating duration:', error);
    return null;
  }
}

// Helper function to extract notes from additional fields
function extractNotes(additionalFields) {
  if (!additionalFields || !Array.isArray(additionalFields)) return null;
  
  try {
    const notesField = additionalFields.find(field => 
      field.label?.toLowerCase().includes('request') || 
      field.label?.toLowerCase().includes('notes') ||
      field.valueType === 'LONG_TEXT'
    );
    
    return notesField?.value || null;
  } catch (error) {
    console.error('❌ Error extracting notes:', error);
    return null;
  }
}

// Ensure business record exists
async function ensureBusinessExists() {
  try {
    const businessData = {
      id: BUSINESS_ID,
      name: 'Keeping It Cute Salon & Spa',
      type: 'salon',
      settings: {
        address: '144 E Oak St, Juneau, WI, USA',
        timezone: 'America/Chicago'
      }
    };

    const { error } = await supabase
      .from('businesses')
      .upsert(businessData, {
        onConflict: 'id',
        ignoreDuplicates: true
      });

    if (error && !error.message.includes('already exists')) {
      console.error('❌ Business creation failed:', error);
    } else {
      console.log('✅ Business record ensured');
    }
  } catch (error) {
    console.error('❌ Error ensuring business exists:', error);
    // Don't throw here, as it's not critical for webhook processing
  }
}

// Export named functions for testing
export { processBookingEvent, processContactEvent, upsertContact, upsertBooking };
