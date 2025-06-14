// api/booking-created.js - CORRECTED for your exact table structure
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
    
    // Map booking data to your EXACT table structure (only columns that exist)
    const bookingRecord = {
      // Required/main fields
      wix_booking_id: bookingData.id || bookingData.booking_id || bookingData.bookingId || `booking-${Date.now()}`,
      
      // Customer information
      customer_email: bookingData.contactDetails?.email || 
                     bookingData.contact?.email || 
                     bookingData.formInfo?.email || 
                     null,
      customer_name: extractCustomerName(bookingData),
      customer_phone: bookingData.contactDetails?.phone || 
                      bookingData.contact?.phone || 
                      null,
      
      // Service information
      service_name: bookingData.service?.name || 
                    bookingData.serviceInfo?.name || 
                    bookingData.bookedEntity?.title ||
                    'Unknown Service',
      service_duration: parseInt(bookingData.service?.duration || 
                                bookingData.serviceInfo?.duration || 
                                bookingData.duration || 60),
      
      // Timing
      appointment_date: bookingData.startDate || 
                       bookingData.start_date || 
                       bookingData.slot?.startDate ||
                       new Date().toISOString(),
      end_time: bookingData.endDate || 
                bookingData.end_date ||
                calculateEndTime(bookingData),
      
      // Pricing and payment  
      total_price: parseFloat(bookingData.totalPrice || 
                             bookingData.total_price || 
                             bookingData.price?.value || 0),
      payment_status: (bookingData.paymentStatus || 
                      bookingData.payment_status || 
                      'NOT_PAID').toLowerCase(),
      
      // Additional details
      staff_member: bookingData.staffMember?.name || 
                   bookingData.staff_member?.name || 
                   null,
      notes: extractNotes(bookingData),
      location: bookingData.location || 'Keeping It Cute Salon & Spa',
      number_of_participants: parseInt(bookingData.numberOfParticipants || 1),
      
      // Wix specific
      wix_contact_id: bookingData.contactDetails?.contactId || 
                     bookingData.contactId ||
                     null,
      
      // System fields
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
    
    // Remove undefined/null values to prevent database errors
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
      return res.status(500).json({ 
        error: 'Failed to create booking', 
        details: bookingError.message,
        hint: bookingError.hint,
        attempted_data: bookingRecord
      });
    }
    
    console.log('✅ Booking created successfully:', booking.id);
    
    res.status(200).json({ 
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        wix_booking_id: booking.wix_booking_id,
        customer_email: booking.customer_email,
        customer_name: booking.customer_name,
        service_name: booking.service_name,
        appointment_date: booking.appointment_date
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Webhook Processing Error:', err);
    console.error('❌ Error stack:', err.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process booking webhook', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper functions
function extractCustomerName(data) {
  if (data.contactDetails?.firstName || data.contactDetails?.lastName) {
    return `${data.contactDetails.firstName || ''} ${data.contactDetails.lastName || ''}`.trim();
  }
  if (data.contact?.firstName || data.contact?.lastName) {
    return `${data.contact.firstName || ''} ${data.contact.lastName || ''}`.trim();
  }
  return data.customerName || 'Unknown Customer';
}

function calculateEndTime(data) {
  const startDate = data.startDate || data.start_date || new Date().toISOString();
  const duration = parseInt(data.duration || data.service_duration || 60);
  const endTime = new Date(new Date(startDate).getTime() + duration * 60000);
  return endTime.toISOString();
}

function extractNotes(data) {
  let notes = [];
  
  if (data.notes) notes.push(data.notes);
  if (data.additionalFields && Array.isArray(data.additionalFields)) {
    data.additionalFields.forEach(field => {
      if (field.value) {
        notes.push(`${field.label || 'Note'}: ${field.value}`);
      }
    });
  }
  if (data.formInfo?.additionalFields) {
    notes.push(data.formInfo.additionalFields);
  }
  
  return notes.length > 0 ? notes.join(' | ') : null;
}
