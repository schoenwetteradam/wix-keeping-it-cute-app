// api/booking-created.js - COMPLETE CORRECTED VERSION
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
 // Add CORS headers
 res.setHeader('Access-Control-Allow-Origin', '*');
 res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wix-webhook-signature');
 
 if (req.method === 'OPTIONS') {
   res.status(200).end();
   return;
 }
 
 if (req.method !== 'POST') {
   return res.status(405).json({ error: 'Method Not Allowed' });
 }
 
 try {
   console.log('📅 Processing booking created webhook...');
   console.log('Raw request body:', JSON.stringify(req.body, null, 2));
   
   const bookingData = req.body;
   
   // Test database connection first
   const { data: testData, error: testError } = await supabase
     .from('bookings')
     .select('count(*)')
     .limit(1);
   
   if (testError) {
     console.error('❌ Database connection failed:', testError);
     return res.status(500).json({ 
       error: 'Database connection failed', 
       details: testError.message 
     });
   }
   
   console.log('✅ Database connection successful');
   
   // Map booking data to your EXACT table structure
   const bookingRecord = {
     // Required/main fields
     wix_booking_id: bookingData.id || bookingData.booking_id || bookingData.bookingId || `booking-${Date.now()}`,
     
     // Customer information
     customer_email: extractCustomerEmail(bookingData),
     customer_name: extractCustomerName(bookingData),
     customer_phone: extractCustomerPhone(bookingData),
     
     // Service information
     service_name: extractServiceName(bookingData),
     service_duration: extractServiceDuration(bookingData),
     
     // Timing
     appointment_date: extractAppointmentDate(bookingData),
     end_time: extractEndTime(bookingData),
     
     // Pricing and payment  
     total_price: extractTotalPrice(bookingData),
     payment_status: extractPaymentStatus(bookingData),
     
     // Additional details
     staff_member: extractStaffMember(bookingData),
     notes: extractNotes(bookingData),
     location: extractLocation(bookingData),
     number_of_participants: extractParticipants(bookingData),
     
     // Wix specific
     wix_contact_id: extractContactId(bookingData),
     
     // System fields that exist in your table
     business_id: null,
     cancelled_date: null,
     revision: 1,
     
     // Raw data storage
     payload: bookingData,
     raw_data: bookingData,
     
     // Timestamps
     created_at: new Date().toISOString(),
     created_date: bookingData.createdDate || new Date().toISOString(),
     updated_at: new Date().toISOString(),
     updated_date: new Date().toISOString()
   };
   
   // Remove undefined values to prevent database errors
   Object.keys(bookingRecord).forEach(key => {
     if (bookingRecord[key] === undefined) {
       delete bookingRecord[key];
     }
   });
   
   console.log('📝 Booking record to insert:', JSON.stringify(bookingRecord, null, 2));
   
   // Insert into bookings table
   const { data: booking, error: bookingError } = await supabase
     .from('bookings')
     .insert([bookingRecord])
     .select()
     .single();
   
   if (bookingError) {
     console.error('❌ Booking insert error:', bookingError);
     
     // Log failed webhook
     try {
       await supabase
         .from('webhook_logs')
         .insert({
           event_type: 'booking_created',
           webhook_status: 'failed',
           wix_id: bookingRecord.wix_booking_id,
           error_message: bookingError.message,
           data: {
             error: bookingError.message,
             hint: bookingError.hint,
             attempted_data: bookingRecord
           }
         });
     } catch (logError) {
       console.error('❌ Failed to log webhook error:', logError);
     }
     
     return res.status(500).json({ 
       error: 'Failed to create booking', 
       details: bookingError.message,
       hint: bookingError.hint,
       attempted_data: bookingRecord
     });
   }
   
   console.log('✅ Booking created successfully:', booking.id);
   
   // Log successful webhook
   try {
     await supabase
       .from('webhook_logs')
       .insert({
         event_type: 'booking_created',
         webhook_status: 'success',
         wix_id: booking.wix_booking_id,
         data: {
           booking_id: booking.id,
           customer_email: booking.customer_email,
           customer_name: booking.customer_name,
           service_name: booking.service_name,
           appointment_date: booking.appointment_date,
           total_price: booking.total_price
         }
       });
   } catch (logError) {
     console.error('Failed to log success:', logError);
   }
   
   res.status(200).json({ 
     success: true,
     message: 'Booking created successfully',
     booking: {
       id: booking.id,
       wix_booking_id: booking.wix_booking_id,
       customer_email: booking.customer_email,
       customer_name: booking.customer_name,
       service_name: booking.service_name,
       appointment_date: booking.appointment_date,
       total_price: booking.total_price
     },
     timestamp: new Date().toISOString()
   });
   
 } catch (err) {
   console.error('❌ Webhook Processing Error:', err);
   console.error('❌ Error stack:', err.stack);
   
   // Log failed webhook for debugging
   try {
     await supabase
       .from('webhook_logs')
       .insert({
         event_type: 'booking_created',
         webhook_status: 'failed',
         error_message: err.message,
         data: {
           error: err.message,
           stack: err.stack,
           payload: req.body
         }
       });
   } catch (logError) {
     console.error('❌ Failed to log webhook error:', logError);
   }
   
   res.status(500).json({ 
     success: false,
     error: 'Failed to process booking webhook', 
     details: err.message,
     timestamp: new Date().toISOString()
   });
 }
}

