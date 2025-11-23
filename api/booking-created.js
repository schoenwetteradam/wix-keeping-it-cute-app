// api/booking-created.js - ENHANCED VERSION WITH FOREIGN KEY LINKING
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
    console.log('📅 Processing booking webhook with FK linking...');
    
    const webhookData = req.body;
    const booking = webhookData.actionEvent?.body?.booking || 
                   webhookData.createdEvent?.entity || 
                   webhookData;
    
    if (!booking) {
      throw new Error('No booking data found in webhook payload');
    }
    
    // Extract basic booking data
    const customerEmail = booking.contactDetails?.email;
    const customerName = extractCustomerName(booking.contactDetails);
    const serviceName = booking.bookedEntity?.title || booking.bookedEntity?.titleTranslated;
    const staffName = booking.bookedEntity?.slot?.resource?.name;
    const wixContactId = booking.contactDetails?.contactId;
    const wixServiceId = booking.bookedEntity?.slot?.serviceId;
    const wixStaffResourceId = booking.bookedEntity?.slot?.resource?.id;
    
    console.log('📋 Extracted data:', {
      customerEmail,
      customerName,
      serviceName,
      staffName,
      wixContactId,
      wixServiceId
    });
    
    // === FIND OR CREATE CUSTOMER ===
    let customerId = null;
    if (customerEmail) {
      // Try to find existing customer by email first
      let { data: existingCustomer } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();

      // If not found by email, try Wix contact ID
      if (!existingCustomer && wixContactId) {
        const { data: customerByWixId } = await supabase
          .from('contacts')
          .select('id')
          .eq('wix_contact_id', wixContactId)
          .maybeSingle();
        existingCustomer = customerByWixId;
      }
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('✅ Found existing customer:', customerId);
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('contacts')
          .insert({
            name: customerName,
            email: customerEmail,
            phone: cleanPhoneNumber(booking.contactDetails?.phone),
            wix_contact_id: wixContactId,
            contact_type: 'customer',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (customerError) {
          console.error('❌ Customer creation failed:', customerError);
        } else {
          customerId = newCustomer.id;
          console.log('✅ Created new customer:', customerId);
        }
      }
    }
    
    // === FIND SERVICE ===
    let serviceId = null;
    if (serviceName) {
      // Try exact match by name first
      let { data: existingService } = await supabase
        .from('salon_services')
        .select('id')
        .eq('name', serviceName)
        .maybeSingle();

      // If not found by name, try Wix service ID
      if (!existingService && wixServiceId) {
        const { data: serviceByWixId } = await supabase
          .from('salon_services')
          .select('id')
          .eq('wix_service_id', wixServiceId)
          .maybeSingle();
        existingService = serviceByWixId;
      }
      
      if (!existingService && serviceName) {
        // Try fuzzy matching on service name
        const { data: allServices } = await supabase
          .from('salon_services')
          .select('id, name');
        
        existingService = allServices?.find(service => 
          service.name.toLowerCase().includes(serviceName.toLowerCase()) ||
          serviceName.toLowerCase().includes(service.name.toLowerCase())
        );
      }
      
      if (existingService) {
        serviceId = existingService.id;
        console.log('✅ Found matching service:', serviceId);
      } else {
        console.log('⚠️ No matching service found for:', serviceName);
      }
    }
    
    // === FIND STAFF ===
    let staffId = null;
    if (staffName) {
      // Try to find staff by Wix resource ID first (most reliable)
      let existingStaff = null;

      if (wixStaffResourceId) {
        const { data: staffByWixId } = await supabase
          .from('staff')
          .select('id')
          .eq('wix_staff_resource_id', wixStaffResourceId)
          .maybeSingle();
        existingStaff = staffByWixId;
      }

      // If not found by Wix ID, try name with ilike (safely parameterized)
      if (!existingStaff && staffName) {
        const { data: staffByName } = await supabase
          .from('staff')
          .select('id')
          .ilike('name', `%${staffName}%`)
          .maybeSingle();
        existingStaff = staffByName;
      }
      
      if (!existingStaff && staffName) {
        // Try fuzzy matching on staff name
        const { data: allStaff } = await supabase
          .from('staff')
          .select('id, name, first_name, last_name');
        
        existingStaff = allStaff?.find(staff => {
          const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
          return fullName.toLowerCase().includes(staffName.toLowerCase()) ||
                 staffName.toLowerCase().includes(fullName.toLowerCase()) ||
                 (staff.name && staff.name.toLowerCase().includes(staffName.toLowerCase()));
        });
      }
      
      if (existingStaff) {
        staffId = existingStaff.id;
        console.log('✅ Found matching staff:', staffId);
      } else {
        console.log('⚠️ No matching staff found for:', staffName);
      }
    }
    
    // === BUILD BOOKING RECORD WITH FOREIGN KEYS ===
    const bookingRecord = {
      wix_booking_id: webhookData.entityId || booking.id,
      
      // Customer information + FK
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: cleanPhoneNumber(booking.contactDetails?.phone),
      wix_contact_id: wixContactId,
      customer_id: customerId, // ✅ FOREIGN KEY POPULATED
      
      // Service information + FK
      service_name: serviceName,
      service_id: serviceId, // ✅ FOREIGN KEY POPULATED
      wix_service_id: wixServiceId,
      
      // Staff information + FK  
      staff_member: staffName,
      staff_id: staffId, // ✅ FOREIGN KEY POPULATED
      wix_staff_resource_id: wixStaffResourceId,
      
      // Timing
      appointment_date: extractAppointmentDate(booking),
      end_time: extractEndTime(booking),
      service_duration: calculateServiceDuration(booking),
      
      // Location and booking details
      location: booking.bookedEntity?.slot?.location?.name || 'Keeping It Cute Salon & Spa',
      number_of_participants: booking.numberOfParticipants || 1,
      payment_status: (booking.paymentStatus || 'NOT_PAID').toLowerCase().replace('not_paid', 'unpaid'),
      status: (booking.status || 'CONFIRMED').toLowerCase(),
      revision: parseInt(booking.revision) || 1,
      
      // Additional fields
      notes: extractAdditionalFields(booking),
      total_price: 0, // Webhook doesn't contain pricing
      
      // Raw data preservation
      payload: booking,
      raw_data: webhookData,
      
      // System fields
      sync_status: 'synced',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_date: booking.createdDate,
      updated_date: booking.updatedDate
    };
    
    // Remove undefined values
    Object.keys(bookingRecord).forEach(key => {
      if (bookingRecord[key] === undefined) {
        delete bookingRecord[key];
      }
    });
    
    console.log('📝 Final booking record with FKs:', {
      wix_booking_id: bookingRecord.wix_booking_id,
      customer_id: bookingRecord.customer_id,
      service_id: bookingRecord.service_id,
      staff_id: bookingRecord.staff_id,
      customer_name: bookingRecord.customer_name,
      service_name: bookingRecord.service_name,
      staff_member: bookingRecord.staff_member
    });
    
    // Insert/update booking with proper foreign key relationships
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
    
    console.log('✅ Booking saved with proper FKs:', {
      id: savedBooking.id,
      customer_id: savedBooking.customer_id,
      service_id: savedBooking.service_id,
      staff_id: savedBooking.staff_id
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
          customer_id: savedBooking.customer_id,
          service_id: savedBooking.service_id,
          staff_id: savedBooking.staff_id,
          relationships_linked: {
            customer: !!savedBooking.customer_id,
            service: !!savedBooking.service_id,
            staff: !!savedBooking.staff_id
          }
        }
      });
    
    return res.status(200).json({ 
      success: true,
      message: 'Booking processed with foreign key relationships',
      booking: {
        id: savedBooking.id,
        wix_booking_id: savedBooking.wix_booking_id,
        customer_id: savedBooking.customer_id,
        service_id: savedBooking.service_id,
        staff_id: savedBooking.staff_id,
        relationships: {
          customer_linked: !!savedBooking.customer_id,
          service_linked: !!savedBooking.service_id,
          staff_linked: !!savedBooking.staff_id
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    
    // Log failed webhook
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          event_type: 'booking_created',
          webhook_status: 'failed',
          error_message: error.message,
          data: { error: error.message, payload: req.body }
        });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }
    
    return res.status(200).json({ 
      success: false,
      error: 'Webhook processing failed',
      details: error.message
    });
  }
}

// ===== HELPER FUNCTIONS =====

function extractCustomerName(contactDetails) {
  if (!contactDetails) return 'Unknown Customer';
  
  const firstName = (contactDetails.firstName || '').trim();
  const lastName = (contactDetails.lastName || '').trim();
  
  return firstName && lastName ? `${firstName} ${lastName}` : 
         firstName || lastName || 'Unknown Customer';
}

function extractAppointmentDate(booking) {
  const slot = booking.bookedEntity?.slot;
  return slot?.startDate || booking.startDate || new Date().toISOString();
}

function extractEndTime(booking) {
  const slot = booking.bookedEntity?.slot;
  if (slot?.endDate) return slot.endDate;
  if (booking.endDate) return booking.endDate;
  
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
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }
  
  return 30;
}

function extractAdditionalFields(booking) {
  const additionalFields = booking.additionalFields || [];
  
  if (additionalFields.length === 0) return null;
  
  return additionalFields
    .map(field => `${field.label}: ${field.value}`)
    .join('\n');
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  return phone.replace(/[\s\-\(\)]/g, '');
}
