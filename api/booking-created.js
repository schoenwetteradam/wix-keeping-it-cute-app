// api/booking-created.js - FIXED VERSION FOR YOUR PAYLOAD STRUCTURE
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
    console.log('📅 Processing booking created webhook...');
    console.log('Raw payload:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;
    
    // Extract the actual booking entity from nested structure
    const booking = webhookData.createdEvent?.entity || webhookData;
    
    if (!booking) {
      throw new Error('No booking entity found in webhook payload');
    }
    
    console.log('📋 Booking ID:', booking.id);
    console.log('📋 Customer:', booking.contactDetails);
    console.log('📋 Service:', booking.bookedEntity);
    
    // Build the booking record with proper nested extraction
    const bookingRecord = {
      wix_booking_id: booking.id,
      
      // Customer information - handle the nested contactDetails
      customer_email: booking.contactDetails?.email,
      customer_name: extractCustomerName(booking),
      customer_phone: cleanPhoneNumber(booking.contactDetails?.phone),
      wix_contact_id: booking.contactDetails?.id,
      
      // Service information - extract from bookedEntity
      service_name: booking.bookedEntity?.title || booking.bookedEntity?.titleTranslated || 'Unknown Service',
      
      // Extract timing from slot if available, otherwise use top-level
      appointment_date: extractAppointmentDate(booking),
      end_time: extractEndTime(booking),
      service_duration: calculateServiceDuration(booking),
      
      // Staff information - extract from nested resource
      staff_member: extractStaffMember(booking),
      
      // Location
      location: extractLocation(booking),
      
      // Booking details
      number_of_participants: booking.numberOfParticipants || booking.totalParticipants || 1,
      payment_status: (booking.paymentStatus || 'undefined').toLowerCase(),
      
      // Additional fields from webhook
      notes: extractAdditionalFields(booking),
      
      // Pricing (set to 0 for now - webhook doesn't contain price)
      total_price: 0,
      
      // System fields
      status: (booking.status || 'CREATED').toLowerCase(),
      revision: parseInt(booking.revision) || 1,
      
      // Raw data preservation
      payload: booking,
      raw_data: webhookData,
      
      // Timestamps
      created_at: new Date().toISOString(),
      created_date: booking.createdDate,
      updated_at: new Date().toISOString(),
      updated_date: booking.updatedDate
    };
    
    // Remove undefined values to prevent database errors
    Object.keys(bookingRecord).forEach(key => {
      if (bookingRecord[key] === undefined) {
        delete bookingRecord[key];
      }
    });
    
    console.log('📝 Final booking record:', bookingRecord);
    
    // Insert or update booking using upsert to handle duplicates
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
    
    console.log('✅ Booking saved successfully:', savedBooking.id);
    
    // Log successful webhook
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'booking_created',
        webhook_status: 'success',
        wix_id: booking.id,
        data: {
          booking_id: savedBooking.id,
          customer_name: savedBooking.customer_name,
          service_name: savedBooking.service_name,
          appointment_date: savedBooking.appointment_date
        }
      });
    
    return res.status(200).json({ 
      success: true,
      message: 'Booking created successfully',
      booking_id: savedBooking.id,
      wix_booking_id: savedBooking.wix_booking_id
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

// ===== HELPER FUNCTIONS FIXED FOR YOUR PAYLOAD STRUCTURE =====

function extractCustomerName(booking) {
  const contact = booking.contactDetails;
  if (!contact) return 'Unknown Customer';
  
  const firstName = (contact.firstName || '').trim();
  const lastName = (contact.lastName || '').trim();
  
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
  // Try slot timing first (more accurate with timezone)
  const slot = booking.bookedEntity?.slot;
  if (slot?.startDate) {
    return slot.startDate;
  }
  
  // Fallback to top-level timing
  if (booking.startDate) {
    return booking.startDate;
  }
  
  // Last resort
  return new Date().toISOString();
}

function extractEndTime(booking) {
  // Try slot timing first
  const slot = booking.bookedEntity?.slot;
  if (slot?.endDate) {
    return slot.endDate;
  }
  
  // Fallback to top-level timing
  if (booking.endDate) {
    return booking.endDate;
  }
  
  // Calculate from start + 30 minutes default
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

function extractStaffMember(booking) {
  // Extract from nested resource structure
  const resource = booking.bookedEntity?.slot?.resource;
  
  if (resource?.name) {
    return resource.name;
  }
  
  // Fallback to resource email if name not available
  if (resource?.email) {
    return resource.email;
  }
  
  return null;
}

function extractLocation(booking) {
  const location = booking.bookedEntity?.slot?.location;
  
  if (location?.name) {
    return location.name;
  }
  
  if (location?.formattedAddress) {
    return location.formattedAddress;
  }
  
  return 'Keeping It Cute Salon & Spa'; // Default location
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
  
  // Remove common phone formatting
  return phone.replace(/[\s\-\(\)]/g, '');
}
  