// Helper functions to extract data from various Wix webhook formats
function extractCustomerEmail(data) {
 return data.contactDetails?.email || 
        data.contact?.email || 
        data.formInfo?.email || 
        data.booking_contact_email ||
        data.buyerInfo?.email ||
        data.billingInfo?.email ||
        null;
}

function extractCustomerName(data) {
 // Try different combinations
 if (data.contactDetails?.firstName || data.contactDetails?.lastName) {
   return `${data.contactDetails.firstName || ''} ${data.contactDetails.lastName || ''}`.trim();
 }
 if (data.contact?.firstName || data.contact?.lastName) {
   return `${data.contact.firstName || ''} ${data.contact.lastName || ''}`.trim();
 }
 if (data.contact?.name?.first || data.contact?.name?.last) {
   return `${data.contact.name.first || ''} ${data.contact.name.last || ''}`.trim();
 }
 return data.booking_contact_name || 
        data.customerName || 
        data.buyerInfo?.firstName + ' ' + data.buyerInfo?.lastName ||
        'Unknown Customer';
}

function extractCustomerPhone(data) {
 return data.contactDetails?.phone || 
        data.contact?.phone || 
        data.formInfo?.phone || 
        data.booking_contact_phone ||
        data.buyerInfo?.phone ||
        null;
}

function extractServiceName(data) {
 return data.service?.name || 
        data.serviceInfo?.name || 
        data.bookedEntity?.title ||
        data.service_name ||
        data.serviceName ||
        'Unknown Service';
}

function extractServiceDuration(data) {
 const duration = data.service?.duration || 
                  data.serviceInfo?.duration || 
                  data.bookedEntity?.duration ||
                  data.duration ||
                  data.service_duration ||
                  60; // default 60 minutes
 
 return parseInt(duration) || 60;
}

function extractAppointmentDate(data) {
 return data.startDate || 
        data.start_date || 
        data.slot?.startDate ||
        data.appointment_date ||
        data.start?.timestamp ||
        new Date().toISOString();
}

function extractEndTime(data) {
 if (data.endDate) return data.endDate;
 if (data.end_date) return data.end_date;
 if (data.slot?.endDate) return data.slot.endDate;
 
 // Calculate end time from start + duration
 const startDate = extractAppointmentDate(data);
 const duration = extractServiceDuration(data);
 const endTime = new Date(new Date(startDate).getTime() + duration * 60000);
 return endTime.toISOString();
}

function extractTotalPrice(data) {
 const price = data.totalPrice || 
               data.total_price || 
               data.price?.value || 
               data.pricing?.total || 
               data.finalPrice?.amount ||
               data.amount ||
               0;
 
 return parseFloat(price) || 0;
}

function extractPaymentStatus(data) {
 const paymentStatus = data.paymentStatus || 
                      data.payment_status || 
                      data.isPaid ? 'PAID' : 'NOT_PAID';
 
 return paymentStatus.toLowerCase();
}

function extractStaffMember(data) {
 return data.staffMember?.name || 
        data.staff_member?.name || 
        data.resource?.name ||
        data.staff_member_name ||
        data.assignedStaff ||
        null;
}

function extractNotes(data) {
 let notes = [];
 
 // Collect notes from various sources
 if (data.notes) notes.push(data.notes);
 if (data.additionalFields) {
   if (Array.isArray(data.additionalFields)) {
     data.additionalFields.forEach(field => {
       if (field.value) {
         notes.push(`${field.label || 'Note'}: ${field.value}`);
       }
     });
   }
 }
 if (data.formInfo?.additionalFields) {
   notes.push(data.formInfo.additionalFields);
 }
 if (data.special_requests) notes.push(data.special_requests);
 
 return notes.length > 0 ? notes.join(' | ') : null;
}

function extractLocation(data) {
 return data.location || 
        data.venue || 
        data.address ||
        'Keeping It Cute Salon & Spa';
}

function extractParticipants(data) {
 return parseInt(data.numberOfParticipants || data.participants || 1);
}

function extractContactId(data) {
 return data.contactId || 
        data.wix_contact_id || 
        data.contactDetails?.contactId ||
        null;
}
  
  return notes.length > 0 ? notes.join(' | ') : null;
}
