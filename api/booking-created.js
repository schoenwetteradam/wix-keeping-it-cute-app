// api/booking-created.js - CORRECTED FOR YOUR ACTUAL WEBHOOK STRUCTURE
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
    console.log('📅 Processing booking webhook...');
    console.log('Raw payload:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;
    
    // Extract the actual booking from the correct nested path
    const booking = webhookData.actionEvent?.body?.booking || 
                   webhookData.createdEvent?.entity || 
                   webhookData;
    
    if (!booking) {
      throw new Error('No booking data found in webhook payload');
    }
    
    console.log('📋 Extracted booking:', {
      id: booking.id,
      customer: booking.contactDetails,
      service: booking.bookedEntity?.title
    });
    
    // Build the booking record with correct data extraction
    const bookingRecord = {
      // Use the entityId as the primary wix_booking_id (this is the actual booking ID)
      wix_booking_id: webhookData.entityId || booking.id,
      
      // Customer information - NOW ACCESSING CORRECT PATH
      customer_email: booking.contactDetails?.email || null,
      customer_name: extractCustomerName(booking.contactDetails),
      customer_phone: cleanPhoneNumber(booking.contactDetails?.phone),
      wix_contact_id: booking.contactDetails?.contactId,
      
      // Service information - NOW ACCESSING CORRECT PATH  
      service_name: booking.bookedEntity?.title || booking.bookedEntity?.titleTranslated || 'Unknown Service',
      
      // Extract timing from nested slot structure
      appointment_date: extractAppointmentDate(booking),
      end_time: extractEndTime(booking),
      service_duration: calculateServiceDuration(booking),
      
      // Staff information - extract from deeply nested resource
      staff_member: booking.bookedEntity?.slot?.resource?.name || null,
      
      // Location
      location: booking.bookedEntity?.slot?.location?.name || 'Keeping It Cute Salon & Spa',
      
      // Booking details
      number_of_participants: booking.numberOfParticipants || booking.totalParticipants || 1,
      payment_status: (booking.paymentStatus || 'NOT_PAID').toLowerCase().replace('not_paid', 'unpaid'),
      
      // Additional fields and notes
      notes: extractAdditionalFields(booking),
      
      // System fields
      status: (booking.status || 'CONFIRMED').toLowerCase(),
      revision: parseInt(booking.revision) || 1,
      
      // Pricing (webhook doesn't contain price info)
      total_price: 0,
      
      // Raw data preservation for debugging
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
    
    console.log('📝 Final booking record:', {
      wix_booking_id: bookingRecord.wix_booking_id,
      customer_name: bookingRecord.customer_name,
      customer_email: bookingRecord.customer_email,
      service_name: bookingRecord.service_name,
      staff_member: bookingRecord.staff_member,
      appointment_date: bookingRecord.appointment_date
    });
    
    // Insert or update booking using upsert
    const { data: savedBooking, error: bookingError } = await supabase
      .from('bookings')
      .upsert(bookingRecord, { 
        onConflict: 'wix_booking_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();
    
    if (bookingError) {
      console.error('❌ Database error:', bookingError);
      throw new Error(`Database insert failed: ${bookingError.message}`);
    }
    
    console.log('✅ Booking saved successfully:', {
      id: savedBooking.id,
      customer_name: savedBooking.customer_name,
      service_name: savedBooking.service_name
    });
    
    // Log successful webhook
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'booking_created',
        webhook_status: 'success',
        wix_id: savedBooking.wix_booking_id,
        data: {
          booking_id: savedBooking.id,
          customer_name: savedBooking.customer_name,
          customer_email: savedBooking.customer_email,
          service_name: savedBooking.service_name,
          appointment_date: savedBooking.appointment_date
        }
      });
    
    return res.status(200).json({ 
      success: true,
      message: 'Booking processed successfully',
      booking: {
        id: savedBooking.id,
        wix_booking_id: savedBooking.wix_booking_id,
        customer_name: savedBooking.customer_name,
        service_name: savedBooking.service_name,
        appointment_date: savedBooking.appointment_date
      }
    });
    
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Log failed webhook for debugging
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          event_type: 'booking_created',
          webhook_status: 'failed',
          error_message: error.message,
          data: {
            error: error.message,
            stack: error.stack,
            payload: req.body
          }
        });
    } catch (logError) {
      console.error('❌ Failed to log webhook error:', logError);
    }
    
    // Return 200 to prevent Wix retries, but log the failure
    return res.status(200).json({ 
      success: false,
      error: 'Webhook processing failed',
      details: error.message,
      logged: true
    });
  }
}

// ===== HELPER FUNCTIONS CORRECTED FOR YOUR DATA STRUCTURE =====

function extractCustomerName(contactDetails) {
  if (!contactDetails) return 'Unknown Customer';
  
  const firstName = (contactDetails.firstName || '').trim();
  const lastName = (contactDetails.lastName || '').trim();
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  }
  
  return 'Unknown Customer';
}

function extractAppointmentDate(booking) {
  // Try local timezone slot timing first (more accurate)
  const slot = booking.bookedEntity?.slot;
  if (slot?.startDate) {
    return slot.startDate;
  }
  
  // Fallback to top-level UTC timing
  if (booking.startDate) {
    return booking.startDate;
  }
  
  return new Date().toISOString();
}

function extractEndTime(booking) {
  // Try local timezone slot timing first
  const slot = booking.bookedEntity?.slot;
  if (slot?.endDate) {
    return slot.endDate;
  }
  
  // Fallback to top-level UTC timing
  if (booking.endDate) {
    return booking.endDate;
  }
  
  // Calculate from start + default duration
  const startDate = extractAppointmentDate(booking);
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + 30);
  return endDate.toISOString();
}

function calculateServiceDuration(booking) {
  const startTime = extractAppointmentDate(booking);
  const endTime = extractEndTime(booking);
  
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    return Math.round(durationMs / (1000 * 60)); // Convert to minutes
  }
  
  return 30; // Default 30 minutes
}

function extractAdditionalFields(booking) {
  const additionalFields = booking.additionalFields || [];
  
  if (additionalFields.length === 0) {
    return null;
  }
  
  // Convert additional fields to readable format
  const notes = additionalFields
    .map(field => `${field.label}: ${field.value}`)
    .join('\n');
    
  return notes;
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove common phone formatting but keep the + for international
  return phone.replace(/[\s\-\(\)]/g, '');
}
